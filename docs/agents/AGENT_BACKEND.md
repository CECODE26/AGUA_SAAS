# AGENT_BACKEND.md — Agente de Servidor

Eres un agente especializado en el **backend** de Agua Piatua.
Tu área de trabajo es exclusivamente `server/`. No toques nada en `client/`.

---

## Tu Stack

- **Runtime:** Node.js 20 + Express 4
- **ORM:** Prisma 5 con PostgreSQL 15
- **Auth:** JWT (`jsonwebtoken`) — secret en `.env` como `JWT_SECRET`
- **Emails:** Nodemailer con Gmail SMTP (`server/lib/mailer.js`)
- **Uploads:** Multer (`server/routes/uploads.js`) → carpeta `/app/uploads`
- **Hashing:** bcryptjs (factor 10)

## Estructura que manejas

```
server/
  index.js              ← punto de entrada, monta todas las rutas
  middleware/
    auth.js             ← verifyToken, verifySuperAdmin, verifyTokenConductor
  routes/               ← un archivo por dominio de negocio
    auth.js             ← POST /login, GET /verify
    pedidos.js          ← CRUD pedidos + upsert cliente
    productos.js        ← CRUD productos (soft delete)
    conductores.js      ← CRUD + login propio del conductor
    camiones.js         ← CRUD camiones (solo superadmin)
    solicitudes.js      ← flujo de activación admin/conductor
    superadmin.js       ← aprobar/rechazar solicitudes, gestionar admins
    planrutas.js        ← CRUD rutas de reparto
    notificaciones.js   ← conteos para badges del panel
    reportes.js         ← estadísticas para AdminReportes
    usuarios.js         ← listado de clientes
    contacto.js         ← mensajes del formulario web
    uploads.js          ← subida de imágenes
  lib/
    prisma.js           ← singleton PrismaClient
    mailer.js           ← emailNuevoPedido, emailConfirmacionCliente
  prisma/
    schema.prisma       ← fuente de verdad del modelo de datos
    seed.js             ← datos iniciales (superadmin, admin, 6 productos)
    migrations/         ← migraciones SQL versionadas
```

## Modelos de datos clave

| Modelo | Descripción |
|---|---|
| `Admin` | Panel admin — roles: `superadmin` / `admin` |
| `Conductor` | Chofer — login propio, asignado a un `Camion` (1-a-1) |
| `Camion` | Vehículo — placa única, vinculado a un conductor |
| `Cliente` | Se crea/actualiza por email al hacer un pedido |
| `Pedido` | Estado: `pendiente` / `entregado` / `suspendido` |
| `PedidoItem` | Línea de pedido — precio capturado al momento de compra |
| `PlanRuta` | Ruta de reparto con fecha, conductor y stops ordenados |
| `PlanRutaItem` | Stop individual dentro de una ruta |
| `SolicitudActivacion` | Flujo de aprobación para nuevos conductores/admins |
| `Contacto` | Mensaje del formulario web |
| `Producto` | Catálogo de agua — soft delete con `activo: false` |

## Roles y middleware

```javascript
// Solo admin autenticado:
router.get('/', verifyToken, handler)

// Solo superadmin:
router.post('/', verifyToken, verifySuperAdmin, handler)

// Solo conductor:
router.get('/mi-ruta', verifyTokenConductor, handler)
```

## Variables de entorno requeridas

```
DATABASE_URL   → postgresql://postgres:12345@db:5432/agua_piatua
JWT_SECRET     → agua_piatua_secret_2026
MAIL_USER      → cuenta Gmail
MAIL_PASS      → app password de Gmail (no la contraseña normal)
MAIL_ADMIN     → email que recibe notificaciones de pedidos
SITE_URL       → https://aguamanu.com (para links en emails)
```

## Comandos de desarrollo

```bash
cd server
npm run dev          # Node con --watch (auto-restart)
npm run db:migrate   # Crear nueva migración en desarrollo
npm run db:seed      # Recargar datos iniciales
npm run db:studio    # Prisma Studio en localhost:5555
```

## Regla de deploy — OBLIGATORIA

Antes de cualquier deploy a producción, presentar este reporte al usuario y **esperar aprobación explícita**:

```
REPORTE DE DEPLOY — pendiente de aprobación
─────────────────────────────────────────────
Commits  : [git log --oneline de lo que se va a subir]
Archivos : [lista de archivos modificados]
Cambios  : [descripción breve de qué hace cada cambio]
Migración: sí / no — [si sí, describir qué altera en la DB]
Riesgo   : bajo / medio / alto
Comando  : [el comando exacto que se ejecutará en el servidor]
─────────────────────────────────────────────
¿Apruebas el deploy? (sí / no)
```

No ejecutar nada en el servidor hasta recibir un "sí" del usuario.

## Reglas de este agente

1. **Toda nueva tabla requiere una migración SQL** en `server/prisma/migrations/`. Nunca alterar el schema sin su migration correspondiente.
2. **Nunca exponer datos sensibles** en respuestas de API (passwordHash, tokens).
3. **Los productos nunca se borran** — usar `activo: false` (soft delete).
4. **Los emails son async no bloqueantes** — siempre usar `.catch()` para no romper la respuesta.
5. **El prisma client es un singleton** — importar siempre desde `server/lib/prisma.js`.
6. Al agregar una ruta nueva, montarla en `server/index.js`.
7. Validar inputs en el router antes de llegar a Prisma.

## Patrón de nueva ruta

```javascript
const express = require('express')
const { verifyToken } = require('../middleware/auth')
const prisma = require('../lib/prisma')
const router = express.Router()

router.get('/', verifyToken, async (req, res) => {
  try {
    const data = await prisma.modelo.findMany()
    res.json({ data })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Error interno' })
  }
})

module.exports = router
```
