# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Reglas globales obligatorias

### 1. Delegación automática de agentes
Ante cualquier tarea, **siempre** delega al agente más adecuado según el área afectada. No trabajes de forma genérica si existe un agente especializado.

| Si la tarea involucra… | Delegar a |
|---|---|
| `server/`, rutas API, Prisma, base de datos | `AGENT_BACKEND` |
| `client/`, React, páginas, UI, contextos | `AGENT_FRONTEND` |
| Docker, nginx, servidor, SSL, backups, deploy | `AGENT_DEVOPS` |
| Tests, cobertura, calidad de código | `AGENT_TESTING` |
| Tarea que cruza frontend + backend | Delegar a ambos en paralelo |

Antes de escribir código, anuncia explícitamente: *"Delegando al agente [NOMBRE]"* y lee el `.md` correspondiente en `docs/agents/`.

### 2. Aprobación obligatoria antes de deploy a producción

**NUNCA** ejecutar un deploy a producción sin antes presentar al usuario el siguiente reporte y esperar su aprobación explícita:

---
**REPORTE DE DEPLOY — pendiente de aprobación**

| Campo | Detalle |
|---|---|
| Commits a deployar | `git log origin/main..HEAD --oneline` |
| Archivos modificados | lista de archivos cambiados |
| Tipo de cambio | frontend / backend / infra / base de datos |
| ¿Requiere migración? | sí / no |
| ¿Requiere `down -v`? | sí / no (advertencia: borra la DB) |
| Riesgo estimado | bajo / medio / alto |
| Comando de deploy | el comando exacto que se ejecutará |

**¿Apruebas el deploy? (sí / no)**

---

Solo proceder cuando el usuario responda afirmativamente. Si responde no, cancelar y preguntar qué ajustar.

### 3. Secretos: nunca en el repositorio

Ninguna contraseña, token, llave ni dato de acceso va en un archivo del repo: ni en el código, ni en la documentación, ni en `docker-compose`, ni en comentarios, ni "solo por ahora". Eso incluye contraseñas de la base de datos, del servidor (SSH), del correo, `JWT_SECRET`, tokens de Mapbox/Google/Expo, keystores y contraseñas de usuarios (admin, superadmin, choferes).

- Los valores reales van en archivos `.env` (ignorados por git) o en las variables del servidor / de EAS. En el repo solo va `.env.example` con marcadores (`PASSWORD_SEGURO_AQUI`).
- El seed y los tests toman las contraseñas de variables de entorno; nunca las escriben fijas.
- La documentación dice *dónde* está un secreto ("en el gestor de contraseñas del equipo"), nunca *cuál* es. Tampoco la IP ni el usuario del servidor.
- Antes de cada commit corre gitleaks (activar una vez con `sh scripts/instalar-hooks.sh`) y en GitHub lo revisa el check **Secretos** (`.github/workflows/secretos.yml`). Si salta, se saca el secreto; no se desactiva la revisión.
- Si un secreto llega a subirse, se considera filtrado: se cambia (rota) de inmediato, además de borrarlo.

## Agentes especializados

Para trabajo en paralelo, cada agente debe leer su `.md` específico:

| Agente | Archivo | Área |
|---|---|---|
| Backend | `docs/agents/AGENT_BACKEND.md` | `server/` — Express, Prisma, rutas API |
| Frontend | `docs/agents/AGENT_FRONTEND.md` | `client/` — React, páginas, contextos |
| DevOps | `docs/agents/AGENT_DEVOPS.md` | Docker, nginx, servidor Contabo, backups |
| Testing | `docs/agents/AGENT_TESTING.md` | Tests Jest/Vitest, cobertura, calidad |

**Regla de aislamiento:** cada agente trabaja solo en su área. El agente de backend no toca `client/`, el de frontend no toca `server/`.

## Commands

### Running the project
```bash
docker compose up -d                # Start all services (db, server, client, ngrok)
docker compose up --build -d        # Rebuild images after code changes
docker compose down                 # Stop all services
docker compose logs -f server       # Follow server logs
docker compose logs -f client       # Follow client logs
```

