# AGENT_FRONTEND.md — Agente de Frontend

Eres un agente especializado en el **frontend** de Agua Piatua.
Tu área de trabajo es exclusivamente `client/`. No toques nada en `server/`.

---

## Regla multi-distribuidora

El sistema es un SaaS: el nombre, color, logo, teléfono y ciudad de la empresa salen de
`useDistribuidora()` (`src/context/DistribuidoraContext.jsx`). No escribas el nombre de
ninguna empresa ni sus datos de contacto en el código. Las llamadas a `/api` no necesitan
nada extra: la distribuidora sale del dominio (o de `VITE_DISTRIBUIDORA` en desarrollo y
en la app de Capacitor, ver `src/lib/distribuidora.js`).

## Tu Stack

- **Framework:** React 18 + React Router DOM v6
- **Build:** Vite 5
- **UI:** Bootstrap 5.3 + Bootstrap Icons
- **Mapas:** Leaflet + React Leaflet
- **Drag & Drop:** @dnd-kit/core + @dnd-kit/sortable
- **Exportación:** jsPDF + jspdf-autotable, xlsx, html2canvas

## Estructura que manejas

```
client/src/
  App.jsx                 ← define TODAS las rutas (React Router)
  index.css               ← estilos globales (cloud divider, wave, footer)
  assets/                 ← imágenes de productos y marca
  context/
    AuthContext.jsx        ← JWT admin, authFetch, isAuthenticated, rol
    CartContext.jsx        ← carrito de compras del sitio público
  components/
    Navbar.jsx             ← navegación pública
    Footer.jsx             ← pie de página
    CartSidebar.jsx        ← panel lateral del carrito
    ProtectedRoute.jsx     ← guard para rutas /admin/*
  hooks/
    useNotificaciones.js   ← polling cada 30s para badges del panel
  pages/
    Inicio.jsx             ← landing page con hero y productos
    Productos.jsx          ← catálogo público con carrito
    Historia.jsx
    Sostenibilidad.jsx
    Blog.jsx
    Contacto.jsx
    LOPDP.jsx              ← página legal
    MisPedidos.jsx         ← historial de pedidos por email
    admin/
      AdminLogin.jsx
      AdminLayout.jsx       ← sidebar + outlet para sub-rutas
      AdminDashboard.jsx
      AdminPedidos.jsx
      AdminProductos.jsx
      AdminUsuarios.jsx
      AdminLogistica.jsx    ← planificación de rutas con drag & drop
      AdminConductores.jsx
      AdminCamiones.jsx
      AdminSolicitudes.jsx
      AdminContacto.jsx
      AdminReportes.jsx
      SuperAdminSolicitudes.jsx
      SuperAdminAdmins.jsx
    conductor/
      ConductorLogin.jsx
      ConductorRuta.jsx     ← vista de ruta del día para el conductor
```

## Árbol de rutas (App.jsx)

```
/                          → Inicio
/historia                  → Historia
/sostenibilidad            → Sostenibilidad
/productos                 → Productos
/blog                      → Blog
/contacto                  → Contacto
/lopdp                     → LOPDP
/mis-pedidos               → MisPedidos

/admin/login               → AdminLogin (público)
/admin                     → AdminDashboard (protegido)
/admin/pedidos             → AdminPedidos
/admin/productos           → AdminProductos
/admin/usuarios            → AdminUsuarios
/admin/logistica           → AdminLogistica
/admin/contacto            → AdminContacto
/admin/reportes            → AdminReportes
/admin/conductores         → AdminConductores
/admin/camiones            → AdminCamiones
/admin/solicitudes         → AdminSolicitudes
/admin/sa/solicitudes      → SuperAdminSolicitudes
/admin/sa/admins           → SuperAdminAdmins

/conductor/login           → ConductorLogin
/conductor/ruta            → ConductorRuta
```

## Contextos disponibles

### AuthContext
```javascript
const { isAuthenticated, admin, rol, authFetch, logout } = useAuth()

// authFetch hace fetch con el header Authorization automáticamente
const res = await authFetch('/api/pedidos')
```

### CartContext
```javascript
const { carrito, agregarProducto, quitarProducto, vaciarCarrito, total } = useCart()
```

### useNotificaciones
```javascript
// Solo usar dentro del panel admin (ya autenticado)
const { pedidosPendientes, contactosSinLeer, solicitudesPendientes } = useNotificaciones()
```

## Llamadas a la API

El proxy de Vite (desarrollo) y nginx (producción) redirigen `/api` al servidor Express.
Usar siempre rutas relativas:

```javascript
// Público
const res = await fetch('/api/productos')

// Protegido (admin)
const res = await authFetch('/api/pedidos')

// Protegido (conductor) — usar el token del conductor
const token = localStorage.getItem('conductor_token')
const res = await fetch('/api/conductores/mi-ruta', {
  headers: { Authorization: `Bearer ${token}` }
})
```

## Tokens de autenticación

| Quién | localStorage key | Endpoint de login |
|---|---|---|
| Admin / Superadmin | `admin_token` | `POST /api/auth/login` |
| Conductor | `conductor_token` | `POST /api/conductores/login` |

## Colores y marca

```css
--color-principal: #00763E;   /* verde Agua Piatua */
```

Usar clases Bootstrap como base. Para el verde de marca usar `style={{ color: '#00763E' }}` o clases CSS personalizadas en `index.css`.

## Comandos de desarrollo

```bash
cd client
npm run dev      # Vite dev server en localhost:5173
npm run build    # Build de producción → dist/
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

1. **No crear páginas nuevas sin añadirlas a `App.jsx`.**
2. **Toda llamada API protegida usa `authFetch`**, nunca `fetch` directo con token manual en páginas admin.
3. **No instalar librerías de UI adicionales** — usar Bootstrap 5 que ya está instalado.
4. **Las imágenes de productos** van en `client/src/assets/` y se importan directamente.
5. **El panel admin** siempre va dentro de `AdminLayout` (tiene el sidebar y la navegación).
6. Al agregar una nueva página admin, añadirla al sidebar de `AdminLayout.jsx`.
7. **Responsive primero** — Bootstrap grid, verificar en móvil.

## Patrón de nueva página admin

```jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function AdminNuevaPagina() {
  const { authFetch } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authFetch('/api/nueva-ruta')
      .then(r => r.json())
      .then(d => setData(d.items))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-5"><div className="spinner-border" /></div>

  return (
    <div>
      <h4 className="mb-4">Título</h4>
      {/* contenido */}
    </div>
  )
}
```
