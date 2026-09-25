const express = require('express')
const bcrypt  = require('bcryptjs')
const prisma  = require('../lib/prisma')
const { verifyToken, verifyTokenMaestro, firmarMaestro } = require('../middleware/auth')
const { distribuidoraIdObligatoria } = require('../lib/tenant')
const { correoInterno, esCorreoInterno, DOMINIO_INTERNO, ciudadPorDefecto, provinciaPorDefecto } = require('../lib/marca')
const validarId = require('../lib/validarId')

const router = express.Router()

const SELECT_CLIENTE = {
  id: true, nombre: true, cedula: true, email: true,
  telefono: true, callePrincipal: true, calleSecundaria: true,
  referencia: true, sector: true, ciudad: true,
  latitud: true, longitud: true,
  diaSemana: true, visitasHorario: true, esFijo: true, creadoEn: true,
  passwordHash: true,   // solo para calcular "origen"; se quita antes de responder
  fijoDesde: true,
}

const DIAS_NUEVO_MS = 7 * 24 * 60 * 60 * 1000   // "nuevo" = eligió sus días hace menos de 7 días

// Agrega campos calculados y quita el hash:
//   origen:    'app' (se registró con contraseña en la app) | 'maestro' (creado desde el panel) | 'web'
//   tieneDias: tiene días de visita (visitasHorario o diaSemana legacy)
//   sinDias:   se registró en la app pero omitió elegir sus días → leyenda en el panel
//   nuevo:     eligió sus días en los últimos 7 días
function decorarCliente(c) {
  const { passwordHash, ...rest } = c
  const origen    = passwordHash ? 'app' : (esCorreoInterno(c.email) ? 'maestro' : 'web')
  const tieneDias = (Array.isArray(c.visitasHorario) && c.visitasHorario.length > 0) || !!c.diaSemana
  const nuevo     = !!c.fijoDesde && (Date.now() - new Date(c.fijoDesde).getTime()) < DIAS_NUEVO_MS
  return { ...rest, origen, tieneDias, sinDias: origen === 'app' && !tieneDias, nuevo }
}

function filtrarPorDia(clientes, dia) {
  if (!dia) return clientes
  return clientes.filter(c => {
    if (Array.isArray(c.visitasHorario) && c.visitasHorario.length > 0)
      return c.visitasHorario.some(v => v.dia === dia)
    return c.diaSemana === dia
  })
}

// ?solo=app | sin_dias | nuevos
function filtrarSolo(clientes, solo) {
  if (solo === 'app')      return clientes.filter(c => c.origen === 'app')
  if (solo === 'sin_dias') return clientes.filter(c => c.sinDias)
  if (solo === 'nuevos')   return clientes.filter(c => c.nuevo)
  return clientes
}

function resumenDe(clientes) {
  return {
    total:   clientes.length,
    app:     clientes.filter(c => c.origen === 'app').length,
    nuevos:  clientes.filter(c => c.nuevo).length,
    sinDias: clientes.filter(c => c.sinDias).length,
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { username, password } = req.body
  // Tolerante con el teclado: sin distinguir mayúsculas ni espacios sobrantes
  const maestro = await prisma.maestroClientes.findFirst({ where: { username: { equals: String(username).trim(), mode: 'insensitive' } } })
  if (!maestro || !maestro.activo)
    return res.status(401).json({ message: 'Credenciales incorrectas o cuenta inactiva' })

  const ok = await bcrypt.compare(password, maestro.passwordHash)
  if (!ok) return res.status(401).json({ message: 'Credenciales incorrectas' })

  const token = firmarMaestro(maestro)
  res.json({ token, maestro: { id: maestro.id, nombre: maestro.nombre } })
})

// ── Listar clientes ───────────────────────────────────────────────────────────
router.get('/clientes', verifyTokenMaestro, async (req, res) => {
  const { q, dia, solo } = req.query
  const where = {}
  if (q) where.OR = [
    { nombre:   { contains: q, mode: 'insensitive' } },
    { cedula:   { contains: q, mode: 'insensitive' } },
    { telefono: { contains: q, mode: 'insensitive' } },
  ]

  const todos = (await prisma.cliente.findMany({
    where,
    orderBy: { nombre: 'asc' },
    select:  SELECT_CLIENTE,
  })).map(decorarCliente)

  // El resumen (chips del panel) se calcula antes de los filtros de día / "solo"
  const resumen  = resumenDe(todos)
  const clientes = filtrarSolo(filtrarPorDia(todos, dia), solo)

  res.json({ clientes, resumen })
})

