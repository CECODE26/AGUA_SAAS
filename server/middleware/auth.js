const jwt = require('jsonwebtoken')
const { distribuidoraId } = require('../lib/tenant')

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error('JWT_SECRET no está definido en las variables de entorno')

// Cada token dice de qué tipo es (admin, conductor, maestro, cliente, plataforma) y de
// qué distribuidora. Un token solo sirve para su tipo y en su distribuidora: el de un
// cliente no abre el panel y el de una empresa no sirve en otra.

function tokenDe(req) {
  const auth = req.headers['authorization']
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return null
}

// Payload verificado o null (sin lanzar)
function leerToken(token) {
  if (!token) return null
  try { return jwt.verify(token, JWT_SECRET) } catch { return null }
}

// ── Firmar ───────────────────────────────────────────────────────────────────
const firmar = (payload, expiresIn) => jwt.sign(payload, JWT_SECRET, { expiresIn })

const firmarAdmin = a =>
  firmar({ tipo: 'admin', username: a.username, rol: a.rol, distribuidoraId: a.distribuidoraId }, '8h')
const firmarConductor = c =>
  firmar({ tipo: 'conductor', role: 'conductor', conductorId: c.id, nombre: c.nombre, distribuidoraId: c.distribuidoraId }, '30d')
const firmarMaestro = m =>
  firmar({ tipo: 'maestro', role: 'maestro', maestroId: m.id, nombre: m.nombre, distribuidoraId: m.distribuidoraId }, '365d')
const firmarCliente = c =>
  firmar({ tipo: 'cliente', id: c.id, email: c.email, distribuidoraId: c.distribuidoraId }, '30d')
const firmarPlataforma = p =>
  firmar({ tipo: 'plataforma', plataformaId: p.id, username: p.username, rol: p.rol || 'superadmin' }, '8h')
// Superadmin de Agua Elite dentro del panel de una empresa ("Ingresar"): superadmin de esa
// empresa por 2 horas, marcado como soporte para registrar lo que cambia
const firmarSoporte = (d, plataforma) =>
  firmar({
    tipo: 'admin', username: `soporte:${plataforma.username}`, rol: 'superadmin', distribuidoraId: d.id,
    soporte: { plataformaId: plataforma.plataformaId, username: plataforma.username },
  }, '2h')

// ── Verificar ────────────────────────────────────────────────────────────────
// Devuelve el payload si el token es de ese tipo y de la distribuidora de la petición
function validarTipo(payload, tipo) {
  if (!payload || payload.tipo !== tipo) return false
  if (tipo === 'plataforma') return true
  return payload.distribuidoraId === distribuidoraId()
}

function middleware(tipo, clave, { expirado = 'Token expirado' } = {}) {
  return (req, res, next) => {
    const token = tokenDe(req)
    if (!token) return res.status(401).json({ success: false, message: 'Token requerido' })
    let payload
    try {
      payload = jwt.verify(token, JWT_SECRET)
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: expirado, expired: true })
      }
      return res.status(403).json({ success: false, message: 'Token inválido' })
    }
    if (!validarTipo(payload, tipo)) {
      return res.status(403).json({ success: false, message: 'Acceso denegado' })
    }
    req[clave] = payload
    next()
  }
}

const verifyToken          = middleware('admin', 'admin')
const verifyTokenConductor = middleware('conductor', 'conductor')
const verifyTokenMaestro   = middleware('maestro', 'maestro', { expirado: 'Sesión expirada' })
const verifyTokenPlataforma = middleware('plataforma', 'plataforma', { expirado: 'Sesión expirada' })

function verifySuperAdmin(req, res, next) {
  // Debe usarse después de verifyToken
  if (req.admin?.rol !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Acceso restringido a superadmin' })
  }
  next()
}

// Cliente de la app/sitio: { id, email } o null si no hay sesión válida de esta distribuidora
function clienteDeToken(req) {
  const payload = leerToken(tokenDe(req))
  return validarTipo(payload, 'cliente') ? payload : null
}

// Conductor desde un token suelto (SSE lo manda por query string)
function conductorDeToken(token) {
  const payload = leerToken(token)
  return validarTipo(payload, 'conductor') ? payload : null
}

module.exports = {
  JWT_SECRET,
  verifyToken, verifySuperAdmin, verifyTokenConductor, verifyTokenMaestro, verifyTokenPlataforma,
  firmarAdmin, firmarConductor, firmarMaestro, firmarCliente, firmarPlataforma, firmarSoporte,
  clienteDeToken, conductorDeToken, leerToken, tokenDe,
}
