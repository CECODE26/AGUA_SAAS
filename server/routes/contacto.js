const express = require('express')
const { verifyToken } = require('../middleware/auth')
const prisma = require('../lib/prisma')
const validarId = require('../lib/validarId')

const router = express.Router()

// POST /api/contacto — PÚBLICO
router.post('/', async (req, res) => {
  const { nombre, telefono, email, mensaje } = req.body
  if (!nombre || !email || !mensaje) {
    return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' })
  }
  await prisma.contacto.create({ data: { nombre, telefono: telefono || null, email, mensaje } })
  console.log('\n✉️  CONTACTO:', { nombre, email })
  res.json({ success: true, message: 'Mensaje recibido' })
})

// GET /api/contacto — PROTEGIDO (admin)
router.get('/', verifyToken, async (req, res) => {
  const { leido } = req.query
  const mensajes = await prisma.contacto.findMany({
    where:   leido !== undefined ? { leido: leido === 'true' } : {},
    orderBy: { creadoEn: 'desc' },
  })
  const noLeidos = await prisma.contacto.count({ where: { leido: false } })
  res.json({ mensajes, total: mensajes.length, noLeidos })
})

// PATCH /api/contacto/:id/leido — PROTEGIDO (admin)
router.patch('/:id/leido', verifyToken, async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const existe = await prisma.contacto.findUnique({ where: { id } })
  if (!existe) return res.status(404).json({ success: false, message: 'Mensaje no encontrado' })

  const msg = await prisma.contacto.update({
    where: { id },
    data:  { leido: true },
  })
  res.json({ success: true, mensaje: msg })
})

// DELETE /api/contacto/:id — PROTEGIDO (admin)
router.delete('/:id', verifyToken, async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const existe = await prisma.contacto.findUnique({ where: { id } })
  if (!existe) return res.status(404).json({ success: false, message: 'Mensaje no encontrado' })

  await prisma.contacto.delete({ where: { id } })
  res.json({ success: true })
})

module.exports = router
