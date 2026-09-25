// Notificaciones push vía Expo Push Service.
// El servidor manda a exp.host; Expo entrega por FCM (Android) y APNs (iOS).
// Todas las funciones son "fire and forget": nunca lanzan, solo registran errores.
const prisma = require('./prisma')

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const LOTE          = 100   // máximo de mensajes por petición a Expo

const esTokenExpo = t => typeof t === 'string' && /^Expo(nent)?PushToken\[.+\]$/.test(t)

// Un token que Expo reporta como DeviceNotRegistered ya no sirve: se borra
async function limpiarToken(token) {
  try {
    await prisma.conductor.updateMany({ where: { pushToken: token }, data: { pushToken: null } })
    await prisma.cliente.updateMany({   where: { pushToken: token }, data: { pushToken: null } })
    console.log('[PUSH] token inválido eliminado')
  } catch (e) {
    console.error('[PUSH] limpiar token:', e.message)
  }
}

// mensajes: [{ to, title, body, data? }]
async function enviar(mensajes) {
  const validos = (mensajes || []).filter(m => esTokenExpo(m.to))
  if (validos.length === 0) return

  for (let i = 0; i < validos.length; i += LOTE) {
    const lote = validos.slice(i, i + LOTE).map(m => ({
      sound:     'default',
      priority:  'high',
      channelId: 'pedidos',
      ...m,
    }))
    try {
      const res  = await fetch(EXPO_PUSH_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body:    JSON.stringify(lote),
      })
      const json    = await res.json().catch(() => ({}))
      const tickets = Array.isArray(json.data) ? json.data : []
      let ok = 0
      for (let j = 0; j < tickets.length; j++) {
        const t = tickets[j]
        if (t.status === 'ok') { ok++; continue }
        console.error('[PUSH] error:', t.message, t.details?.error ?? '')
        if (t.details?.error === 'DeviceNotRegistered') await limpiarToken(lote[j].to)
      }
      if (json.errors) console.error('[PUSH] respuesta Expo:', JSON.stringify(json.errors))
      console.log(`[PUSH] ${ok}/${lote.length} enviada(s)`)
    } catch (e) {
      console.error('[PUSH ERROR]', e.message)
    }
  }
}

// ── Helpers de texto ─────────────────────────────────────────────────────────

const hoyISO = () => new Date().toISOString().split('T')[0]

function fechaCorta(fecha) {
  if (!fecha) return null
  const iso = new Date(fecha).toISOString().split('T')[0]
  if (iso === hoyISO()) return 'hoy'
  const [, m, d] = iso.split('-')
  return `el ${d}/${m}`
}

// "JANICK RODRIGO CEVALLOS" → "Janick Rodrigo Cevallos"
function capitalizar(texto = '') {
  return String(texto).trim().toLowerCase().replace(/(^|\s)\S/g, s => s.toUpperCase())
}

// "JANICK RODRIGO CEVALLOS" → "Janick"
function primerNombre(nombre) {
  const n = capitalizar(nombre).split(/\s+/)[0]
  return n || null
}

// Los textos usan {nombre}; si no hay nombre se quita el saludo sin dejar comas sueltas.
function personalizar(texto, nombre) {
  if (!texto) return texto
  if (nombre) return texto.replace(/\{nombre\}/g, nombre)
  const limpio = texto
    .replace(/,\s*\{nombre\}/g, '')
    .replace(/\{nombre\},\s*/g, '')
    .replace(/\{nombre\}/g, '')
    .replace(/^\s*[,:]\s*/, '')
    .trim()
  return limpio.charAt(0).toUpperCase() + limpio.slice(1)
}

function direccionDe(cliente = {}) {
  const calles = [cliente.callePrincipal, cliente.calleSecundaria].filter(Boolean).join(' y ')
  const base   = calles || cliente.referencia || 'sin dirección'
  return cliente.sector && base !== cliente.sector ? `${base}, ${cliente.sector}` : base
}

// "2 Bidón 20 L y 1 Botellón" a partir de los items del pedido
function resumenItems(items = []) {
  const partes = (items || [])
    .filter(i => i && i.cantidad)
    .map(i => `${i.cantidad} ${i.producto?.nombre ?? 'producto'}`)
  if (partes.length === 0) return null
  if (partes.length === 1) return partes[0]
  if (partes.length === 2) return `${partes[0]} y ${partes[1]}`
  return `${partes[0]}, ${partes[1]} y más`
}

const money = n => `$${Number(n || 0).toFixed(2)}`

// ── Mensajes estándar (sin emojis; {nombre} se reemplaza al enviar) ─────────

