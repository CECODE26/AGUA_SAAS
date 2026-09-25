const express = require('express')
const { verifyToken } = require('../middleware/auth')
const prisma = require('../lib/prisma')
const validarId = require('../lib/validarId')
const { buscarConflictoDeZona } = require('../lib/geoZonas')

const router = express.Router()

const selectLocalidad = {
  id: true, nombre: true, poligono: true, color: true, activo: true,
  camionId: true, creadoEn: true,
  camion: { select: { id: true, placa: true } },
}

function poligonoValido(p) {
  return Array.isArray(p) && p.length >= 3
}

// Mensaje uniforme cuando una ruta se cruza con la de otro camión
function respuestaConflicto(res, conflicto) {
  return res.status(409).json({
    message: `La ruta se cruza con "${conflicto.nombre}" del camión ${conflicto.camion?.placa ?? 'sin placa'}. ` +
             'Ajusta el dibujo o desactiva la otra ruta primero.',
    conflicto: { id: conflicto.id, nombre: conflicto.nombre, placa: conflicto.camion?.placa ?? null },
  })
}

// ── GET /api/localidades — todas las localidades (con su camión) ──────────────
router.get('/', verifyToken, async (req, res) => {
  const localidades = await prisma.localidad.findMany({
    orderBy: { id: 'asc' },
    select: selectLocalidad,
  })
  res.json({ localidades })
})

// ── POST /api/localidades — crear localidad (asignada o en el pool) ───────────
router.post('/', verifyToken, async (req, res) => {
  const { nombre, poligono, color, camionId } = req.body
  if (!nombre || !nombre.trim()) return res.status(400).json({ message: 'El nombre es requerido' })
  if (!poligonoValido(poligono)) return res.status(400).json({ message: 'Dibuja una zona con al menos 3 puntos' })

  if (camionId) {
    const camion = await prisma.camion.findUnique({ where: { id: parseInt(camionId) } })
    if (!camion) return res.status(404).json({ message: 'Camión no encontrado' })
    const conflicto = await buscarConflictoDeZona({ poligono, camionId })
    if (conflicto) return respuestaConflicto(res, conflicto)
  }

  const localidad = await prisma.localidad.create({
    data: {
      nombre: nombre.trim(),
      poligono,
      color: color || null,
      camionId: camionId ? parseInt(camionId) : null,
    },
    select: selectLocalidad,
  })
  res.json({ localidad })
})

// ── PUT /api/localidades/:id — editar nombre / color / activo ─────────────────
router.put('/:id', verifyToken, async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const { nombre, color, activo } = req.body

  const data = {}
  if (nombre !== undefined) {
    if (!nombre.trim()) return res.status(400).json({ message: 'El nombre no puede quedar vacío' })
    data.nombre = nombre.trim()
  }
  if (color  !== undefined) data.color  = color || null
  if (activo !== undefined) data.activo = !!activo

  // Reactivar una ruta puede resucitar un cruce con otra creada mientras estaba apagada
  if (data.activo === true) {
    const actual = await prisma.localidad.findUnique({ where: { id }, select: { poligono: true, camionId: true } })
    if (actual?.camionId) {
      const conflicto = await buscarConflictoDeZona({ poligono: actual.poligono, camionId: actual.camionId, ignorarId: id })
      if (conflicto) return respuestaConflicto(res, conflicto)
    }
  }

  const localidad = await prisma.localidad.update({ where: { id }, data, select: selectLocalidad })
  res.json({ localidad })
})

// ── PATCH /api/localidades/:id/poligono — redibujar la zona ───────────────────
router.patch('/:id/poligono', verifyToken, async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const { poligono } = req.body
  if (!poligonoValido(poligono)) return res.status(400).json({ message: 'La zona necesita al menos 3 puntos' })

  const actual = await prisma.localidad.findUnique({ where: { id }, select: { camionId: true, activo: true } })
  if (actual?.camionId && actual.activo) {
    const conflicto = await buscarConflictoDeZona({ poligono, camionId: actual.camionId, ignorarId: id })
    if (conflicto) return respuestaConflicto(res, conflicto)
  }

  const localidad = await prisma.localidad.update({ where: { id }, data: { poligono }, select: selectLocalidad })
  res.json({ localidad })
})

// ── PATCH /api/localidades/:id/asignar — asignar o quitar camión ──────────────
router.patch('/:id/asignar', verifyToken, async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const camionId = req.body.camionId ? parseInt(req.body.camionId) : null

  if (camionId) {
    const camion = await prisma.camion.findUnique({ where: { id: camionId } })
    if (!camion) return res.status(404).json({ message: 'Camión no encontrado' })
    const actual = await prisma.localidad.findUnique({ where: { id }, select: { poligono: true, activo: true } })
    if (actual?.activo) {
      const conflicto = await buscarConflictoDeZona({ poligono: actual.poligono, camionId, ignorarId: id })
      if (conflicto) return respuestaConflicto(res, conflicto)
    }
  }

  const localidad = await prisma.localidad.update({ where: { id }, data: { camionId }, select: selectLocalidad })
  res.json({ localidad })
})

// ── PATCH /api/localidades/:id/tomar — un camión toma una ruta libre ──────────
// Ruta libre = sin camión (pool) o desactivada. Se asigna Y se activa en un solo
// paso, validando que no se cruce con rutas activas de otros camiones.
router.patch('/:id/tomar', verifyToken, async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const camionId = parseInt(req.body.camionId)
  if (!Number.isInteger(camionId) || camionId <= 0) return res.status(400).json({ message: 'Indica el camión que toma la ruta' })

  const camion = await prisma.camion.findUnique({ where: { id: camionId }, select: { id: true, activo: true } })
  if (!camion) return res.status(404).json({ message: 'Camión no encontrado' })
  if (!camion.activo) return res.status(400).json({ message: 'El camión está inactivo; actívalo antes de darle rutas' })

  const actual = await prisma.localidad.findUnique({ where: { id }, select: { poligono: true, activo: true, camionId: true } })
  if (!actual) return res.status(404).json({ message: 'Ruta no encontrada' })
  const libre = actual.camionId === null || actual.activo === false
  if (!libre) return res.status(409).json({ message: 'Esa ruta está activa en otro camión. Desactívala primero.' })

  const conflicto = await buscarConflictoDeZona({ poligono: actual.poligono, camionId, ignorarId: id })
  if (conflicto) return respuestaConflicto(res, conflicto)

  const localidad = await prisma.localidad.update({ where: { id }, data: { camionId, activo: true }, select: selectLocalidad })
  res.json({ localidad })
})

// ── DELETE /api/localidades/:id ───────────────────────────────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  await prisma.localidad.delete({ where: { id } }).catch(() => {})
  res.json({ success: true })
})

module.exports = router
