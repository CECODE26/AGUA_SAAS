// Tarjeta de fidelidad: cada bidón entregado suma un sello; al completar la
// tarjeta el cliente gana un premio: un producto gratis (recarga o envase) o un
// % de descuento en su siguiente pedido, según lo que elija el administrador.
//
// Reglas que importan:
//  - El sello se cuenta cuando el pedido queda ENTREGADO, no al hacerlo.
//  - Un mismo pedido no puede dar sellos dos veces (índice único pedidoId+tipo).
//  - El bidón de premio (precio 0) no suma sellos.
//  - Nada de esto puede romper una entrega: todo va en try/catch y solo registra.
const prisma = require('./prisma')
const { distribuidoraIdObligatoria } = require('./tenant')

// ── Configuración (una fila por distribuidora) ───────────────────────────────
async function getConfig() {
  const distribuidoraId = distribuidoraIdObligatoria()
  const existente = await prisma.configFidelidad.findUnique({ where: { distribuidoraId } })
  if (existente) return existente
  try {
    return await prisma.configFidelidad.create({ data: {} })
  } catch (e) {
    // Dos peticiones a la vez crearon la fila: usar la que quedó
    if (e?.code === 'P2002') return prisma.configFidelidad.findUnique({ where: { distribuidoraId } })
    throw e
  }
}

async function guardarConfig(datos = {}) {
  const permitidos = [
    'activo', 'sellosParaPremio', 'tipoPremio', 'productoPremioId', 'descuentoPct', 'productosQueSuman',
    'sumaApp', 'sumaExpress', 'sumaVisitaFija', 'caducidadMeses', 'maxPremiosPorMes',
  ]
  const data = {}
  for (const k of permitidos) if (datos[k] !== undefined) data[k] = datos[k]
  if (data.sellosParaPremio != null) {
    const n = parseInt(data.sellosParaPremio)
    if (!Number.isInteger(n) || n < 2 || n > 100) throw new Error('Los bidones para ganar deben estar entre 2 y 100')
    data.sellosParaPremio = n
  }
  if (data.tipoPremio != null && !['producto', 'descuento'].includes(data.tipoPremio)) throw new Error('Tipo de premio no válido')
  if (data.descuentoPct != null) {
    const n = parseInt(data.descuentoPct)
    if (!Number.isInteger(n) || n < 5 || n > 100) throw new Error('El descuento debe estar entre 5 % y 100 %')
    data.descuentoPct = n
  }
  // Los productos del programa tienen que ser de esta distribuidora
  const idsProductos = [
    ...(data.productoPremioId != null ? [parseInt(data.productoPremioId)] : []),
    ...(Array.isArray(data.productosQueSuman) ? data.productosQueSuman.map(Number) : []),
  ]
  if (idsProductos.length) {
    const unicos = [...new Set(idsProductos)]
    if (unicos.some(n => !Number.isInteger(n))) throw new Error('Producto no válido')
    const encontrados = await prisma.producto.count({ where: { id: { in: unicos } } })
    if (encontrados !== unicos.length) throw new Error('Producto no encontrado')
    if (data.productoPremioId != null) data.productoPremioId = parseInt(data.productoPremioId)
  }

  const actual = await getConfig()
  const final  = { ...actual, ...data }
  if (final.activo && final.tipoPremio === 'producto' && !final.productoPremioId) throw new Error('Elige qué producto se regala antes de activar el programa')
  if (final.activo && final.tipoPremio === 'descuento' && !final.descuentoPct) throw new Error('Indica el % de descuento antes de activar el programa')
  return prisma.configFidelidad.update({ where: { distribuidoraId: actual.distribuidoraId }, data })
}