const msg = {
  pedidoRecibido: p => {
    const items = resumenItems(p.items)
    return {
      title: `Listo, {nombre}: pedido #${p.id} confirmado`,
      body:  `${items ? `${items} · ` : ''}Total ${money(p.total)}. Te avisamos apenas salga el camión.`,
    }
  },
  pedidoProgramado: (p, fecha, chofer = null) => {
    const cuando = fechaCorta(fecha)
    const camion = chofer ? `el camión de ${chofer}` : 'el camión de Agua Manú'
    return cuando === 'hoy' || !cuando
      ? { title: 'Tu agua sale hoy, {nombre}',
          body:  `El pedido #${p.id} va en ${camion}. Ten lista tu entrada.` }
      : { title: `Tu agua sale ${cuando}, {nombre}`,
          body:  `El pedido #${p.id} está programado y va en ${camion}.` }
  },
  pedidoEntregado: (p, chofer = null) => ({
    title: 'Agua fresca en casa, {nombre}',
    body:  `Pedido #${p.id} entregado${chofer ? ` por ${chofer}` : ''}. Gracias por preferir Agua Manú.`,
  }),
  pedidoNoEntregado: (p, motivo) => ({
    title: 'Tocamos y no estabas, {nombre}',
    body:  `Pedido #${p.id}${motivo ? `: ${motivo}` : ''}. Nos comunicamos contigo para reprogramarlo sin costo.`,
  }),
  pedidoSuspendido: p => ({
    title: `Pausamos tu pedido #${p.id}, {nombre}`,
    body:  'Cuando quieras retomarlo, escríbenos o toca aquí.',
  }),
  nuevoPedidoConductor: p => ({
    title: `Pedido nuevo en tu ruta: ${capitalizar(p.cliente?.nombre) || 'cliente'}`,
    body:  `${direccionDe(p.cliente)} · ${money(p.total)}. Ya está sumado a tu recorrido.`,
  }),
  rutaConductor: n => ({
    title: `{nombre}, tu ruta de hoy tiene ${n} entrega${n !== 1 ? 's' : ''}`,
    body:  'Revisa el recorrido y arranca cuando estés listo.',
  }),
}

// ── Envío individual (resuelve {nombre} con el destinatario) ────────────────

async function notificarConductor(conductorId, title, body, data = {}) {
  try {
    if (!conductorId) return
    const c = await prisma.conductor.findUnique({ where: { id: conductorId }, select: { pushToken: true, nombre: true } })
    if (!c?.pushToken) return
    const nombre = primerNombre(c.nombre)
    await enviar([{
      to: c.pushToken,
      title: personalizar(title, nombre),
      body:  personalizar(body, nombre),
      categoryId: 'ruta_conductor',
      data: { destino: 'conductor', ...data },
    }])
  } catch (e) {
    console.error('[PUSH conductor]', e.message)
  }
}

async function notificarCliente(clienteId, title, body, data = {}) {
  try {
    if (!clienteId) return
    const c = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { pushToken: true, nombre: true } })
    if (!c?.pushToken) return
    const nombre = primerNombre(c.nombre)
    await enviar([{
      to: c.pushToken,
      title: personalizar(title, nombre),
      body:  personalizar(body, nombre),
      categoryId: 'estado_pedido',
      data: { destino: 'cliente', ...data },
    }])
  } catch (e) {
    console.error('[PUSH cliente]', e.message)
  }
}

// ── Avisos compuestos ────────────────────────────────────────────────────────

// Avisa a los clientes de varios pedidos que quedaron planificados en una ruta.
// La fecha y el chofer se toman de la ruta más reciente en la que está cada pedido.
async function notificarClientesPlanificados(pedidoIds) {
  try {
    const ids = (pedidoIds || []).map(Number).filter(Boolean)
    if (ids.length === 0) return
    const pedidos = await prisma.pedido.findMany({
      where:   { id: { in: ids } },
      include: {
        cliente:   { select: { id: true, pushToken: true, nombre: true } },
        planItems: {
          include: { ruta: { select: { fecha: true, conductor: { select: { nombre: true } } } } },
          orderBy: { id: 'desc' },
          take: 1,
        },
      },
    })
    const mensajes = pedidos
      .filter(p => p.cliente?.pushToken)
      .map(p => {
        const ruta   = p.planItems[0]?.ruta
        const chofer = primerNombre(ruta?.conductor?.nombre)
        const nombre = primerNombre(p.cliente.nombre)
        const m      = msg.pedidoProgramado(p, ruta?.fecha ?? null, chofer)
        return {
          to: p.cliente.pushToken,
          title: personalizar(m.title, nombre),
          body:  personalizar(m.body, nombre),
          categoryId: 'estado_pedido',
          data: { destino: 'cliente', pedidoId: p.id },
        }
      })
    await enviar(mensajes)
  } catch (e) {
    console.error('[PUSH planificados]', e.message)
  }
}

// Nombre del chofer que lleva el pedido (última ruta en la que está)
async function choferDePedido(pedidoId) {
  try {
    const p = await prisma.pedido.findUnique({
      where:  { id: pedidoId },
      select: {
        planItems: {
          select:  { ruta: { select: { conductor: { select: { nombre: true } } } } },
          orderBy: { id: 'desc' },
          take: 1,
        },
      },
    })
    return primerNombre(p?.planItems?.[0]?.ruta?.conductor?.nombre)
  } catch {
    return null
  }
}

// Avisa al cliente del cambio de estado de su pedido (entregado / no_entregado / suspendido)
async function notificarEstadoPedido(pedido, estado, motivo = null) {
  try {
    if (!pedido?.clienteId) return
    let m = null
    if (estado === 'entregado')    m = msg.pedidoEntregado(pedido, await choferDePedido(pedido.id))
    if (estado === 'no_entregado') m = msg.pedidoNoEntregado(pedido, motivo)
    if (estado === 'suspendido')   m = msg.pedidoSuspendido(pedido)
    if (estado === 'planificado')  return notificarClientesPlanificados([pedido.id])
    if (!m) return
    await notificarCliente(pedido.clienteId, m.title, m.body, { pedidoId: pedido.id, estado })
  } catch (e) {
    console.error('[PUSH estado]', e.message)
  }
}

module.exports = {
  enviar,
  notificarConductor,
  notificarCliente,
  notificarClientesPlanificados,
  notificarEstadoPedido,
  msg,
  personalizar,
  primerNombre,
}
