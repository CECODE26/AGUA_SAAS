const express   = require('express')
require('express-async-errors')   // los errores de rutas async llegan al manejador de abajo (sin esto tumban el proceso)
const cors      = require('cors')
const path      = require('path')
const rateLimit = require('express-rate-limit')
const { origenPermitido } = require('./lib/distribuidoras')
const { resolverDistribuidora } = require('./middleware/distribuidora')
const { manejarErrores } = require('./middleware/errores')

const app = express()
const PORT = 3001
// Detrás de nginx/Cloudflare: usar la IP real del visitante (necesario para el límite de intentos de login)
app.set('trust proxy', 1)

// CORS: dominios propios de cada distribuidora, subdominios de la plataforma,
// localhost y lo que se agregue en CORS_ORIGINS (ver lib/distribuidoras.js)
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)   // apps móviles y llamadas del mismo servidor
    origenPermitido(origin).then(ok => cb(null, ok)).catch(() => cb(null, false))
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Distribuidora'],
}))
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Rate limiting — login: 20 intentos cada 15 min por IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Demasiados intentos. Espera 15 minutos antes de intentar de nuevo.' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/auth/login',        loginLimiter)
app.use('/api/auth/recuperar',    loginLimiter)   // "olvidé mi contraseña": mismo límite de intentos
app.use('/api/conductores/login', loginLimiter)
app.use('/api/maestro/login',     loginLimiter)
app.use('/api/plataforma/login',  loginLimiter)

// Rate limiting — contacto y recuperación: 10 envíos por hora por IP
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { message: 'Demasiados envíos. Espera una hora antes de intentar de nuevo.' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/contacto',                   emailLimiter)
app.use('/api/clientes/auth/recuperar',    emailLimiter)

// Cada petición /api queda asociada a su distribuidora (middleware/distribuidora.js)
app.use('/api', resolverDistribuidora)

// Rutas
app.use('/api/plataforma',      require('./routes/plataforma'))
app.use('/api/distribuidora',   require('./routes/distribuidora'))
app.use('/api/auth',           require('./routes/auth'))
app.use('/api/clientes/auth',  require('./routes/clienteAuth'))
app.use('/api/pedidos',   require('./routes/pedidos'))
app.use('/api/usuarios',  require('./routes/usuarios'))
app.use('/api/productos', require('./routes/productos'))

app.use('/api/contacto',  require('./routes/contacto'))
app.use('/api/uploads',   require('./routes/uploads'))
app.use('/api/reportes',  require('./routes/reportes'))
app.use('/api/planrutas',   require('./routes/planrutas'))
app.use('/api/conductores', require('./routes/conductores'))
app.use('/api/map-tiles',   require('./routes/mapTiles'))
app.use('/api/camiones',        require('./routes/camiones'))
app.use('/api/localidades',     require('./routes/localidades'))
app.use('/api/solicitudes',     require('./routes/solicitudes'))
app.use('/api/superadmin',      require('./routes/superadmin'))
app.use('/api/notificaciones',  require('./routes/notificaciones'))
app.use('/api/fidelidad',                 require('./routes/fidelidad'))
app.use('/api/maestro',         require('./routes/maestro'))
app.use('/api/contenido',       require('./routes/contenido'))

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Agua Elite API running' })
})

app.use(manejarErrores)

app.listen(PORT, () => {
  console.log(`✅ Servidor Agua Elite corriendo en http://localhost:${PORT}`)

  // Traspaso nocturno: mover pedidos no entregados a la ruta del día siguiente
  // Se dispara a las 20:00 hora Ecuador (01:00 UTC) usando setTimeout recursivo
  require('./lib/traspasoNocturno')
})
