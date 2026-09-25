const express = require('express')
const { verifyToken, verifySuperAdmin } = require('../middleware/auth')
const fs = require('fs')
const path = require('path')
const multer = require('multer')

const router = express.Router()
// Dentro de uploads/ para que viva en el volumen persistente:
// las ediciones sobreviven a los rebuilds del contenedor
const CONTENT_FILE = path.join(__dirname, '../uploads/contenido.json')

function readContent() {
  if (!fs.existsSync(CONTENT_FILE)) return {}
  try { return JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8')) } catch { return {} }
}

// GET /api/contenido — público (lo leen las páginas del sitio)
router.get('/', (req, res) => {
  res.json(readContent())
})

// PUT /api/contenido — solo superadmin
router.put('/', verifyToken, verifySuperAdmin, (req, res) => {
  fs.writeFileSync(CONTENT_FILE, JSON.stringify(req.body, null, 2))
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