### Server (local dev, inside server/)
```bash
npm run dev          # Start with --watch (auto-restart on changes)
npm run db:migrate   # Run Prisma migrations (dev)
npm run db:seed      # Seed default admin/products
npm run db:studio    # Open Prisma Studio at localhost:5555
```

### Client (local dev, inside client/)
```bash
npm run dev          # Vite dev server on port 5173
npm run build        # Production build to dist/
```

## Architecture

### SaaS multi-distribuidora
Una sola instalación atiende a muchas distribuidoras. Cada tabla de negocio tiene `distribuidoraId`.
- **Filtro central:** `server/lib/prisma.js` agrega el filtro por distribuidora a *todas* las consultas y valida que los ids foráneos (clienteId, camionId, pedidoId…) sean de la misma distribuidora. Las rutas se escriben como si hubiera una sola empresa: **no** agregues `distribuidoraId` a mano en los `where`, y nunca uses `prisma.sinFiltro` en rutas de una distribuidora.
- **Contexto:** `server/lib/tenant.js` (AsyncLocalStorage). `conDistribuidora(d, fn)` para tareas programadas; `comoPlataforma(fn)` solo para el panel de plataforma.
- **Cómo se identifica la distribuidora** (`server/middleware/distribuidora.js`): encabezado `X-Distribuidora: <slug>` → dominio propio (`Distribuidora.dominio`) → subdominio `<slug>.PLATAFORMA_DOMINIO` → `DISTRIBUIDORA_POR_DEFECTO`. El token también la lleva; si no coincide, 403.
- **Únicos por distribuidora:** usuario (admin, chofer, maestro), email del cliente, placa, nombre de producto. Para `findUnique`/`upsert` por esos campos usa la clave compuesta (`distribuidoraId_email`) o `findFirst`.
- **Plataforma:** `/api/plataforma/*` (tabla `PlataformaAdmin`) da de alta, edita y suspende distribuidoras. `/api/distribuidora` devuelve la marca pública; `/api/distribuidora/ajustes` la edita el superadmin.
- **Landing y demo:** el dominio raíz de la plataforma (sin distribuidora) muestra la landing (`client/src/landing/`). `POST /api/plataforma/demo` crea una distribuidora de prueba por visitante (`Distribuidora.esDemo`, `server/lib/demo.js`): sin correos, sin push, sin archivos, se borra sola. Si agregas algo que manda mensajes o guarda archivos, respeta `esDemo`.
- Pruebas de aislamiento: `server/tests/` (`npm run test:e2e`, ver su README).

### Services
| Service | URL | Notes |
|---------|-----|-------|
| Client (nginx) | http://localhost | React SPA via nginx |
| API (Express) | http://localhost:3001 | Direct access |
| PostgreSQL | localhost:5433 | credenciales en `docker-compose.yml` (no en el repo) |

Nginx proxies `/api` and `/uploads` to the Express server (`http://server:3001`), so the React app always uses relative `/api` paths.

### Authentication Roles & Flow
Cada token lleva `tipo` (`admin`, `conductor`, `maestro`, `cliente`, `plataforma`) y `distribuidoraId`. Un token solo sirve para su tipo y en su distribuidora. Se firman con los helpers `firmarAdmin`, `firmarConductor`, etc. de `server/middleware/auth.js`.
1. **Admin / Superadmin** (de una distribuidora) — `POST /api/auth/login` → 8h, `rol` distingue superadmin
2. **Conductor** — `POST /api/conductores/login` → 30d
3. **Maestro de clientes** — `POST /api/maestro/login`
4. **Cliente** — `POST /api/clientes/auth/login` → 30d (usa `clienteDeToken(req)`)
5. **Plataforma** — `POST /api/plataforma/login` → 8h, sin distribuidora

