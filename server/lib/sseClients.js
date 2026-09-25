// Mapa de conductores conectados por SSE: conductorId → res
const clients = new Map()

function registrar(conductorId, res) {
  const anterior = clients.get(conductorId)
  if (anterior) { try { anterior.end() } catch {} }
  clients.set(conductorId, res)
}

function eliminar(conductorId) {
  clients.delete(conductorId)
}

function notificar(conductorId, evento) {
  const res = clients.get(conductorId)
  if (res) {
    try { res.write(`data: ${JSON.stringify(evento)}\n\n`) } catch {}
  }
}

module.exports = { registrar, eliminar, notificar }
