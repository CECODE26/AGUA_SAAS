const prisma = require('./prisma')

// ─── Geometría de zonas/rutas ────────────────────────────────────────────────
// Los polígonos se guardan como [[lat, lng], ...] (convención Leaflet).
// También se aceptan los formatos GeoJSON usados por autoDespacho.

function normalizarAnillo(poligono) {
  if (!poligono) return null
  if (Array.isArray(poligono)) return poligono.length >= 3 ? poligono : null
  if (poligono.type === 'Polygon' && Array.isArray(poligono.coordinates?.[0])) {
    return poligono.coordinates[0].map(([lng, lat]) => [lat, lng])
  }
  if (poligono.type === 'Feature' && poligono.geometry?.type === 'Polygon') {
    return poligono.geometry.coordinates[0].map(([lng, lat]) => [lat, lng])
  }
  return null
}

function puntoEnAnillo([lat, lng], anillo) {
  let inside = false
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const yi = anillo[i][0], xi = anillo[i][1]
    const yj = anillo[j][0], xj = anillo[j][1]
    const intersecta = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)
    if (intersecta) inside = !inside
  }
  return inside
}

// Orientación de la terna de puntos (producto cruzado del giro p→q→r)
function orientacion(p, q, r) {
  const val = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1])
  if (Math.abs(val) < 1e-12) return 0
  return val > 0 ? 1 : 2
}

function enSegmento(p, q, r) {
  return q[0] <= Math.max(p[0], r[0]) && q[0] >= Math.min(p[0], r[0]) &&
         q[1] <= Math.max(p[1], r[1]) && q[1] >= Math.min(p[1], r[1])
}

function segmentosSeCruzan(p1, q1, p2, q2) {
  const o1 = orientacion(p1, q1, p2)
  const o2 = orientacion(p1, q1, q2)
  const o3 = orientacion(p2, q2, p1)
  const o4 = orientacion(p2, q2, q1)
  if (o1 !== o2 && o3 !== o4) return true
  if (o1 === 0 && enSegmento(p1, p2, q1)) return true
  if (o2 === 0 && enSegmento(p1, q2, q1)) return true
  if (o3 === 0 && enSegmento(p2, p1, q2)) return true
  if (o4 === 0 && enSegmento(p2, q1, q2)) return true
  return false
}

// ¿Se solapan dos polígonos? (vértice contenido o aristas que se cruzan)
function poligonosSeCruzan(polA, polB) {
  const a = normalizarAnillo(polA)
  const b = normalizarAnillo(polB)
  if (!a || !b) return false

  if (a.some(v => puntoEnAnillo(v, b))) return true
  if (b.some(v => puntoEnAnillo(v, a))) return true

  for (let i = 0; i < a.length; i++) {
    const a1 = a[i], a2 = a[(i + 1) % a.length]
    for (let j = 0; j < b.length; j++) {
      const b1 = b[j], b2 = b[(j + 1) % b.length]
      if (segmentosSeCruzan(a1, a2, b1, b2)) return true
    }
  }
  return false
}

/**
 * Busca una ruta ACTIVA de OTRO camión que se cruce con el polígono dado.
 * Devuelve la localidad en conflicto o null. Las rutas del mismo camión
 * pueden solaparse (p. ej. norte y sur del mismo chofer se tocan) y las
 * inactivas o sin camión no bloquean.
 */
async function buscarConflictoDeZona({ poligono, camionId, ignorarId = null }) {
  if (!camionId || !poligono) return null
  const otras = await prisma.localidad.findMany({
    where: {
      activo: true,
      camionId: { not: null },
      NOT: [
        { camionId: parseInt(camionId) },
        ...(ignorarId ? [{ id: ignorarId }] : []),
      ],
    },
    select: { id: true, nombre: true, poligono: true, camion: { select: { placa: true } } },
  })
  for (const otra of otras) {
    if (poligonosSeCruzan(poligono, otra.poligono)) return otra
  }
  return null
}

module.exports = { poligonosSeCruzan, buscarConflictoDeZona }
