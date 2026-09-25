const https  = require('https')
const prisma  = require('./prisma')
const push    = require('./push')

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN

// ─── Utilidades geométricas ──────────────────────────────────────────────────

// Distancia en metros entre dos puntos (fallback sin Mapbox)
function haversine(lat1, lng1, lat2, lng2) {
  const R  = 6371000
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lng2 - lng1) * Math.PI / 180
  const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Ray-casting: determina si el punto (lat, lng) está dentro del polígono.
 *
 * El polígono se almacena en Camion.poligono como JSON ya parseado por Prisma.
 * Acepta dos formatos GeoJSON:
 *   - Array plano de pares:  [[lng, lat], [lng, lat], ...]
 *   - Objeto GeoJSON Feature/Polygon con coordinates anidadas
 *
 * Internamente trabaja con [lng, lat] igual que GeoJSON.
 */
function puntoDentroDePoligono(lat, lng, poligono) {
  if (!poligono) return false

  // Extraer el array de coordenadas según el formato recibido
  let anillo
  // Todos los formatos se normalizan a [[lat, lng], ...] (igual que Leaflet)
  if (Array.isArray(poligono)) {
    anillo = poligono
  } else if (poligono.type === 'Polygon' && Array.isArray(poligono.coordinates?.[0])) {
    // GeoJSON usa [lng, lat] → invertir a [lat, lng]
    anillo = poligono.coordinates[0].map(([lng, lat]) => [lat, lng])
  } else if (poligono.type === 'Feature' && poligono.geometry?.type === 'Polygon') {
    anillo = poligono.geometry.coordinates[0].map(([lng, lat]) => [lat, lng])
  } else {
    return false
  }

  if (anillo.length < 3) return false

  // Polígono guardado como [[lat, lng], ...] (convención Leaflet)
  // Ray-casting: y = lat, x = lng
  let inside = false

  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const yi = anillo[i][0], xi = anillo[i][1]   // [lat, lng]
    const yj = anillo[j][0], xj = anillo[j][1]
    const intersecta = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)
    if (intersecta) inside = !inside
  }

  return inside
}

// ─── Mapbox Matrix API ───────────────────────────────────────────────────────

// Llama a Mapbox Matrix API y devuelve array de tiempos (segundos)
// tiempos[i] = tiempo desde conductores[i] hasta destino
function matrixMapbox(destLng, destLat, conductores) {
  const coords = [
    `${destLng},${destLat}`,
    ...conductores.map(c => `${c.ubicacionLng},${c.ubicacionLat}`),
  ].join(';')

  const srcIndices = conductores.map((_, i) => i + 1).join(';')
  const url = `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coords}` +
    `?sources=${srcIndices}&destinations=0&annotations=duration&access_token=${MAPBOX_TOKEN}`

  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.code !== 'Ok') return reject(new Error(json.message || 'Mapbox error'))
          // durations[i][0] = tiempo de conductores[i] al destino
          resolve(json.durations.map(row => row[0]))
        } catch (e) { reject(e) }
      })
    }).on('error', reject)
  })
}

// ─── Auto-despacho principal ─────────────────────────────────────────────────

