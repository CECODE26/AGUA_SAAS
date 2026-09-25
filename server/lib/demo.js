// Demo instantánea de la landing de Agua Elite.
//
// Cada visitante que toca "Probar la demo" recibe su PROPIA distribuidora de prueba,
// cargada con datos de ejemplo (productos, camiones, zonas, choferes, clientes, pedidos,
// fidelidad). Puede tocar todo: como el filtro por distribuidora separa los datos, lo que
// haga no lo ve nadie más. No manda correos ni avisos push (ver mailer.js y push.js) y se
// borra sola a las DEMO_HORAS horas.
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const prisma = require('./prisma')
const { conDistribuidora, comoPlataforma } = require('./tenant')
const distribuidoras = require('./distribuidoras')

const DEMO_HORAS = Number(process.env.DEMO_HORAS) || 2
const DEMO_MAX_ACTIVAS = Number(process.env.DEMO_MAX_ACTIVAS) || 300

// Puyo, Pastaza: la ciudad de la demo. Polígonos en [lat, lng] como los dibuja el panel.
const CENTRO = { lat: -1.4924, lng: -77.9991 }
const ZONAS = {
  centro: [[-1.480, -78.010], [-1.480, -77.990], [-1.500, -77.990], [-1.500, -78.010]],
  norte:  [[-1.458, -78.012], [-1.458, -77.986], [-1.4795, -77.986], [-1.4795, -78.012]],
  sur:    [[-1.5005, -78.012], [-1.5005, -77.988], [-1.522, -77.988], [-1.522, -78.012]],
}

const CLIENTES = [
  { nombre: 'María Fernanda López', sector: 'Barrio Obrero',  lat: -1.4861, lng: -78.0032, sellos: 7 },
  { nombre: 'Carlos Villacís',      sector: 'El Dorado',      lat: -1.4702, lng: -77.9954, sellos: 3 },
  { nombre: 'Lucía Andrade',        sector: 'Centro',         lat: -1.4930, lng: -77.9978, sellos: 9, premios: 1 },
  { nombre: 'Jorge Cedeño',         sector: 'Cumandá',        lat: -1.4658, lng: -78.0061, sellos: 1 },
  { nombre: 'Rosa Guamán',          sector: 'La Merced',      lat: -1.4958, lng: -78.0045, sellos: 4, fijo: true },
  { nombre: 'Diego Paredes',        sector: 'Los Ángeles',    lat: -1.5086, lng: -77.9960, sellos: 2 },
  { nombre: 'Andrea Salazar',       sector: 'Mariscal',       lat: -1.4889, lng: -77.9925, sellos: 5, fijo: true },
  { nombre: 'Pedro Yánez',          sector: 'Obrero Alto',    lat: -1.5142, lng: -78.0071, sellos: 0 },
]

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const aleatorio = n => crypto.randomBytes(n).toString('base64url').replace(/[-_]/g, '').toLowerCase()
const diaISO = (offset = 0) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().split('T')[0] }
const aLas = (offset, hora) => new Date(`${diaISO(offset)}T${String(hora).padStart(2, '0')}:${String(10 + (hora * 7) % 50).padStart(2, '0')}:00Z`)
const correoDe = nombre => `${nombre.split(' ')[0].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()}@example.com`

class ErrorDemo extends Error {
  constructor(message, status = 503) { super(message); this.status = status; this.codigo = 'DEMO_NO_DISPONIBLE' }
}

