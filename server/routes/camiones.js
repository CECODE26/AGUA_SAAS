const express = require('express')
const { verifyToken, verifySuperAdmin } = require('../middleware/auth')
const prisma = require('../lib/prisma')
const validarId = require('../lib/validarId')

const router = express.Router()

const selectCamion = {
  id: true, placa: true, marca: true, modelo: true,
  color: true, anio: true, activo: true, rutaLibre: true, poligono: true, creadoEn: true,
  conductor: { select: { id: true, nombre: true, username: true, activo: true } },
}

// ── GET /api/camiones — todos los admins pueden ver la flota ─────────────────
router.get('/', verifyToken, async (req, res) => {
  const camiones = await prisma.camion.findMany({
    orderBy: { id: 'asc' },
    select: selectCamion,
  })
  res.json({ camiones })
})

// ── POST /api/camiones — cualquier admin crea camiones ───────────────────────
router.post('/', verifyToken, async (req, res) => {
  const { placa, marca, modelo, color, anio } = req.body
  if (!placa || !marca) return res.status(400).json({ message: 'placa y marca son requeridos' })

  const existe = await prisma.camion.findUnique({ where: { placa: placa.toUpperCase() } })
  if (existe) return res.status(409).json({ message: 'Ya existe un camión con esa placa' })

  const camion = await prisma.camion.create({
    data: { placa: placa.toUpperCase(), marca, modelo, color, anio: anio ? parseInt(anio) : null },
    select: selectCamion,
  })
  res.json({ camion })
})

// ── PUT /api/camiones/:id — editar datos del camión ──────────────────────────
router.put('/:id', verifyToken, async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const { placa, marca, modelo, color, anio, activo, rutaLibre } = req.body

  // Desactivación TOTAL en cascada: al apagar el camión, sus zonas pasan al
  // pool (libres para otro camión) y su chofer queda libre (sin camión).
  if (activo === false) {
    await prisma.$transaction([
      prisma.localidad.updateMany({ where: { camionId: id }, data: { camionId: null } }),
      prisma.conductor.updateMany({ where: { camionId: id }, data: { camionId: null } }),
      prisma.camion.update({ where: { id }, data: { activo: false } }),
    ])
    const camion = await prisma.camion.findUnique({ where: { id }, select: selectCamion })
    return res.json({ camion, cascada: true })
  }

  const data = {}
  if (placa  !== undefined) data.placa  = placa.toUpperCase()
  if (marca  !== undefined) data.marca  = marca
  if (modelo !== undefined) data.modelo = modelo
  if (color  !== undefined) data.color  = color
  if (anio   !== undefined) data.anio   = anio ? parseInt(anio) : null
  if (activo !== undefined) data.activo = activo
  if (rutaLibre !== undefined) data.rutaLibre = !!rutaLibre

  const camion = await prisma.camion.update({ where: { id }, data, select: selectCamion })
  res.json({ camion })
})

// ── PATCH /api/camiones/:id/asignar — asignar conductor a camión ──────────────
router.patch('/:id/asignar', verifyToken, async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const conductorId = req.body.conductorId ? parseInt(req.body.conductorId) : null

  // Verificar que el conductor no tiene ya otro camión asignado
  if (conductorId) {
    const conductor = await prisma.conductor.findUnique({ where: { id: conductorId } })
    if (!conductor) return res.status(404).json({ message: 'Conductor no encontrado' })
    if (conductor.camionId && conductor.camionId !== id) {
      return res.status(409).json({ message: 'Este conductor ya tiene otro camión asignado' })
    }
  }

  // Liberar el conductor que tenía este camión antes (si hay uno distinto)
  const camionActual = await prisma.camion.findUnique({
    where: { id },
    select: { conductor: { select: { id: true } } },
  })
  if (camionActual?.conductor?.id && camionActual.conductor.id !== conductorId) {
    await prisma.conductor.update({
      where: { id: camionActual.conductor.id },
      data:  { camionId: null },
    })
  }

  // Asignar o desasignar
  if (conductorId) {
    await prisma.conductor.update({ where: { id: conductorId }, data: { camionId: id } })
  } else if (camionActual?.conductor?.id) {
    await prisma.conductor.update({ where: { id: camionActual.conductor.id }, data: { camionId: null } })
  }

  const camionActualizado = await prisma.camion.findUnique({ where: { id }, select: selectCamion })
  res.json({ camion: camionActualizado })
})

// ── PATCH /api/camiones/:id/poligono — guardar zona de cobertura ─────────────
router.patch('/:id/poligono', verifyToken, async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const { poligono } = req.body
  if (!Array.isArray(poligono)) return res.status(400).json({ message: 'poligono debe ser un array de coordenadas' })
  const camion = await prisma.camion.update({ where: { id }, data: { poligono }, select: selectCamion })
  res.json({ camion })
})

