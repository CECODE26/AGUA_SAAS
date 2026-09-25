const express                        = require('express')
const bcrypt                         = require('bcryptjs')
const jwt                            = require('jsonwebtoken')
const { verifyToken, verifyTokenConductor, JWT_SECRET } = require('../middleware/auth')
const prisma                         = require('../lib/prisma')
const sseClients                     = require('../lib/sseClients')
const push                           = require('../lib/push')
const { puntoDentroDePoligono }      = require('../lib/autoDespacho')
const validarId = require('../lib/validarId')
const fidelidad = require('../lib/fidelidad')
const { normalizarUsername, limpiarPassword, usernameOcupado } = require('../lib/usuarios')

const DIAS_SEMANA = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado']

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function nearestNeighbor(stops) {
  if (stops.length <= 1) return stops
  const rem = [...stops]
  const ord = [rem.splice(0, 1)[0]]
  while (rem.length) {
    const last = ord[ord.length - 1]
    let minD = Infinity, idx = 0
    rem.forEach((s, i) => { const d = haversineM(last.lat, last.lng, s.lat, s.lng); if (d < minD) { minD = d; idx = i } })
    ord.push(rem.splice(idx, 1)[0])
  }
  return ord
}

const router = express.Router()

// ── Admin: listar conductores ─────────────────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
  const conductores = await prisma.conductor.findMany({
    orderBy: { id: 'asc' },
    select: {
      id: true, nombre: true, username: true, activo: true, creadoEn: true,
      camion: { select: { id: true, placa: true, marca: true, modelo: true, color: true } },
    },
  })
  res.json({ conductores })
})

// ── Admin: crear conductor ────────────────────────────────────────────────────
router.post('/', verifyToken, async (req, res) => {
  const { nombre, camionId, telefono } = req.body
  // Usuario limpio (minúsculas, sin espacios sobrantes) y contraseña sin espacios de más
  const username = normalizarUsername(req.body.username)
  const password = limpiarPassword(req.body.password)
  if (!nombre || !username || !password)
    return res.status(400).json({ message: 'nombre, username y password son requeridos' })
  if (password.length < 4) return res.status(400).json({ message: 'La contraseña debe tener al menos 4 caracteres' })

  const ocupado = await usernameOcupado(username)
  if (ocupado) return res.status(409).json({ message: ocupado })

  if (camionId) {
    const camion = await prisma.camion.findUnique({ where: { id: parseInt(camionId) }, include: { conductor: true } })
    if (!camion) return res.status(404).json({ message: 'Camión no encontrado' })
    if (camion.conductor) return res.status(409).json({ message: 'Ese camión ya tiene un conductor asignado' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const conductor = await prisma.conductor.create({
    data: { nombre, username, passwordHash, activo: true, telefono: telefono ? String(telefono).trim() : null, ...(camionId ? { camionId: parseInt(camionId) } : {}) },
    select: { id: true, nombre: true, username: true, activo: true, creadoEn: true, telefono: true },
  })
  res.json({ conductor })
})

// ── Admin: actualizar conductor (nombre, password) ────────────────────────────
// Nota: activo solo puede cambiarlo el superadmin vía /api/superadmin/conductores/:id/activo
router.put('/:id', verifyToken, async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const { nombre, password, telefono } = req.body

  const data = {}
  if (nombre   !== undefined) data.nombre = nombre
  if (telefono !== undefined) data.telefono = telefono ? String(telefono).trim() : null
  if (password && limpiarPassword(password)) data.passwordHash = await bcrypt.hash(limpiarPassword(password), 10)

  const conductor = await prisma.conductor.update({
    where: { id },
    data,
    select: { id: true, nombre: true, username: true, activo: true, creadoEn: true, telefono: true },
  })
  res.json({ conductor })
})

// ── Admin: eliminar conductor ─────────────────────────────────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  await prisma.conductor.delete({ where: { id } }).catch(() => {})
  res.json({ success: true })
})

