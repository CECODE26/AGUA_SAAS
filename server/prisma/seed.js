const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  // Superadmin
  const hashSA = await bcrypt.hash('superadmin2026', 10)
  await prisma.admin.upsert({
    where:  { username: 'superadmin' },
    update: {},
    create: { username: 'superadmin', passwordHash: hashSA, rol: 'superadmin', activo: true },
  })
  console.log('Superadmin creado: superadmin / superadmin2026')

  // Admin
  const hash = await bcrypt.hash('piatua2026', 10)
  await prisma.admin.upsert({
    where:  { username: 'admin' },
    update: { rol: 'admin', activo: true },
    create: { username: 'admin', passwordHash: hash, rol: 'admin', activo: true },
  })
  console.log('Admin creado: admin / piatua2026')

  // Maestro de Clientes
  const hashMaestro = await bcrypt.hash('maestro2026', 10)
  await prisma.maestroClientes.upsert({
    where:  { username: 'maestro' },
    update: {},
    create: { nombre: 'Maestro de Clientes', username: 'maestro', passwordHash: hashMaestro, activo: true },
  })
  console.log('Maestro creado: maestro / maestro2026')

  // Producto inicial: crear únicamente si el catálogo está vacío.
  // Si ya existe pero fue desactivado, restaurarlo sin alterar precio ni stock.
  const productoInicial = await prisma.producto.findUnique({
    where: { nombre: 'Agua Manú 20L' },
  })

  if (productoInicial) {
    if (!productoInicial.activo) {
      await prisma.producto.update({
        where: { id: productoInicial.id },
        data: { activo: true },
      })
      console.log('Producto inicial restaurado: Agua Manú 20L')
    } else {
      console.log('Producto inicial disponible: Agua Manú 20L')
    }
  } else {
    const productosCount = await prisma.producto.count()

    if (productosCount === 0) {
      await prisma.producto.create({
        data: {
          nombre:      'Agua Manú 20L',
          descripcion: 'Dispensador familiar o empresarial. Renovación semanal con recogida del envase.',
          precio:      8.00,
          stock:       80,
          tag:         'Mejor valor',
        },
      })
      console.log('Producto inicial creado: Agua Manú 20L')
    } else {
      console.log('Catálogo existente conservado; no se creó el producto inicial')
    }
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
