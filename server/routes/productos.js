const express = require('express')
const { verifyToken } = require('../middleware/auth')
const prisma = require('../lib/prisma')
const validarId = require('../lib/validarId')

const router = express.Router()

// GET /api/productos — PÚBLICO (solo activos) / ADMIN (todos con ?all=true)
router.get('/', async (req, res) => {
  const where = req.query.all === 'true' ? {} : { activo: true }
  const productos = await prisma.producto.findMany({
    where,
    orderBy: [{ orden: 'asc' }, { id: 'asc' }],
  })
  res.json({ productos })
})

// PUT /api/productos/reordenar — PROTEGIDO
router.put('/reordenar', verifyToken, async (req, res) => {
  const { ids } = req.body || {}

  if (!Array.isArray(ids) || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    return res.status(400).json({
      success: false,
      message: 'ids debe ser un arreglo de IDs numéricos válidos',
    })
  }

  if (new Set(ids).size !== ids.length) {
    return res.status(400).json({
      success: false,
      message: 'La lista de productos no puede contener IDs duplicados',
    })
  }

  try {
    const productos = await prisma.$transaction(async (tx) => {
      const existentes = await tx.producto.findMany({ select: { id: true } })
      const idsRecibidos = new Set(ids)

      if (
        ids.length !== existentes.length ||
        existentes.some(({ id }) => !idsRecibidos.has(id))
      ) {
        const error = new Error('La lista debe incluir exactamente todos los productos existentes')
        error.statusCode = 400
        throw error
      }

      for (const [orden, id] of ids.entries()) {
        await tx.producto.update({
          where: { id },
          data: { orden },
        })
      }

      return tx.producto.findMany({
        orderBy: [{ orden: 'asc' }, { id: 'asc' }],
      })
    })

    return res.json({ success: true, productos })
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ success: false, message: error.message })
    }

    console.error('Error al reordenar productos:', error)
    return res.status(500).json({ success: false, message: 'Error interno al reordenar productos' })
  }
})

// PATCH /api/productos/:id/toggle — PROTEGIDO (activa/desactiva)
router.patch('/:id/toggle', verifyToken, async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const existe = await prisma.producto.findUnique({ where: { id } })
  if (!existe) return res.status(404).json({ success: false, message: 'Producto no encontrado' })
  const producto = await prisma.producto.update({
    where: { id },
    data: { activo: !existe.activo },
  })
  res.json({ success: true, producto })
})

// POST /api/productos — PROTEGIDO
router.post('/', verifyToken, async (req, res) => {
  const { nombre, descripcion, precio, stock, tag } = req.body
  if (!nombre || precio == null || stock == null) {
    return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' })
  }
  const producto = await prisma.$transaction(async (tx) => {
    const ultimoOrden = await tx.producto.aggregate({ _max: { orden: true } })

    return tx.producto.create({
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || '',
        precio: parseFloat(precio),
        stock: parseInt(stock),
        tag: tag?.trim() || null,
        orden: (ultimoOrden._max.orden ?? -1) + 1,
      },
    })
  })
  res.status(201).json({ success: true, producto })
})

// PUT /api/productos/:id — PROTEGIDO
router.put('/:id', verifyToken, async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const { nombre, descripcion, precio, stock, tag } = req.body

  const existe = await prisma.producto.findUnique({ where: { id } })
  if (!existe) return res.status(404).json({ success: false, message: 'Producto no encontrado' })

  const producto = await prisma.producto.update({
    where: { id },
    data: {
      ...(nombre      != null && { nombre: nombre.trim() }),
      ...(descripcion != null && { descripcion: descripcion.trim() }),
      ...(precio      != null && { precio: parseFloat(precio) }),
      ...(stock       != null && { stock: parseInt(stock) }),
      ...(tag !== undefined   && { tag: tag?.trim() || null }),
    },
  })
  res.json({ success: true, producto })
})

// DELETE /api/productos/:id — PROTEGIDO (desactiva, no borra)
router.delete('/:id', verifyToken, async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const existe = await prisma.producto.findUnique({ where: { id } })
  if (!existe) return res.status(404).json({ success: false, message: 'Producto no encontrado' })

  await prisma.producto.update({ where: { id }, data: { activo: false } })
  res.json({ success: true })
})

module.exports = router
