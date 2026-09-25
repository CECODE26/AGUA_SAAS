// Pruebas de aislamiento entre distribuidoras (ver tests/README.md).
const B = process.env.API_URL || 'http://localhost:3001/api'
let fallos = 0
function ok(cond, msg) { console.log(`${cond ? '✔' : '✘'} ${msg}`); if (!cond) fallos++ }
async function req(method, path, { token, slug, host, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (slug) headers['X-Distribuidora'] = slug
  if (host) headers.Host = host
  const r = await fetch(B + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  let json = null; try { json = await r.json() } catch {}
  return { status: r.status, json }
}
;(async () => {
  // Plataforma
  const lp = await req('POST', '/plataforma/login', { body: { username: 'dueno', password: 'clave-plataforma-1' } })
  ok(lp.status === 200, 'login plataforma')
  const P = lp.json.token
  ok((await req('GET', '/plataforma/distribuidoras')).status === 401, 'plataforma sin token → 401')
  for (const [slug, nombre] of [['norte', 'Agua Norte'], ['sur', 'Agua Sur']]) {
    const r = await req('POST', '/plataforma/distribuidoras', { token: P, body: { slug, nombre, colorPrimario: '#112233', admin: { username: 'jefe', password: 'clave-segura-1' } } })
    ok(r.status === 201, `alta distribuidora ${slug} (mismo usuario "jefe" en ambas)`)
  }
  ok((await req('POST', '/plataforma/distribuidoras', { token: P, body: { slug: 'norte', nombre: 'x', admin: { username: 'a', password: '12345678' } } })).status === 409, 'slug repetido → 409')
  ok((await req('POST', '/plataforma/distribuidoras', { token: P, body: { slug: 'Mal Slug!', nombre: 'x', admin: { username: 'a', password: '12345678' } } })).status === 400, 'slug inválido → 400')

  // Marca pública por encabezado y por subdominio
  const pub = await req('GET', '/distribuidora', { slug: 'norte' })
  ok(pub.json?.distribuidora?.nombre === 'Agua Norte', 'marca pública por X-Distribuidora')
  ok((await req('GET', '/distribuidora', { slug: 'noexiste' })).status === 404, 'slug inexistente → 404')

  // Login del administrador de cada empresa (rol admin: ve solo su espacio)
  const ln = await req('POST', '/auth/login', { slug: 'norte', body: { username: 'jefe', password: 'clave-segura-1' } })
  const ls = await req('POST', '/auth/login', { slug: 'sur', body: { username: 'jefe', password: 'clave-segura-1' } })
  ok(ln.status === 200 && ls.status === 200 && ln.json.rol === 'admin', 'login del admin de cada empresa (rol admin)')
  const N = ln.json.token, S = ls.json.token
  ok((await req('GET', '/superadmin/admins', { token: N })).status === 403, 'el admin de la empresa no tiene funciones de superadmin')

  // Superadmin de Agua Elite: "Ingresar" al panel de una empresa
  const empresas = (await req('GET', '/plataforma/distribuidoras', { token: P })).json.distribuidoras
  const idN = empresas.find(e => e.slug === 'norte').id
  const ing = await req('POST', `/plataforma/distribuidoras/${idN}/ingresar`, { token: P })
  ok(ing.status === 200 && ing.json.slug === 'norte', 'el superadmin ingresa al panel de norte')
  const NS = ing.json.token
  ok((await req('GET', '/superadmin/admins', { token: NS })).status === 200, 'dentro de la empresa tiene funciones de superadmin')
  ok((await req('GET', '/pedidos', { token: NS, slug: 'sur' })).status === 403, 'la sesión de soporte de norte no sirve en sur')

  // Token de una distribuidora no sirve en otra
  const cruz = await req('GET', '/pedidos', { token: N, slug: 'sur' })
  ok(cruz.status === 403, `token de norte en sur → 403 (${cruz.status})`)
  ok((await req('GET', '/pedidos', { token: N })).status === 200, 'token sin encabezado usa su distribuidora')

  // Productos con el mismo nombre en cada una
  const pn = await req('POST', '/productos', { token: N, body: { nombre: 'Bidón 20L', precio: 2, stock: 10 } })
  const ps = await req('POST', '/productos', { token: S, body: { nombre: 'Bidón 20L', precio: 3, stock: 10 } })
  ok(pn.status === 201 && ps.status === 201, 'mismo producto en dos distribuidoras')
  const listaN = await req('GET', '/productos', { slug: 'norte' })
  ok(listaN.json.productos.length === 1 && listaN.json.productos[0].precio === 2, 'norte solo ve su catálogo')

  // Editar producto ajeno
  const ed = await req('PUT', `/productos/${ps.json.producto.id}`, { token: N, body: { precio: 99 } })
  ok(ed.status === 404, `editar producto de sur desde norte → 404 (${ed.status})`)
  const tg = await req('PATCH', `/productos/${ps.json.producto.id}/toggle`, { token: N })
  ok(tg.status === 404, 'toggle producto ajeno → 404')

  // Pedido público en cada una
  const cliente = { nombre: 'Ana', telefono: '0999999999', email: 'ana@correo.com', lat: -1.49, lng: -78.0 }
  const pedN = await req('POST', '/pedidos', { slug: 'norte', body: { cliente, productos: [{ nombre: 'Bidón 20L', cantidad: 2 }], total: 4 } })
  const pedS = await req('POST', '/pedidos', { slug: 'sur', body: { cliente, productos: [{ nombre: 'Bidón 20L', cantidad: 1 }], total: 3 } })
  ok(pedN.status === 200 && pedS.status === 200, 'pedido del mismo cliente en dos distribuidoras')
  const pedidosN = await req('GET', '/pedidos', { token: N })
  ok(pedidosN.json.pedidos.length === 1 && pedidosN.json.pedidos[0].total === 4, 'norte solo ve su pedido')
  ok((await req('PATCH', `/pedidos/${pedS.json.pedidoId}/estado`, { token: N, body: { estado: 'entregado' } })).status === 404, 'cambiar estado de pedido ajeno → 404')
  const hist = await req('GET', `/pedidos/cliente/${encodeURIComponent('ana@correo.com')}`, { slug: 'sur' })
  ok(hist.json.pedidos.length === 1 && hist.json.pedidos[0].total === 3, 'historial del cliente solo de sur')
  const prodS = await req('GET', '/productos?all=true', { slug: 'sur' })
  ok(prodS.json.productos[0].stock === 9, 'stock descontado solo en sur')

  // Cliente de la app: registro, y su token no abre el panel
  const reg = await req('POST', '/clientes/auth/registro', { slug: 'norte', body: { nombre: 'Luis', cedula: '1', direccion: 'Calle', telefono: '0988888888', referencia: 'x', email: 'luis@correo.com', password: 'Clave#123' } })
  ok(reg.status === 201, 'registro de cliente')
  const C = reg.json.token
  ok((await req('GET', '/pedidos', { token: C })).status === 403, 'token de cliente NO abre el panel admin (antes sí)')
  ok((await req('GET', '/clientes/auth/perfil', { token: C, slug: 'norte' })).status === 200, 'perfil del cliente en su distribuidora')
  ok((await req('GET', '/clientes/auth/perfil', { token: C, slug: 'sur' })).status === 403, 'token de cliente en otra distribuidora → 403')
  ok((await req('POST', '/clientes/auth/login', { slug: 'sur', body: { email: 'luis@correo.com', password: 'Clave#123' } })).status === 404, 'la cuenta de norte no existe en sur')

  // Camiones y conductores: misma placa y mismo usuario en cada una
  const cn = await req('POST', '/camiones', { token: N, body: { placa: 'abc123', marca: 'Hino' } })
  const cs = await req('POST', '/camiones', { token: S, body: { placa: 'ABC123', marca: 'Isuzu' } })
  ok(cn.status === 200 && cs.status === 200, 'misma placa en dos distribuidoras')
  const condN = await req('POST', '/conductores', { token: N, body: { nombre: 'Pedro', username: 'pedro', password: 'clave1', camionId: cs.json.camion.id } })
  ok(condN.status === 404, `conductor de norte con camión de sur → 404 (${condN.status})`)
  const condN2 = await req('POST', '/conductores', { token: N, body: { nombre: 'Pedro', username: 'pedro', password: 'clave1', camionId: cn.json.camion.id } })
  const condS = await req('POST', '/conductores', { token: S, body: { nombre: 'Pedro', username: 'pedro', password: 'clave1' } })
  ok(condN2.status === 200 && condS.status === 200, 'mismo usuario de chofer en dos distribuidoras')
  const lc = await req('POST', '/conductores/login', { slug: 'norte', body: { username: 'pedro', password: 'clave1' } })
  ok(lc.status === 200, 'login de chofer')
  const K = lc.json.token
  ok((await req('GET', '/pedidos', { token: K })).status === 403, 'token de chofer NO abre el panel admin (antes sí)')
  const miRuta = await req('GET', '/conductores/mi-ruta', { token: K })
  ok(miRuta.status === 200, `chofer ve su ruta (${miRuta.status})`)
  ok(miRuta.json?.ruta === null, 'sin zonas ni ruta libre el pedido queda pendiente (no se autodespacha)')

  // Ruta con pedido ajeno
  const hoy = new Date().toISOString().split('T')[0]
  const ruta = await req('POST', '/planrutas', { token: N, body: { nombre: 'R1', fecha: hoy, conductorId: condS.json.conductor.id } })
  ok(ruta.status === 404, `ruta de norte con chofer de sur → 404 (${ruta.status})`)
  const ruta2 = await req('POST', '/planrutas', { token: N, body: { nombre: 'R1', fecha: hoy, conductorId: condN2.json.conductor.id } })
  ok(ruta2.status === 200, 'ruta de norte con su chofer')
  const put = await req('PUT', `/planrutas/${ruta2.json.ruta.id}`, { token: N, body: { items: [pedS.json.pedidoId] } })
  ok(put.status === 404, `meter pedido de sur en ruta de norte → 404 (${put.status})`)
  const put2 = await req('PUT', `/planrutas/${ruta2.json.ruta.id}`, { token: N, body: { items: [pedN.json.pedidoId] } })
  ok(put2.status === 200, 'meter pedido propio en la ruta')
  const miRuta2 = await req('GET', '/conductores/mi-ruta', { token: K })
  ok(miRuta2.json?.ruta?.paradas?.some(p => p.pedidoId === pedN.json.pedidoId), 'el chofer ve el pedido en su ruta')
  ok((await req('PATCH', `/conductores/mi-ruta/pedidos/${pedN.json.pedidoId}`, { token: K, body: { estado: 'entregado' } })).status === 200, 'chofer marca entregado')

  // Venta exprés
  const vr = await req('POST', '/conductores/venta-rapida', { token: K, body: { nombre: 'Vecino', telefono: '0977', productos: [{ nombre: 'Bidón 20L', cantidad: 1 }] } })
  ok(vr.status === 200, 'venta exprés')

  // Fidelidad: config por distribuidora
  const fcfg = await req('PUT', '/fidelidad/config', { token: NS, body: { activo: true, productoPremioId: ps.json.producto.id } })
  ok(fcfg.status === 400, `premio con producto de otra distribuidora → 400 (${fcfg.status})`)
  const fcfg2 = await req('PUT', '/fidelidad/config', { token: NS, body: { activo: true, productoPremioId: pn.json.producto.id, sellosParaPremio: 5 } })
  ok(fcfg2.status === 200, 'fidelidad activada en norte')
  const fs = await req('GET', '/fidelidad/config', { token: S })
  ok(fs.json.config.activo === false, 'sur sigue con fidelidad apagada')

  // Contenido y ajustes por distribuidora
  ok((await req('PUT', '/contenido', { token: NS, body: { hero: 'Hola norte' } })).status === 200, 'contenido guardado')
  const contS = await req('GET', '/contenido', { slug: 'sur' })
  ok(JSON.stringify(contS.json) === '{}', 'sur no ve el contenido de norte')
  const aj = await req('PUT', '/distribuidora/ajustes', { token: NS, body: { nombre: 'Agua Norte S.A.', whatsapp: '0999' } })
  ok(aj.status === 200 && aj.json.distribuidora.nombre === 'Agua Norte S.A.', 'el superadmin (soporte) cambia la marca de norte')

  // Suspender
  ok((await req('PATCH', `/plataforma/distribuidoras/1`, { token: P, body: { activo: false } })).status === 200, 'plataforma suspende norte')
  ok((await req('GET', '/productos', { slug: 'norte' })).status === 403, 'norte suspendida → 403')
  ok((await req('GET', '/pedidos', { token: N })).status === 403, 'panel de norte suspendido → 403')
  ok((await req('GET', '/productos', { slug: 'sur' })).status === 200, 'sur sigue funcionando')
  await req('PATCH', `/plataforma/distribuidoras/1`, { token: P, body: { activo: true } })
  const lista = await req('GET', '/plataforma/distribuidoras', { token: P })
  ok(lista.json.distribuidoras.length === 2 && lista.json.distribuidoras[0]._count.pedidos >= 1, 'plataforma lista empresas con conteos')

  // Errores ya no tumban el servidor
  ok((await req('PUT', '/conductores/999999', { token: N, body: { nombre: 'x' } })).status === 404, 'update de id inexistente → 404 sin caerse')
  ok((await req('GET', '/pedidos', { token: N })).status === 200, 'servidor sigue vivo')

  // Registro de lo que hizo el superadmin dentro de norte
  const regSoporte = await req('GET', `/plataforma/distribuidoras/${idN}/registro`, { token: P })
  ok(regSoporte.status === 200 && regSoporte.json.registro.some(r => r.metodo === 'PUT' && r.ruta.includes('/distribuidora/ajustes')) && regSoporte.json.registro.some(r => r.metodo === 'INGRESO'),
    `queda registro del ingreso y de los cambios (${regSoporte.json.registro?.length})`)

  // Revendedores: activan empresas y ven solo las suyas; el ingreso se separa por quién vendió
  const rv = await req('POST', '/plataforma/revendedores', { token: P, body: { nombre: 'Pablo Ventas', username: 'pablo', password: 'clave-revende-1' } })
  ok(rv.status === 201, 'superadmin crea un revendedor')
  const R = (await req('POST', '/plataforma/login', { body: { username: 'pablo', password: 'clave-revende-1' } })).json.token
  const er = await req('POST', '/plataforma/distribuidoras', { token: R, body: { slug: 'este', nombre: 'Agua Este', precioMensual: 40, admin: { username: 'jefe', password: 'clave-segura-1' } } })
  ok(er.status === 201, 'el revendedor activa una empresa')
  await req('PATCH', `/plataforma/distribuidoras/${idN}`, { token: P, body: { precioMensual: 50 } })
  const listaR = await req('GET', '/plataforma/distribuidoras', { token: R })
  ok(listaR.json.distribuidoras.length === 1 && listaR.json.distribuidoras[0].slug === 'este', 'el revendedor solo ve las empresas que activó')
  ok((await req('GET', `/plataforma/distribuidoras/${idN}`, { token: R })).status === 404, 'el revendedor no ve empresas ajenas')
  ok((await req('POST', `/plataforma/distribuidoras/${er.json.distribuidora.id}/ingresar`, { token: R })).status === 403, 'el revendedor no puede ingresar a paneles')
  ok((await req('GET', '/plataforma/revendedores', { token: R })).status === 403, 'el revendedor no ve a los demás revendedores')
  const susp = await req('PATCH', `/plataforma/distribuidoras/${er.json.distribuidora.id}`, { token: R, body: { activo: false, precioMensual: 1 } })
  const este = (await req('GET', '/plataforma/distribuidoras', { token: P })).json.distribuidoras.find(e => e.slug === 'este')
  ok(susp.status === 200 && este.activo === true && este.precioMensual === 40, 'el revendedor no puede suspender ni cambiar el precio')
  const resumen = (await req('GET', '/plataforma/distribuidoras', { token: P })).json.resumen
  ok(resumen.ingresoMensual === 90 && resumen.directo.ingresoMensual === 50 && resumen.porRevendedor[0]?.nombre === 'Pablo Ventas' && resumen.porRevendedor[0].ingresoMensual === 40,
    `ingreso separado: directo vs revendedor (${JSON.stringify(resumen)})`)

  console.log(fallos ? `\n${fallos} FALLO(S)` : '\nTODO OK')
  process.exit(fallos ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