// ── Cuántos sellos da un pedido ──────────────────────────────────────────────
// Suman las unidades de los productos elegidos; el premio (precio 0) nunca suma.
function sellosDePedido(pedido, config) {
  const lista = Array.isArray(config.productosQueSuman) && config.productosQueSuman.length > 0
    ? config.productosQueSuman.map(Number)
    : (config.productoPremioId ? [config.productoPremioId] : null)   // null = todos los productos

  return (pedido.items || []).reduce((suma, item) => {
    if (Number(item.precioUnitario) <= 0) return suma                 // bidón regalado
    if (lista && !lista.includes(item.productoId)) return suma
    return suma + (parseInt(item.cantidad) || 0)
  }, 0)
}

function canalPermitido(config, origen) {
  if (origen === 'express') return config.sumaExpress
  if (origen === 'visita')  return config.sumaVisitaFija
  return config.sumaApp
}

// ── Acreditar sellos y convertirlos en premios ───────────────────────────────
async function acreditar(clienteId, sellos, config) {
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { sellos: true, nombre: true } })
  if (!cliente) return { premiosNuevos: 0, restantes: 0 }

  const total         = (cliente.sellos || 0) + sellos
  const premiosNuevos = Math.floor(total / config.sellosParaPremio)
  const restantes     = total % config.sellosParaPremio

  await prisma.cliente.update({
    where: { id: clienteId },
    data: { sellos: restantes, ...(premiosNuevos > 0 ? { premiosDisponibles: { increment: premiosNuevos } } : {}) },
  })

  // Deja rastro de cada tarjeta completada
  for (let i = 0; i < premiosNuevos; i++) {
    await prisma.movimientoFidelidad.create({
      data: { clienteId, tipo: 'premio', sellos: -config.sellosParaPremio, nota: 'Tarjeta completa: bidón gratis' },
    }).catch(() => {})
  }
  return { premiosNuevos, restantes, nombre: cliente.nombre }
}

// ── Punto de entrada: un pedido quedó entregado ──────────────────────────────
// origen: 'app' (pedido normal) | 'express' (venta del chofer) | 'visita' (cliente fijo)
async function registrarEntrega(pedidoId, origen = 'app') {
  try {
    const config = await getConfig()
    if (!config.activo || !canalPermitido(config, origen)) return

    const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId }, include: { items: true } })
    if (!pedido || pedido.estado !== 'entregado' || !pedido.clienteId) return

    const sellos = sellosDePedido(pedido, config)
    if (sellos <= 0) return

    // El índice único (pedidoId, tipo) impide contar dos veces el mismo pedido
    await prisma.movimientoFidelidad.create({
      data: { clienteId: pedido.clienteId, tipo: 'gana', sellos, pedidoId, origen },
    })

    const r = await acreditar(pedido.clienteId, sellos, config)
    if (r.premiosNuevos > 0) avisarPremio(pedido.clienteId, r.premiosNuevos)
    console.log(`[FIDELIDAD] pedido #${pedidoId}: +${sellos} sello(s)${r.premiosNuevos ? ` · ${r.premiosNuevos} premio(s)` : ''}`)
  } catch (e) {
    if (e?.code === 'P2002') return   // ese pedido ya dio sellos
    console.error('[FIDELIDAD] registrarEntrega:', e.message)
  }
}

// Aviso al teléfono del cliente cuando completa la tarjeta (nunca lanza)
async function avisarPremio(clienteId, premios) {
  try {
    const push = require('./push')
    const title = 'Completaste tu tarjeta, {nombre}'
    const texto = await textoPremio(await getConfig())
    const body  = premios > 1
      ? `Ganaste ${premios} premios: ${texto} en cada uno. Úsalos en tus próximos pedidos.`
      : `Ganaste ${texto} en tu próximo pedido.`
    push.notificarCliente(clienteId, title, body, { destino: 'cliente', fidelidad: true })
  } catch (e) {
    console.error('[FIDELIDAD] aviso:', e.message)
  }
}

// Cómo se dice el premio en los avisos y en la app ("1 Bidón 20L gratis", "15 % de descuento")
async function textoPremio(config) {
  if (config.tipoPremio === 'descuento') return `${config.descuentoPct} % de descuento`
  if (!config.productoPremioId) return 'un premio'
  const p = await prisma.producto.findUnique({ where: { id: config.productoPremioId }, select: { nombre: true } })
  return p ? `1 ${p.nombre} gratis` : 'un premio'
}

