// Pruebas de aislamiento entre distribuidoras (ver tests/README.md).
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
const login = async slug => (await req('POST', '/auth/login', { slug, body: { username: 'jefe', password: 'clave-segura-1' } })).json.token
;(async () => {
  const N = await login('norte'), S = await login('sur')
  const zona = [[-1.5, -78.1], [-1.5, -77.9], [-1.4, -77.9], [-1.4, -78.1]]
  // Norte: camión con zona y chofer; Sur: camión con la MISMA zona
  const camN = (await req('GET', '/camiones', { token: N })).json.camiones[0]
  const camS = (await req('GET', '/camiones', { token: S })).json.camiones[0]
  const locN = await req('POST', '/localidades', { token: N, body: { nombre: 'Centro', poligono: zona, camionId: camN.id } })
  ok(locN.status === 200, 'zona de norte')
  const locS = await req('POST', '/localidades', { token: S, body: { nombre: 'Centro', poligono: zona, camionId: camS.id } })
  ok(locS.status === 200, 'la misma zona en sur no choca con la de norte')
  const locX = await req('POST', '/localidades', { token: N, body: { nombre: 'X', poligono: zona, camionId: camS.id } })
  ok(locX.status === 404, 'zona de norte con camión de sur → 404')
  const condS = (await req('GET', '/conductores', { token: S })).json.conductores[0]
  await req('PATCH', `/camiones/${camS.id}/asignar`, { token: S, body: { conductorId: condS.id } })

  // Pedido en norte dentro de la zona → se autodespacha al chofer de norte, nunca al de sur
  const cliente = { nombre: 'Rosa', telefono: '0911', email: 'rosa@correo.com', lat: -1.45, lng: -78.0 }
  const p = await req('POST', '/pedidos', { slug: 'norte', body: { cliente, productos: [{ nombre: 'Bidón 20L', cantidad: 3 }], total: 6 } })
  await new Promise(r => setTimeout(r, 800))
  const kN = (await req('POST', '/conductores/login', { slug: 'norte', body: { username: 'pedro', password: 'clave1' } })).json.token
  const kS = (await req('POST', '/conductores/login', { slug: 'sur', body: { username: 'pedro', password: 'clave1' } })).json.token
  const rN = await req('GET', '/conductores/mi-ruta', { token: kN })
  const rS = await req('GET', '/conductores/mi-ruta', { token: kS })
  ok(rN.json.ruta?.paradas?.some(x => x.pedidoId === p.json.pedidoId), 'autodespacho: el pedido de norte cae al chofer de norte')
  ok(!rS.json.ruta?.paradas?.some(x => x.pedidoId === p.json.pedidoId), 'autodespacho: el chofer de sur no lo ve')

  // Fidelidad: norte tiene 5 sellos por premio; 3 bidones entregados → 3 sellos
  await req('PATCH', `/conductores/mi-ruta/pedidos/${p.json.pedidoId}`, { token: kN, body: { estado: 'entregado' } })
  await new Promise(r => setTimeout(r, 500))
  const clientes = (await req('GET', '/usuarios', { token: N })).json.usuarios
  const rosa = clientes.find(c => c.email === 'rosa@correo.com')
  const fid = await req('GET', `/fidelidad/cliente/${rosa.id}`, { token: kN })
  ok(fid.json.sellos === 3, `fidelidad suma sellos en norte (${fid.json.sellos})`)
  ok((await req('GET', `/fidelidad/cliente/${rosa.id}`, { token: kS })).status === 404 || (await req('GET', `/fidelidad/cliente/${rosa.id}`, { token: kS })).json.activo === false, 'chofer de sur no ve la tarjeta de un cliente de norte')
  const res = await req('GET', '/fidelidad/resumen', { token: N })
  ok(res.status === 200 && res.json.conTarjeta === 1, 'resumen de fidelidad de norte')

  // Solicitudes: un admin de norte pide un admin; el superadmin de sur no la ve ni la aprueba
  const sol = await req('POST', '/solicitudes', { token: N, body: { tipo: 'admin', targetNombre: 'Caja', targetUsername: 'caja', targetPassword: 'clave1' } })
  ok(sol.status === 200, 'solicitud en norte')
  const solS = await req('GET', '/superadmin/solicitudes', { token: S })
  ok(solS.json.solicitudes.length === 0, 'sur no ve solicitudes de norte')
  ok((await req('POST', `/superadmin/solicitudes/${sol.json.solicitud.id}/aprobar`, { token: S })).status === 404, 'sur no puede aprobar la de norte')
  ok((await req('POST', `/superadmin/solicitudes/${sol.json.solicitud.id}/aprobar`, { token: N })).status === 200, 'norte la aprueba')
  ok((await req('POST', '/auth/login', { slug: 'norte', body: { username: 'caja', password: 'clave1' } })).status === 200, 'el admin nuevo entra en norte')
  ok((await req('POST', '/auth/login', { slug: 'sur', body: { username: 'caja', password: 'clave1' } })).status === 401, 'y no en sur')
  const admS = await req('GET', '/superadmin/admins', { token: S })
  ok(admS.json.admins.length === 1, 'sur solo ve sus admins')

  // Notificaciones y reportes
  const notN = await req('GET', '/notificaciones', { token: N })
  ok(notN.status === 200 && notN.json.ultimoPedido?.id === p.json.pedidoId, 'notificaciones de norte')
  const repS = await req('GET', '/reportes', { token: S })
  ok(repS.json.resumen.totalPedidos === 1, `reportes de sur solo cuentan sus pedidos (${repS.json.resumen.totalPedidos})`)
  const csv = await fetch(B + '/reportes/csv', { headers: { Authorization: `Bearer ${S}` } }).then(r => r.text())
  ok(!csv.includes('rosa@correo.com'), 'CSV de sur sin clientes de norte')

  // Contacto
  await req('POST', '/contacto', { slug: 'sur', body: { nombre: 'X', email: 'x@x.com', mensaje: 'hola' } })
  ok((await req('GET', '/contacto', { token: N })).json.total === 0, 'mensajes de contacto separados')
  ok((await req('GET', '/contacto', { token: S })).json.total === 1, 'sur ve su mensaje')

  // SSE del chofer con token de otra distribuidora
  const sse = await fetch(`${B}/conductores/eventos?token=${kS}`, { headers: { 'X-Distribuidora': 'norte' } })
  ok(sse.status === 403, `SSE con token de sur en norte → 403 (${sse.status})`)

  console.log(fallos ? `\n${fallos} FALLO(S)` : '\nTODO OK')
  process.exit(fallos ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
