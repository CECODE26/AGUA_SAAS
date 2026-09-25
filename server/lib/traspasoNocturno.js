/**
 * traspasoNocturno.js
 *
 * A las 20:00 hora Ecuador (UTC-5 → 01:00 UTC del día siguiente) busca todos
 * los PlanRutaItem de HOY cuyo pedido no está entregado y los mueve como
 * primeras paradas de la ruta del conductor para MAÑANA.
 *
 * Uso: require('./lib/traspasoNocturno') desde index.js — se programa solo.
 */

const prisma = require('./prisma')
const { comoPlataforma, conDistribuidora } = require('./tenant')

// ─── Cálculo de próxima ejecución ────────────────────────────────────────────

/**
 * Devuelve los milisegundos hasta la próxima vez que sean las 20:00 en Ecuador.
 * Ecuador = UTC-5.  20:00 ECT = 01:00 UTC del día siguiente.
 *
 * Si ya pasaron las 20:00 de hoy, programa para mañana.
 */
function msHastaProximaEjecucion() {
  const ahora = new Date()

  // Hora local Ecuador en la que queremos disparar: 20:00 → UTC 01:00 siguiente día
  // Construimos la próxima marca de tiempo UTC equivalente.
  // Enfoque simple: calculamos cuándo son las 01:00 UTC del mañana/pasado mañana.

  const ahoraUTC = ahora.getTime()

  // Próxima 01:00 UTC
  const proximaUTC = (() => {
    const candidato = new Date(ahora)
    candidato.setUTCHours(1, 0, 0, 0)
    // Si ya pasó (o está en los próximos segundos), adelantar un día
    if (candidato.getTime() <= ahoraUTC) {
      candidato.setUTCDate(candidato.getUTCDate() + 1)
    }
    return candidato.getTime()
  })()

  return proximaUTC - ahoraUTC
}

// ─── Lógica de traspaso ───────────────────────────────────────────────────────

