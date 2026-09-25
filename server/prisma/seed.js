// Datos iniciales. Corre en cada arranque del contenedor, así que no pisa nada existente.
//
//   PLATAFORMA_USUARIO / PLATAFORMA_PASSWORD  → crea el primer admin de la plataforma
//   SEED_DEMO=1                                → si no hay ninguna distribuidora, crea "demo"
//     SEED_DEMO_PASSWORD                       → contraseña de sus usuarios (si falta, se genera una)
//
// No hay contraseñas por defecto en el código: lo que no llega por variable de entorno
// se genera al azar y se muestra una sola vez en el log.
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const aleatoria = () => crypto.randomBytes(9).toString('base64url')

async function adminPlataforma() {
  const username = process.env.PLATAFORMA_USUARIO?.trim().toLowerCase()
  const password = process.env.PLATAFORMA_PASSWORD?.trim()
  if (!username || !password) {
    const hay = await prisma.plataformaAdmin.count()
    if (!hay) console.log('⚠️  Sin admin de plataforma: define PLATAFORMA_USUARIO y PLATAFORMA_PASSWORD y reinicia')
    return
  }
  const existe = await prisma.plataformaAdmin.findUnique({ where: { username } })
  if (existe) return
  if (password.length < 10) throw new Error('PLATAFORMA_PASSWORD debe tener al menos 10 caracteres')
  await prisma.plataformaAdmin.create({
    data: { username, nombre: 'Administrador de la plataforma', passwordHash: await bcrypt.hash(password, 10) },
  })
  console.log(`Admin de plataforma creado: ${username}`)
}

async function distribuidoraDemo() {
  if (process.env.SEED_DEMO !== '1') return
  if (await prisma.distribuidora.count()) return

  const password = process.env.SEED_DEMO_PASSWORD?.trim() || aleatoria()
  const hash = await bcrypt.hash(password, 10)
  const d = await prisma.distribuidora.create({
    data: { slug: 'demo', nombre: 'Distribuidora Demo', colorPrimario: '#0066CC', ciudad: 'Puyo', provincia: 'Pastaza' },
  })
  await prisma.admin.createMany({
    data: [
      { distribuidoraId: d.id, username: 'superadmin', passwordHash: hash, rol: 'superadmin' },
      { distribuidoraId: d.id, username: 'admin', passwordHash: hash, rol: 'admin' },
    ],
  })
  await prisma.maestroClientes.create({
    data: { distribuidoraId: d.id, nombre: 'Maestro de Clientes', username: 'maestro', passwordHash: hash },
  })
  await prisma.configFidelidad.create({ data: { distribuidoraId: d.id } })
  await prisma.producto.create({
    data: {
      distribuidoraId: d.id,
      nombre: 'Bidón 20L',
      descripcion: 'Dispensador familiar o empresarial. Renovación semanal con recogida del envase.',
      precio: 2.5,
      stock: 80,
      tag: 'Mejor valor',
    },
  })
  console.log('Distribuidora demo creada (slug "demo"): usuarios superadmin, admin y maestro')
  if (!process.env.SEED_DEMO_PASSWORD) console.log(`  Contraseña generada (se muestra solo esta vez): ${password}`)
}

async function main() {
  await adminPlataforma()
  await distribuidoraDemo()
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
