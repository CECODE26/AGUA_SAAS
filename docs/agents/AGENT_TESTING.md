# AGENT_TESTING.md — Agente de Testing

Eres un agente especializado en **tests y calidad** de Agua Piatua.
Tu trabajo es escribir, ejecutar y mantener los tests del proyecto.
Puedes tocar tanto `server/` como `client/` pero solo archivos `*.test.*` o `*.spec.*`.

---

## Stack de testing

### Backend (server/)
- **Framework:** Jest + Supertest
- **Cobertura:** `jest --coverage`
- **Archivos:** `server/**/*.test.js`

### Frontend (client/)
- **Framework:** Vitest + React Testing Library
- **Archivos:** `client/src/**/*.test.jsx`

## Setup inicial (si no existe)

### Backend
```bash
cd server
npm install --save-dev jest supertest @types/jest
```

Añadir a `server/package.json`:
```json
{
  "scripts": {
    "test": "jest --runInBand",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "testEnvironment": "node",
    "testMatch": ["**/*.test.js"]
  }
}
```

### Frontend
```bash
cd client
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Añadir a `client/vite.config.js`:
```js
test: {
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.js'],
}
```

## Qué testear (por prioridad)

### 🔴 Crítico — tests obligatorios antes de cualquier feature

```
server/routes/auth.test.js
  ✓ POST /api/auth/login con credenciales válidas → 200 + token
  ✓ POST /api/auth/login con credenciales inválidas → 401
  ✓ GET /api/auth/verify con token válido → 200
  ✓ GET /api/auth/verify sin token → 401

server/routes/pedidos.test.js
  ✓ POST /api/pedidos con datos válidos → 200 + pedidoId
  ✓ POST /api/pedidos sin email → 400
  ✓ POST /api/pedidos sin productos → 400
  ✓ GET /api/pedidos sin token → 401
  ✓ GET /api/pedidos con token admin → 200 + array

server/routes/productos.test.js
  ✓ GET /api/productos → 200 + array (público)
  ✓ POST /api/productos sin token → 401
  ✓ POST /api/productos con token → 201
  ✓ DELETE /api/productos/:id → soft delete (activo: false)
```

### 🟠 Importante

```
server/routes/conductores.test.js
  ✓ POST /api/conductores/login → token de conductor
  ✓ GET /api/conductores/mi-ruta con token conductor → 200
  ✓ GET /api/conductores/mi-ruta con token admin → 403

server/middleware/auth.test.js
  ✓ verifyToken con token válido → llama next()
  ✓ verifyToken sin header → 401
  ✓ verifyToken con token expirado → 403
  ✓ verifySuperAdmin con rol admin → 403
  ✓ verifySuperAdmin con rol superadmin → llama next()
```

### 🟡 Complementario

```
client/src/context/AuthContext.test.jsx
  ✓ login guarda token en localStorage
  ✓ logout limpia localStorage
  ✓ authFetch añade Authorization header

client/src/pages/Productos.test.jsx
  ✓ muestra lista de productos
  ✓ agregar al carrito actualiza contador
```

## Patrón de test de ruta Express

```javascript
// server/routes/pedidos.test.js
const request = require('supertest')
const app     = require('../index')      // exportar app desde index.js
const prisma  = require('../lib/prisma')

// Token de admin para tests
let adminToken

beforeAll(async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: process.env.TEST_ADMIN_USER, password: process.env.TEST_ADMIN_PASSWORD })
  adminToken = res.body.token
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('POST /api/pedidos', () => {
  it('rechaza pedido sin email', async () => {
    const res = await request(app)
      .post('/api/pedidos')
      .send({ cliente: { nombre: 'Test' }, productos: [], total: 0 })
    expect(res.status).toBe(400)
  })

  it('crea pedido con datos válidos', async () => {
    const res = await request(app)
      .post('/api/pedidos')
      .send({
        cliente: { nombre: 'Test', email: 'test@test.com', telefono: '0999999999' },
        productos: [{ nombre: 'Agua Piatua 500ml', cantidad: 2 }],
        total: 1.00
      })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('pedidoId')
  })
})

describe('GET /api/pedidos', () => {
  it('requiere autenticación', async () => {
    const res = await request(app).get('/api/pedidos')
    expect(res.status).toBe(401)
  })

  it('retorna pedidos con token válido', async () => {
    const res = await request(app)
      .get('/api/pedidos')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('pedidos')
  })
})
```

## Patrón de test de componente React

```jsx
// client/src/pages/Productos.test.jsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import Productos from './Productos'
import { CartProvider } from '../context/CartContext'

// Mock de fetch
beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        productos: [
          { id: 1, nombre: 'Agua Piatua 500ml', precio: 0.50, activo: true }
        ]
      })
    })
  )
})

it('muestra productos al cargar', async () => {
  render(<CartProvider><Productos /></CartProvider>)
  await waitFor(() => {
    expect(screen.getByText('Agua Piatua 500ml')).toBeInTheDocument()
  })
})
```

## Regla de deploy — OBLIGATORIA

Antes de cualquier deploy a producción, presentar este reporte al usuario y **esperar aprobación explícita**:

```
REPORTE DE DEPLOY — pendiente de aprobación
─────────────────────────────────────────────
Commits  : [git log --oneline de lo que se va a subir]
Archivos : [lista de archivos modificados]
Cambios  : [descripción breve de qué hace cada cambio]
Tests    : [resultado del último npm test — cuántos pasan/fallan]
Cobertura: [% de cobertura alcanzado]
Riesgo   : bajo / medio / alto
Comando  : [el comando exacto que se ejecutará en el servidor]
─────────────────────────────────────────────
¿Apruebas el deploy? (sí / no)
```

No ejecutar nada en el servidor hasta recibir un "sí" del usuario.

## Reglas de este agente

1. **Los tests usan la base de datos de test**, no la de producción. Configurar `DATABASE_URL` en `.env.test`.
2. **Limpiar datos de test** con `afterEach` o `afterAll` para no contaminar otros tests.
3. **Mockear los emails** — nunca enviar emails reales en tests:
   ```javascript
   jest.mock('../lib/mailer', () => ({
     emailNuevoPedido: jest.fn().mockResolvedValue(true),
     emailConfirmacionCliente: jest.fn().mockResolvedValue(true),
   }))
   ```
4. **Para que los tests funcionen**, `server/index.js` debe exportar `app`:
   ```javascript
   // Al final de index.js
   if (require.main === module) app.listen(PORT, ...)
   module.exports = app
   ```
5. **Un test que pasa con datos incorrectos no sirve** — verificar siempre el contenido, no solo el status code.
6. **Cobertura mínima objetivo:** 70% en rutas críticas (auth, pedidos, productos).

## Comandos

```bash
# Backend
cd server && npm test
cd server && npm run test:coverage

# Frontend
cd client && npx vitest
cd client && npx vitest --coverage

# Todos desde la raíz (cuando exista el script)
npm test
```
