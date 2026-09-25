const express    = require('express')
const { verifyToken } = require('../middleware/auth')
const prisma     = require('../lib/prisma')

const router = express.Router()

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

// GET /api/reportes?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/', verifyToken, async (req, res) => {
  const { desde, hasta } = req.query
  if (desde && !DATE_REGEX.test(desde)) return res.status(400).json({ message: 'Fecha "desde" inválida, usa YYYY-MM-DD' })
  if (hasta && !DATE_REGEX.test(hasta)) return res.status(400).json({ message: 'Fecha "hasta" inválida, usa YYYY-MM-DD' })

  const fechaDesde = desde ? new Date(desde + 'T00:00:00.000Z') : new Date(new Date().setDate(1))
  const fechaHasta = hasta ? new Date(hasta + 'T23:59:59.999Z') : new Date()

  const pedidos = await prisma.pedido.findMany({
    where: {
      creadoEn: { gte: fechaDesde, lte: fechaHasta },
    },
    include: {
      cliente: true,
      items: { include: { producto: true } },
    },
    orderBy: { creadoEn: 'desc' },
  })

  // Totales generales
  const totalPedidos      = pedidos.length
  const totalIngresos     = pedidos.reduce((s, p) => s + p.total, 0)
  const pedidosEntregados = pedidos.filter(p => p.estado === 'entregado').length
  const pedidosPendientes = pedidos.filter(p => p.estado === 'pendiente').length
  const pedidosSuspendidos = pedidos.filter(p => p.estado === 'suspendido').length

  // Fidelidad: lo regalado no es venta y los descuentos se restan de lo cobrado
  const descuentosFidelidad = +pedidos.reduce((s, p) => s + (p.descuentoFidelidad || 0), 0).toFixed(2)
  let regaladosFidelidad = 0

  // Productos más vendidos (ingresos = lo realmente cobrado)
  const productosMap = {}
  for (const pedido of pedidos) {
    const bruto  = pedido.items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0)
    const factor = bruto > 0 && pedido.descuentoFidelidad ? (bruto - pedido.descuentoFidelidad) / bruto : 1
    for (const item of pedido.items) {
      const nombre = item.producto?.nombre ?? 'Desconocido'
      if (!productosMap[nombre]) productosMap[nombre] = { nombre, cantidad: 0, ingresos: 0, regalados: 0 }
      if (item.precioUnitario <= 0) {
        productosMap[nombre].regalados += item.cantidad
        regaladosFidelidad += item.cantidad
        continue
      }
      productosMap[nombre].cantidad += item.cantidad
      productosMap[nombre].ingresos += item.cantidad * item.precioUnitario * factor
    }
  }
  for (const p of Object.values(productosMap)) p.ingresos = +p.ingresos.toFixed(2)
  const productosMasVendidos = Object.values(productosMap)
    .sort((a, b) => b.cantidad - a.cantidad)

  // Pedidos formateados
  const pedidosFormateados = pedidos.map(p => ({
    id:       p.id,
    estado:   p.estado,
    total:    p.total,
    descuentoFidelidad: p.descuentoFidelidad || 0,
    creadoEn: p.creadoEn,
    cliente:  {
      nombre:   p.cliente.nombre,
      email:    p.cliente.email,
      telefono: p.cliente.telefono,
      latitud:  p.cliente.latitud,
      longitud: p.cliente.longitud,
      direccion: [
        p.cliente.callePrincipal,
        p.cliente.calleSecundaria,
        p.cliente.numeracion,
        p.cliente.sector,
      ].filter(Boolean).join(', ') || null,
    },
    items:    p.items.map(i => ({
      nombre:         i.producto?.nombre ?? '',
      cantidad:       i.cantidad,
      precioUnitario: i.precioUnitario,
      premioFidelidad: i.precioUnitario <= 0,
    })),
  }))

  res.json({
    periodo: { desde: fechaDesde, hasta: fechaHasta },
    resumen: { totalPedidos, totalIngresos, pedidosEntregados, pedidosPendientes, pedidosSuspendidos, descuentosFidelidad, regaladosFidelidad },
    productosMasVendidos,
    pedidos: pedidosFormateados,
  })
})

// GET /api/reportes/csv?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/csv', verifyToken, async (req, res) => {
  const { desde, hasta } = req.query
  if (desde && !DATE_REGEX.test(desde)) return res.status(400).json({ message: 'Fecha "desde" inválida, usa YYYY-MM-DD' })
  if (hasta && !DATE_REGEX.test(hasta)) return res.status(400).json({ message: 'Fecha "hasta" inválida, usa YYYY-MM-DD' })

  const fechaDesde = desde ? new Date(desde + 'T00:00:00.000Z') : new Date(new Date().setDate(1))
  const fechaHasta = hasta ? new Date(hasta + 'T23:59:59.999Z') : new Date()

  const pedidos = await prisma.pedido.findMany({
    where: { creadoEn: { gte: fechaDesde, lte: fechaHasta } },
    include: { cliente: true, items: { include: { producto: true } } },
    orderBy: { creadoEn: 'desc' },
  })

  const rows = []
  rows.push(['ID', 'Fecha', 'Estado', 'Cliente', 'Email', 'Teléfono', 'Producto', 'Cantidad', 'Precio Unitario', 'Descuento fidelidad', 'Total Pedido'])

  for (const p of pedidos) {
    if (p.items.length === 0) {
      rows.push([p.id, p.creadoEn.toISOString(), p.estado, p.cliente.nombre, p.cliente.email, p.cliente.telefono, '', '', '', p.descuentoFidelidad || 0, p.total])
    } else {
      for (const item of p.items) {
        rows.push([
          p.id,
          p.creadoEn.toISOString(),
          p.estado,
          p.cliente.nombre,
          p.cliente.email,
          p.cliente.telefono,
          item.precioUnitario <= 0 ? `${item.producto?.nombre ?? ''} (regalo fidelidad)` : (item.producto?.nombre ?? ''),
          item.cantidad,
          item.precioUnitario,
          p.descuentoFidelidad || 0,
          p.total,
        ])
      }
    }
  }

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="reporte-${desde ?? 'mes'}-${hasta ?? 'hoy'}.csv"`)
  res.send('\uFEFF' + csv) // BOM para que Excel abra bien con tildes
})

module.exports = router
