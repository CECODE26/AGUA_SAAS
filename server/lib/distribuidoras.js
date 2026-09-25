// Búsqueda de distribuidoras (con caché corta) y cómo se identifican en cada petición:
//   1. Encabezado X-Distribuidora: <slug>   → apps móviles y pruebas
//   2. Dominio propio (Distribuidora.dominio) → aguamanu.com, www.aguamanu.com
//   3. Subdominio de la plataforma            → <slug>.PLATAFORMA_DOMINIO
//   4. DISTRIBUIDORA_POR_DEFECTO (slug)       → instalaciones de una sola empresa
const prisma = require('./prisma')
const { comoPlataforma } = require('./tenant')

const TTL_MS = 60 * 1000
const cache = new Map()   // clave → { valor, vence }

async function conCache(clave, buscar) {
  const hit = cache.get(clave)
  if (hit && hit.vence > Date.now()) return hit.valor
  const valor = await comoPlataforma(buscar)
  cache.set(clave, { valor, vence: Date.now() + TTL_MS })
  return valor
}

function invalidar() {
  cache.clear()
}

const normalizarSlug = s => String(s ?? '').trim().toLowerCase()
const normalizarDominio = d => String(d ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '').replace(/^www\./, '')

function porSlug(slug) {
  const s = normalizarSlug(slug)
  if (!s) return Promise.resolve(null)
  return conCache(`slug:${s}`, () => prisma.distribuidora.findUnique({ where: { slug: s } }))
}

function porId(id) {
  if (!Number.isInteger(id)) return Promise.resolve(null)
  return conCache(`id:${id}`, () => prisma.distribuidora.findUnique({ where: { id } }))
}

async function porHost(hostname) {
  const host = normalizarDominio(hostname)
  if (!host) return null
  const propia = await conCache(`dom:${host}`, () => prisma.distribuidora.findUnique({ where: { dominio: host } }))
  if (propia) return propia
  const raiz = normalizarDominio(process.env.PLATAFORMA_DOMINIO)
  if (raiz && host.endsWith(`.${raiz}`)) {
    const sub = host.slice(0, -(raiz.length + 1))
    if (sub && !sub.includes('.')) return porSlug(sub)
  }
  return null
}

// Distribuidora que pide la petición (sin mirar el token)
async function desdePeticion(req) {
  const encabezado = req.get('x-distribuidora')
  if (encabezado) return { distribuidora: await porSlug(encabezado), origen: 'encabezado' }
  const deHost = await porHost(req.hostname)
  if (deHost) return { distribuidora: deHost, origen: 'dominio' }
  if (process.env.DISTRIBUIDORA_POR_DEFECTO) {
    return { distribuidora: await porSlug(process.env.DISTRIBUIDORA_POR_DEFECTO), origen: 'por_defecto' }
  }
  return { distribuidora: null, origen: null }
}

// ¿Este origen web (CORS) es de alguna distribuidora o de la plataforma?
async function origenPermitido(origin) {
  const extra = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
  if (extra.includes(origin)) return true
  let host
  try { host = new URL(origin).hostname } catch { return false }
  if (host === 'localhost' || host === '127.0.0.1') return true
  const raiz = normalizarDominio(process.env.PLATAFORMA_DOMINIO)
  if (raiz && (host === raiz || host === `www.${raiz}`)) return true
  return !!(await porHost(host))
}

// URL pública del sitio de la distribuidora (links en correos)
function urlSitio(d) {
  if (d?.dominio) return `https://${d.dominio}`
  const raiz = normalizarDominio(process.env.PLATAFORMA_DOMINIO)
  if (d?.slug && raiz) return `https://${d.slug}.${raiz}`
  return process.env.SITE_URL || 'http://localhost:5173'
}

// Lo que puede ver cualquiera (sitio público y apps)
function publica(d) {
  if (!d) return null
  return {
    slug: d.slug,
    nombre: d.nombre,
    colorPrimario: d.colorPrimario,
    logo: d.logo,
    telefono: d.telefono,
    whatsapp: d.whatsapp,
    ciudad: d.ciudad,
    provincia: d.provincia,
    depositoLat: d.depositoLat,
    depositoLng: d.depositoLng,
    // Demo de la landing: el aviso muestra cuándo vence y los usuarios de prueba
    ...(d.esDemo ? { esDemo: true, demoVenceEn: d.demoVenceEn, demoAccesos: d.demoAccesos } : {}),
  }
}

module.exports = {
  porSlug, porId, porHost, desdePeticion, origenPermitido, invalidar,
  urlSitio, publica, normalizarSlug, normalizarDominio,
}