// ── Público: login conductor ──────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password)
    return res.status(400).json({ message: 'Usuario y contraseña requeridos' })
  try {
    // Tolerante con el teclado del celular: ignora mayúsculas/minúsculas y espacios sobrantes en el usuario
    const usuario = String(username).trim()
    const conductor = await prisma.conductor.findFirst({ where: { username: { equals: usuario, mode: 'insensitive' } } })
    if (!conductor || !conductor.activo)
      return res.status(401).json({ message: 'Credenciales incorrectas o cuenta inactiva' })

    // La contraseña se compara tal cual; si falla, se reintenta sin espacios al inicio/final (autocompletado)
    let ok = await bcrypt.compare(password, conductor.passwordHash)
    if (!ok && String(password).trim() !== password) ok = await bcrypt.compare(String(password).trim(), conductor.passwordHash)
    if (!ok) return res.status(401).json({ message: 'Credenciales incorrectas' })

    const token = jwt.sign(
      { conductorId: conductor.id, nombre: conductor.nombre, role: 'conductor' },
      JWT_SECRET,
      { expiresIn: '30d' }
    )
    res.json({ token, conductor: { id: conductor.id, nombre: conductor.nombre } })
  } catch (e) {
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// ── Conductor: guardar push token ────────────────────────────────────────────
router.post('/push-token', verifyTokenConductor, async (req, res) => {
  const { pushToken } = req.body
  if (!pushToken) return res.status(400).json({ message: 'pushToken requerido' })
  try {
    // Un mismo teléfono no puede quedar apuntando a dos conductores
    await prisma.conductor.updateMany({ where: { pushToken, id: { not: req.conductor.conductorId } }, data: { pushToken: null } })
    await prisma.conductor.update({
      where: { id: req.conductor.conductorId },
      data:  { pushToken },
    })
    res.json({ success: true })
  } catch (e) {
    console.error('push-token conductor:', e.message)
    res.status(500).json({ message: 'No se pudo guardar el token' })
  }
})

// ── Conductor: borrar push token (al cerrar sesión) ──────────────────────────
router.delete('/push-token', verifyTokenConductor, async (req, res) => {
  try {
    await prisma.conductor.update({ where: { id: req.conductor.conductorId }, data: { pushToken: null } })
  } catch {}
  res.json({ success: true })
})

// ── Conductor: ver su ruta del día ────────────────────────────────────────────
router.get('/mi-ruta', verifyTokenConductor, async (req, res) => {
  const hoy = new Date()
  const inicio = new Date(hoy.toISOString().split('T')[0] + 'T00:00:00Z')
  const fin    = new Date(hoy.toISOString().split('T')[0] + 'T23:59:59Z')

  const ruta = await prisma.planRuta.findFirst({
    where: {
      conductorId: req.conductor.conductorId,
      fecha: { gte: inicio, lte: fin },
    },
    include: {
      items: {
        orderBy: { orden: 'asc' },
        include: {
          pedido: {
            include: { cliente: true, items: { include: { producto: true } } },
          },
        },
      },
    },
  })

  // ── Clientes fijos para hoy ──────────────────────────────────────────────
  const conductor = await prisma.conductor.findUnique({
    where: { id: req.conductor.conductorId },
    include: { camion: { include: { localidades: { where: { activo: true } } } } },
  })

  const zonasConductor = conductor?.camion?.localidades ?? []

  let visitasFijas = []
  if (zonasConductor.length > 0) {
    const diaHoy = DIAS_SEMANA[new Date().getDay()]

    const clientesFijos = await prisma.cliente.findMany({
      where: { esFijo: true, latitud: { not: null }, longitud: { not: null } },
      include: { visitasFijas: { where: { conductorId: conductor.id, fecha: { gte: inicio, lte: fin } } } },
    })

    // Obtener totales de pedidos asociados a las visitas
    const pedidoIds = clientesFijos.flatMap(c => c.visitasFijas[0]?.pedidoId ? [c.visitasFijas[0].pedidoId] : [])
    const pedidoTotales = pedidoIds.length > 0
      ? await prisma.pedido.findMany({ where: { id: { in: pedidoIds } }, select: { id: true, total: true } })
      : []
    const totalPorPedido = Object.fromEntries(pedidoTotales.map(p => [p.id, p.total]))

    const productos = await prisma.producto.findMany({ where: { activo: true }, select: { id: true, nombre: true } })
    const productoMap = Object.fromEntries(productos.map(p => [p.id, p.nombre]))

    for (const cliente of clientesFijos) {
      const horarios = Array.isArray(cliente.visitasHorario) ? cliente.visitasHorario : []
      const entrada  = horarios.find(h => h.dia === diaHoy)
      if (!entrada) continue
      const enAlgunaZona = zonasConductor.some(z => puntoDentroDePoligono(cliente.latitud, cliente.longitud, z.poligono))
      if (!enAlgunaZona) continue

      const visitaHoy   = cliente.visitasFijas[0] ?? null
      const defaultProds = Array.isArray(cliente.productosDefault) ? cliente.productosDefault : []

      visitasFijas.push({
        clienteId: cliente.id,
        hora:      entrada.hora ?? null,
        resultado: visitaHoy?.resultado ?? null,
        cantidades: visitaHoy?.cantidades ?? null,
        visitaId:  visitaHoy?.id ?? null,
        total:     visitaHoy?.pedidoId ? parseFloat(totalPorPedido[visitaHoy.pedidoId] ?? 0) || null : null,
        cliente: {
          nombre:          cliente.nombre,
          telefono:        cliente.telefono,
          callePrincipal:  cliente.callePrincipal,
          calleSecundaria: cliente.calleSecundaria,
          referencia:      cliente.referencia,
          latitud:         cliente.latitud,
          longitud:        cliente.longitud,
          productosDefault: defaultProds.map(p => ({
            nombre:   productoMap[p.productoId] ?? '',
            cantidad: p.cantidad,
          })),
        },
      })
    }

    visitasFijas.sort((a, b) => (a.hora ?? '').localeCompare(b.hora ?? ''))
  }

  // Lista de productos: la necesita el modal de venta rápida, exista o no ruta
  const productosVenta = await prisma.producto.findMany({
    where: { activo: true },
    select: { id: true, nombre: true },
    orderBy: { nombre: 'asc' },
  })

  // ── Sin ruta y sin clientes fijos: igual mandamos los productos para que
  //    el chofer pueda registrar ventas desde el botón (venta rápida) ──────
  if (!ruta && visitasFijas.length === 0) {
    return res.json({ ruta: null, productosDisponibles: productosVenta })
  }

  // ── Construir paradas unificadas con nearest neighbor ───────────────────
  const conGps = [], sinGps = []

  for (const item of (ruta?.items ?? []).filter(i => i.pedido.estado !== 'suspendido')) {
    const lat = item.pedido.latitud ?? item.pedido.cliente.latitud
    const lng = item.pedido.longitud ?? item.pedido.cliente.longitud
    const parada = {
      tipo:     'pedido',
      estado:   item.pedido.estado,
      pedidoId: item.pedido.id,
      cliente: {
        nombre:          item.pedido.cliente.nombre,
        telefono:        item.pedido.cliente.telefono,
        callePrincipal:  item.pedido.cliente.callePrincipal,
        calleSecundaria: item.pedido.cliente.calleSecundaria,
        referencia:      item.pedido.cliente.referencia,
        latitud:  lat,
        longitud: lng,
      },
      productos: item.pedido.items.map(i => ({ nombre: i.producto?.nombre ?? '', cantidad: i.cantidad, gratis: Number(i.precioUnitario) <= 0 })),
      total: item.pedido.total,
      notas: item.pedido.notas ?? null,
    }
    if (lat != null && lng != null) conGps.push({ lat, lng, parada })
    else sinGps.push(parada)
  }

  for (const v of visitasFijas) {
    if (v.cliente.latitud != null && v.cliente.longitud != null) {
      conGps.push({
        lat: v.cliente.latitud, lng: v.cliente.longitud,
        parada: { tipo: 'visita_fija', clienteId: v.clienteId, hora: v.hora, resultado: v.resultado, cantidades: v.cantidades, visitaId: v.visitaId, total: v.total, cliente: v.cliente },
      })
    }
  }

  const ordenados = nearestNeighbor(conGps)
  const paradas = [
    ...ordenados.map((s, i) => ({ ...s.parada, orden: i + 1 })),
    ...sinGps.map((p, i)    => ({ ...p,         orden: ordenados.length + i + 1 })),
  ]

  res.json({
    ruta: { id: ruta?.id ?? null, nombre: ruta?.nombre ?? 'Ruta del día', color: ruta?.color ?? '#00763E', fecha: ruta?.fecha ?? inicio, paradas },
    productosDisponibles: productosVenta,
  })
})

// ── Conductor: enviar ubicación GPS ──────────────────────────────────────────
router.post('/mi-ubicacion', verifyTokenConductor, async (req, res) => {
  const { lat, lng } = req.body
  const latNum = parseFloat(lat)
  const lngNum = parseFloat(lng)
  if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180)
    return res.status(400).json({ message: 'Coordenadas inválidas' })
  await prisma.conductor.update({
    where: { id: req.conductor.conductorId },
    data: { ubicacionLat: latNum, ubicacionLng: lngNum, ubicacionAt: new Date() },
  })
  res.json({ ok: true })
})