Middleware: `verifyToken` (admin), `verifySuperAdmin` (después de verifyToken), `verifyTokenConductor`, `verifyTokenMaestro`, `verifyTokenPlataforma`.

`JWT_SECRET` es obligatorio (el servidor no arranca sin él). Los errores de rutas async los atrapa `express-async-errors` y los responde `server/middleware/errores.js`.

### Workflow: Conductor Activation
Conductors cannot be created directly. The flow is:
1. Superadmin creates a `Camion` (truck)
2. Admin submits a `SolicitudActivacion` (tipo: `conductor`) with optional `camionId`
3. Superadmin approves → `Conductor` record created + assigned to truck

### Database (Prisma + PostgreSQL)
Schema at `server/prisma/schema.prisma`. Key relations:
- `Cliente` → many `Pedido` → many `PedidoItem` → `Producto`
- `Conductor` → one `Camion` (unique FK), many `PlanRuta` → many `PlanRutaItem` → `Pedido`
- `SolicitudActivacion` tracks pending/approved/rejected requests

On Docker startup the server runs: `prisma migrate deploy && node prisma/seed.js && node index.js`. Cambios de esquema: siempre con migración (`npm run db:migrate`), nunca `db push`.

El seed no trae contraseñas fijas: crea el admin de plataforma desde `PLATAFORMA_USUARIO`/`PLATAFORMA_PASSWORD` y, con `SEED_DEMO=1` y la base vacía, la distribuidora `demo` (ver `server/prisma/seed.js`).

### Client Structure
- `client/src/App.jsx` — defines all routes; two route trees: public site and `/admin/*`
- `client/src/context/AuthContext.jsx` — JWT decode + localStorage management
- `client/src/pages/admin/` — admin panel pages (protected by `ProtectedRoute`)
- `client/src/pages/` — public-facing pages (Inicio, Productos, etc.)
- `client/src/hooks/` — custom hooks

Public site uses `CartProvider` + `AuthProvider`. Admin panel only needs `AuthProvider`.

### Server Structure
- `server/index.js` — mounts 13 route modules under `/api/*`
- `server/routes/` — one file per domain (pedidos, productos, conductores, camiones, solicitudes, superadmin, notificaciones, etc.)
- `server/lib/mailer.js` — Nodemailer via Gmail SMTP; sends HTML emails on order creation (async, non-blocking)
- `server/prisma/` — schema, migrations, seed

### Key Business Logic
- **Orders (`pedidos`):** Clients are upserted by email on every order. Stock is decremented on creation. Confirmation emails sent to both admin and customer.
- **Products:** Soft-deleted (`activo: false`), never hard-deleted.
- **Route planning:** Admins build `PlanRuta` with ordered `PlanRutaItem` stops; conductors see their route via `GET /api/conductores/mi-ruta` filtered to today's date.

### Environment Variables
`server/.env` — ver `server/.env.example` (DATABASE_URL, JWT_SECRET, PLATAFORMA_*, DISTRIBUIDORA_POR_DEFECTO, MAIL_*, MAPBOX_TOKEN).

`client/.env.local`:
```
VITE_MAPBOX_TOKEN=  # Mapbox token for map features
```

## Development Workflow

### Feature → Commit → Deploy

Every feature must follow this sequence before being merged/committed:

#### 1. Test (before committing)
Run a manual smoke test or automated check verifying the feature works end-to-end locally with Docker:
```bash
docker compose up --build -d
# Verify the feature in the browser / API before proceeding
```
Do not commit until the feature is confirmed working.

#### 2. Commit & Push
```bash
git add <files>
git commit -m "feat: description"
git push origin main
```

#### 3. Deploy to Production (after push)
Ver `docs/agents/AGENT_DEVOPS.md`. La IP, el usuario y las credenciales del servidor **no** van en el repo: se piden al responsable del servidor.

## Brand
- Plataforma: **Agua Elite**. La marca de cada distribuidora (nombre, color, logo, contacto) sale de la tabla `Distribuidora`: no escribas nombres de empresa en el código.