// ── Crear ─────────────────────────────────────────────────────────────────────
async function crearDemo() {
  const activas = await comoPlataforma(() => prisma.distribuidora.count({ where: { esDemo: true, demoVenceEn: { gt: new Date() } } }))
  if (activas >= DEMO_MAX_ACTIVAS) throw new ErrorDemo('Hay muchas demos abiertas en este momento. Intenta de nuevo en unos minutos.')

  const clave = `demo${crypto.randomInt(1000, 9999)}`
  // El visitante entra como administrador del negocio (rol admin): ve solo el espacio de su
  // distribuidora. El nivel superadmin es del dueño de Agua Elite y no existe en las demos.
  const accesos = { panel: { usuario: 'negocio', clave }, chofer: { usuario: 'kevin', clave } }
  const d = await comoPlataforma(() => prisma.distribuidora.create({
    data: {
      slug: `demo-${aleatorio(8).slice(0, 8)}`,
      nombre: 'Agua Demo',
      colorPrimario: '#2A62D8',
      ciudad: 'Puyo',
      provincia: 'Pastaza',
      depositoLat: CENTRO.lat,
      depositoLng: CENTRO.lng,
      esDemo: true,
      demoVenceEn: new Date(Date.now() + DEMO_HORAS * 3600 * 1000),
      demoAccesos: accesos,
      contenido: {
        nosotros: { principal: {
          texto: 'Agua Demo es una distribuidora de ejemplo para que conozcas Agua Elite por dentro.\n\n' +
                 'Todo lo que ves (clientes, pedidos, rutas y choferes) es inventado y se borra solo. ' +
                 'Cámbialo, crea pedidos o arma rutas: nadie más ve lo que hagas aquí.',
        } },
      },
    },
  }))

  try {
    await conDistribuidora(d, () => cargarDatos(d, clave))
  } catch (e) {
    await borrarDistribuidora(d.id).catch(() => {})
    throw e
  }
  return { distribuidora: d, accesos }
}

