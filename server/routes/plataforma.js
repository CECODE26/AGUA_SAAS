// Panel de la plataforma (dueños del SaaS): alta, edición y suspensión de distribuidoras.
// Estas rutas no pertenecen a ninguna distribuidora y ven todas.
const express = require('express')
const bcrypt  = require('bcryptjs')
const prisma  = require('../lib/prisma')
const { als } = require('../lib/tenant')
const distribuidoras = require('../lib/distribuidoras')
const validarId = require('../lib/validarId')
const { normalizarUsername, limpiarPassword } = require('../lib/usuarios')
const { verifyTokenPlataforma, firmarPlataforma, firmarAdmin, firmarSoporte } = require('../middleware/auth')
const demo = require('../lib/demo')

const router = express.Router()

// Todo lo de aquí corre sin filtro por distribuidora
router.use((req, res, next) => als.run({ plataforma: true }, next))

const SLUGS_RESERVADOS = new Set(['www', 'api', 'app', 'admin', 'plataforma', 'panel', 'mail', 'static', 'uploads'])

function error400(message) {
  return Object.assign(new Error(message), { status: 400, codigo: 'DATOS_INVALIDOS' })
}

function validarSlug(slug) {
  const s = distribuidoras.normalizarSlug(slug)
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(s)) {
    throw error400('El identificador debe tener de 3 a 40 letras minúsculas, números o guiones (sin guion al inicio ni al final)')
  }
  if (SLUGS_RESERVADOS.has(s) || s === 'demo' || s.startsWith('demo-')) throw error400('Ese identificador está reservado')
  return s
}

function validarDominio(dominio) {
  if (dominio === null || dominio === '') return null
  const d = distribuidoras.normalizarDominio(dominio)
  if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(d)) throw error400('Dominio inválido')
  return d
}

const CAMPOS = ['nombre', 'plan', 'colorPrimario', 'telefono', 'whatsapp', 'emailAvisos', 'ciudad', 'provincia', 'depositoLat', 'depositoLng']

function datosDistribuidora(body, { parcial }) {
  const data = {}
  if (body.slug !== undefined || !parcial) data.slug = validarSlug(body.slug)
  if (body.dominio !== undefined) data.dominio = validarDominio(body.dominio)
  if (body.activo !== undefined) data.activo = !!body.activo
  for (const k of CAMPOS) {
    if (body[k] === undefined) continue
    if (k === 'depositoLat' || k === 'depositoLng') {
      const n = body[k] === null || body[k] === '' ? null : Number(body[k])
      if (n !== null && !Number.isFinite(n)) throw error400('Coordenadas del depósito inválidas')
      data[k] = n
    } else {
      data[k] = body[k] === null ? null : String(body[k]).trim() || null
    }
  }
  if (!parcial && !data.nombre) throw error400('El nombre es obligatorio')
  if (parcial && 'nombre' in data && !data.nombre) throw error400('El nombre no puede quedar vacío')
  if (data.colorPrimario && !/^#[0-9a-f]{6}$/i.test(data.colorPrimario)) throw error400('Color inválido, usa el formato #RRGGBB')
  // Columnas con valor por defecto: vacías = no se tocan (null no es válido ahí)
  for (const k of ['plan', 'colorPrimario', 'ciudad', 'provincia']) if (k in data && !data[k]) delete data[k]
  return data
}

const conteos = { _count: { select: { pedidos: true, clientes: true, conductores: true, camiones: true, admins: true } } }

// ── POST /api/plataforma/login ───────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ message: 'Usuario y contraseña requeridos' })
  const admin = await prisma.plataformaAdmin.findUnique({ where: { username: normalizarUsername(username) } })
  const ok = admin?.activo && await bcrypt.compare(limpiarPassword(password), admin.passwordHash)
  if (!ok) return res.status(401).json({ message: 'Credenciales incorrectas' })
  res.json({ token: firmarPlataforma(admin), admin: { username: admin.username, nombre: admin.nombre, rol: admin.rol } })
})

