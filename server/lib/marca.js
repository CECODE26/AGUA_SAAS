// Datos de la distribuidora actual que aparecen en textos (correos, avisos push, 2 pasos).
const { distribuidoraActual } = require('./tenant')

const MARCA_PLATAFORMA = 'Agua Elite'

function nombreMarca() {
  return distribuidoraActual()?.nombre || MARCA_PLATAFORMA
}

function ciudadPorDefecto() {
  return distribuidoraActual()?.ciudad || 'Puyo'
}

function provinciaPorDefecto() {
  return distribuidoraActual()?.provincia || 'Pastaza'
}

// Clientes sin correo real (creados por el maestro o en venta exprés) llevan un correo
// interno único dentro de su distribuidora. Los de antes de la migración usaban
// @aguamanu.local; la migración multi_distribuidora los pasa a este dominio.
const DOMINIO_INTERNO = 'sin-correo.local'

function correoInterno(local, sub = null) {
  return `${local}@${sub ? `${sub}.` : ''}${DOMINIO_INTERNO}`
}

function esCorreoInterno(email) {
  return typeof email === 'string' && email.endsWith(DOMINIO_INTERNO)
}

module.exports = {
  MARCA_PLATAFORMA, DOMINIO_INTERNO,
  nombreMarca, ciudadPorDefecto, provinciaPorDefecto, correoInterno, esCorreoInterno,
}
