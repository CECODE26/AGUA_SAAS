// Datos de la distribuidora de la petición: marca pública y ajustes del superadmin.
const express = require('express')
const multer  = require('multer')
const path    = require('path')
const fs      = require('fs')
const prisma  = require('../lib/prisma')
const { comoPlataforma } = require('../lib/tenant')
const distribuidoras = require('../lib/distribuidoras')
const { verifyToken, verifySuperAdmin } = require('../middleware/auth')
const { sinArchivosEnDemo } = require('../middleware/distribuidora')

const router = express.Router()

// Lo que el superadmin de la distribuidora puede cambiar por su cuenta.
// Slug, dominio, plan y suspensión los maneja la plataforma.
const EDITABLES = ['nombre', 'colorPrimario', 'telefono', 'whatsapp', 'emailAvisos', 'ciudad', 'provincia', 'depositoLat', 'depositoLng']

function limpiarAjustes(body = {}) {
  const data = {}
  for (const k of EDITABLES) {
    if (body[k] === undefined) continue
    let v = body[k]
    if (k === 'depositoLat' || k === 'depositoLng') {
      v = v === null || v === '' ? null : Number(v)
      if (v !== null && !Number.isFinite(v)) throw Object.assign(new Error('Coordenadas del depósito inválidas'), { status: 400, codigo: 'DATOS_INVALIDOS' })
    } else {
      v = v === null ? null : String(v).trim()
      if (k === 'nombre' && !v) throw Object.assign(new Error('El nombre no puede quedar vacío'), { status: 400, codigo: 'DATOS_INVALIDOS' })
      if (k === 'colorPrimario' && !/^#[0-9a-f]{6}$/i.test(v)) throw Object.assign(new Error('Color inválido, usa el formato #RRGGBB'), { status: 400, codigo: 'DATOS_INVALIDOS' })
      if (v === '' || v === null) {
        // Ciudad y provincia tienen valor por defecto: vacías = no se tocan
        if (k === 'ciudad' || k === 'provincia') continue
        v = null
      }
    }
    data[k] = v
  }
  return data
}

const ajustes = d => ({ ...distribuidoras.publica(d), emailAvisos: d.emailAvisos, dominio: d.dominio, plan: d.plan })

// GET /api/distribuidora — público: nombre, colores y contacto para el sitio y las apps
router.get('/', (req, res) => {
  res.json({ distribuidora: distribuidoras.publica(req.distribuidora) })
})

// GET /api/distribuidora/ajustes — superadmin
router.get('/ajustes', verifyToken, verifySuperAdmin, async (req, res) => {
  const d = await comoPlataforma(() => prisma.distribuidora.findUnique({ where: { id: req.distribuidora.id } }))
  res.json({ distribuidora: ajustes(d) })
})

// PUT /api/distribuidora/ajustes — superadmin
router.put('/ajustes', verifyToken, verifySuperAdmin, async (req, res) => {
  const data = limpiarAjustes(req.body)
  const d = await comoPlataforma(() => prisma.distribuidora.update({ where: { id: req.distribuidora.id }, data }))
  distribuidoras.invalidar()
  res.json({ distribuidora: ajustes(d) })
})

// POST /api/distribuidora/logo — superadmin
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype) &&
      ['.png', '.jpg', '.jpeg', '.webp'].includes(path.extname(file.originalname).toLowerCase())
    cb(ok ? null : new Error('Solo se permiten imágenes JPG, PNG o WEBP'), ok)
  },
})

router.post('/logo', verifyToken, verifySuperAdmin, sinArchivosEnDemo, upload.single('logo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No se recibió ninguna imagen' })
  const ext = path.extname(req.file.originalname).toLowerCase()
  const filename = `logo-${req.distribuidora.slug}-${Date.now()}${ext}`
  fs.writeFileSync(path.join(__dirname, '../uploads', filename), req.file.buffer)

  const anterior = req.distribuidora.logo
  const d = await comoPlataforma(() => prisma.distribuidora.update({ where: { id: req.distribuidora.id }, data: { logo: filename } }))
  if (anterior) fs.rm(path.join(__dirname, '../uploads', path.basename(anterior)), { force: true }, () => {})
  distribuidoras.invalidar()
  res.json({ distribuidora: ajustes(d) })
})

module.exports = router