// ── POST /api/plataforma/demo — demo instantánea para la landing (público) ──
// Crea una distribuidora de prueba solo para este visitante y le da la sesión de su
// dueño. La landing lo manda a <slug>.PLATAFORMA_DOMINIO/demo/entrar con esa sesión.
router.post('/demo', async (req, res) => {
  const { distribuidora, accesos } = await demo.crearDemo()
  // Sesión del administrador del negocio de la demo (nunca superadmin)
  const negocio = await prisma.admin.findFirst({ where: { distribuidoraId: distribuidora.id, username: accesos.panel.usuario, rol: 'admin' } })
  console.log(`🧪 Demo creada: ${distribuidora.slug} (vence ${distribuidora.demoVenceEn.toISOString()})`)
  res.status(201).json({
    slug: distribuidora.slug,
    token: firmarAdmin(negocio),
    venceEn: distribuidora.demoVenceEn,
    accesos,
  })
})

router.use(verifyTokenPlataforma)

// Dos roles en la plataforma:
//   superadmin → el dueño de Agua Elite: ve todas las empresas, entra a su panel, suspende,
//                fija precios y maneja a los revendedores
//   revendedor → activa empresas y ve solo las que activó él
const esSuperadmin = req => (req.plataforma.rol || 'superadmin') === 'superadmin'

function soloSuperadmin(req, res, next) {
  if (!esSuperadmin(req)) return res.status(403).json({ message: 'Solo el superadmin de Agua Elite puede hacer esto' })
  next()
}

// Empresas que puede ver quien pregunta
const alcance = req => (esSuperadmin(req) ? { esDemo: false } : { esDemo: false, activadaPorId: req.plataforma.plataformaId })

async function empresaVisible(req, id) {
  return prisma.distribuidora.findFirst({ where: { id, ...alcance(req) } })
}

const incluirLista = {
  ...conteos,
  activadaPor: { select: { id: true, nombre: true, username: true, rol: true } },
}

const sinInternos = ({ contenido, demoAccesos, ...d }) => d

// Ingreso mensual (lo que pagan las empresas activas), separado por quién las activó
function resumenVentas(empresas) {
  const activas = empresas.filter(d => d.activo)
  const suma = lista => +lista.reduce((t, d) => t + (d.precioMensual || 0), 0).toFixed(2)
  const directas = activas.filter(d => !d.activadaPor || d.activadaPor.rol !== 'revendedor')
  const porRevendedor = {}
  for (const d of activas.filter(d => d.activadaPor?.rol === 'revendedor')) {
    const r = (porRevendedor[d.activadaPor.id] ??= { id: d.activadaPor.id, nombre: d.activadaPor.nombre, empresas: 0, ingresoMensual: 0 })
    r.empresas++
    r.ingresoMensual = +(r.ingresoMensual + (d.precioMensual || 0)).toFixed(2)
  }
  return {
    empresasActivas: activas.length,
    empresasSuspendidas: empresas.length - activas.length,
    ingresoMensual: suma(activas),
    directo: { empresas: directas.length, ingresoMensual: suma(directas) },
    porRevendedor: Object.values(porRevendedor).sort((a, b) => b.ingresoMensual - a.ingresoMensual),
  }
}

function precioValido(v) {
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) throw error400('El precio mensual debe ser un número mayor o igual a 0')
  return +n.toFixed(2)
}

// ── GET /api/plataforma/yo ───────────────────────────────────────────────────
router.get('/yo', async (req, res) => {
  const yo = await prisma.plataformaAdmin.findUnique({ where: { id: req.plataforma.plataformaId }, select: { id: true, username: true, nombre: true, rol: true } })
  res.json({ yo })
})

// ── GET /api/plataforma/distribuidoras (empresas) ───────────────────────────
router.get('/distribuidoras', async (req, res) => {
  const lista = await prisma.distribuidora.findMany({ where: alcance(req), orderBy: { id: 'asc' }, include: incluirLista })
  const extra = esSuperadmin(req)
    ? { demosActivas: await prisma.distribuidora.count({ where: { esDemo: true, demoVenceEn: { gt: new Date() } } }) }
    : {}
  res.json({ distribuidoras: lista.map(sinInternos), resumen: resumenVentas(lista), ...extra })
})

