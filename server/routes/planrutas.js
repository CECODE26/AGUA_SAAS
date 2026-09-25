const express                           = require('express')
const { verifyToken }                   = require('../middleware/auth')
const prisma                            = require('../lib/prisma')
const { puntoDentroDePoligono, despacharPendientes } = require('../lib/autoDespacho')
const validarId = require('../lib/validarId')
const push      = require('../lib/push')

const router = express.Router()

// GET /api/planrutas?fecha=YYYY-MM-DD
router.get('/', verifyToken, async (req, res) => {
  const fecha = req.query.fecha
    ? new Date(req.query.fecha + 'T12:00:00Z')
    : (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d })()

  const rutas = await prisma.planRuta.findMany({
    where: {
      fecha: {
        gte: new Date(fecha.toISOString().split('T')[0] + 'T00:00:00Z'),
        lte: new Date(fecha.toISOString().split('T')[0] + 'T23:59:59Z'),
      },
    },
    include: {
      conductor: { select: { id: true, nombre: true } },
      items: {
        orderBy: { orden: 'asc' },
        include: {
          pedido: {
            include: { cliente: true, items: { include: { producto: true } } },
          },
        },
      },
    },
    orderBy: { id: 'asc' },
  })

  res.json({ rutas })
})

// POST /api/planrutas  — crear ruta
router.post('/', verifyToken, async (req, res) => {
  const { nombre, fecha, color, conductorId } = req.body
  if (!nombre || !fecha) return res.status(400).json({ message: 'nombre y fecha requeridos' })

  const ruta = await prisma.planRuta.create({
    data: {
      nombre,
      color:      color      ?? '#0d6efd',
      fecha:      new Date(fecha + 'T12:00:00Z'),
      conductorId: conductorId ? parseInt(conductorId) : null,
    },
    include: { items: true, conductor: { select: { id: true, nombre: true } } },
  })

  // Reintentar pedidos pendientes: los que llegaron antes de que existiera
  // esta ruta (p. ej. de madrugada) se asignan solos ahora
  if (ruta.conductorId) {
    despacharPendientes(`ruta "${nombre}" creada`).catch(e => console.error('Despacho pendientes:', e.message))
  }

  res.json({ ruta })
})

// PUT /api/planrutas/:id  — actualizar nombre/color/conductor/items
router.put('/:id', verifyToken, async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const { nombre, color, conductorId, items } = req.body

  const existe = await prisma.planRuta.findUnique({ where: { id } })
  if (!existe) return res.status(404).json({ message: 'Ruta no encontrada' })

  // Actualizar campos básicos
  const dataUpdate = {}
  if (nombre      !== undefined) dataUpdate.nombre      = nombre
  if (color       !== undefined) dataUpdate.color       = color
  if (conductorId !== undefined) dataUpdate.conductorId = conductorId ? parseInt(conductorId) : null
  if (Object.keys(dataUpdate).length > 0) {
    await prisma.planRuta.update({ where: { id }, data: dataUpdate })
  }

  // Si la ruta quedó con conductor asignado, reintentar los pedidos pendientes
  if (dataUpdate.conductorId) {
    despacharPendientes(`conductor asignado a la ruta #${id}`).catch(e => console.error('Despacho pendientes:', e.message))
  }

  // Reemplazar items si se envían
  if (Array.isArray(items)) {
    // Normalizar a enteros para evitar fallos de comparación string vs number
    const itemsInt = items.map(x => parseInt(x))

    // Obtener pedidos que estaban en la ruta antes de reemplazar
    const itemsAnteriores = await prisma.planRutaItem.findMany({ where: { rutaId: id } })
    const idsAnteriores   = itemsAnteriores.map(i => i.pedidoId)

    await prisma.planRutaItem.deleteMany({ where: { rutaId: id } })
    if (itemsInt.length > 0) {
      // Sacar estos pedidos de cualquier OTRA ruta para evitar duplicados
      await prisma.planRutaItem.deleteMany({
        where: { pedidoId: { in: itemsInt }, rutaId: { not: id } },
      })
      await prisma.planRutaItem.createMany({
        data: itemsInt.map((pedidoId, i) => ({ rutaId: id, pedidoId, orden: i })),
      })
    }

    // Marcar pedidos incluidos en la ruta como planificado
    if (itemsInt.length > 0) {
      await prisma.pedido.updateMany({
        where: { id: { in: itemsInt } },
        data:  { estado: 'planificado' },
      })
      // Avisar solo a los clientes cuyos pedidos son nuevos en esta ruta
      const nuevos = itemsInt.filter(pid => !idsAnteriores.includes(pid))
      if (nuevos.length > 0) push.notificarClientesPlanificados(nuevos)
    }

    // Resetear a pendiente los pedidos que fueron quitados de esta ruta
    // Solo si su estado es planificado (pueden estar en otra ruta)
    const idsQuitados = idsAnteriores.filter(pid => !itemsInt.includes(pid))
    if (idsQuitados.length > 0) {
      // Verificar que no estén en otra ruta antes de resetear
      const enOtraRuta = await prisma.planRutaItem.findMany({
        where: { pedidoId: { in: idsQuitados } },
        select: { pedidoId: true },
      })
      const enOtraRutaIds = new Set(enOtraRuta.map(i => i.pedidoId))
      const soloEnEstaRuta = idsQuitados.filter(pid => !enOtraRutaIds.has(pid))
      if (soloEnEstaRuta.length > 0) {
        await prisma.pedido.updateMany({
          where: { id: { in: soloEnEstaRuta }, estado: 'planificado' },
          data:  { estado: 'pendiente' },
        })
      }
    }
  }

  // Notificar al conductor si se asignaron pedidos
  const rutaActual = await prisma.planRuta.findUnique({ where: { id }, select: { conductorId: true } })
  if (Array.isArray(items) && items.length > 0 && rutaActual?.conductorId) {
    const aviso = push.msg.rutaConductor(items.length)
    push.notificarConductor(rutaActual.conductorId, aviso.title, aviso.body, { rutaId: id })
  }

  const ruta = await prisma.planRuta.findUnique({
    where: { id },
    include: {
      conductor: { select: { id: true, nombre: true } },
      items: {
        orderBy: { orden: 'asc' },
        include: { pedido: { include: { cliente: true, items: { include: { producto: true } } } } },
      },
    },
  })
  res.json({ ruta })
})