// ── Crear cliente ─────────────────────────────────────────────────────────────
router.post('/clientes', verifyTokenMaestro, async (req, res) => {
  const {
    nombre, cedula, email, telefono,
    callePrincipal, calleSecundaria, referencia, sector,
    latitud, longitud, visitasHorario,
  } = req.body

  if (!nombre || !telefono)
    return res.status(400).json({ message: 'Nombre y teléfono son requeridos' })

  const emailFinal = email?.trim() || correoInterno(`sin-email-${Date.now()}`)
  const visitas    = Array.isArray(visitasHorario) && visitasHorario.length > 0 ? visitasHorario : null

  try {
    const data = {
      nombre, cedula: cedula || null, telefono,
      callePrincipal:  callePrincipal  || null,
      calleSecundaria: calleSecundaria || null,
      referencia:      referencia      || null,
      sector:          sector          || null,
      latitud:  latitud  ? parseFloat(latitud)  : null,
      longitud: longitud ? parseFloat(longitud) : null,
      visitasHorario: visitas,
      esFijo: true,
    }

    const cliente = await prisma.cliente.upsert({
      where:  { distribuidoraId_email: { distribuidoraId: distribuidoraIdObligatoria(), email: emailFinal } },
      update: data,
      create: { email: emailFinal, ciudad: ciudadPorDefecto(), provincia: provinciaPorDefecto(), ...data },
    })
    res.json({ success: true, cliente })
  } catch (e) {
    if (e.code === 'P2002')
      return res.status(400).json({ message: 'Ya existe un cliente con ese correo' })
    throw e
  }
})

// ── Actualizar cliente ────────────────────────────────────────────────────────
router.put('/clientes/:id', verifyTokenMaestro, async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const {
    nombre, cedula, email, telefono,
    callePrincipal, calleSecundaria, referencia, sector,
    latitud, longitud, visitasHorario,
  } = req.body

  const visitas = Array.isArray(visitasHorario) && visitasHorario.length > 0 ? visitasHorario : null

  const cliente = await prisma.cliente.update({
    where: { id },
    data: {
      nombre, cedula: cedula || null,
      email: email || undefined,
      telefono,
      callePrincipal:  callePrincipal  || null,
      calleSecundaria: calleSecundaria || null,
      referencia:      referencia      || null,
      sector:          sector          || null,
      latitud:  latitud  ? parseFloat(latitud)  : null,
      longitud: longitud ? parseFloat(longitud) : null,
      visitasHorario: visitas,
      esFijo: true,
    },
  })
  res.json({ success: true, cliente })
})

// ── Eliminar cliente ──────────────────────────────────────────────────────────
router.delete('/clientes/:id', verifyTokenMaestro, async (req, res) => {
  const id = validarId(req.params.id)
  if (!id) return res.status(400).json({ message: 'ID inválido' })
  const tiene = await prisma.pedido.count({ where: { clienteId: id } })
  if (tiene > 0)
    return res.status(400).json({ message: 'No se puede eliminar: el cliente tiene pedidos registrados' })
  await prisma.cliente.delete({ where: { id } })
  res.json({ success: true })
})

// ── Clientes fijos para admin / superadmin ────────────────────────────────────
router.get('/admin/clientes', verifyToken, async (req, res) => {
  const { q, dia, solo } = req.query

  const base = {
    OR: [
      { esFijo: true },
      { email: { endsWith: DOMINIO_INTERNO } },
    ],
  }

  const extra = []
  if (q) extra.push({
    OR: [
      { nombre:   { contains: q, mode: 'insensitive' } },
      { cedula:   { contains: q, mode: 'insensitive' } },
      { telefono: { contains: q, mode: 'insensitive' } },
    ],
  })

  const where = extra.length ? { AND: [base, ...extra] } : base

  const todos = (await prisma.cliente.findMany({
    where,
    orderBy: [{ nombre: 'asc' }],
    select: {
      ...SELECT_CLIENTE,
      _count: { select: { pedidos: true } },
    },
  })).map(decorarCliente)

  const resumen  = resumenDe(todos)
  const clientes = filtrarSolo(filtrarPorDia(todos, dia), solo)

  res.json({ clientes, total: clientes.length, resumen })
})

module.exports = router
