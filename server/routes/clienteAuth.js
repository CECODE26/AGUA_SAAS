const express  = require('express')
const bcrypt    = require('bcryptjs')
const prisma    = require('../lib/prisma')
const { emailRecuperarPassword, emailNuevoClienteFijo } = require('../lib/mailer')


const router = express.Router()
const { firmarCliente, clienteDeToken } = require('../middleware/auth')
const { distribuidoraIdObligatoria } = require('../lib/tenant')

// Clave única del cliente dentro de su distribuidora
const porEmail = email => ({ distribuidoraId_email: { distribuidoraId: distribuidoraIdObligatoria(), email } })

const CAMPOS_PUBLICOS = {
  id: true, nombre: true, email: true, cedula: true,
  telefono: true, callePrincipal: true, referencia: true,
  latitud: true, longitud: true, creadoEn: true,
  esFijo: true, visitasHorario: true,
}

function validarPassword(p) {
  return p.length >= 8 &&
    /[A-Z]/.test(p) &&
    /[a-z]/.test(p) &&
    /[0-9]/.test(p) &&
    /[@#$!%^&*()\-_=+\[\]{};':"\\|,.<>/?]/.test(p)
}

// POST /api/clientes/auth/registro
router.post('/registro', async (req, res) => {
  try {
    const { nombre, cedula, direccion, telefono, referencia, email, password } = req.body
    if (!nombre || !cedula || !direccion || !telefono || !referencia || !email || !password) {
      return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' })
    }
    if (!/^\d{10}$/.test(telefono.replace(/\s/g, ''))) {
      return res.status(400).json({ success: false, message: 'El teléfono debe tener exactamente 10 dígitos' })
    }
    if (!validarPassword(password)) {
      return res.status(400).json({ success: false, message: 'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial' })
    }
    const emailLower  = email.trim().toLowerCase()
    const existe      = await prisma.cliente.findUnique({ where: porEmail(emailLower) })
    if (existe?.passwordHash) {
      return res.status(409).json({ success: false, message: 'Ya tienes una cuenta con ese correo. Inicia sesión o recupera tu contraseña.' })
    }
    const passwordHash = await bcrypt.hash(password, 10)
    // Si el cliente fue creado por el admin (sin contraseña), activamos su cuenta
    const cliente = existe
      ? await prisma.cliente.update({
          where:  porEmail(emailLower),
          data:   { passwordHash },
          select: CAMPOS_PUBLICOS,
        })
      : await prisma.cliente.create({
          data: {
            nombre:         nombre.trim(),
            cedula:         cedula.trim(),
            callePrincipal: direccion.trim(),
            telefono:       telefono.trim(),
            referencia:     referencia.trim(),
            email:          emailLower,
            passwordHash,
          },
          select: CAMPOS_PUBLICOS,
        })
    const token = firmarCliente({ ...cliente, distribuidoraId: distribuidoraIdObligatoria() })
    res.status(201).json({ success: true, token, cliente })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Error al registrar' })
  }
})

// POST /api/clientes/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Correo y contraseña requeridos' })
    }
    const cliente = await prisma.cliente.findUnique({ where: porEmail(email.trim().toLowerCase()) })
    if (!cliente) {
      return res.status(404).json({ success: false, noAccount: true, message: 'No encontramos una cuenta con ese correo.' })
    }
    if (!cliente.passwordHash) {
      return res.status(401).json({ success: false, noPassword: true, message: 'Tu cuenta existe pero no tiene contraseña. Completa tu registro para activarla.' })
    }
    const ok = await bcrypt.compare(password, cliente.passwordHash)
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Contraseña incorrecta' })
    }
    const token = firmarCliente(cliente)
    const { passwordHash: _, ...datos } = cliente
    res.json({ success: true, token, cliente: datos })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Error al iniciar sesión' })
  }
})

// GET /api/clientes/auth/perfil  (token requerido)
router.get('/perfil', async (req, res) => {
  try {
    const id = clienteDeToken(req)?.id
    if (!id) return res.status(401).json({ success: false, message: 'Token inválido' })
    const cliente = await prisma.cliente.findUnique({ where: { id }, select: CAMPOS_PUBLICOS })
    if (!cliente) return res.status(404).json({ success: false })
    res.json({ success: true, cliente })
  } catch {
    res.status(401).json({ success: false, message: 'Token inválido' })
  }
})

// Extrae el id del cliente del header Authorization; null si no hay token válido
function clienteIdDeReq(req) {
  return clienteDeToken(req)?.id ?? null
}

// POST /api/clientes/auth/push-token  — guardar Expo push token del teléfono
router.post('/push-token', async (req, res) => {
  const id = clienteIdDeReq(req)
  if (!id) return res.status(401).json({ success: false, message: 'Token inválido' })
  const { pushToken } = req.body
  if (!pushToken) return res.status(400).json({ success: false, message: 'pushToken requerido' })
  try {
    // Un mismo teléfono no puede quedar apuntando a dos clientes
    await prisma.cliente.updateMany({ where: { pushToken, id: { not: id } }, data: { pushToken: null } })
    await prisma.cliente.update({ where: { id }, data: { pushToken } })
    res.json({ success: true })
  } catch (e) {
    console.error('push-token cliente:', e.message)
    res.status(500).json({ success: false, message: 'No se pudo guardar el token' })
  }
})

