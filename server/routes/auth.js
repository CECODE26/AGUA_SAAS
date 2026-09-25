const express = require('express')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { authenticator } = require('otplib')
const QRCode = require('qrcode')
const { verifyToken, JWT_SECRET } = require('../middleware/auth')
const prisma = require('../lib/prisma')

const router = express.Router()

// Google Authenticator / cualquier app TOTP. window 1 = tolera ±30 s de desfase del reloj del celular.
authenticator.options = { window: 1 }

function codigoValido(secret, codigo) {
  if (!secret || !codigo) return false
  try { return authenticator.check(String(codigo).replace(/\s+/g, ''), secret) } catch { return false }
}

const perfil = a => ({
  username: a.username, rol: a.rol, telefono: a.telefono,
  totpActivo: a.totpActivo, totpLogin: a.totpLogin, totpPendiente: !!a.totpSecret && !a.totpActivo,
})

async function adminActual(req) {
  return prisma.admin.findUnique({ where: { username: req.admin.username } })
}

// ── POST /api/auth/login ─────────────────────────────────────────────────────
// Si el admin activó "código al iniciar sesión", el primer intento (sin código) responde
// { requiereCodigo: true } y el panel pide el código de la app autenticadora.
router.post('/login', async (req, res) => {
  const { username, password, codigo } = req.body

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos' })
  }

  // Tolerante con el teclado: usuario sin distinguir mayúsculas ni espacios sobrantes
  const admin = await prisma.admin.findFirst({ where: { username: { equals: String(username).trim(), mode: 'insensitive' } } })
  if (!admin) {
    return res.status(401).json({ success: false, message: 'Credenciales incorrectas' })
  }

  let passwordValida = await bcrypt.compare(password, admin.passwordHash)
  if (!passwordValida && String(password).trim() !== password) passwordValida = await bcrypt.compare(String(password).trim(), admin.passwordHash)
  if (!passwordValida) {
    return res.status(401).json({ success: false, message: 'Credenciales incorrectas' })
  }

  if (!admin.activo) {
    return res.status(403).json({ success: false, message: 'Cuenta inactiva. Contacta al superadmin.' })
  }

  if (admin.totpActivo && admin.totpLogin) {
    if (!codigo) {
      return res.json({ success: false, requiereCodigo: true, message: 'Ingresa el código de tu app autenticadora' })
    }
    if (!codigoValido(admin.totpSecret, codigo)) {
      return res.status(401).json({ success: false, requiereCodigo: true, message: 'Código incorrecto o vencido' })
    }
  }

  const token = jwt.sign({ username: admin.username, rol: admin.rol }, JWT_SECRET, { expiresIn: '8h' })
  res.json({ success: true, token, rol: admin.rol })
})

// ── GET /api/auth/verify ─────────────────────────────────────────────────────
router.get('/verify', verifyToken, (req, res) => {
  res.json({ success: true, admin: req.admin.username, rol: req.admin.rol })
})

// ── Mi cuenta ────────────────────────────────────────────────────────────────
router.get('/me', verifyToken, async (req, res) => {
  const admin = await adminActual(req)
  if (!admin) return res.status(404).json({ message: 'Cuenta no encontrada' })
  res.json({ admin: perfil(admin) })
})

router.put('/me', verifyToken, async (req, res) => {
  const telefono = req.body.telefono != null ? String(req.body.telefono).trim() : undefined
  if (telefono === undefined) return res.status(400).json({ message: 'Nada que actualizar' })
  const admin = await prisma.admin.update({ where: { username: req.admin.username }, data: { telefono: telefono || null } })
  res.json({ admin: perfil(admin) })
})

// ── Verificación en dos pasos ────────────────────────────────────────────────

// Paso 1: genera el secreto y el QR (queda pendiente hasta confirmar con un código)
router.post('/totp/iniciar', verifyToken, async (req, res) => {
  const admin = await adminActual(req)
  if (!admin) return res.status(404).json({ message: 'Cuenta no encontrada' })
  if (!req.body.password || !(await bcrypt.compare(req.body.password, admin.passwordHash))) {
    return res.status(400).json({ message: 'Contraseña incorrecta' })
  }
  if (admin.totpActivo) return res.status(400).json({ message: 'La verificación en dos pasos ya está activa' })

  const secret  = authenticator.generateSecret()
  const otpauth = authenticator.keyuri(admin.username, 'Agua Manú', secret)
  const qr      = await QRCode.toDataURL(otpauth, { margin: 1, width: 220 })
  await prisma.admin.update({ where: { id: admin.id }, data: { totpSecret: secret, totpActivo: false, totpLogin: false } })
  res.json({ qr, secret })
})

