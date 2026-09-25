const express = require('express')
const jwt = require('jsonwebtoken')
const { verifyToken, verifySuperAdmin, verifyTokenConductor, JWT_SECRET } = require('../middleware/auth')
const prisma = require('../lib/prisma')
const validarId = require('../lib/validarId')
const fidelidad = require('../lib/fidelidad')

const router = express.Router()

// Id del cliente a partir de su token (mismo esquema que /api/clientes/auth)
function clienteIdDeReq(req) {
  try {
    const auth = req.headers.authorization
    if (!auth?.startsWith('Bearer ')) return null
    const { id } = jwt.verify(auth.slice(7), JWT_SECRET)
    return id ?? null
  } catch {
    return null
  }
}

// ── Cliente: su tarjeta ──────────────────────────────────────────────────────
router.get('/mi-tarjeta', async (req, res) => {
  const id = clienteIdDeReq(req)
  if (!id) return res.status(401).json({ message: 'Token inválido' })
  const tarjeta = await fidelidad.tarjetaDe(id)
  if (!tarjeta) return res.status(404).json({ message: 'Cliente no encontrado' })
  res.json({ tarjeta })
})

// ── Chofer: ver si un cliente trae premio (para la app del conductor) ───────
router.get('/cliente/:id', verifyTokenConductor, async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const config = await fidelidad.getConfig()
  if (!config.activo) return res.json({ activo: false, premiosDisponibles: 0 })
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    select: { sellos: true, premiosDisponibles: true },
  })
  if (!cliente) return res.status(404).json({ message: 'Cliente no encontrado' })
  res.json({
    activo: true,
    meta: config.sellosParaPremio,
    sellos: cliente.sellos || 0,
    premiosDisponibles: cliente.premiosDisponibles || 0,
  })
})

// ── Admin: resumen del programa ──────────────────────────────────────────────
router.get('/resumen', verifyToken, async (req, res) => {
  res.json(await fidelidad.resumenAdmin())
})

// ── Admin: leer configuración ────────────────────────────────────────────────
router.get('/config', verifyToken, async (req, res) => {
  res.json({ config: await fidelidad.getConfig() })
})

// ── Superadmin: guardar configuración ────────────────────────────────────────
router.put('/config', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const config = await fidelidad.guardarConfig(req.body)
    res.json({ config })
  } catch (e) {
    res.status(400).json({ message: e.message })
  }
})

// ── Admin: movimientos de un cliente (auditoría) ─────────────────────────────
router.get('/movimientos/:clienteId', verifyToken, async (req, res) => {
  const clienteId = validarId(req.params.clienteId)
  if (!clienteId) return res.status(400).json({ message: 'ID inválido' })
  const movimientos = await prisma.movimientoFidelidad.findMany({
    where: { clienteId },
    orderBy: { creadoEn: 'desc' },
    take: 50,
  })
  res.json({ movimientos })
})

// ── Superadmin: ajuste manual de sellos (con motivo) ─────────────────────────
router.post('/ajuste', verifyToken, verifySuperAdmin, async (req, res) => {
  const clienteId = validarId(req.body.clienteId)
  const sellos = parseInt(req.body.sellos)
  const nota = (req.body.nota || '').trim()
  if (!clienteId || !Number.isInteger(sellos) || sellos === 0) {
    return res.status(400).json({ message: 'Indica el cliente y cuántos sellos sumar o restar' })
  }
  if (!nota) return res.status(400).json({ message: 'Escribe el motivo del ajuste' })

  const config = await fidelidad.getConfig()
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { sellos: true } })
  if (!cliente) return res.status(404).json({ message: 'Cliente no encontrado' })

  await prisma.movimientoFidelidad.create({
    data: { clienteId, tipo: 'ajuste', sellos, origen: 'admin', nota: `${nota} (${req.admin.username})` },
  })

  if (sellos > 0) {
    await fidelidad.acreditar(clienteId, sellos, config)
  } else {
    await prisma.cliente.update({
      where: { id: clienteId },
      data: { sellos: Math.max(0, (cliente.sellos || 0) + sellos) },
    })
  }
  const tarjeta = await fidelidad.tarjetaDe(clienteId)
  res.json({ tarjeta })
})

module.exports = router
