// Último middleware: convierte los errores de las rutas en respuestas JSON.
// Antes, un error en una ruta async (por ejemplo, actualizar un id que no existe)
// dejaba la promesa sin atrapar y tumbaba el servidor.
function manejarErrores(err, req, res, next) {
  if (res.headersSent) return next(err)

  // Errores propios con estado (sin distribuidora, registro de otra distribuidora…)
  if (err.status && err.codigo) {
    return res.status(err.status).json({ message: err.message, codigo: err.codigo })
  }
  // Prisma: registro no encontrado / único repetido / id foráneo inválido
  if (err.code === 'P2025') return res.status(404).json({ message: 'Registro no encontrado' })
  if (err.code === 'P2002') return res.status(409).json({ message: 'Ya existe un registro con esos datos' })
  if (err.code === 'P2003') return res.status(400).json({ message: 'El registro relacionado no existe' })
  // JSON mal formado o archivo rechazado por multer
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'JSON inválido' })
  if (err.name === 'MulterError' || /Solo se permiten imágenes/.test(err.message)) {
    return res.status(400).json({ message: err.message })
  }
  // Datos con tipos inválidos para Prisma (por ejemplo, texto donde va un número)
  if (err.name === 'PrismaClientValidationError') return res.status(400).json({ message: 'Datos inválidos' })

  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err)
  res.status(500).json({ message: 'Error interno del servidor' })
}

module.exports = { manejarErrores }
