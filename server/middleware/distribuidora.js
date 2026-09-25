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
  if (distribuidora.esDemo && distribuidora.demoVenceEn && new Date(distribuidora.demoVenceEn) < new Date()) {
    return res.status(410).json({ message: 'Esta demo ya terminó. Abre una nueva desde la página de Agua Elite.', codigo: 'DEMO_VENCIDA' })
  }
  if (!distribuidora.activo) {
    return res.status(403).json({ message: 'Esta distribuidora está suspendida', codigo: 'DISTRIBUIDORA_SUSPENDIDA' })
  }

  req.distribuidora = distribuidora
  als.run({ distribuidoraId: distribuidora.id, distribuidora }, next)
}

// En las demos de la landing no se suben archivos: se borran solas y nadie limpiaría los archivos
function sinArchivosEnDemo(req, res, next) {
  if (req.distribuidora?.esDemo) {
    return res.status(403).json({ message: 'En la demo no se pueden subir imágenes.', codigo: 'DEMO_SIN_ARCHIVOS' })
  }
  next()
}

module.exports = { resolverDistribuidora, sinArchivosEnDemo }