async function traspasoDeDistribuidora() {

  const ahora = new Date()

  // "Hoy" en Ecuador (UTC-5): cuando son las 20:00 ECT son las 01:00 UTC del día
  // siguiente, por lo tanto "hoy Ecuador" = ayer UTC.
  const hoyEcuadorUTC = new Date(ahora)
  hoyEcuadorUTC.setUTCDate(hoyEcuadorUTC.getUTCDate() - 1) // retroceder un día
  const fechaHoy = hoyEcuadorUTC.toISOString().split('T')[0]

  // "Mañana" Ecuador = hoy UTC
  const fechaMañana = ahora.toISOString().split('T')[0]

  const iniciHoy = new Date(fechaHoy + 'T00:00:00Z')
  const finHoy   = new Date(fechaHoy + 'T23:59:59Z')

  // 1. Obtener todos los PlanRutaItem de hoy con pedidos no entregados
  const itemsHoy = await prisma.planRutaItem.findMany({
    where: {
      ruta: {
        fecha: { gte: iniciHoy, lte: finHoy },
      },
      pedido: {
        estado: { not: 'entregado' },
      },
    },
    include: {
      pedido: true,
      ruta: {
        select: { id: true, conductorId: true, nombre: true },
      },
    },
    orderBy: { orden: 'asc' },
  })

  if (itemsHoy.length === 0) {
    console.log('🌙 Traspaso nocturno: no hay pedidos pendientes de hoy. Nada que hacer.')
    return
  }

  // 2. Agrupar por conductorId
  const porConductor = new Map()
  for (const item of itemsHoy) {
    const conductorId = item.ruta.conductorId
    if (conductorId == null) continue
    if (!porConductor.has(conductorId)) {
      porConductor.set(conductorId, [])
    }
    porConductor.get(conductorId).push(item)
  }

  // 3. Para cada conductor, insertar pendientes al inicio de la ruta de mañana
  const iniciMañana = new Date(fechaMañana + 'T00:00:00Z')
  const finMañana   = new Date(fechaMañana + 'T23:59:59Z')

  for (const [conductorId, items] of porConductor.entries()) {
    const conductor = await prisma.conductor.findUnique({
      where: { id: conductorId },
      select: { id: true, nombre: true },
    })
    if (!conductor) continue

    const pendientes = items // ya ordenados por orden asc
    const N = pendientes.length

    // Buscar o crear ruta de mañana
    let rutaMañana = await prisma.planRuta.findFirst({
      where: {
        conductorId,
        fecha: { gte: iniciMañana, lte: finMañana },
      },
      include: { items: { orderBy: { orden: 'asc' } } },
    })

    if (!rutaMañana) {
      rutaMañana = await prisma.planRuta.create({
        data: {
          conductorId,
          fecha:  iniciMañana,
          nombre: `Ruta ${fechaMañana} — ${conductor.nombre}`,
        },
        include: { items: true },
      })
    }

    // Desplazar ítems existentes: sumarles N al orden para dejar espacio al inicio
    if (rutaMañana.items.length > 0) {
      await prisma.$transaction(
        rutaMañana.items.map(item =>
          prisma.planRutaItem.update({
            where: { id: item.id },
            data:  { orden: item.orden + N },
          })
        )
      )
    }

    // Insertar los pendientes como primeras paradas (orden 1, 2, 3 ... N)
    // Filtrar pedidos que ya estuvieran en la ruta de mañana (evitar duplicados)
    const pedidosYaEnRuta = new Set(rutaMañana.items.map(i => i.pedidoId))

    let ordenActual = 1
    const pedidosInsertados = []
    for (const item of pendientes) {
      if (pedidosYaEnRuta.has(item.pedidoId)) {
        console.log(`🌙 Traspaso: pedido #${item.pedidoId} ya está en ruta de mañana, omitido`)
        continue
      }
      await prisma.planRutaItem.create({
        data: {
          rutaId:   rutaMañana.id,
          pedidoId: item.pedidoId,
          orden:    ordenActual++,
        },
      })
      pedidosInsertados.push(item.pedidoId)
    }

    // Asegurar que los pedidos traspasados queden como planificado
    if (pedidosInsertados.length > 0) {
      await prisma.pedido.updateMany({
        where: { id: { in: pedidosInsertados } },
        data:  { estado: 'planificado' },
      })
    }

    const insertados = ordenActual - 1
    console.log(`🌙 Traspaso: ${insertados} pedidos pendientes → ${conductor.nombre} para mañana (ruta #${rutaMañana.id})`)
  }

}

// Corre el traspaso en cada distribuidora activa; si una falla, sigue con las demás
async function ejecutarTraspaso() {
  console.log('🌙 Traspaso nocturno: iniciando...')
  try {
    const activas = await comoPlataforma(() => prisma.distribuidora.findMany({ where: { activo: true } }))
    for (const d of activas) {
      try {
        console.log(`🌙 Traspaso: ${d.nombre} (${d.slug})`)
        await conDistribuidora(d, traspasoDeDistribuidora)
      } catch (e) {
        console.error(`🌙 Traspaso nocturno falló en ${d.slug}:`, e.message)
      }
    }
    console.log('🌙 Traspaso nocturno: completado.')
  } catch (e) {
    console.error('🌙 Traspaso nocturno:', e.message)
  } finally {
    programarProximaEjecucion()
  }
}

// ─── Programación con setTimeout ─────────────────────────────────────────────

function programarProximaEjecucion() {
  const ms = msHastaProximaEjecucion()
  const horas = (ms / 1000 / 60 / 60).toFixed(1)
  console.log(`🌙 Traspaso nocturno: próxima ejecución en ${horas}h (20:00 hora Ecuador)`)
  setTimeout(ejecutarTraspaso, ms)
}

// Iniciar la cadena al importar el módulo
programarProximaEjecucion()

module.exports = { ejecutarTraspaso }