async function cargarDatos(d, clave) {
  const hash = await bcrypt.hash(clave, 10)

  // Equipo
  const negocio = await prisma.admin.create({ data: { username: 'negocio', passwordHash: hash, rol: 'admin' } })
  await prisma.maestroClientes.create({ data: { nombre: 'Maestro de clientes', username: 'maestro', passwordHash: hash } })

  // Catálogo
  const recarga = await prisma.producto.create({ data: { nombre: 'Recarga 20L', descripcion: 'Cambiamos tu bidón vacío por uno lleno.', precio: 1.5, stock: 180, tag: 'Más popular', orden: 0 } })
  const bidon   = await prisma.producto.create({ data: { nombre: 'Bidón 20L con envase', descripcion: 'Bidón nuevo con agua, para empezar.', precio: 6.5, stock: 40, orden: 1 } })
  const botella = await prisma.producto.create({ data: { nombre: 'Botella 1L', descripcion: 'Para el día a día.', precio: 0.6, stock: 300, orden: 2 } })
  const pack    = await prisma.producto.create({ data: { nombre: 'Pack x12 · 500 ml', descripcion: 'Para reuniones y eventos.', precio: 4.5, stock: 60, tag: 'Mejor valor', orden: 3 } })
  const productos = [recarga, bidon, botella, pack]

  await prisma.configFidelidad.create({
    data: { activo: true, sellosParaPremio: 10, tipoPremio: 'producto', productoPremioId: recarga.id, productosQueSuman: [recarga.id, bidon.id] },
  })

  // Flota: Kevin reparte Centro y Norte; Carlos, Sur y lo que caiga fuera de zona
  const camion1 = await prisma.camion.create({ data: { placa: 'PAA-1024', marca: 'Hino', modelo: 'Dutro', color: 'Blanco', anio: 2021 } })
  const camion2 = await prisma.camion.create({ data: { placa: 'PBB-2048', marca: 'Isuzu', modelo: 'NPR', color: 'Azul', anio: 2019, rutaLibre: true } })
  await prisma.localidad.createMany({ data: [
    { nombre: 'Centro', poligono: ZONAS.centro, color: '#2A62D8', camionId: camion1.id },
    { nombre: 'Norte',  poligono: ZONAS.norte,  color: '#0DCAF0', camionId: camion1.id },
    { nombre: 'Sur',    poligono: ZONAS.sur,    color: '#F2B872', camionId: camion2.id },
  ] })
  const kevin  = await prisma.conductor.create({ data: { nombre: 'Kevin Tapia', username: 'kevin', passwordHash: hash, activo: true, camionId: camion1.id, ubicacionLat: -1.4889, ubicacionLng: -78.0012, ubicacionAt: new Date() } })
  const carlos = await prisma.conductor.create({ data: { nombre: 'Carlos Mena', username: 'carlos', passwordHash: hash, activo: true, camionId: camion2.id, ubicacionLat: -1.5071, ubicacionLng: -77.9990, ubicacionAt: new Date() } })
  await prisma.historialConductorCamion.createMany({ data: [
    { camionId: camion1.id, conductorId: kevin.id, conductorNombre: kevin.nombre, asignadoEn: aLas(-60, 9) },
    { camionId: camion2.id, conductorId: carlos.id, conductorNombre: carlos.nombre, asignadoEn: aLas(-45, 9) },
  ] })

  // Clientes
  const hoyDia = DIAS[new Date().getDay()]
  const clientes = []
  for (const [i, c] of CLIENTES.entries()) {
    clientes.push(await prisma.cliente.create({
      data: {
        email: correoDe(c.nombre), nombre: c.nombre, telefono: `09900000${String(i + 10)}`,
        callePrincipal: 'Calle de ejemplo', numeracion: String(100 + i * 17), sector: c.sector,
        ciudad: 'Puyo', provincia: 'Pastaza', latitud: c.lat, longitud: c.lng,
        sellos: c.sellos, premiosDisponibles: c.premios || 0,
        ...(c.fijo ? {
          esFijo: true, fijoDesde: aLas(-20, 10),
          visitasHorario: [{ dia: hoyDia, hora: i % 2 ? '10:00' : '15:30' }, { dia: DIAS[(new Date().getDay() + 3) % 7], hora: '09:00' }],
          productosDefault: [{ productoId: recarga.id, nombre: recarga.nombre, cantidad: 2 }],
        } : {}),
      },
    }))
  }

  const crearPedido = async ({ cliente, lineas, estado, creadoEn, origen = 'web', conductorId = null }) => {
    const total = lineas.reduce((s, [p, n]) => s + p.precio * n, 0)
    return prisma.pedido.create({
      data: {
        clienteId: cliente.id, estado, origen, conductorId, creadoEn, total: +total.toFixed(2),
        latitud: cliente.latitud, longitud: cliente.longitud,
        items: { create: lineas.map(([p, n]) => ({ productoId: p.id, cantidad: n, precioUnitario: p.precio })) },
      },
    })
  }

  // Historial de dos semanas (para reportes y la tarjeta de fidelidad)
  for (let dia = -13; dia <= -1; dia++) {
    const cuantos = 2 + ((dia * -7) % 3)
    for (let k = 0; k < cuantos; k++) {
      const cliente = clientes[(dia * -3 + k) % clientes.length]
      const p = await crearPedido({
        cliente, estado: 'entregado', creadoEn: aLas(dia, 9 + k * 2),
        lineas: [[recarga, 1 + ((k + dia * -1) % 3)], ...(k === 1 ? [[botella, 6]] : [])],
      })
      if (cliente.sellos > 0 && k === 0) {
        await prisma.movimientoFidelidad.create({ data: { clienteId: cliente.id, tipo: 'gana', sellos: 1, pedidoId: p.id, origen: 'app', creadoEn: aLas(dia, 18) } })
      }
    }
  }

  // Hoy: ruta de Kevin con una entrega hecha y tres en camino
  const hoy = [
    await crearPedido({ cliente: clientes[0], lineas: [[recarga, 2]], estado: 'entregado', creadoEn: aLas(0, 7) }),
    await crearPedido({ cliente: clientes[1], lineas: [[bidon, 1]], estado: 'planificado', creadoEn: aLas(0, 8) }),
    await crearPedido({ cliente: clientes[2], lineas: [[recarga, 3]], estado: 'planificado', creadoEn: aLas(0, 8) }),
    await crearPedido({ cliente: clientes[3], lineas: [[recarga, 1], [pack, 1]], estado: 'planificado', creadoEn: aLas(0, 9) }),
  ]
  await prisma.planRuta.create({
    data: {
      nombre: 'Ruta Kevin', fecha: new Date(`${diaISO(0)}T12:00:00Z`), color: '#2A62D8', conductorId: kevin.id,
      items: { create: hoy.map((p, i) => ({ pedidoId: p.id, orden: i + 1 })) },
    },
  })
  // Pendientes para planificar a mano
  await crearPedido({ cliente: clientes[5], lineas: [[recarga, 2]], estado: 'pendiente', creadoEn: aLas(0, 10) })
  await crearPedido({ cliente: clientes[7], lineas: [[bidon, 1], [recarga, 1]], estado: 'pendiente', creadoEn: aLas(0, 11) })
  // Ventas exprés de Carlos
  await crearPedido({ cliente: clientes[6], lineas: [[recarga, 1]], estado: 'entregado', origen: 'express', conductorId: carlos.id, creadoEn: aLas(0, 9) })
  await crearPedido({ cliente: clientes[4], lineas: [[recarga, 2]], estado: 'entregado', origen: 'express', conductorId: carlos.id, creadoEn: aLas(-1, 16) })

  // Bandeja del dueño
  await prisma.contacto.createMany({ data: [
    { nombre: 'Colegio San José', email: 'compras@example.com', telefono: '0990000099', mensaje: '¿Hacen entregas semanales de 30 bidones? Queremos una cotización.', creadoEn: aLas(0, 8) },
    { nombre: 'Andrea Salazar', email: 'andrea@example.com', mensaje: 'Gracias por la entrega de ayer, muy puntuales.', leido: true, creadoEn: aLas(-2, 17) },
  ] })
  await prisma.solicitudActivacion.create({
    data: { tipo: 'admin', targetNombre: 'Ana Cajas', targetUsername: 'ana', targetPasswordHash: hash, solicitadoPor: 'negocio' },
  })

  return { negocio }
}

