const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error('JWT_SECRET no está definido en las variables de entorno')

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer <token>

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token requerido' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.admin = decoded
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expirado', expired: true })
    }
    return res.status(403).json({ success: false, message: 'Token inválido' })
  }
}

function verifySuperAdmin(req, res, next) {
  // Debe usarse después de verifyToken
  if (req.admin?.rol !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Acceso restringido a superadmin' })
  }
  next()
}

function verifyTokenConductor(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'Token requerido' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    if (decoded.role !== 'conductor') return res.status(403).json({ message: 'Acceso denegado' })
    req.conductor = decoded
    next()
  } catch {
    return res.status(403).json({ message: 'Token inválido' })
  }
}

function verifyTokenMaestro(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'Token requerido' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    if (decoded.role !== 'maestro') return res.status(403).json({ message: 'Acceso denegado' })
    req.maestro = decoded
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ message: 'Sesión expirada', expired: true })
    return res.status(403).json({ message: 'Token inválido' })
  }
}

module.exports = { verifyToken, verifySuperAdmin, verifyTokenConductor, verifyTokenMaestro, JWT_SECRET }