// ── GET /api/plataforma/distribuidoras/:id ──────────────────────────────────
router.get('/distribuidoras/:id', async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const d = await prisma.distribuidora.findFirst({
    where: { id, ...alcance(req) },
    include: {
      ...incluirLista,
      admins: { select: { id: true, username: true, rol: true, activo: true, creadoEn: true }, orderBy: { id: 'asc' } },
    },
  })
  if (!d) return res.status(404).json({ message: 'Empresa no encontrada' })
  res.json({ distribuidora: sinInternos(d) })
})

// ── POST /api/plataforma/distribuidoras — activar una empresa ───────────────
// Se crea con su administrador (rol admin: ve solo su espacio). El nivel superadmin
// dentro de la empresa lo ejerce el dueño de Agua Elite con "Ingresar".
router.post('/distribuidoras', async (req, res) => {
  const data = datosDistribuidora(req.body, { parcial: false })
  const precio = precioValido(req.body.precioMensual)
  if (precio !== undefined) data.precioMensual = precio

  // Quién la activó: el revendedor que la crea, o el superadmin (que puede atribuirla a un revendedor)
  let activadaPorId = req.plataforma.plataformaId
  if (esSuperadmin(req) && req.body.revendedorId) {
    const r = await prisma.plataformaAdmin.findFirst({ where: { id: Number(req.body.revendedorId), rol: 'revendedor' } })
    if (!r) throw error400('Revendedor no encontrado')
    activadaPorId = r.id
  }

  const cuenta = req.body.admin ?? req.body.superadmin ?? {}
  const username = normalizarUsername(cuenta.username)
  const password = limpiarPassword(cuenta.password)
  if (!username) throw error400('Indica el usuario del administrador de la empresa')
  if (password.length < 8) throw error400('La contraseña del administrador debe tener al menos 8 caracteres')

  const creada = await prisma.$transaction(async tx => {
    const d = await tx.distribuidora.create({ data: { ...data, activadaPorId } })
    await tx.admin.create({
      data: {
        distribuidoraId: d.id,
        username,
        passwordHash: await bcrypt.hash(password, 10),
        rol: 'admin',
        activo: true,
        telefono: cuenta.telefono ? String(cuenta.telefono).trim() : null,
      },
    })
    await tx.configFidelidad.create({ data: { distribuidoraId: d.id } })
    return d
  })
  distribuidoras.invalidar()
  console.log(`🏢 Empresa activada: ${creada.nombre} (${creada.slug}) por ${req.plataforma.username}`)
  res.status(201).json({ distribuidora: sinInternos(creada) })
})

// ── PATCH /api/plataforma/distribuidoras/:id — editar, suspender o reactivar ─
// El revendedor edita los datos de sus empresas; precio, identificador, dominio, plan y
// suspensión quedan para el superadmin.
router.patch('/distribuidoras/:id', async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  if (!(await empresaVisible(req, id))) return res.status(404).json({ message: 'Empresa no encontrada' })
  const data = datosDistribuidora(req.body, { parcial: true })
  if (esSuperadmin(req)) {
    const precio = precioValido(req.body.precioMensual)
    if (precio !== undefined) data.precioMensual = precio
  } else {
    for (const k of ['slug', 'dominio', 'plan', 'activo']) delete data[k]
  }
  const d = await prisma.distribuidora.update({ where: { id }, data })
  distribuidoras.invalidar()
  res.json({ distribuidora: sinInternos(d) })
})

// ── PATCH /api/plataforma/distribuidoras/:id/admins/:adminId/password ───────
// Para cuando el administrador de la empresa pierde el acceso
router.patch('/distribuidoras/:id/admins/:adminId/password', async (req, res) => {
  const id = validarId(req.params.id)
  const adminId = validarId(req.params.adminId)
  if (!id || !adminId) return res.status(400).json({ message: 'ID inválido' })
  if (!(await empresaVisible(req, id))) return res.status(404).json({ message: 'Empresa no encontrada' })
  const nueva = limpiarPassword(req.body.nueva)
  if (nueva.length < 8) throw error400('La contraseña nueva debe tener al menos 8 caracteres')
  const admin = await prisma.admin.findFirst({ where: { id: adminId, distribuidoraId: id } })
  if (!admin) return res.status(404).json({ message: 'Usuario no encontrado en esa empresa' })
  await prisma.admin.update({
    where: { id: admin.id },
    data: { passwordHash: await bcrypt.hash(nueva, 10), activo: true },
  })
  console.log(`🔑 Contraseña restablecida: ${admin.username} (empresa #${id}) por ${req.plataforma.username}`)
  res.json({ success: true })
})