async function autoDespachar(pedido) {
  // Usar coordenadas del pedido (específicas de esta entrega), fallback al cliente
  const pedidoLat = pedido.latitud ?? pedido.cliente?.latitud
  const pedidoLng = pedido.longitud ?? pedido.cliente?.longitud
  if (!pedidoLat || !pedidoLng) {
    console.log('⚠️  Auto-despacho omitido: pedido sin coordenadas GPS')
    return null
  }

  const ahora  = new Date()
  const hoy    = ahora.toISOString().split('T')[0]
  const inicio = new Date(hoy + 'T00:00:00Z')
  const fin    = new Date(hoy + 'T23:59:59Z')

  // Buscar TODOS los conductores activos con camión (tengan o no ruta hoy).
  // El reparto es desatendido: si el chofer aún no tiene ruta del día, se le
  // crea al vuelo cuando le cae un pedido en su zona.
  const conductores = await prisma.conductor.findMany({
    where: {
      activo: true,
      camionId: { not: null },
    },
    include: {
      camion: { include: { localidades: { where: { activo: true } } } },
      rutas: {
        where: { fecha: { gte: inicio, lte: fin } },
        include: { items: { orderBy: { orden: 'asc' } } },
      },
    },
  })

  if (conductores.length === 0) {
    console.log('⚠️  Auto-despacho: ningún conductor activo con camión')
    return null
  }

  // Asigna el pedido a un conductor, creando su ruta del día si aún no existe
  async function asignar(conductor, tipo) {
    let ruta = conductor.rutas[0]
    if (!ruta) {
      ruta = await prisma.planRuta.create({
        data: {
          nombre:      `Ruta ${conductor.nombre}`,
          color:       '#0d6efd',
          fecha:       new Date(hoy + 'T12:00:00Z'),
          conductorId: conductor.id,
        },
      })
      console.log(`🆕 Auto-despacho: ruta creada al vuelo para ${conductor.nombre} (ruta #${ruta.id})`)
    }
    // Quitar el pedido de cualquier otra ruta para evitar duplicados
    await prisma.planRutaItem.deleteMany({ where: { pedidoId: pedido.id, rutaId: { not: ruta.id } } })
    const itemsActuales = await prisma.planRutaItem.findMany({ where: { rutaId: ruta.id } })
    const maxOrden = itemsActuales.length > 0 ? Math.max(...itemsActuales.map(i => i.orden)) : 0
    await prisma.planRutaItem.upsert({
      where:  { rutaId_pedidoId: { rutaId: ruta.id, pedidoId: pedido.id } },
      create: { rutaId: ruta.id, pedidoId: pedido.id, orden: maxOrden + 1 },
      update: {},
    })
    await prisma.pedido.update({ where: { id: pedido.id }, data: { estado: 'planificado' } })
    console.log(`🚀 Auto-despacho (${tipo}): Pedido #${pedido.id} → ${conductor.nombre} (camión ${conductor.camion.placa}, ruta #${ruta.id})`)

    // Push en segundo plano: al chofer (nuevo pedido) y al cliente (va en camino)
    const aviso = push.msg.nuevoPedidoConductor(pedido)
    push.notificarConductor(conductor.id, aviso.title, aviso.body, { pedidoId: pedido.id, rutaId: ruta.id })
    push.notificarClientesPlanificados([pedido.id])

    return { conductorId: conductor.id, rutaId: ruta.id, conductor: conductor.nombre }
  }

  // ── Fase 1: asignación por zona (localidades activas del camión) ─────────
  for (const conductor of conductores) {
    if (!conductor.camion?.activo) continue          // camión desactivado → no despacha
    const zonas = conductor.camion?.localidades ?? []
    if (zonas.length === 0) continue
    if (zonas.some(z => puntoDentroDePoligono(pedidoLat, pedidoLng, z.poligono))) {
      return asignar(conductor, 'zona')
    }
  }

  // ── Fase 2: camión de RUTA LIBRE (comodín) para pedidos fuera de toda zona ─
  const libres = conductores.filter(c => c.camion?.activo && c.camion?.rutaLibre)
  if (libres.length > 0) {
    // Si hay varios camiones libres, elegir el del chofer más cercano por GPS
    let elegido = libres[0]
    if (libres.length > 1) {
      let mejorDist = Infinity
      for (const c of libres) {
        if (c.ubicacionLat == null || c.ubicacionLng == null) continue
        const d = haversine(pedidoLat, pedidoLng, c.ubicacionLat, c.ubicacionLng)
        if (d < mejorDist) { mejorDist = d; elegido = c }
      }
    }
    return asignar(elegido, 'ruta libre')
  }

  // No cae en zona y no hay camión de ruta libre → pendiente para asignar a mano
  console.log(`📋 Auto-despacho: pedido #${pedido.id} sin zona y sin camión de ruta libre, queda pendiente`)
  return null
}

/**
 * Reintenta el despacho de TODOS los pedidos pendientes.
 * Se llama al crear una ruta del día o asignarle conductor: los pedidos que
 * llegaron cuando el chofer aún no tenía ruta (p. ej. de madrugada) se
 * asignan solos en cuanto la ruta existe, en vez de quedar huérfanos.
 */
async function despacharPendientes(motivo = '') {
  const pendientes = await prisma.pedido.findMany({
    where: { estado: 'pendiente' },
    include: { cliente: true },
    orderBy: { id: 'asc' },
  })
  if (pendientes.length === 0) return 0

  console.log(`🔁 Reintentando despacho de ${pendientes.length} pedido(s) pendiente(s)${motivo ? ` — ${motivo}` : ''}`)
  let asignados = 0
  for (const pedido of pendientes) {
    try {
      const resultado = await autoDespachar(pedido)
      if (resultado) asignados++
    } catch (e) {
      console.error(`Auto-despacho pendiente #${pedido.id}:`, e.message)
    }
  }
  console.log(`🔁 Despacho de pendientes: ${asignados}/${pendientes.length} asignado(s)`)
  return asignados
}

module.exports = { autoDespachar, despacharPendientes, puntoDentroDePoligono }