// ── Conductor: canal SSE de eventos en tiempo real ────────────────────────────
router.get('/eventos', (req, res) => {
  const { token } = req.query
  if (!token) return res.status(401).json({ message: 'Token requerido' })
  let conductorId
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    conductorId   = payload.conductorId
  } catch { return res.status(401).json({ message: 'Token inválido' }) }

  res.setHeader('Content-Type',  'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection',    'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // evita que nginx almacene en búfer
  res.flushHeaders()

  // Heartbeat cada 25s para mantener la conexión viva
  const hb = setInterval(() => { try { res.write(': ping\n\n') } catch {} }, 25000)
  sseClients.registrar(conductorId, res)
  req.on('close', () => { clearInterval(hb); sseClients.eliminar(conductorId) })
})

// ── Conductor: registrar visita a cliente fijo ────────────────────────────────
router.post('/visita-fijo', verifyTokenConductor, async (req, res) => {
  const { clienteId, resultado, notas, cantidades } = req.body
  if (!clienteId || !['compro', 'no_necesita', 'no_estaba'].includes(resultado))
    return res.status(400).json({ message: 'clienteId y resultado válido requeridos' })

  const hoy   = new Date()
  const fecha = new Date(hoy.toISOString().split('T')[0] + 'T00:00:00Z')

  const cantidadesGuardar = resultado === 'compro' && Array.isArray(cantidades) ? cantidades : null

  // Leer registro previo
  const anterior = await prisma.visitaClienteFijo.findUnique({
    where: { clienteId_conductorId_fecha: { clienteId: parseInt(clienteId), conductorId: req.conductor.conductorId, fecha } },
  })

  // ── 1. Restaurar stock de la compra anterior ─────────────────────────────
  if (anterior?.resultado === 'compro' && Array.isArray(anterior.cantidades)) {
    for (const item of anterior.cantidades) {
      if (!item.nombre || !item.cantidad) continue
      const prod = await prisma.producto.findFirst({ where: { nombre: item.nombre, activo: true } })
      if (prod) await prisma.producto.update({ where: { id: prod.id }, data: { stock: { increment: parseInt(item.cantidad) } } })
    }
  }

  // ── 2. Eliminar pedido anterior generado por esta visita ─────────────────
  if (anterior?.pedidoId) {
    try {
      await prisma.pedidoItem.deleteMany({ where: { pedidoId: anterior.pedidoId } })
      await prisma.pedido.delete({ where: { id: anterior.pedidoId } })
    } catch {
      await prisma.pedido.update({ where: { id: anterior.pedidoId }, data: { estado: 'suspendido' } }).catch(() => {})
    }
  }

  // ── 3. Crear pedido real si compró ───────────────────────────────────────
  let nuevoPedidoId = null
  let totalPedido   = 0
  if (resultado === 'compro' && cantidadesGuardar?.length) {
    const items = []
    for (const item of cantidadesGuardar) {
      if (!item.nombre || !item.cantidad) continue
      const prod = await prisma.producto.findFirst({ where: { nombre: item.nombre, activo: true } })
      if (prod) {
        items.push({ productoId: prod.id, cantidad: parseInt(item.cantidad), precioUnitario: prod.precio })
        totalPedido += parseFloat(prod.precio) * parseInt(item.cantidad)
      }
    }
    if (items.length > 0) {
      const pedido = await prisma.pedido.create({
        data: { clienteId: parseInt(clienteId), total: totalPedido, estado: 'entregado', items: { create: items } },
      })
      nuevoPedidoId = pedido.id
      fidelidad.registrarEntrega(pedido.id, 'visita')   // la compra en la visita también suma sellos
    }
  }

  // ── 4. Guardar visita ────────────────────────────────────────────────────
  const data = { resultado, notas: notas ?? null, cantidades: cantidadesGuardar, pedidoId: nuevoPedidoId }
  const visita = await prisma.visitaClienteFijo.upsert({
    where: { clienteId_conductorId_fecha: { clienteId: parseInt(clienteId), conductorId: req.conductor.conductorId, fecha } },
    create: { clienteId: parseInt(clienteId), conductorId: req.conductor.conductorId, fecha, ...data },
    update: data,
  })

  // ── 5. Descontar nuevo stock ─────────────────────────────────────────────
  if (resultado === 'compro' && cantidadesGuardar?.length) {
    for (const item of cantidadesGuardar) {
      if (!item.nombre || !item.cantidad) continue
      const prod = await prisma.producto.findFirst({ where: { nombre: item.nombre, activo: true } })
      if (prod) await prisma.producto.update({ where: { id: prod.id }, data: { stock: Math.max(0, prod.stock - parseInt(item.cantidad)) } })
    }
  }

  res.json({ ok: true, visita, pedidoId: nuevoPedidoId, total: totalPedido })
})