// ── GET /api/camiones/:id/resumen — indicadores de la ficha operativa ────────
// Todo sale de datos existentes: rutas (Localidad), la ruta del día del chofer
// (PlanRuta/PlanRutaItem), ventas exprés (Pedido origen=express), GPS del chofer
// (Conductor.ubicacion*) e historial de asignaciones (HistorialConductorCamion).
router.get('/:id/resumen', verifyToken, async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })

  const camion = await prisma.camion.findUnique({
    where: { id },
    select: {
      id: true, placa: true,
      conductor: { select: { id: true, nombre: true, ubicacionLat: true, ubicacionLng: true, ubicacionAt: true } },
      localidades: { select: { id: true, nombre: true, activo: true } },
    },
  })
  if (!camion) return res.status(404).json({ message: 'Camión no encontrado' })

  const hoyStr = new Date().toISOString().split('T')[0]
  const inicio = new Date(hoyStr + 'T00:00:00Z')
  const fin    = new Date(hoyStr + 'T23:59:59Z')

  const rutasActivas   = camion.localidades.filter(l => l.activo).length
  const rutasInactivas = camion.localidades.length - rutasActivas

  // Ruta del día y paradas (solo si hay chofer asignado)
  let rutaHoy = null
  let paradasHoy = { total: 0, entregadas: 0, pendientes: 0, noEntregadas: 0 }
  let ventasExpresHoy = { cantidad: 0, total: 0 }
  let ultimaEntrega = null
  let ultimaVenta = null
  if (camion.conductor) {
    const ruta = await prisma.planRuta.findFirst({
      where: { conductorId: camion.conductor.id, fecha: { gte: inicio, lte: fin } },
      select: {
        id: true, nombre: true, creadoEn: true,
        items: { select: { pedido: { select: { estado: true, actualizadoEn: true } } } },
      },
    })
    if (ruta) {
      rutaHoy = { id: ruta.id, nombre: ruta.nombre, creadoEn: ruta.creadoEn }
      for (const it of ruta.items) {
        paradasHoy.total++
        const e = it.pedido.estado
        if (e === 'entregado') {
          paradasHoy.entregadas++
          if (!ultimaEntrega || it.pedido.actualizadoEn > ultimaEntrega) ultimaEntrega = it.pedido.actualizadoEn
        } else if (e === 'no_entregado') paradasHoy.noEntregadas++
        else paradasHoy.pendientes++
      }
    }
    const ventas = await prisma.pedido.findMany({
      where: { conductorId: camion.conductor.id, origen: 'express', creadoEn: { gte: inicio, lte: fin } },
      select: { total: true, creadoEn: true },
      orderBy: { creadoEn: 'desc' },
    })
    ventasExpresHoy = { cantidad: ventas.length, total: ventas.reduce((s, v) => s + Number(v.total || 0), 0) }
    ultimaVenta = ventas[0]?.creadoEn ?? null
  }

  const historial = await prisma.historialConductorCamion.findMany({
    where: { camionId: id },
    orderBy: { asignadoEn: 'desc' },
    take: 5,
    select: { conductorNombre: true, asignadoEn: true, removidoEn: true },
  })

  // Actividad reciente: solo hechos que el sistema registra con fecha
  const actividad = []
  if (rutaHoy) actividad.push({ cuando: rutaHoy.creadoEn, texto: `Ruta del día "${rutaHoy.nombre}" creada con ${paradasHoy.total} parada${paradasHoy.total !== 1 ? 's' : ''}.` })
  if (ultimaEntrega) actividad.push({ cuando: ultimaEntrega, texto: `Última entrega registrada (${paradasHoy.entregadas} de ${paradasHoy.total} paradas de hoy).` })
  if (ultimaVenta) actividad.push({ cuando: ultimaVenta, texto: `Venta exprés registrada por ${camion.conductor.nombre}.` })
  for (const h of historial.slice(0, 2)) {
    actividad.push(h.removidoEn
      ? { cuando: h.removidoEn, texto: `${h.conductorNombre} dejó de ser el chofer de ${camion.placa}.` }
      : { cuando: h.asignadoEn, texto: `${h.conductorNombre} asignado como chofer de ${camion.placa}.` })
  }
  actividad.sort((a, b) => new Date(b.cuando) - new Date(a.cuando))

  const c = camion.conductor
  res.json({
    rutasActivas, rutasInactivas, rutaHoy, paradasHoy, ventasExpresHoy,
    ultimaSenal: c?.ubicacionAt ? { at: c.ubicacionAt, lat: c.ubicacionLat, lng: c.ubicacionLng } : null,
    historial,
    actividad: actividad.slice(0, 5),
  })
})

// ── DELETE /api/camiones/:id ─────────────────────────────────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const camion = await prisma.camion.findUnique({
    where: { id },
    select: { conductor: { select: { id: true } } },
  })
  if (!camion) return res.status(404).json({ message: 'Camión no encontrado' })
  if (camion.conductor) return res.status(400).json({ message: 'Desasigna el conductor antes de eliminar el camión' })

  await prisma.camion.delete({ where: { id } })
  res.json({ success: true })
})

module.exports = router