// ── Canje: usar el premio en un pedido ───────────────────────────────────────
// Reserva el premio y devuelve qué aplicar, o null si no aplica:
//   { tipo: 'producto', productoId, cantidad: 1, precioUnitario: 0, ... }
//   { tipo: 'descuento', pct }
async function reservarPremio(clienteId, config) {
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { premiosDisponibles: true } })
  if (!cliente || (cliente.premiosDisponibles || 0) < 1) return null
  if (config.tipoPremio !== 'descuento' && !config.productoPremioId) return null

  if (config.maxPremiosPorMes) {
    const desde = new Date(); desde.setDate(1); desde.setHours(0, 0, 0, 0)
    const usados = await prisma.movimientoFidelidad.count({
      where: { clienteId, tipo: 'canje', creadoEn: { gte: desde } },
    })
    if (usados >= config.maxPremiosPorMes) return null
  }

  if (config.tipoPremio === 'descuento') {
    if (!config.descuentoPct) return null
    await prisma.cliente.update({ where: { id: clienteId }, data: { premiosDisponibles: { decrement: 1 } } })
    return { tipo: 'descuento', pct: config.descuentoPct }
  }

  const producto = await prisma.producto.findUnique({ where: { id: config.productoPremioId } })
  if (!producto || !producto.activo) return null

  await prisma.cliente.update({ where: { id: clienteId }, data: { premiosDisponibles: { decrement: 1 } } })
  return { tipo: 'producto', productoId: producto.id, cantidad: 1, precioUnitario: 0, nombre: producto.nombre, valor: Number(producto.precio) }
}

// Deja registrado el canje una vez que el pedido existe
async function registrarCanje(clienteId, pedidoId, origen = 'app') {
  try {
    await prisma.movimientoFidelidad.create({
      data: { clienteId, tipo: 'canje', sellos: 0, pedidoId, origen, nota: 'Premio usado' },
    })
  } catch (e) {
    if (e?.code !== 'P2002') console.error('[FIDELIDAD] registrarCanje:', e.message)
  }
}

// Si un pedido con premio se suspende o se elimina, el premio vuelve al cliente
async function devolverPremio(pedidoId) {
  try {
    const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId }, select: { clienteId: true, premioAplicado: true } })
    if (!pedido?.premioAplicado) return
    await prisma.cliente.update({ where: { id: pedido.clienteId }, data: { premiosDisponibles: { increment: 1 } } })
    await prisma.pedido.update({ where: { id: pedidoId }, data: { premioAplicado: false, descuentoFidelidad: null } })
    await prisma.movimientoFidelidad.deleteMany({ where: { pedidoId, tipo: 'canje' } })
    console.log(`[FIDELIDAD] premio devuelto del pedido #${pedidoId}`)
  } catch (e) {
    console.error('[FIDELIDAD] devolverPremio:', e.message)
  }
}

// ── Lo que ve el cliente en su tarjeta ───────────────────────────────────────
async function tarjetaDe(clienteId) {
  const config = await getConfig()
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { sellos: true, premiosDisponibles: true },
  })
  if (!cliente) return null

  const movimientos = await prisma.movimientoFidelidad.findMany({
    where: { clienteId },
    orderBy: { creadoEn: 'desc' },
    take: 10,
    select: { tipo: true, sellos: true, pedidoId: true, origen: true, nota: true, creadoEn: true },
  })

  let premio = null
  if (config.productoPremioId) {
    premio = await prisma.producto.findUnique({
      where: { id: config.productoPremioId },
      select: { id: true, nombre: true, precio: true },
    })
  }

  return {
    activo: config.activo,
    tipoPremio: config.tipoPremio,
    descuentoPct: config.descuentoPct,
    textoPremio: await textoPremio(config),
    meta: config.sellosParaPremio,
    sellos: cliente.sellos || 0,
    premiosDisponibles: cliente.premiosDisponibles || 0,
    faltan: Math.max(0, config.sellosParaPremio - (cliente.sellos || 0)),
    premio,
    movimientos,
  }
}