// ── Borrar (en orden: algunas relaciones no se borran en cascada) ────────────
async function borrarDistribuidora(id) {
  const db = prisma.sinFiltro
  const porD = { distribuidoraId: id }
  await db.$transaction([
    db.planRutaItem.deleteMany({ where: { ruta: porD } }),
    db.planRutaItem.deleteMany({ where: { pedido: porD } }),
    db.movimientoFidelidad.deleteMany({ where: porD }),
    db.visitaClienteFijo.deleteMany({ where: porD }),
    db.pedidoItem.deleteMany({ where: { pedido: porD } }),
    db.planRuta.deleteMany({ where: porD }),
    db.pedido.deleteMany({ where: porD }),
    db.distribuidora.delete({ where: { id } }),
  ])
  distribuidoras.invalidar()
}

async function limpiarDemosVencidas() {
  const vencidas = await prisma.sinFiltro.distribuidora.findMany({
    where: { esDemo: true, demoVenceEn: { lt: new Date() } },
    select: { id: true, slug: true },
  })
  for (const d of vencidas) {
    try { await borrarDistribuidora(d.id) } catch (e) { console.error(`[DEMO] no se pudo borrar ${d.slug}:`, e.message) }
  }
  if (vencidas.length) console.log(`[DEMO] ${vencidas.length} demo(s) vencida(s) borrada(s)`)
  return vencidas.length
}

function programarLimpieza() {
  const correr = () => limpiarDemosVencidas().catch(e => console.error('[DEMO] limpieza:', e.message))
  correr()
  setInterval(correr, 10 * 60 * 1000).unref()
}

module.exports = { crearDemo, borrarDistribuidora, limpiarDemosVencidas, programarLimpieza, DEMO_HORAS }
