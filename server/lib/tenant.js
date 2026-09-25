// Contexto de la distribuidora de cada petición.
// Se guarda con AsyncLocalStorage: todo lo que corre dentro de la petición (rutas,
// libs, tareas en segundo plano que se disparan desde ella) ve la misma distribuidora
// sin tener que pasarla de mano en mano. lib/prisma.js la usa para filtrar.
const { AsyncLocalStorage } = require('async_hooks')

const als = new AsyncLocalStorage()

class ErrorSinDistribuidora extends Error {
  constructor(message = 'No se sabe a qué distribuidora va esta petición') {
    super(message)
    this.status = 400
    this.codigo = 'SIN_DISTRIBUIDORA'
  }
}

// Registro fuera de la distribuidora actual (id de otra empresa en el cuerpo o la URL)
class ErrorFueraDeDistribuidora extends Error {
  constructor(message = 'Registro no encontrado') {
    super(message)
    this.status = 404
    this.codigo = 'FUERA_DE_DISTRIBUIDORA'
  }
}

function contexto() {
  return als.getStore() ?? null
}

// Id de la distribuidora de la petición; null si no hay
function distribuidoraId() {
  return als.getStore()?.distribuidoraId ?? null
}

// Igual, pero falla si no hay distribuidora (para código que la necesita sí o sí)
function distribuidoraIdObligatoria() {
  const id = distribuidoraId()
  if (!id) throw new ErrorSinDistribuidora()
  return id
}

// Datos de la distribuidora (nombre, marca, contacto) ya cargados por el resolver
function distribuidoraActual() {
  return als.getStore()?.distribuidora ?? null
}

// Las consultas de Prisma son perezosas: se ejecutan al hacer await. Por eso el await
// va dentro del run, si no la consulta correría fuera del contexto.

// Corre fn como si fuera una petición de esa distribuidora (tareas programadas, alta de empresas)
function conDistribuidora(distribuidora, fn) {
  const esObjeto = typeof distribuidora === 'object'
  const store = { distribuidoraId: esObjeto ? distribuidora.id : distribuidora, distribuidora: esObjeto ? distribuidora : null }
  return als.run(store, async () => await fn())
}

// Corre fn sin filtro: solo para el panel de la plataforma, que ve todas las empresas
function comoPlataforma(fn) {
  return als.run({ plataforma: true }, async () => await fn())
}

module.exports = {
  als,
  contexto,
  distribuidoraId,
  distribuidoraIdObligatoria,
  distribuidoraActual,
  conDistribuidora,
  comoPlataforma,
  ErrorSinDistribuidora,
  ErrorFueraDeDistribuidora,
}
