const express = require('express')
const { verifyToken, clienteDeToken } = require('../middleware/auth')
const { distribuidoraIdObligatoria } = require('../lib/tenant')
const { nombreMarca, ciudadPorDefecto, provinciaPorDefecto } = require('../lib/marca')
const prisma  = require('../lib/prisma')
const { emailNuevoPedido, emailConfirmacionCliente } = require('../lib/mailer')
const { autoDespachar } = require('../lib/autoDespacho')
const sseClients        = require('../lib/sseClients')
const push              = require('../lib/push')
const fidelidad = require('../lib/fidelidad')
const validarId = require('../lib/validarId')

const router = express.Router()

// POST /api/pedidos — PÚBLICO (clientes del sitio)
// Id del cliente según su token de la app (null si no hay sesión válida)
function clienteIdDeToken(req) {
  return clienteDeToken(req)?.id ?? null
}

router.post('/', async (req, res) => {
  const { cliente, productos, total } = req.body

  if (!cliente?.nombre || !cliente?.telefono || !cliente?.email) {
    return res.status(400).json({ success: false, message: 'Faltan datos del cliente' })
  }
  if (!productos || productos.length === 0) {
    return res.status(400).json({ success: false, message: 'El pedido no tiene productos' })
  }

  // Upsert cliente por email
  const datosCliente = {
    nombre:          cliente.nombre,
    telefono:        cliente.telefono,
    callePrincipal:  cliente.callePrincipal  || null,
    calleSecundaria: cliente.interseccion    || cliente.calleSecundaria || null,
    numeracion:      cliente.numeracion      || null,
    referencia:      cliente.referencia      || null,
    sector:          cliente.sector          || null,
    ciudad:          cliente.ciudad          || ciudadPorDefecto(),
    provincia:       cliente.provincia       || provinciaPorDefecto(),
    latitud:         (cliente.lat  ?? cliente.latitud)  != null ? parseFloat(cliente.lat  ?? cliente.latitud)  : null,
    longitud:        (cliente.lng  ?? cliente.longitud) != null ? parseFloat(cliente.lng  ?? cliente.longitud) : null,
  }

  const clienteDb = await prisma.cliente.upsert({
    where:  { distribuidoraId_email: { distribuidoraId: distribuidoraIdObligatoria(), email: cliente.email } },
    update: datosCliente,
    create: { email: cliente.email, ...datosCliente },
  })

  // Buscar IDs de productos por nombre y descontar stock
  const items = []
  for (const item of productos) {
    const prod = await prisma.producto.findFirst({ where: { nombre: item.nombre, activo: true } })
    if (!prod) continue
    items.push({
      productoId:     prod.id,
      cantidad:       parseInt(item.cantidad),
      precioUnitario: prod.precio,
    })
    // Descuento atómico en un solo UPDATE: leer y reescribir el stock en dos
    // pasos pierde descuentos cuando llegan pedidos simultáneos
    await prisma.$executeRaw`UPDATE "Producto" SET stock = GREATEST(0, stock - ${parseInt(item.cantidad)}) WHERE id = ${prod.id}`
  }

  if (items.length === 0) {
    return res.status(400).json({ success: false, message: 'Ningún producto válido en el pedido' })
  }

  // Fidelidad: usar el premio exige la sesión del propio cliente (no basta con conocer su correo)
  let premio = null
  let totalFinal = parseFloat(total)
  let descuentoFidelidad = null
  if (req.body.usarPremio && clienteIdDeToken(req) === clienteDb.id) {
    const config = await fidelidad.getConfig()
    if (config.activo) {
      premio = await fidelidad.reservarPremio(clienteDb.id, config)
      if (premio?.tipo === 'producto') {
        // Línea propia a $0: no se mezcla con la cobrada, así no suma sello ni infla los reportes
        items.push({ productoId: premio.productoId, cantidad: 1, precioUnitario: 0 })
        await prisma.$executeRaw`UPDATE "Producto" SET stock = GREATEST(0, stock - 1) WHERE id = ${premio.productoId}`
      } else if (premio?.tipo === 'descuento') {
        // El descuento se calcula aquí con los precios reales, no con lo que mande la app
        const subtotal = items.reduce((s, i) => s + i.cantidad * Number(i.precioUnitario), 0)
        descuentoFidelidad = +(subtotal * premio.pct / 100).toFixed(2)
        totalFinal = +(subtotal - descuentoFidelidad).toFixed(2)
      }
    }
  }

  const latPedido = (cliente.lat ?? cliente.latitud) != null ? parseFloat(cliente.lat ?? cliente.latitud) : null
  const lngPedido = (cliente.lng ?? cliente.longitud) != null ? parseFloat(cliente.lng ?? cliente.longitud) : null

  const pedido = await prisma.pedido.create({
    data: {
      clienteId: clienteDb.id,
      total:     totalFinal,
      notas:     cliente.notas || null,
      latitud:   latPedido,
      longitud:  lngPedido,
      premioAplicado: !!premio,
      descuentoFidelidad,
      items:     { create: items },
    },
    include: { items: { include: { producto: true } }, cliente: true },
  })

  if (premio) fidelidad.registrarCanje(clienteDb.id, pedido.id, 'app')

  console.log(`\n📦 NUEVO PEDIDO #${pedido.id} | ${clienteDb.nombre} | $${totalFinal}`)

  // Emails en segundo plano
  emailNuevoPedido(pedido, clienteDb).catch(e => console.error('Email admin:', e.message))
  emailConfirmacionCliente(pedido, clienteDb).catch(e => console.error('Email cliente:', e.message))

  // Push al cliente (si tiene la app con notificaciones activas)
  const aviso = push.msg.pedidoRecibido(pedido)
  push.notificarCliente(clienteDb.id, aviso.title, aviso.body, { pedidoId: pedido.id })

  // Auto-despacho: asignar al conductor más cercano en tiempo real
  // (el push al conductor y al cliente lo manda autoDespacho al asignar)
  autoDespachar(pedido).then(resultado => {
    if (!resultado) return
    sseClients.notificar(resultado.conductorId, {
      tipo: 'nuevo_pedido',
      pedido: {
        id:        pedido.id,
        orden:     999,
        estado:    'pendiente',
        pedidoId:  pedido.id,
        total:     pedido.total,
        notas:     pedido.notas ?? null,
        cliente: {
          nombre:          pedido.cliente.nombre,
          telefono:        pedido.cliente.telefono,
          callePrincipal:  pedido.cliente.callePrincipal,
          calleSecundaria: pedido.cliente.calleSecundaria,
          referencia:      pedido.cliente.referencia,
          latitud:         pedido.latitud  ?? pedido.cliente.latitud,
          longitud:        pedido.longitud ?? pedido.cliente.longitud,
        },
        productos: pedido.items.map(i => ({
          nombre:   i.producto?.nombre ?? '',
          cantidad: i.cantidad,
          gratis:   Number(i.precioUnitario) <= 0,
        })),
      },
    })
  }).catch(e => console.error('Auto-despacho error:', e.message))

  res.json({ success: true, pedidoId: pedido.id, total: totalFinal, premioAplicado: !!premio, message: 'Pedido recibido correctamente' })
})