// ── Resumen para el panel del admin ──────────────────────────────────────────
async function resumenAdmin() {
  const config = await getConfig()
  const desde = new Date(); desde.setDate(1); desde.setHours(0, 0, 0, 0)

  const [conTarjeta, premiosListos, canjesMes, cercaRaw] = await Promise.all([
    prisma.cliente.count({ where: { OR: [{ sellos: { gt: 0 } }, { premiosDisponibles: { gt: 0 } }] } }),
    prisma.cliente.count({ where: { premiosDisponibles: { gt: 0 } } }),
    prisma.movimientoFidelidad.count({ where: { tipo: 'canje', creadoEn: { gte: desde } } }),
    prisma.cliente.findMany({
      where: { OR: [{ premiosDisponibles: { gt: 0 } }, { sellos: { gte: Math.max(1, config.sellosParaPremio - 2) } }] },
      orderBy: [{ premiosDisponibles: 'desc' }, { sellos: 'desc' }],
      take: 12,
      select: { id: true, nombre: true, sector: true, sellos: true, premiosDisponibles: true },
    }),
  ])

  let valorPremio = 0
  if (config.productoPremioId) {
    const p = await prisma.producto.findUnique({ where: { id: config.productoPremioId }, select: { precio: true } })
    valorPremio = Number(p?.precio || 0)
  }

  // Lo que costó el programa este mes: productos regalados a su precio + descuentos hechos
  const canjesProducto = await prisma.pedidoItem.findMany({
    where: { precioUnitario: 0, pedido: { premioAplicado: true, creadoEn: { gte: desde } } },
    select: { cantidad: true, producto: { select: { precio: true } } },
  })
  const descuentos = await prisma.pedido.aggregate({
    where: { premioAplicado: true, creadoEn: { gte: desde } },
    _sum: { descuentoFidelidad: true },
  })
  const costoMes = canjesProducto.reduce((s, i) => s + i.cantidad * Number(i.producto?.precio || 0), 0)
    + Number(descuentos._sum.descuentoFidelidad || 0)

  return {
    config,
    textoPremio: await textoPremio(config),
    conTarjeta,
    premiosListos,
    canjesMes,
    costoMes: +costoMes.toFixed(2),
    valorPremio,
    cerca: cercaRaw,
  }
}

// ── Caducidad (opcional): borra sellos de quien no compra hace meses ─────────
async function caducarSellos() {
  const config = await getConfig()
  if (!config.activo || !config.caducidadMeses) return { caducados: 0 }
  const limite = new Date(); limite.setMonth(limite.getMonth() - config.caducidadMeses)

  const candidatos = await prisma.cliente.findMany({
    where: { sellos: { gt: 0 } },
    select: { id: true, sellos: true },
  })
  let caducados = 0
  for (const c of candidatos) {
    const ultimo = await prisma.movimientoFidelidad.findFirst({
      where: { clienteId: c.id, tipo: 'gana' },
      orderBy: { creadoEn: 'desc' },
      select: { creadoEn: true },
    })
    if (ultimo && ultimo.creadoEn < limite) {
      await prisma.cliente.update({ where: { id: c.id }, data: { sellos: 0 } })
      await prisma.movimientoFidelidad.create({
        data: { clienteId: c.id, tipo: 'caduca', sellos: -c.sellos, nota: `Sin comprar ${config.caducidadMeses} meses` },
      }).catch(() => {})
      caducados++
    }
  }
  return { caducados }
}

module.exports = {
  getConfig, guardarConfig,
  registrarEntrega, reservarPremio, registrarCanje, devolverPremio,
  tarjetaDe, resumenAdmin, caducarSellos, textoPremio,
  sellosDePedido, acreditar,
}
