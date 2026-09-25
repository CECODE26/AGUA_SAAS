const express = require('express')
const bcrypt  = require('bcryptjs')
const { verifyToken, verifySuperAdmin } = require('../middleware/auth')
const prisma  = require('../lib/prisma')
const validarId = require('../lib/validarId')
const { normalizarUsername, limpiarPassword, usernameOcupado } = require('../lib/usuarios')

const router = express.Router()

// Todas las rutas requieren ser superadmin
router.use(verifyToken, verifySuperAdmin)

// ── GET /api/superadmin/solicitudes ───────────────────────────────────────────
// Lista solicitudes (por defecto solo pendientes)
router.get('/solicitudes', async (req, res) => {
  const { estado } = req.query
  const where = estado ? { estado } : {}
  const solicitudes = await prisma.solicitudActivacion.findMany({
    where,
    orderBy: { creadoEn: 'desc' },
  })
  res.json({ solicitudes })
})

// ── POST /api/superadmin/solicitudes/:id/aprobar ──────────────────────────────
router.post('/solicitudes/:id/aprobar', async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const nota = req.body.nota || null

  const solicitud = await prisma.solicitudActivacion.findUnique({ where: { id } })
  if (!solicitud) return res.status(404).json({ message: 'Solicitud no encontrada' })
  if (solicitud.estado !== 'pendiente') return res.status(400).json({ message: 'La solicitud ya fue resuelta' })

  // El usuario se guarda limpio y no puede repetirse (aunque cambien las mayúsculas)
  if (solicitud.targetUsername) {
    const ocupado = await usernameOcupado(solicitud.targetUsername, { ignorarSolicitudId: solicitud.id })
    if (ocupado) return res.status(409).json({ message: `${ocupado}. Rechaza esta solicitud y pide otra con un usuario distinto.` })
  }

  // ── conductor ─────────────────────────────────────────────────────────────
  if (solicitud.tipo === 'conductor') {
    await prisma.conductor.create({
      data: {
        nombre:       solicitud.targetNombre,
        username:     normalizarUsername(solicitud.targetUsername),
        passwordHash: solicitud.targetPasswordHash,
        activo:       true,
        telefono:     solicitud.targetTelefono || null,
        ...(solicitud.targetId ? { camionId: solicitud.targetId } : {}),
      },
    })
    // Registrar en historial si viene con camión
    if (solicitud.targetId) {
      await prisma.historialConductorCamion.create({
        data: {
          camionId:        solicitud.targetId,
          conductorNombre: solicitud.targetNombre,
          asignadoEn:      new Date(),
        },
      })
    }

  // ── admin ──────────────────────────────────────────────────────────────────
  } else if (solicitud.tipo === 'admin') {
    await prisma.admin.create({
      data: {
        username:     normalizarUsername(solicitud.targetUsername),
        passwordHash: solicitud.targetPasswordHash,
        rol:          'admin',
        activo:       true,
        telefono:     solicitud.targetTelefono || null,
      },
    })

  // ── camion_nuevo ───────────────────────────────────────────────────────────
  } else if (solicitud.tipo === 'camion_nuevo') {
    // 1. Crear el camión
    const camion = await prisma.camion.create({
      data: {
        placa:   solicitud.camionPlaca,
        marca:   solicitud.camionMarca,
        modelo:  solicitud.camionModelo || null,
        color:   solicitud.camionColor  || null,
        anio:    solicitud.camionAnio   || null,
        activo:  true,
      },
    })
    // 2. Crear el conductor y asignarlo al camión
    await prisma.conductor.create({
      data: {
        nombre:       solicitud.targetNombre,
        username:     normalizarUsername(solicitud.targetUsername),
        passwordHash: solicitud.targetPasswordHash,
        activo:       true,
        camionId:     camion.id,
      },
    })
    // 3. Registrar en historial
    await prisma.historialConductorCamion.create({
      data: {
        camionId:        camion.id,
        conductorNombre: solicitud.targetNombre,
        asignadoEn:      new Date(),
      },
    })

  // ── cambio_conductor ───────────────────────────────────────────────────────
  } else if (solicitud.tipo === 'cambio_conductor') {
    const camionId = solicitud.targetId
    if (!camionId) return res.status(400).json({ message: 'Solicitud sin camionId' })

    const camion = await prisma.camion.findUnique({
      where:   { id: camionId },
      include: { conductor: true },
    })
    if (!camion) return res.status(404).json({ message: 'Camión no encontrado' })

    // 1. Cerrar el historial del conductor anterior
    if (camion.conductor) {
      await prisma.historialConductorCamion.updateMany({
        where: { camionId, conductorId: camion.conductor.id, removidoEn: null },
        data:  { removidoEn: new Date() },
      })
      // Desasociar al conductor anterior del camión
      await prisma.conductor.update({
        where: { id: camion.conductor.id },
        data:  { camionId: null, activo: false },
      })
    }

    // 2. Crear el nuevo conductor y asignarlo
    const nuevoConductor = await prisma.conductor.create({
      data: {
        nombre:       solicitud.targetNombre,
        username:     normalizarUsername(solicitud.targetUsername),
        passwordHash: solicitud.targetPasswordHash,
        activo:       true,
        camionId,
      },
    })

    // 3. Registrar nuevo conductor en historial
    await prisma.historialConductorCamion.create({
      data: {
        camionId,
        conductorId:     nuevoConductor.id,
        conductorNombre: solicitud.targetNombre,
        asignadoEn:      new Date(),
      },
    })
  }

  const updated = await prisma.solicitudActivacion.update({
    where: { id },
    data:  { estado: 'aprobada', nota, resueltaEn: new Date() },
  })

  res.json({ success: true, solicitud: updated })
})