// GET /api/pedidos/cliente/:email — PÚBLICO (historial del cliente)
router.get('/cliente/:email', async (req, res) => {
  const { email } = req.params
  const cliente = await prisma.cliente.findFirst({
    where: { email },
    include: {
      pedidos: {
        orderBy: { creadoEn: 'desc' },
        include: { items: { include: { producto: true } } },
      },
    },
  })
  if (!cliente) return res.json({ pedidos: [], cliente: null })

  const pedidos = cliente.pedidos.map(p => ({
    id:        p.id,
    estado:    p.estado,
    total:     p.total,
    descuentoFidelidad: p.descuentoFidelidad,
    creadoEn:  p.creadoEn,
    items:     p.items.map(i => ({
      nombre:         i.producto?.nombre ?? '',
      cantidad:       i.cantidad,
      precioUnitario: i.precioUnitario,
    })),
  }))

  res.json({ cliente: { nombre: cliente.nombre, email: cliente.email }, pedidos })
})

// PATCH /api/pedidos/:id/cancelar — cliente autenticado
router.patch('/:id/cancelar', async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Token requerido' })
  const clienteId = clienteIdDeToken(req)
  if (!clienteId) return res.status(401).json({ success: false, message: 'Token inválido' })

  try {
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      select: {
        estado: true,
        clienteId: true,
        items: {
          select: {
            productoId: true,
            cantidad: true,
          },
        },
      },
    })
    if (!pedido)                    return res.status(404).json({ success: false, message: 'Pedido no encontrado' })
    if (pedido.clienteId !== clienteId) return res.status(403).json({ success: false, message: 'No tienes permiso' })
    if (pedido.estado !== 'pendiente') {
      return res.status(400).json({
        success: false,
        message: pedido.estado === 'planificado'
          ? `Este pedido ya fue asignado a ruta. Contacta a ${nombreMarca()} para cancelarlo.`
          : 'Solo puedes cancelar pedidos pendientes',
      })
    }
    await prisma.pedido.update({ where: { id }, data: { estado: 'suspendido' } })
    for (const item of pedido.items) {
      await prisma.producto.update({ where: { id: item.productoId }, data: { stock: { increment: item.cantidad } } })
    }
    await fidelidad.devolverPremio(id)   // si usó su premio, vuelve a su tarjeta
    res.json({ success: true })
  } catch (err) {
    console.error('Error al cancelar pedido:', err)
    res.status(500).json({ success: false, message: 'No se pudo cancelar el pedido' })
  }
})

