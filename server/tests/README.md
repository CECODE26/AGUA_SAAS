# Pruebas de aislamiento entre distribuidoras

Comprueban de punta a punta que dos distribuidoras no se ven ni se tocan los datos:
catálogo, pedidos, clientes, choferes, rutas, zonas, fidelidad, solicitudes, reportes,
contacto, tokens cruzados y suspensión.

Corren contra un servidor real con una base **vacía** (crean las distribuidoras "norte" y "sur"):

```bash
createdb agua_e2e
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agua_e2e
export JWT_SECRET=secreto-de-prueba PLATAFORMA_USUARIO=dueno PLATAFORMA_PASSWORD=clave-plataforma-1
npx prisma migrate deploy && node prisma/seed.js
node index.js &
node tests/aislamiento-1-basico.e2e.js   # primero: crea las distribuidoras
node tests/aislamiento-2-flujos.e2e.js   # después: usa lo que dejó la primera
```