// DELETE /api/planrutas/:id
router.delete('/:id', verifyToken, async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })

  // Antes de borrar, obtener los pedidos de esta ruta para resetearlos a pendiente
  const itemsRuta = await prisma.planRutaItem.findMany({
    where: { rutaId: id },
    select: { pedidoId: true },
  })
  const pedidosEnRuta = itemsRuta.map(i => i.pedidoId)

  await prisma.planRuta.delete({ where: { id } }).catch(() => {})

  // Resetear a pendiente los pedidos de la ruta eliminada
  if (pedidosEnRuta.length > 0) {
    await prisma.pedido.updateMany({
      where: { id: { in: pedidosEnRuta }, estado: 'planificado' },
      data:  { estado: 'pendiente' },
    })
  }

  res.json({ success: true })
})

// POST /api/planrutas/asignar-por-zona
// Body: { fecha, guardar? }
// guardar=false (default) → preview sin persistir
// guardar=true            → asigna y guarda en BD
router.post('/asignar-por-zona', verifyToken, async (req, res) => {
  const { fecha, guardar = false } = req.body
  if (!fecha) return res.status(400).json({ message: 'fecha requerida' })

  const fechaObj    = new Date(fecha + 'T12:00:00Z')
  const fechaInicio = new Date(fecha + 'T00:00:00Z')
  const fechaFin    = new Date(fecha + 'T23:59:59Z')

  // 1. Pedidos pendientes con GPS (usar coordenadas del pedido, fallback al cliente)
  const pedidos = await prisma.pedido.findMany({
    where:   { estado: 'pendiente' },
    include: { cliente: true },
  })
  const conGPS = pedidos.filter(p => (p.latitud ?? p.cliente?.latitud) && (p.longitud ?? p.cliente?.longitud))
  if (conGPS.length === 0) {
    return res.status(422).json({ message: 'No hay pedidos pendientes con coordenadas GPS' })
  }

  // 2. Conductores activos con camión y al menos una localidad activa
  const conductores = await prisma.conductor.findMany({
    where:   { activo: true, camionId: { not: null } },
    include: {
      camion: { include: { localidades: { where: { activo: true } } } },
      rutas:  { where: { fecha: { gte: fechaInicio, lte: fechaFin } } },
    },
    orderBy: { id: 'asc' },
  })
  const conZona = conductores.filter(c => (c.camion?.localidades?.length ?? 0) > 0)

  // 3. Distribuir cada pedido a su zona
  const asignacion = {}   // conductorId → { conductor, pedidos[] }
  const sinZona    = []

  for (const pedido of conGPS) {
    const pLat = pedido.latitud ?? pedido.cliente.latitud
    const pLng = pedido.longitud ?? pedido.cliente.longitud
    let asignado = false
    for (const conductor of conZona) {
      const caeEnZona = conductor.camion.localidades.some(z => puntoDentroDePoligono(pLat, pLng, z.poligono))
      if (caeEnZona) {
        if (!asignacion[conductor.id]) asignacion[conductor.id] = { conductor, pedidos: [] }
        asignacion[conductor.id].pedidos.push(pedido)
        asignado = true
        break
      }
    }
    if (!asignado) sinZona.push(pedido)
  }

  // Preview sin guardar
  if (!guardar) {
    return res.json({
      preview:    true,
      conductores: Object.values(asignacion).map(({ conductor, pedidos }) => ({
        conductorId: conductor.id,
        nombre:      conductor.nombre,
        pedidos:     pedidos.map(p => ({ id: p.id, cliente: p.cliente.nombre })),
      })),
      sinZona: sinZona.map(p => ({ id: p.id, cliente: p.cliente.nombre })),
    })
  }

  // Guardar: crear/reutilizar rutas y asignar pedidos
  const COLORES = ['#0d6efd', '#dc3545', '#198754', '#fd7e14', '#6f42c1', '#0dcaf0', '#d63384', '#20c997']
  let colorIdx  = 0
  const resumen = []

  for (const { conductor, pedidos } of Object.values(asignacion)) {
    let ruta = conductor.rutas[0]
    if (!ruta) {
      ruta = await prisma.planRuta.create({
        data: {
          nombre:      `${conductor.nombre} – ${fecha}`,
          fecha:       fechaObj,
          color:       COLORES[colorIdx++ % COLORES.length],
          conductorId: conductor.id,
        },
      })
    }

    const itemsActuales = await prisma.planRutaItem.findMany({ where: { rutaId: ruta.id } })
    let maxOrden = itemsActuales.length > 0 ? Math.max(...itemsActuales.map(i => i.orden)) : -1

    for (const pedido of pedidos) {
      await prisma.planRutaItem.deleteMany({
        where: { pedidoId: pedido.id, rutaId: { not: ruta.id } },
      })
      maxOrden++
      await prisma.planRutaItem.upsert({
        where:  { rutaId_pedidoId: { rutaId: ruta.id, pedidoId: pedido.id } },
        create: { rutaId: ruta.id, pedidoId: pedido.id, orden: maxOrden },
        update: {},
      })
    }

    await prisma.pedido.updateMany({
      where: { id: { in: pedidos.map(p => p.id) } },
      data:  { estado: 'planificado' },
    })

    // Push: al chofer (cuántas paradas) y a cada cliente (va en camino)
    const avisoZona = push.msg.rutaConductor(pedidos.length)
    push.notificarConductor(conductor.id, avisoZona.title, avisoZona.body, { rutaId: ruta.id })
    push.notificarClientesPlanificados(pedidos.map(p => p.id))

    resumen.push({ conductorId: conductor.id, nombre: conductor.nombre, asignados: pedidos.length })
  }

  res.json({
    success:   true,
    asignados: conGPS.length - sinZona.length,
    sinZona:   sinZona.length,
    conductores: resumen,
  })
})

