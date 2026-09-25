const express = require('express')
const bcrypt  = require('bcryptjs')
const { verifyToken } = require('../middleware/auth')
const prisma  = require('../lib/prisma')

const { normalizarUsername, limpiarPassword, usernameOcupado } = require('../lib/usuarios')

const router = express.Router()

router.use(verifyToken)

// ── GET /api/solicitudes — el admin ve sus propias solicitudes ────────────────
router.get('/', async (req, res) => {
  const solicitudes = await prisma.solicitudActivacion.findMany({
    where:   { solicitadoPor: req.admin.username },
    orderBy: { creadoEn: 'desc' },
  })
  res.json({ solicitudes })
})

// ── POST /api/solicitudes — crear solicitud de nuevo admin ───────────────────
router.post('/', async (req, res) => {
  const { tipo, targetNombre, targetTelefono } = req.body
  // Usuario limpio (minúsculas, sin espacios sobrantes) y contraseña sin espacios de más
  const targetUsername = normalizarUsername(req.body.targetUsername)
  const targetPassword = limpiarPassword(req.body.targetPassword)

  if (tipo !== 'admin')
    return res.status(400).json({ message: 'Solo se aceptan solicitudes de tipo admin' })
  if (!targetNombre || !targetUsername || !targetPassword)
    return res.status(400).json({ message: 'nombre, usuario y contraseña son requeridos' })
  if (targetPassword.length < 4) return res.status(400).json({ message: 'La contraseña debe tener al menos 4 caracteres' })

  // Sin duplicados entre admins, choferes ni solicitudes pendientes (sin distinguir mayúsculas)
  const ocupado = await usernameOcupado(targetUsername)
  if (ocupado) return res.status(409).json({ message: ocupado })

  const solicitud = await prisma.solicitudActivacion.create({
    data: {
      tipo: 'admin', targetNombre, targetUsername,
      targetPasswordHash: await bcrypt.hash(targetPassword, 10),
      targetTelefono: targetTelefono ? String(targetTelefono).trim() : null,
      solicitadoPor: req.admin.username,
    },
  })
  res.json({ solicitud })
})

module.exports = router