// ── Conductor: actualizar estado de pedido (entregado / no_entregado) ─────────
router.patch('/mi-ruta/pedidos/:pedidoId', verifyTokenConductor, async (req, res) => {
  const pedidoId = validarId(req.params.pedidoId)
  if (!pedidoId) return res.status(400).json({ message: 'ID inválido' })
  const { estado = 'entregado', motivo = null } = req.body

  const ESTADOS_VALIDOS = ['entregado', 'no_entregado']
  if (!ESTADOS_VALIDOS.includes(estado))
    return res.status(400).json({ message: 'Estado inválido' })

  const hoy    = new Date()
  const inicio = new Date(hoy.toISOString().split('T')[0] + 'T00:00:00Z')
  const fin    = new Date(hoy.toISOString().split('T')[0] + 'T23:59:59Z')

  const item = await prisma.planRutaItem.findFirst({
    where: {
      pedidoId,
      ruta: {
        conductorId: req.conductor.conductorId,
        fecha: { gte: inicio, lte: fin },
      },
    },
  })
  if (!item) return res.status(403).json({ message: 'Pedido no encontrado en tu ruta' })

  const actualizado = await prisma.pedido.update({
    where: { id: pedidoId },
    data:  { estado, motivoNoEntrega: estado === 'no_entregado' ? (motivo ?? null) : null },
  })
  // Avisar al cliente en segundo plano
  push.notificarEstadoPedido(actualizado, estado, motivo)
  // Fidelidad: los sellos se suman al entregar, nunca al pedir
  if (estado === 'entregado') fidelidad.registrarEntrega(pedidoId, 'app')
  res.json({ success: true })
})

