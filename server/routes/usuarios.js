const express = require('express')
const { verifyToken, verifySuperAdmin } = require('../middleware/auth')
const prisma = require('../lib/prisma')
const validarId = require('../lib/validarId')

const router = express.Router()

// GET /api/usuarios — PROTEGIDO (admin)
router.get('/', verifyToken, async (req, res) => {
  const clientes = await prisma.cliente.findMany({
    include: {
      _count:  { select: { pedidos: true } },
      pedidos: { orderBy: { creadoEn: 'desc' }, take: 1, select: { creadoEn: true } },
    },
    orderBy: { actualizadoEn: 'desc' },
  })

  const usuarios = clientes.map(c => ({
    id:           c.id,
    email:        c.email,
    nombre:       c.nombre,
    telefono:     c.telefono,
    direccion:    c.callePrincipal,
    totalPedidos: c._count.pedidos,
    ultimoPedido: c.pedidos[0]?.creadoEn || c.creadoEn,
    primerPedido: c.creadoEn,
  }))

  res.json({ usuarios, total: usuarios.length })
})

// DELETE /api/usuarios/:id — Solo superadmin
router.delete('/:id', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const id = validarId(req.params.id)
    if (!id) return res.status(400).json({ message: 'ID inválido' })
    const tiene = await prisma.pedido.count({ where: { clienteId: id } })
    if (tiene > 0)
      return res.status(400).json({ success: false, message: 'No se puede eliminar: el cliente tiene pedidos registrados' })
    await prisma.cliente.delete({ where: { id } })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Error al eliminar cliente' })
  }
})

module.exports = router