// ─── Utilidades para auto-generación ─────────────────────────────────────────

// Distancia Haversine en km entre dos puntos {lat, lng}
function haversine(a, b) {
  const R = 6371
  const toRad = x => x * Math.PI / 180
  const dLat  = toRad(b.lat - a.lat)
  const dLng  = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2
          + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

// Centroide de una lista de puntos {lat, lng}
function centroide(puntos) {
  if (puntos.length === 0) return { lat: -1.488252, lng: -78.015242 } // depósito
  return {
    lat: puntos.reduce((s, p) => s + p.lat, 0) / puntos.length,
    lng: puntos.reduce((s, p) => s + p.lng, 0) / puntos.length,
  }
}

// Ordena paradas por Nearest Neighbor desde el depósito
function ordenarParadas(paradas, deposito) {
  const restantes = [...paradas]
  const ordenadas = []
  let actual = deposito
  while (restantes.length > 0) {
    let mejorIdx  = 0
    let mejorDist = Infinity
    for (let i = 0; i < restantes.length; i++) {
      const d = haversine(actual, restantes[i].coords)
      if (d < mejorDist) { mejorDist = d; mejorIdx = i }
    }
    ordenadas.push(restantes[mejorIdx])
    actual = restantes[mejorIdx].coords
    restantes.splice(mejorIdx, 1)
  }
  return ordenadas
}

// POST /api/planrutas/auto-generar
// Body: { fecha, reemplazar? }
// - fecha: YYYY-MM-DD
// - reemplazar: true → elimina rutas existentes para esa fecha antes de crear
router.post('/auto-generar', verifyToken, async (req, res) => {
  const { fecha, reemplazar = false } = req.body
  if (!fecha) return res.status(400).json({ message: 'fecha requerida' })

  const DEPOSITO = { lat: -1.488252, lng: -78.015242 }
  const COLORES  = ['#0d6efd', '#dc3545', '#198754', '#fd7e14', '#6f42c1', '#0dcaf0', '#d63384', '#20c997']

  // 1. Conductores activos con camión
  const conductores = await prisma.conductor.findMany({
    where:   { activo: true, camionId: { not: null } },
    include: { camion: true },
    orderBy: { id: 'asc' },
  })
  if (conductores.length === 0) {
    return res.status(422).json({ message: 'No hay conductores activos con camión asignado' })
  }

  // 2. Pedidos pendientes con coordenadas GPS
  const pedidosRaw = await prisma.pedido.findMany({
    where:   { estado: 'pendiente' },
    include: { cliente: true },
  })
  const pedidosConGPS = pedidosRaw.filter(p => p.cliente.latitud && p.cliente.longitud)
    .map(p => ({
      id:     p.id,
      coords: { lat: p.cliente.latitud, lng: p.cliente.longitud },
    }))

  if (pedidosConGPS.length === 0) {
    return res.status(422).json({ message: 'No hay pedidos pendientes con ubicación GPS' })
  }

  // 3. Pedidos ya asignados a alguna ruta (para no duplicar)
  const fechaObj   = new Date(fecha + 'T12:00:00Z')
  const fechaInicio = new Date(fecha + 'T00:00:00Z')
  const fechaFin    = new Date(fecha + 'T23:59:59Z')

  const rutasExistentes = await prisma.planRuta.findMany({
    where: { fecha: { gte: fechaInicio, lte: fechaFin } },
    include: { items: true },
  })

  // Eliminar si se pidió reemplazar
  if (reemplazar && rutasExistentes.length > 0) {
    // Resetear a pendiente los pedidos de las rutas que se van a eliminar
    const pedidosDeRutasEliminadas = rutasExistentes.flatMap(r => r.items.map(i => i.pedidoId))
    if (pedidosDeRutasEliminadas.length > 0) {
      await prisma.pedido.updateMany({
        where: { id: { in: pedidosDeRutasEliminadas }, estado: 'planificado' },
        data:  { estado: 'pendiente' },
      })
    }
    await prisma.planRuta.deleteMany({
      where: { id: { in: rutasExistentes.map(r => r.id) } },
    })
  }

  const yaAsignados = reemplazar
    ? new Set()
    : new Set(rutasExistentes.flatMap(r => r.items.map(i => i.pedidoId)))

  const sinAsignar = pedidosConGPS.filter(p => !yaAsignados.has(p.id))

  if (sinAsignar.length === 0) {
    return res.status(422).json({ message: 'Todos los pedidos ya tienen ruta asignada para esta fecha' })
  }

  // 4. Clustering greedy: asignar cada pedido al conductor cuyo centroide esté más cerca
  const N       = conductores.length
  const clusters = conductores.map(() => [])

  for (const pedido of sinAsignar) {
    let mejorIdx  = 0
    let mejorDist = Infinity
    for (let i = 0; i < N; i++) {
      const c    = centroide(clusters[i].map(p => p.coords))
      const dist = haversine(c, pedido.coords)
      if (dist < mejorDist) { mejorDist = dist; mejorIdx = i }
    }
    clusters[mejorIdx].push(pedido)
  }

  // 5. Crear rutas en DB (solo clusters con al menos 1 pedido)
  const rutasCreadas = []
  for (let i = 0; i < N; i++) {
    if (clusters[i].length === 0) continue

    const conductor = conductores[i]
    const ordenadas = ordenarParadas(clusters[i], DEPOSITO)
    const color     = COLORES[i % COLORES.length]

    const ruta = await prisma.planRuta.create({
      data: {
        nombre:      `${conductor.nombre} – Auto`,
        fecha:       fechaObj,
        color,
        conductorId: conductor.id,
        items: {
          create: ordenadas.map((p, idx) => ({ pedidoId: p.id, orden: idx })),
        },
      },
      include: {
        conductor: { select: { id: true, nombre: true } },
        items: {
          orderBy: { orden: 'asc' },
          include: { pedido: { include: { cliente: true, items: { include: { producto: true } } } } },
        },
      },
    })
    rutasCreadas.push(ruta)

    // Marcar pedidos de este cluster como planificado
    const idsPedidosCluster = ordenadas.map(p => p.id)
    if (idsPedidosCluster.length > 0) {
      await prisma.pedido.updateMany({
        where: { id: { in: idsPedidosCluster } },
        data:  { estado: 'planificado' },
      })
      const avisoAuto = push.msg.rutaConductor(idsPedidosCluster.length)
      push.notificarConductor(conductor.id, avisoAuto.title, avisoAuto.body, { rutaId: ruta.id })
      push.notificarClientesPlanificados(idsPedidosCluster)
    }
  }

  res.json({
    success: true,
    rutasCreadas: rutasCreadas.length,
    pedidosAsignados: sinAsignar.length,
    rutas: rutasCreadas,
  })
})

module.exports = router
