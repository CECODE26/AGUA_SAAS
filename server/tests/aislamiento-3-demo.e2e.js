// Demo instantánea de la landing (ver tests/README.md). Corre después de las otras dos:
// usa la distribuidora "norte" que crea la primera para comprobar que las demos no la tocan.
// Necesita DATABASE_URL (vence una demo a mano para probar la limpieza).
const B = process.env.API_URL || 'http://localhost:3001/api'
let fallos = 0
function ok(c, m) { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) fallos++ }
async function req(method, path, { token, slug, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (slug) headers['X-Distribuidora'] = slug
  const r = await fetch(B + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  let json = null; try { json = await r.json() } catch {}
  return { status: r.status, json }
}
;(async () => {
  const a = await req('POST', '/plataforma/demo')
  const b = await req('POST', '/plataforma/demo')
  ok(a.status === 201 && b.status === 201 && a.json.slug !== b.json.slug, `dos visitantes, dos demos distintas (${a.json?.slug}, ${b.json?.slug})`)
  const A = a.json.token, S = a.json.slug

  // Entra directo como dueño, con datos de ejemplo
  const ped = await req('GET', '/pedidos', { token: A })
  ok(ped.status === 200 && ped.json.pedidos.length > 20, `la demo trae pedidos de ejemplo (${ped.json?.pedidos?.length})`)
  const pub = await req('GET', '/distribuidora', { slug: S })
  ok(pub.json.distribuidora.esDemo === true && pub.json.distribuidora.demoAccesos?.chofer?.usuario === 'kevin', 'la marca pública avisa que es demo y da el usuario de chofer')
  ok((await req('GET', '/fidelidad/programa', { slug: S })).json.activo === true, 'fidelidad activa en la demo')
  const rep = await req('GET', '/reportes', { token: A })
  ok(rep.json.resumen.totalPedidos > 0, 'reportes con datos')

  // El chofer de la demo entra con los accesos que muestra el aviso
  const { usuario, clave } = a.json.accesos.chofer
  const k = await req('POST', '/conductores/login', { slug: S, body: { username: usuario, password: clave } })
  ok(k.status === 200, 'chofer de la demo entra')
  const ruta = await req('GET', '/conductores/mi-ruta', { token: k.json.token })
  ok(ruta.json.ruta?.paradas?.length >= 4, `el chofer tiene su ruta de hoy (${ruta.json.ruta?.paradas?.length} paradas)`)

  // Lo que se toca en una demo no se ve en la otra ni en una distribuidora real
  const nuevo = await req('POST', '/productos', { token: A, body: { nombre: 'Producto del visitante A', precio: 1, stock: 1 } })
  ok(nuevo.status === 201, 'el visitante puede crear cosas en su demo')
  const catB = await req('GET', '/productos', { slug: b.json.slug })
  ok(!catB.json.productos.some(p => p.nombre === 'Producto del visitante A'), 'la otra demo no lo ve')
  const catN = await req('GET', '/productos', { slug: 'norte' })
  ok(!catN.json.productos.some(p => p.nombre === 'Producto del visitante A'), 'la distribuidora real no lo ve')
  ok((await req('GET', '/pedidos', { token: A, slug: 'norte' })).status === 403, 'el token de la demo no sirve en una distribuidora real')

  // Sin archivos, sin aparecer en el panel de plataforma, slug reservado
  ok((await req('POST', `/uploads/producto/${nuevo.json.producto.id}`, { token: A })).status === 403, 'en la demo no se suben imágenes')
  const P = (await req('POST', '/plataforma/login', { body: { username: 'dueno', password: 'clave-plataforma-1' } })).json.token
  const lista = await req('GET', '/plataforma/distribuidoras', { token: P })
  ok(!lista.json.distribuidoras.some(d => d.esDemo) && lista.json.demosActivas >= 2, `las demos no se mezclan con los clientes del panel (${lista.json.demosActivas} activas)`)
  ok((await req('POST', '/plataforma/distribuidoras', { token: P, body: { slug: 'demo-falsa', nombre: 'x', superadmin: { username: 'a', password: '12345678' } } })).status === 400, 'nadie puede crear una distribuidora con slug demo-')

  // Vence y se borra
  const { PrismaClient } = require('@prisma/client')
  const db = new PrismaClient()
  await db.distribuidora.update({ where: { slug: S }, data: { demoVenceEn: new Date(Date.now() - 1000) } })
  await new Promise(r => setTimeout(r, 61000))   // la caché de distribuidoras dura 60 s
  ok((await req('GET', '/productos', { slug: S })).status === 410, 'demo vencida → 410 con aviso')
  const { limpiarDemosVencidas } = require('../lib/demo')
  const borradas = await limpiarDemosVencidas()
  ok(borradas >= 1 && !(await db.distribuidora.findUnique({ where: { slug: S } })), 'la limpieza la borra con todos sus datos')
  ok((await db.pedido.count({ where: { distribuidora: { slug: S } } })) === 0, 'sin pedidos huérfanos')
  ok((await req('GET', '/productos', { slug: b.json.slug })).status === 200, 'la otra demo sigue viva')
  await db.$disconnect()

  console.log(fallos ? `\n${fallos} FALLO(S)` : '\nTODO OK')
  process.exit(fallos ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
