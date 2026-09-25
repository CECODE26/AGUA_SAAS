// Panel de la plataforma (dueños del SaaS): alta, edición y suspensión de distribuidoras.
// Estas rutas no pertenecen a ninguna distribuidora y ven todas.
const express = require('express')
const bcrypt  = require('bcryptjs')
const prisma  = require('../lib/prisma')
const { als } = require('../lib/tenant')
const distribuidoras = require('../lib/distribuidoras')
const validarId = require('../lib/validarId')
const { normalizarUsername, limpiarPassword } = require('../lib/usuarios')
const { verifyTokenPlataforma, firmarPlataforma } = require('../middleware/auth')

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
  if (SLUGS_RESERVADOS.has(s)) throw error400('Ese identificador está reservado')
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
  if ('plan' in data && !data.plan) delete data.plan
  if ('colorPrimario' in data && !data.colorPrimario) delete data.colorPrimario
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
  res.json({ token: firmarPlataforma(admin), admin: { username: admin.username, nombre: admin.nombre } })
})

router.use(verifyTokenPlataforma)

// ── GET /api/plataforma/distribuidoras ──────────────────────────────────────
router.get('/distribuidoras', async (req, res) => {
  const lista = await prisma.distribuidora.findMany({ orderBy: { id: 'asc' }, include: conteos })
  res.json({ distribuidoras: lista.map(({ contenido, ...d }) => d) })
})

// ── GET /api/plataforma/distribuidoras/:id ──────────────────────────────────
router.get('/distribuidoras/:id', async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const d = await prisma.distribuidora.findUnique({
    where: { id },
    include: {
      ...conteos,
      admins: { select: { id: true, username: true, rol: true, activo: true, creadoEn: true }, orderBy: { id: 'asc' } },
    },
  })
  if (!d) return res.status(404).json({ message: 'Distribuidora no encontrada' })
  const { contenido, ...resto } = d
  res.json({ distribuidora: resto })
})

// ── POST /api/plataforma/distribuidoras — alta con su primer superadmin ─────
router.post('/distribuidoras', async (req, res) => {
  const data = datosDistribuidora(req.body, { parcial: false })
  const username = normalizarUsername(req.body.superadmin?.username)
  const password = limpiarPassword(req.body.superadmin?.password)
  if (!username) throw error400('Indica el usuario del superadmin de la distribuidora')
  if (password.length < 8) throw error400('La contraseña del superadmin debe tener al menos 8 caracteres')

  const creada = await prisma.$transaction(async tx => {
    const d = await tx.distribuidora.create({ data })
    await tx.admin.create({
      data: {
        distribuidoraId: d.id,
        username,
        passwordHash: await bcrypt.hash(password, 10),
        rol: 'superadmin',
        activo: true,
        telefono: req.body.superadmin?.telefono ? String(req.body.superadmin.telefono).trim() : null,
      },
    })
    await tx.configFidelidad.create({ data: { distribuidoraId: d.id } })
    return d
  })
  distribuidoras.invalidar()
  console.log(`🏢 Distribuidora creada: ${creada.nombre} (${creada.slug}) por ${req.plataforma.username}`)
  const { contenido, ...resto } = creada
  res.status(201).json({ distribuidora: resto })
})

// ── PATCH /api/plataforma/distribuidoras/:id — editar, suspender o reactivar ─
router.patch('/distribuidoras/:id', async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const data = datosDistribuidora(req.body, { parcial: true })
  const d = await prisma.distribuidora.update({ where: { id }, data })
  distribuidoras.invalidar()
  const { contenido, ...resto } = d
  res.json({ distribuidora: resto })
})

// ── PATCH /api/plataforma/distribuidoras/:id/admins/:adminId/password ───────
// Para cuando el dueño de la distribuidora pierde el acceso
router.patch('/distribuidoras/:id/admins/:adminId/password', async (req, res) => {
  const id = validarId(req.params.id)
  const adminId = validarId(req.params.adminId)
  if (!id || !adminId) return res.status(400).json({ message: 'ID inválido' })
  const nueva = limpiarPassword(req.body.nueva)
  if (nueva.length < 8) throw error400('La contraseña nueva debe tener al menos 8 caracteres')
  const admin = await prisma.admin.findFirst({ where: { id: adminId, distribuidoraId: id } })
  if (!admin) return res.status(404).json({ message: 'Admin no encontrado en esa distribuidora' })
  await prisma.admin.update({
    where: { id: admin.id },
    data: { passwordHash: await bcrypt.hash(nueva, 10), activo: true },
  })
  console.log(`🔑 Contraseña restablecida: ${admin.username} (distribuidora #${id}) por ${req.plataforma.username}`)
  res.json({ success: true })
})

module.exports = router