// ── POST /api/superadmin/solicitudes/:id/rechazar ─────────────────────────────
router.post('/solicitudes/:id/rechazar', async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const nota = req.body.nota || null

  const solicitud = await prisma.solicitudActivacion.findUnique({ where: { id } })
  if (!solicitud) return res.status(404).json({ message: 'Solicitud no encontrada' })
  if (solicitud.estado !== 'pendiente') return res.status(400).json({ message: 'La solicitud ya fue resuelta' })

  const updated = await prisma.solicitudActivacion.update({
    where: { id },
    data:  { estado: 'rechazada', nota, resueltaEn: new Date() },
  })

  res.json({ success: true, solicitud: updated })
})

// ── GET /api/superadmin/admins ────────────────────────────────────────────────
router.get('/admins', async (req, res) => {
  const admins = await prisma.admin.findMany({
    orderBy: { id: 'asc' },
    select: { id: true, username: true, rol: true, activo: true, creadoEn: true, telefono: true, totpActivo: true, totpLogin: true },
  })
  res.json({ admins })
})

// ── PATCH /api/superadmin/admins/:id/activo ───────────────────────────────────
router.patch('/admins/:id/activo', async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const { activo } = req.body
  const admin = await prisma.admin.update({
    where: { id },
    data:  { activo },
    select: { id: true, username: true, rol: true, activo: true, creadoEn: true, telefono: true, totpActivo: true, totpLogin: true },
  })
  res.json({ admin })
})

// ── PATCH /api/superadmin/admins/:id — datos de contacto (celular) ───────────
router.patch('/admins/:id', async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const telefono = req.body.telefono != null ? String(req.body.telefono).trim() : undefined
  if (telefono === undefined) return res.status(400).json({ message: 'Nada que actualizar' })
  const admin = await prisma.admin.update({
    where: { id },
    data:  { telefono: telefono || null },
    select: { id: true, username: true, rol: true, activo: true, creadoEn: true, telefono: true, totpActivo: true, totpLogin: true },
  })
  res.json({ admin })
})

// ── PATCH /api/superadmin/admins/:id/password — restablecer contraseña ───────
// Si el superadmin tiene verificación en dos pasos, exige su código.
router.patch('/admins/:id/password', async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const { nueva, codigo } = req.body
  if (!nueva || String(nueva).length < 6) return res.status(400).json({ message: 'La contraseña nueva debe tener al menos 6 caracteres' })

  const yo = await prisma.admin.findUnique({ where: { username: req.admin.username } })
  if (yo?.totpActivo) {
    const { authenticator } = require('otplib')
    authenticator.options = { window: 1 }
    let ok = false
    try { ok = !!codigo && authenticator.check(String(codigo).replace(/\s+/g, ''), yo.totpSecret) } catch { ok = false }
    if (!ok) return res.status(400).json({ message: 'Código de verificación incorrecto' })
  }

  const target = await prisma.admin.findUnique({ where: { id } })
  if (!target) return res.status(404).json({ message: 'Admin no encontrado' })
  const admin = await prisma.admin.update({
    where: { id },
    data:  { passwordHash: await bcrypt.hash(limpiarPassword(nueva), 10) },
    select: { id: true, username: true, rol: true, activo: true, creadoEn: true, telefono: true, totpActivo: true, totpLogin: true },
  })
  res.json({ admin })
})

// ── DELETE /api/superadmin/admins/:id ────────────────────────────────────────
router.delete('/admins/:id', async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  // No se puede eliminar a sí mismo
  const target = await prisma.admin.findUnique({ where: { id } })
  if (!target) return res.status(404).json({ message: 'Admin no encontrado' })
  if (target.username === req.admin.username) return res.status(400).json({ message: 'No puedes eliminarte a ti mismo' })

  await prisma.admin.delete({ where: { id } })
  res.json({ success: true })
})

// ── PATCH /api/superadmin/conductores/:id/activo ──────────────────────────────
router.patch('/conductores/:id/activo', async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const { activo } = req.body
  const conductor = await prisma.conductor.update({
    where: { id },
    data:  { activo },
    select: { id: true, nombre: true, username: true, activo: true, creadoEn: true },
  })
  res.json({ conductor })
})

module.exports = router
