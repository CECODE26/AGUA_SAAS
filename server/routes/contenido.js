const express = require('express')
const { verifyToken, verifySuperAdmin } = require('../middleware/auth')
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const prisma = require('../lib/prisma')
const { comoPlataforma } = require('../lib/tenant')

const router = express.Router()
// Los textos editables del sitio se guardan en Distribuidora.contenido (uno por empresa).
// Antes vivían en uploads/contenido.json; prisma/importar-contenido.js los pasa a la base.

// GET /api/contenido — público (lo leen las páginas del sitio)
router.get('/', async (req, res) => {
  const id = req.distribuidora.id
  const d = await comoPlataforma(() => prisma.distribuidora.findUnique({ where: { id }, select: { contenido: true } }))
  res.json(d?.contenido ?? {})
})

// PUT /api/contenido — solo superadmin
router.put('/', verifyToken, verifySuperAdmin, async (req, res) => {
  const contenido = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {}
  await comoPlataforma(() => prisma.distribuidora.update({ where: { id: req.distribuidora.id }, data: { contenido } }))
  res.json({ ok: true })
})

// Multer para imágenes de contenido
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/contenido')
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}${ext}`)
  },
})
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } })

// POST /api/contenido/imagen — solo superadmin
router.post('/imagen', verifyToken, verifySuperAdmin, upload.single('imagen'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' })
  res.json({ url: `/uploads/contenido/${req.file.filename}` })
})

module.exports = router
