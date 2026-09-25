# Contexto rápido de Agua Elite

Leer esto (y `CLAUDE.md`) antes de tocar el proyecto. Sirve para no tener que recorrer
todo el código: dice qué hay, dónde está y en qué estado quedó.

## Qué es
SaaS para distribuidoras de agua en bidón. Nació de AGUAPAG (el sistema de Agua Manú,
repo `Janick2025/AGUAPAG`, que **no se toca**: se copió una sola vez como base).
Una instalación atiende a muchas distribuidoras; cada una con sus datos, su marca y su sitio.

## Mapa
| Parte | Dónde | Notas |
|---|---|---|
| API | `server/` (Express + Prisma + PostgreSQL) | filtro por distribuidora en `lib/prisma.js` + `lib/tenant.js` |
| Identificar distribuidora | `server/middleware/distribuidora.js` | encabezado, dominio propio, subdominio o por defecto |
| Panel plataforma (dueños del SaaS) | `server/routes/plataforma.js`, `client/src/pages/plataforma/` | menú solo "Empresas": ventas (directo / por revendedor), alta, edición, suspensión, revendedores |
| Ingresar a una empresa (soporte) | `firmarSoporte` en `middleware/auth.js`, `client/src/soporte/` | el superadmin entra al panel completo de la empresa 2 h; lo que cambia queda en `RegistroSoporte` |
| Demo instantánea | `server/lib/demo.js`, `client/src/landing/` | una distribuidora de prueba por visitante, se borra a las 2 h |
| Sitio público de cada distribuidora | `client/src/sitio/` + `client/src/pages/{Inicio,Productos,Contacto,MisPedidos,Nosotros,LOPDP}.jsx` | diseño D · Elite |
| Landing de Agua Elite | `client/src/landing/LandingAguaElite.jsx` | dominio raíz |
| Panel de la distribuidora | `client/src/pages/admin/` | heredado de AGUAPAG |
| App Expo (cliente y chofer) | `mobile/` | marca blanca por variables (`mobile/.env.example`) |
| App Capacitor (web empaquetada) | `client/src/AppMobile.jsx`, `*Mobile.jsx` | **pendiente**: aún con textos de Agua Manú |
| Plantillas de diseño | `plantillas/` | la elegida es la D · Elite |
| Pruebas | `server/tests/` (`npm run test:e2e`) | 3 suites de aislamiento, ver su README |

## Cómo probar sin leer todo
- Postgres local + `DATABASE_URL`, `JWT_SECRET`, `PLATAFORMA_USUARIO/PASSWORD`, `PLATAFORMA_DOMINIO=localhost`.
- `npx prisma migrate deploy && node prisma/seed.js && node index.js`, luego `npm run test:e2e`.
- Web: `cd client && npx vite`. `localhost:5173` = landing; `<slug>.localhost:5173` = una distribuidora.

## Estado (rama `claude/ecstatic-albattani-xo5h2o`)
Hecho: multi-distribuidora, plataforma, marca por distribuidora, sitio Elite, landing, demo
(el visitante entra como admin del negocio, nunca superadmin),
roles de plataforma (superadmin = dueño de Agua Elite; revendedor = activa empresas y solo ve las suyas;
ventas = `precioMensual` de cada empresa), "Ingresar" a una empresa con registro de cambios,
protección de secretos. Pendiente: app Capacitor sin marca de Manú, despliegue (necesita
DNS comodín `*.dominio` + SSL), contacto de ventas de la landing (`VITE_CONTACTO_*`),
reescritura opcional del historial de git (esperando permiso del usuario).
