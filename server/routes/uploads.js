const express  = require('express')
const multer   = require('multer')
const path     = require('path')
const fs       = require('fs')
const { verifyToken } = require('../middleware/auth')
const prisma   = require('../lib/prisma')
const validarId = require('../lib/validarId')
const { normalizarImagen } = require('../lib/normalizarImagen')

const router = express.Router()

// multer en memoria: procesamos el buffer con sharp antes de guardar
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB máximo
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp']
    const allowedExts  = ['.jpg', '.jpeg', '.png', '.webp']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) cb(null, true)
    else cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'))
  },
})

// POST /api/uploads/producto/:id — sube imagen, la normaliza y actualiza el producto
router.post('/producto/:id', verifyToken, upload.single('imagen'), async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  if (!req.file) return res.status(400).json({ success: false, message: 'No se recibió ningún archivo' })

  const producto = await prisma.producto.findUnique({ where: { id } })
  if (!producto) return res.status(404).json({ success: false, message: 'Producto no encontrado' })

  let filename
  try {
    const normalizada = await normalizarImagen(req.file.buffer)
    filename = `producto-${Date.now()}.png`
    fs.writeFileSync(path.join(__dirname, '../uploads', filename), normalizada)
  } catch (err) {
    return res.status(500).json({ success: false, message: 'No se pudo procesar la imagen' })
  }

  // Eliminar imagen anterior si existe
  if (producto.imagen) {
    const anterior = path.join(__dirname, '../uploads', producto.imagen)
    if (fs.existsSync(anterior)) fs.unlinkSync(anterior)
  }

  await prisma.producto.update({
    where: { id },
    data:  { imagen: filename },
  })

  res.json({ success: true, imagen: filename })
})

module.exports = router