// Paso 2: confirma con el primer código que muestra la app
router.post('/totp/confirmar', verifyToken, async (req, res) => {
  const admin = await adminActual(req)
  if (!admin?.totpSecret || admin.totpActivo) return res.status(400).json({ message: 'Primero genera el código QR' })
  if (!codigoValido(admin.totpSecret, req.body.codigo)) return res.status(400).json({ message: 'Código incorrecto. Revisa la hora del celular e inténtalo de nuevo.' })
  const actualizado = await prisma.admin.update({ where: { id: admin.id }, data: { totpActivo: true } })
  res.json({ admin: perfil(actualizado) })
})

// Pedir (o no) el código también al iniciar sesión
router.put('/totp/login', verifyToken, async (req, res) => {
  const admin = await adminActual(req)
  if (!admin?.totpActivo) return res.status(400).json({ message: 'Activa primero la verificación en dos pasos' })
  if (!codigoValido(admin.totpSecret, req.body.codigo)) return res.status(400).json({ message: 'Código incorrecto' })
  const actualizado = await prisma.admin.update({ where: { id: admin.id }, data: { totpLogin: !!req.body.activar } })
  res.json({ admin: perfil(actualizado) })
})

// Desactivar: exige contraseña + código
router.post('/totp/desactivar', verifyToken, async (req, res) => {
  const admin = await adminActual(req)
  if (!admin) return res.status(404).json({ message: 'Cuenta no encontrada' })
  if (!req.body.password || !(await bcrypt.compare(req.body.password, admin.passwordHash))) {
    return res.status(400).json({ message: 'Contraseña incorrecta' })
  }
  if (admin.totpActivo && !codigoValido(admin.totpSecret, req.body.codigo)) {
    return res.status(400).json({ message: 'Código incorrecto' })
  }
  const actualizado = await prisma.admin.update({ where: { id: admin.id }, data: { totpSecret: null, totpActivo: false, totpLogin: false } })
  res.json({ admin: perfil(actualizado) })
})

// ── Cambiar mi contraseña: contraseña actual + código de la app ──────────────
router.post('/cambiar-password', verifyToken, async (req, res) => {
  const { actual, nueva, codigo } = req.body
  if (!actual || !nueva) return res.status(400).json({ message: 'Contraseña actual y nueva requeridas' })
  if (String(nueva).length < 6) return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' })

  const admin = await adminActual(req)
  if (!admin) return res.status(404).json({ message: 'Cuenta no encontrada' })
  if (!admin.totpActivo) {
    return res.status(403).json({ message: 'Activa primero la verificación en dos pasos para poder cambiar la contraseña', requiereTotp: true })
  }
  if (!(await bcrypt.compare(actual, admin.passwordHash))) return res.status(400).json({ message: 'La contraseña actual no es correcta' })
  if (!codigoValido(admin.totpSecret, codigo)) return res.status(400).json({ message: 'Código de verificación incorrecto' })

  await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash: await bcrypt.hash(nueva, 10) } })
  res.json({ success: true, message: 'Contraseña actualizada' })
})

// ── POST /api/auth/recuperar — "Olvidé mi contraseña" con el código del autenticador ──
// Sin sesión: usuario + código TOTP + contraseña nueva. Solo cuentas con 2 pasos activos.
router.post('/recuperar', async (req, res) => {
  const { username, codigo, nueva } = req.body
  if (!username || !codigo || !nueva) return res.status(400).json({ success: false, message: 'Usuario, código y contraseña nueva requeridos' })
  if (String(nueva).length < 6) return res.status(400).json({ success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres' })

  const admin = await prisma.admin.findUnique({ where: { username } })
  // Misma respuesta si el usuario no existe o el código falla: no revela cuentas
  if (!admin || !admin.activo) return res.status(400).json({ success: false, message: 'Usuario o código incorrectos' })
  if (!admin.totpActivo) {
    return res.status(400).json({ success: false, message: 'Esta cuenta no tiene verificación en dos pasos. Pide al superadmin que restablezca tu contraseña.' })
  }
  if (!codigoValido(admin.totpSecret, codigo)) return res.status(400).json({ success: false, message: 'Usuario o código incorrectos' })

  await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash: await bcrypt.hash(String(nueva), 10) } })
  res.json({ success: true, message: 'Contraseña restablecida. Ya puedes iniciar sesión.' })
})

module.exports = router