// ── POST /api/plataforma/distribuidoras/:id/ingresar — entrar al panel de una empresa
// Da una sesión de superadmin dentro de esa empresa (2 h) para dar soporte: crear rutas,
// corregir pedidos, etc. Todo lo que cambie queda en RegistroSoporte.
router.post('/distribuidoras/:id/ingresar', soloSuperadmin, async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const d = await prisma.distribuidora.findFirst({ where: { id, esDemo: false } })
  if (!d) return res.status(404).json({ message: 'Empresa no encontrada' })
  if (!d.activo) throw error400('La empresa está suspendida: reactívala para entrar a su panel')
  await prisma.registroSoporte.create({ data: { distribuidoraId: d.id, plataformaAdminId: req.plataforma.plataformaId, metodo: 'INGRESO', ruta: '/admin' } })
  console.log(`🛟 ${req.plataforma.username} ingresó al panel de ${d.nombre} (${d.slug})`)
  res.json({ slug: d.slug, dominio: d.dominio, token: firmarSoporte(d, req.plataforma) })
})

// ── GET /api/plataforma/distribuidoras/:id/registro — qué se cambió en soporte
router.get('/distribuidoras/:id/registro', soloSuperadmin, async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const registro = await prisma.registroSoporte.findMany({
    where: { distribuidoraId: id },
    orderBy: { creadoEn: 'desc' },
    take: 100,
    include: { plataformaAdmin: { select: { username: true, nombre: true } } },
  })
  res.json({ registro })
})

// ── Revendedores (solo superadmin) ───────────────────────────────────────────
const selectRevendedor = { id: true, username: true, nombre: true, telefono: true, email: true, activo: true, creadoEn: true, _count: { select: { empresasActivadas: true } } }

router.get('/revendedores', soloSuperadmin, async (req, res) => {
  const revendedores = await prisma.plataformaAdmin.findMany({ where: { rol: 'revendedor' }, orderBy: { id: 'asc' }, select: selectRevendedor })
  res.json({ revendedores })
})

router.post('/revendedores', soloSuperadmin, async (req, res) => {
  const username = normalizarUsername(req.body.username)
  const password = limpiarPassword(req.body.password)
  const nombre = String(req.body.nombre ?? '').trim()
  if (!nombre || !username) throw error400('Nombre y usuario son obligatorios')
  if (password.length < 8) throw error400('La contraseña debe tener al menos 8 caracteres')
  const revendedor = await prisma.plataformaAdmin.create({
    data: {
      nombre, username, rol: 'revendedor', passwordHash: await bcrypt.hash(password, 10),
      telefono: req.body.telefono ? String(req.body.telefono).trim() : null,
      email: req.body.email ? String(req.body.email).trim() : null,
    },
    select: selectRevendedor,
  })
  res.status(201).json({ revendedor })
})

router.patch('/revendedores/:id', soloSuperadmin, async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const actual = await prisma.plataformaAdmin.findFirst({ where: { id, rol: 'revendedor' } })
  if (!actual) return res.status(404).json({ message: 'Revendedor no encontrado' })
  const data = {}
  if (req.body.activo !== undefined) data.activo = !!req.body.activo
  for (const k of ['nombre', 'telefono', 'email']) if (req.body[k] !== undefined) data[k] = String(req.body[k] ?? '').trim() || (k === 'nombre' ? actual.nombre : null)
  if (req.body.password) {
    const p = limpiarPassword(req.body.password)
    if (p.length < 8) throw error400('La contraseña debe tener al menos 8 caracteres')
    data.passwordHash = await bcrypt.hash(p, 10)
  }
  const revendedor = await prisma.plataformaAdmin.update({ where: { id }, data, select: selectRevendedor })
  res.json({ revendedor })
})

module.exports = router