// ── Conductor: registrar venta exprés (venta directa en la calle) ─────────────
// El camión exprés no tiene zonas ni rutas: el chofer vende puerta a puerta y
// registra cada venta aquí. Entra al sistema como pedido ya entregado.
// La app del chofer manda { nombre, productos, telefono?, lat?, lng? }.
router.post('/venta-rapida', verifyTokenConductor, async (req, res) => {
  const { productos } = req.body
  // La app envía "nombre"; se aceptan también clienteNombre/clienteTelefono
  const clienteNombre   = req.body.nombre ?? req.body.clienteNombre
  const clienteTelefono = req.body.telefono ?? req.body.clienteTelefono
  const { lat, lng } = req.body
  if (!Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({ message: 'La venta necesita al menos un producto' })
  }

  // Con teléfono se registra/actualiza el cliente real; sin datos va al
  // cliente genérico de mostrador
  const email = clienteTelefono
    ? `tel-${String(clienteTelefono).replace(/\D/g, '')}@clientes.aguamanu.local`
    : 'venta-express@aguamanu.local'
  const cliente = await prisma.cliente.upsert({
    where:  { email },
    update: clienteNombre ? { nombre: clienteNombre, ...(clienteTelefono ? { telefono: String(clienteTelefono) } : {}) } : {},
    create: {
      email,
      nombre:   clienteNombre || 'Venta Exprés (mostrador)',
      telefono: clienteTelefono ? String(clienteTelefono) : 's/n',
    },
  })

  const items = []
  let total = 0
  for (const it of productos) {
    const prod = await prisma.producto.findFirst({ where: { nombre: it.nombre, activo: true } })
    if (!prod) continue
    const cantidad = Math.max(1, parseInt(it.cantidad) || 1)
    items.push({ productoId: prod.id, cantidad, precioUnitario: prod.precio })
    total += prod.precio * cantidad
    // Descuento atómico (mismo patrón que pedidos web)
    await prisma.$executeRaw`UPDATE "Producto" SET stock = GREATEST(0, stock - ${cantidad}) WHERE id = ${prod.id}`
  }
  if (items.length === 0) return res.status(400).json({ message: 'Ningún producto válido en la venta' })

  const pedido = await prisma.pedido.create({
    data: {
      clienteId:   cliente.id,
      total,
      estado:      'entregado',
      origen:      'express',
      conductorId: req.conductor.conductorId,
      latitud:     lat != null ? parseFloat(lat) : null,
      longitud:    lng != null ? parseFloat(lng) : null,
      items:       { create: items },
    },
  })

  // Si el chofer tiene ruta hoy, sumar la venta para que cuente en sus estadísticas
  const hoy    = new Date()
  const inicio = new Date(hoy.toISOString().split('T')[0] + 'T00:00:00Z')
  const fin    = new Date(hoy.toISOString().split('T')[0] + 'T23:59:59Z')
  const ruta   = await prisma.planRuta.findFirst({
    where:   { conductorId: req.conductor.conductorId, fecha: { gte: inicio, lte: fin } },
    include: { _count: { select: { items: true } } },
  })
  if (ruta) {
    await prisma.planRutaItem.create({
      data: { rutaId: ruta.id, pedidoId: pedido.id, orden: ruta._count.items + 1 },
    })
  }

  fidelidad.registrarEntrega(pedido.id, 'express')   // la venta en la calle también suma sellos
  console.log(`🛒 Venta exprés #${pedido.id} | conductor ${req.conductor.nombre ?? req.conductor.conductorId} | $${total.toFixed(2)}`)
  res.json({ ok: true, success: true, pedidoId: pedido.id, total })
})

module.exports = router