// DELETE /api/clientes/auth/push-token  — al cerrar sesión
router.delete('/push-token', async (req, res) => {
  const id = clienteIdDeReq(req)
  if (!id) return res.status(401).json({ success: false })
  try { await prisma.cliente.update({ where: { id }, data: { pushToken: null } }) } catch {}
  res.json({ success: true })
})

// POST /api/clientes/auth/recuperar  — solicitar código por email
router.post('/recuperar', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ success: false, message: 'Correo requerido' })
    const emailLower = email.trim().toLowerCase()
    const cliente = await prisma.cliente.findUnique({ where: porEmail(emailLower) })
    if (!cliente)
      return res.status(404).json({ success: false, noAccount: true, message: 'No encontramos una cuenta con ese correo. ¿Ya te registraste?' })
    const codigo  = String(Math.floor(100000 + Math.random() * 900000))
    const expiry  = new Date(Date.now() + 15 * 60 * 1000)
    await prisma.cliente.update({
      where: porEmail(emailLower),
      data:  { resetCodigo: codigo, resetExpiry: expiry },
    })
    if (!process.env.MAIL_USER) {
      console.log(`[DEV] Código recuperación para ${emailLower}: ${codigo}`)
      return res.json({ success: true })
    }
    try {
      await emailRecuperarPassword(cliente.email, cliente.nombre, codigo)
    } catch (err) {
      console.error('[MAIL ERROR] recuperar:', err.message)
      return res.status(500).json({ success: false, message: 'No se pudo enviar el correo. Revisa que tu dirección sea correcta e intenta nuevamente.' })
    }
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Error al enviar el correo' })
  }
})

// POST /api/clientes/auth/resetear  — validar código y cambiar contraseña
router.post('/resetear', async (req, res) => {
  try {
    const { email, codigo, password } = req.body
    if (!email || !codigo || !password) {
      return res.status(400).json({ success: false, message: 'Faltan datos' })
    }
    const emailLower = email.trim().toLowerCase()
    const cliente = await prisma.cliente.findUnique({ where: porEmail(emailLower) })
    if (!cliente?.resetCodigo || cliente.resetCodigo !== codigo.trim()) {
      return res.status(400).json({ success: false, message: 'Código incorrecto' })
    }
    if (!cliente.resetExpiry || new Date() > cliente.resetExpiry) {
      await prisma.cliente.update({ where: porEmail(emailLower), data: { resetCodigo: null, resetExpiry: null } })
      return res.status(400).json({ success: false, message: 'El código expiró. Solicita uno nuevo.' })
    }
    if (!validarPassword(password)) {
      return res.status(400).json({ success: false, message: 'La contraseña no cumple los requisitos de seguridad' })
    }
    const passwordHash = await bcrypt.hash(password, 10)
    await prisma.cliente.update({
      where: porEmail(emailLower),
      data:  { passwordHash, resetCodigo: null, resetExpiry: null },
    })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Error al restablecer la contraseña' })
  }
})

// PATCH /api/clientes/auth/visitas — guardar horario de visitas (token requerido)
router.patch('/visitas', async (req, res) => {
  try {
    const id = clienteDeToken(req)?.id
    if (!id) return res.status(401).json({ success: false, message: 'Token inválido' })
    const { visitasHorario, latitud, longitud } = req.body
    if (!Array.isArray(visitasHorario) || visitasHorario.length === 0) {
      return res.status(400).json({ success: false, message: 'Debes seleccionar al menos una visita' })
    }
    // ¿Es la primera vez que este cliente elige días? → se vuelve cliente fijo "nuevo"
    const antes = await prisma.cliente.findUnique({ where: { id }, select: { esFijo: true, fijoDesde: true } })
    const primeraVez = !!antes && !antes.esFijo

    const data = { visitasHorario, esFijo: true }
    if (primeraVez || !antes?.fijoDesde) data.fijoDesde = new Date()
    if (latitud != null && longitud != null) {
      data.latitud  = parseFloat(latitud)
      data.longitud = parseFloat(longitud)
    }
    const cliente = await prisma.cliente.update({
      where: { id },
      data,
      select: {
        id: true, nombre: true, email: true, cedula: true, telefono: true,
        callePrincipal: true, calleSecundaria: true, referencia: true, sector: true,
        latitud: true, longitud: true, esFijo: true, visitasHorario: true,
      },
    })
    // Avisar al admin por correo (solo la primera vez, en segundo plano)
    if (primeraVez) emailNuevoClienteFijo(cliente).catch(e => console.error('Email cliente fijo:', e.message))
    res.json({ success: true, cliente })
  } catch {
    res.status(401).json({ success: false, message: 'Token inválido' })
  }
})

module.exports = router