// GET /api/pedidos — PROTEGIDO (admin)
router.get('/', verifyToken, async (req, res) => {
  const { estado } = req.query
  const pedidos = await prisma.pedido.findMany({
    where:   estado ? { estado } : {},
    include: { cliente: true, items: { include: { producto: true } } },
    orderBy: { creadoEn: 'desc' },
  })
  res.json({ pedidos, total: pedidos.length })
})

// PATCH /api/pedidos/clientes/:id/coords — PROTEGIDO (admin)
// Guarda coordenadas geocodificadas en el Cliente (solo si aún no tiene GPS exacto)
router.patch('/clientes/:id/coords', verifyToken, async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const { latitud, longitud } = req.body
  if (!latitud || !longitud) return res.status(400).json({ message: 'latitud y longitud requeridas' })

  // No sobreescribir si ya tiene coordenadas guardadas
  const cliente = await prisma.cliente.findUnique({ where: { id } })
  if (!cliente) return res.status(404).json({ message: 'Cliente no encontrado' })
  if (cliente.latitud && cliente.longitud) return res.json({ ok: true, skipped: true })

  await prisma.cliente.update({
    where: { id },
    data:  { latitud: parseFloat(latitud), longitud: parseFloat(longitud) },
  })
  res.json({ ok: true })
})

// PATCH /api/pedidos/:id/estado — PROTEGIDO (admin)
router.patch('/:id/estado', verifyToken, async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const { estado } = req.body

  const estadosValidos = ['pendiente', 'planificado', 'entregado', 'no_entregado', 'suspendido']
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ success: false, message: 'Estado no válido' })
  }

  const antes = await prisma.pedido.findUnique({ where: { id }, include: { items: true } })
  if (!antes) return res.status(404).json({ success: false, message: 'Pedido no encontrado' })

  const pedido = await prisma.pedido.update({
    where: { id },
    data:  { estado },
    include: { cliente: true, items: { include: { producto: true } } },
  })

  // Fidelidad: al entregar suma sellos; al suspender devuelve el bidón gratis
  if (estado === 'entregado') fidelidad.registrarEntrega(id, pedido.origen === 'express' ? 'express' : 'app')
  if (estado === 'suspendido' && pedido.premioAplicado) fidelidad.devolverPremio(id)

  // Restaurar stock al suspender; volver a descontar si se reactiva
  if (antes.estado !== 'suspendido' && estado === 'suspendido') {
    for (const item of antes.items) {
      await prisma.producto.update({ where: { id: item.productoId }, data: { stock: { increment: item.cantidad } } })
    }
  } else if (antes.estado === 'suspendido' && estado !== 'suspendido') {
    for (const item of antes.items) {
      const prod = await prisma.producto.findUnique({ where: { id: item.productoId } })
      if (prod) await prisma.producto.update({ where: { id: item.productoId }, data: { stock: Math.max(0, prod.stock - item.cantidad) } })
    }
  }

  // Avisar al cliente si el estado realmente cambió
  if (antes.estado !== estado) push.notificarEstadoPedido(pedido, estado)

  res.json({ success: true, pedido })
})

module.exports = router
