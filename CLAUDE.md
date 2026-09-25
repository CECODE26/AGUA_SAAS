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

### Services
| Service | URL | Notes |
|---------|-----|-------|
| Client (nginx) | http://localhost | React SPA via nginx |
| API (Express) | http://localhost:3001 | Direct access |
| PostgreSQL | localhost:5433 | User: postgres / Pass: 12345 / DB: agua_piatua |

Nginx proxies `/api` and `/uploads` to the Express server (`http://server:3001`), so the React app always uses relative `/api` paths.

### Authentication Roles & Flow
Three distinct auth roles with separate JWT tokens:
1. **Admin** — `POST /api/auth/login` → 8h JWT, stored in `localStorage` as `admin_token`
2. **Superadmin** — same endpoint, same storage, differentiated by `rol` field in token
3. **Conductor (Driver)** — `POST /api/conductores/login` → 12h JWT, stored as `conductor_token`

Middleware chain in `server/middleware/auth.js`:
- `verifyToken` → validates admin/superadmin JWT
- `verifySuperAdmin` → must chain after `verifyToken`, checks `rol === 'superadmin'`
- `verifyTokenConductor` → validates driver JWT

JWT secret defaults to `'agua-piatua-secret-2026'`, overridden by `JWT_SECRET` env var.

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

On Docker startup the server runs: `prisma migrate deploy && node prisma/seed.js && node index.js`

Seed creates: `superadmin` (pw: `superadmin2026`), `admin` (pw: `piatua2026`), and 6 water products.

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
`server/.env` required keys:
```
DATABASE_URL=postgresql://postgres:12345@db:5432/agua_piatua
JWT_SECRET=
MAIL_USER=          # Gmail address
MAIL_PASS=          # Gmail app password (not account password)
MAIL_ADMIN=         # Recipient for new-order notifications
SITE_URL=           # Used in customer email links (default: http://localhost:5173)
```

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
Connect via SSH and pull + rebuild on the Contabo VPS:

```bash
ssh root@31.220.98.255
# Contraseña: pedirla al responsable del servidor (no se guarda en el repo)
```

Once connected, run inside the project directory:
```bash
cd /root/AGUAPAG          # or wherever the repo lives on the server
git pull origin main
docker compose down
docker compose up --build -d
```

Production server: **31.220.98.255** (Contabo VPS, user `root`)

## Brand
- Primary color: `#00763E` (green)
- Brand name: Agua Piatua
