// Reglas comunes para nombres de usuario y contraseñas (admins y choferes).
// Evita el clásico "contraseña incorrecta" por mayúsculas o espacios del teclado del celular.
const prisma = require('./prisma')

// "  Raul  Leon " → "raul leon" (minúsculas, sin espacios sobrantes, un solo espacio interno)
function normalizarUsername(u) {
  return String(u ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
}

// La contraseña se guarda sin espacios al inicio/final (el autocompletado suele agregarlos)
function limpiarPassword(p) {
  return String(p ?? '').trim()
}

// ¿Existe ya un admin o chofer con ese usuario, sin distinguir mayúsculas?
async function usernameOcupado(username, { ignorarConductorId = null, ignorarAdminId = null, ignorarSolicitudId = null } = {}) {
  const u = normalizarUsername(username)
  if (!u) return false
  const [conductor, admin, solicitud] = await Promise.all([
    prisma.conductor.findFirst({ where: { username: { equals: u, mode: 'insensitive' }, ...(ignorarConductorId ? { id: { not: ignorarConductorId } } : {}) }, select: { id: true } }),
    prisma.admin.findFirst({ where: { username: { equals: u, mode: 'insensitive' }, ...(ignorarAdminId ? { id: { not: ignorarAdminId } } : {}) }, select: { id: true } }),
    // Al aprobar una solicitud, esa misma solicitud no cuenta como duplicada
    prisma.solicitudActivacion.findFirst({ where: { estado: 'pendiente', targetUsername: { equals: u, mode: 'insensitive' }, ...(ignorarSolicitudId ? { id: { not: ignorarSolicitudId } } : {}) }, select: { id: true } }),
  ])
  if (conductor) return 'Ya existe un chofer con ese usuario'
  if (admin)     return 'Ya existe un admin con ese usuario'
  if (solicitud) return 'Ya hay una solicitud pendiente con ese usuario'
  return false
}

module.exports = { normalizarUsername, limpiarPassword, usernameOcupado }
