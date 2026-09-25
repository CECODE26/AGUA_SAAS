// Pasa el contenido editable viejo (uploads/contenido.json) a una distribuidora.
// Uso: node prisma/importar-contenido.js <slug> [ruta/al/contenido.json]
const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const [slug, archivo = path.join(__dirname, '../uploads/contenido.json')] = process.argv.slice(2)
if (!slug) { console.error('Uso: node prisma/importar-contenido.js <slug> [archivo]'); process.exit(1) }

const prisma = new PrismaClient()
;(async () => {
  const contenido = JSON.parse(fs.readFileSync(archivo, 'utf8'))
  const d = await prisma.distribuidora.update({ where: { slug }, data: { contenido } })
  console.log(`Contenido importado en ${d.nombre} (${d.slug})`)
})().catch(e => { console.error(e.message); process.exit(1) }).finally(() => prisma.$disconnect())
