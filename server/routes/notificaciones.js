const express = require('express')
const { verifyToken } = require('../middleware/auth')
const prisma = require('../lib/prisma')

const router = express.Router()

const DIAS_NUEVO = 7   // un cliente fijo cuenta como "nuevo" durante esta cantidad de días

router.get('/', verifyToken, async (req, res) => {
  const desde = new Date(Date.now() - DIAS_NUEVO * 24 * 60 * 60 * 1000)
  const [pedidosPendientes, contactosSinLeer, solicitudesPendientes, clientesFijosNuevos, ultimo] = await Promise.all([
    prisma.pedido.count({ where: { estado: 'pendiente' } }),
    prisma.contacto.count({ where: { leido: false } }),
    req.admin.rol === 'superadmin'
      ? prisma.solicitudActivacion.count({ where: { estado: 'pendiente' } })
      : prisma.solicitudActivacion.count({ where: { solicitadoPor: req.admin.username, estado: 'pendiente' } }),
    prisma.cliente.count({ where: { esFijo: true, fijoDesde: { gte: desde } } }),
    // Último pedido creado: el panel lo usa para avisar (sonido + cartel) cuando entra uno nuevo
    prisma.pedido.findFirst({
      orderBy: { id: 'desc' },
      select:  { id: true, total: true, estado: true, creadoEn: true, cliente: { select: { nombre: true } } },
    }),
  ])

  const ultimoPedido = ultimo
    ? { id: ultimo.id, total: ultimo.total, estado: ultimo.estado, creadoEn: ultimo.creadoEn, cliente: ultimo.cliente?.nombre ?? '' }
    : null

  res.json({ pedidosPendientes, contactosSinLeer, solicitudesPendientes, clientesFijosNuevos, ultimoPedido })
})

module.exports = router
