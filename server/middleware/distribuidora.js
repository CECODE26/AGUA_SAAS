// Identifica la distribuidora de cada petición /api y la deja en el contexto
// (lib/tenant.js) para que lib/prisma.js filtre todas las consultas.
const { als } = require('../lib/tenant')
const distribuidoras = require('../lib/distribuidoras')
const { leerToken, tokenDe } = require('./auth')

// Rutas que no pertenecen a ninguna distribuidora
const LIBRES = ['/health', '/plataforma', '/map-tiles']
const esLibre = path => LIBRES.some(p => path === p || path.startsWith(`${p}/`))

async function resolverDistribuidora(req, res, next) {
  if (esLibre(req.path)) return als.run({}, next)

  const { distribuidora: pedida, origen } = await distribuidoras.desdePeticion(req)
  if (origen === 'encabezado' && !pedida) {
    return res.status(404).json({ message: 'Distribuidora no encontrada', codigo: 'DISTRIBUIDORA_NO_EXISTE' })
  }

  // El token también dice de qué distribuidora es (la app del chofer puede no mandar encabezado)
  const payload = leerToken(tokenDe(req) ?? (typeof req.query.token === 'string' ? req.query.token : null))
  const deToken = payload?.distribuidoraId ?? null
  if (deToken && pedida && deToken !== pedida.id) {
    return res.status(403).json({ message: 'Esta sesión es de otra distribuidora. Vuelve a iniciar sesión.', codigo: 'OTRA_DISTRIBUIDORA' })
  }

  const distribuidora = pedida ?? (deToken ? await distribuidoras.porId(deToken) : null)
  if (!distribuidora) {
    return res.status(400).json({ message: 'No se sabe a qué distribuidora va esta petición', codigo: 'SIN_DISTRIBUIDORA' })
  }
  if (!distribuidora.activo) {
    return res.status(403).json({ message: 'Esta distribuidora está suspendida', codigo: 'DISTRIBUIDORA_SUSPENDIDA' })
  }

  req.distribuidora = distribuidora
  als.run({ distribuidoraId: distribuidora.id, distribuidora }, next)
}

module.exports = { resolverDistribuidora }
