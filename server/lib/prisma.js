// Cliente de Prisma con el filtro por distribuidora.
//
// Toda consulta sobre una tabla de negocio queda limitada a la distribuidora de la
// petición (lib/tenant.js). Las rutas escriben sus consultas como si hubiera una sola
// empresa y este archivo agrega el filtro:
//   - lecturas, updates y deletes: where.distribuidoraId = actual
//   - creates: data.distribuidoraId = actual
//   - ids de otras tablas en los datos (clienteId, camionId, pedidoId…): se comprueba
//     que sean de la misma distribuidora antes de escribir
//   - tablas hijas sin columna propia (PedidoItem, PlanRutaItem, historial): se filtran
//     por la distribuidora de su tabla padre
// Sin distribuidora en el contexto, las tablas de negocio no se pueden tocar (falla cerrado).
// El panel de plataforma usa comoPlataforma() para ver todas las empresas.
const { PrismaClient, Prisma } = require('@prisma/client')
const { contexto, ErrorSinDistribuidora, ErrorFueraDeDistribuidora } = require('./tenant')

const base = new PrismaClient()

const modelos = Prisma.dmmf.datamodel.models
const porNombre = Object.fromEntries(modelos.map(m => [m.name, m]))

// Tablas con columna distribuidoraId
const CON_DISTRIBUIDORA = new Set(
  modelos.filter(m => m.fields.some(f => f.name === 'distribuidoraId' && f.kind === 'scalar')).map(m => m.name)
)

// Tablas hijas: se filtran por la relación con su padre
const HIJAS = {
  PedidoItem:               'pedido',
  PlanRutaItem:             'ruta',
  HistorialConductorCamion: 'camion',
}

// Por tabla: claves foráneas hacia tablas con distribuidora → { campoId, relacion, destino }
const FORANEAS = Object.fromEntries(modelos.map(m => [
  m.name,
  m.fields
    .filter(f => f.kind === 'object' && f.relationFromFields?.length === 1 && f.type !== 'Distribuidora' && CON_DISTRIBUIDORA.has(f.type))
    .map(f => ({ campoId: f.relationFromFields[0], relacion: f.name, destino: f.type })),
]))

const OPS_CON_WHERE = new Set([
  'findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany',
  'count', 'aggregate', 'groupBy', 'update', 'updateMany', 'delete', 'deleteMany', 'upsert',
])

const delegado = nombre => nombre.charAt(0).toLowerCase() + nombre.slice(1)

function idDe(valor) {
  if (typeof valor === 'number') return valor
  if (valor && typeof valor === 'object') {
    if (typeof valor.set === 'number') return valor.set
    if (typeof valor.connect?.id === 'number') return valor.connect.id
  }
  return null
}

// Junta los ids foráneos de uno o varios objetos data: { Destino: Set(ids) }
function idsForaneos(modelo, datas) {
  const porDestino = {}
  for (const data of datas) {
    if (!data || typeof data !== 'object') continue
    for (const fk of FORANEAS[modelo] || []) {
      const id = idDe(data[fk.campoId]) ?? idDe(data[fk.relacion])
      if (id == null) continue
      ;(porDestino[fk.destino] ??= new Set()).add(id)
    }
  }
  return porDestino
}

async function comprobarForaneas(modelo, datas, distribuidoraId) {
  const porDestino = idsForaneos(modelo, datas)
  for (const [destino, set] of Object.entries(porDestino)) {
    const ids = [...set]
    const encontrados = await base[delegado(destino)].count({ where: { id: { in: ids }, distribuidoraId } })
    if (encontrados !== ids.length) throw new ErrorFueraDeDistribuidora(`${destino} no encontrado`)
  }
}

// ¿El data usa relaciones anidadas (cliente: { connect }) en vez de ids sueltos?
function usaRelaciones(modelo, data) {
  return (FORANEAS[modelo] || []).some(fk => data[fk.relacion] !== undefined)
}

function conDistribuidoraEnData(modelo, data, distribuidoraId) {
  const limpio = { ...data }
  delete limpio.distribuidoraId
  delete limpio.distribuidora
  return usaRelaciones(modelo, limpio)
    ? { ...limpio, distribuidora: { connect: { id: distribuidoraId } } }
    : { ...limpio, distribuidoraId }
}

function sinCambioDeDistribuidora(data) {
  if (!data || typeof data !== 'object') return data
  const limpio = { ...data }
  delete limpio.distribuidoraId
  delete limpio.distribuidora
  return limpio
}

function agregarAnd(where, filtro) {
  const w = where ?? {}
  const previos = Array.isArray(w.AND) ? w.AND : (w.AND ? [w.AND] : [])
  return { ...w, AND: [...previos, filtro] }
}

const prisma = base.$extends({
  name: 'filtroDistribuidora',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const esPropia = CON_DISTRIBUIDORA.has(model)
        const padre    = HIJAS[model]
        if (!esPropia && !padre) return query(args)

        const ctx = contexto()
        if (ctx?.plataforma) return query(args)
        const distribuidoraId = ctx?.distribuidoraId
        if (!distribuidoraId) throw new ErrorSinDistribuidora()

        const a = { ...args }

        // 1. Filtro de lectura / escritura por where
        if (OPS_CON_WHERE.has(operation)) {
          a.where = esPropia
            ? { ...(a.where ?? {}), distribuidoraId }
            : agregarAnd(a.where, { [padre]: { distribuidoraId } })
        }

        // 2. Datos a escribir: poner la distribuidora y validar ids foráneos
        if (operation === 'create') {
          await comprobarForaneas(model, [a.data], distribuidoraId)
          if (esPropia) a.data = conDistribuidoraEnData(model, a.data, distribuidoraId)
        } else if (operation === 'createMany' || operation === 'createManyAndReturn') {
          const lista = Array.isArray(a.data) ? a.data : [a.data]
          await comprobarForaneas(model, lista, distribuidoraId)
          if (esPropia) a.data = lista.map(d => ({ ...sinCambioDeDistribuidora(d), distribuidoraId }))
        } else if (operation === 'update' || operation === 'updateMany') {
          a.data = sinCambioDeDistribuidora(a.data)
          await comprobarForaneas(model, [a.data], distribuidoraId)
        } else if (operation === 'upsert') {
          await comprobarForaneas(model, [a.create, a.update], distribuidoraId)
          a.update = sinCambioDeDistribuidora(a.update)
          if (esPropia) a.create = conDistribuidoraEnData(model, a.create, distribuidoraId)
        }

        return query(a)
      },
    },
  },
})

// Sin filtro, solo para el panel de plataforma y scripts de mantenimiento
prisma.sinFiltro = base

module.exports = prisma
