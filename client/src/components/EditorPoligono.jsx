import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import 'leaflet-draw'

// Centro de Puyo (Pastaza). Antes apuntaba a -1.0403,-77.8167 (Puerto Napo, 50 km al norte).
export const PUYO = [-1.4924, -77.9979]

export const COLORES_ZONA = ['#dc3545', '#198754', '#fd7e14', '#6f42c1', '#0dcaf0', '#d63384', '#20c997', '#ffc107']

export default function EditorPoligono({ poligonoInicial, otrosPoligonos = [], nombreZona = '', zonaActiva = true, onGuardar, onCancelar }) {
  return (
    <div className="mt-3">
      <MapContainer center={PUYO} zoom={13} style={{ height: 420, borderRadius: 10 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <DrawControl
          poligonoInicial={poligonoInicial}
          otrosPoligonos={otrosPoligonos}
          nombreZona={nombreZona}
          zonaActiva={zonaActiva}
          onGuardar={onGuardar}
          onCancelar={onCancelar}
        />
      </MapContainer>
      {otrosPoligonos.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mt-2">
          {otrosPoligonos.map(o => (
            <span key={o.placa} className="badge" style={{ background: o.color, fontSize: '0.72rem' }}>
              <i className="bi bi-pentagon-fill me-1"></i>{o.placa}
            </span>
          ))}
          <span className="badge" style={{ background: '#0066CC', fontSize: '0.72rem' }}>
            <i className="bi bi-pentagon-fill me-1"></i>{nombreZona || 'Zona nueva'}
          </span>
        </div>
      )}
      <p className="text-muted small mt-2">
        <i className="bi bi-info-circle me-1"></i>
        Usa el botón <strong>polígono</strong> del mapa para dibujar el área de cobertura. Haz clic en el primer punto para cerrar la figura.
      </p>
    </div>
  )
}

function DrawControl({ poligonoInicial, otrosPoligonos = [], nombreZona = '', zonaActiva = true, onGuardar, onCancelar }) {
  const map = useMap()
  const drawnRef = useRef(null)
  const didFitRef = useRef(false)
  // El nombre puede cambiar mientras se escribe: mantenerlo en un ref para usarlo al dibujar
  const nombreRef = useRef(nombreZona)
  useEffect(() => {
    nombreRef.current = nombreZona
    // Actualizar en vivo la etiqueta del polígono ya dibujado
    drawnRef.current?.getLayers().forEach(l => {
      if (l.getTooltip()) l.setTooltipContent(nombreZona || 'Zona nueva')
    })
  }, [nombreZona])

  // Capa de dibujo + controles (se crea una sola vez)
  useEffect(() => {
    const drawnItems = new L.FeatureGroup()
    map.addLayer(drawnItems)
    drawnRef.current = drawnItems

    if (poligonoInicial?.length >= 3) {
      const latlngs = poligonoInicial.map(([lat, lng]) => [lat, lng])
      const poly = L.polygon(latlngs, { color: '#0066CC', fillOpacity: 0.2 })
      poly.bindTooltip(nombreRef.current || 'Esta zona', { permanent: true, direction: 'center', className: '' })
      drawnItems.addLayer(poly)
      map.fitBounds(poly.getBounds(), { padding: [30, 30] })
      didFitRef.current = true
    }

    const drawControl = new L.Control.Draw({
      edit: { featureGroup: drawnItems },
      draw: {
        polygon:      { shapeOptions: { color: '#0066CC', fillOpacity: 0.2 } },
        polyline:     false,
        rectangle:    false,
        circle:       false,
        marker:       false,
        circlemarker: false,
      },
    })
    map.addControl(drawControl)

    map.on(L.Draw.Event.CREATED, e => {
      drawnItems.clearLayers()
      e.layer.bindTooltip(nombreRef.current || 'Zona nueva', { permanent: true, direction: 'center', className: '' })
      drawnItems.addLayer(e.layer)
    })

    return () => {
      map.removeControl(drawControl)
      map.removeLayer(drawnItems)
      map.off(L.Draw.Event.CREATED)
    }
  }, [map])

  // El switch de la localidad oculta/muestra el polígono en edición
  // (el editor sigue abierto; el dibujo se conserva y reaparece al reactivar)
  useEffect(() => {
    const g = drawnRef.current
    if (!g) return
    if (zonaActiva) { if (!map.hasLayer(g)) map.addLayer(g) }
    else if (map.hasLayer(g)) map.removeLayer(g)
  }, [map, zonaActiva])

  // Zonas de referencia: se REDIBUJAN cada vez que cambian
  // (p. ej. al activar/desactivar una localidad con el mapa abierto)
  const refKey = otrosPoligonos.map(o => `${o.placa}|${o.color}`).join(';')
  useEffect(() => {
    const refLayers = []
    otrosPoligonos.forEach(({ placa, poligono, color }) => {
      if (poligono?.length >= 3) {
        const poly = L.polygon(poligono, {
          color,
          fillColor: color,
          fillOpacity: 0.12,
          weight: 2,
          dashArray: '6,4',
          interactive: false,
        })
        poly.bindTooltip(placa, { permanent: true, direction: 'center', className: '' })
        poly.addTo(map)
        refLayers.push(poly)
      }
    })

    // Encuadrar solo la primera vez (si no había polígono propio)
    if (!didFitRef.current && refLayers.length > 0) {
      try { map.fitBounds(L.featureGroup(refLayers).getBounds(), { padding: [40, 40] }) } catch {}
      didFitRef.current = true
    }

    return () => { refLayers.forEach(l => map.removeLayer(l)) }
  }, [map, refKey])

  function handleGuardar() {
    const layers = drawnRef.current?.getLayers() ?? []
    if (layers.length === 0) { alert('Dibuja un polígono primero'); return }
    const coords = layers[0].getLatLngs()[0].map(p => [p.lat, p.lng])
    onGuardar(coords)
  }

  return (
    <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 1000, display: 'flex', gap: 8 }}>
      <button className="btn btn-success btn-sm fw-semibold shadow" onClick={handleGuardar}>
        <i className="bi bi-check-lg me-1"></i>Guardar zona
      </button>
      <button className="btn btn-outline-secondary btn-sm shadow" onClick={onCancelar}>
        Cancelar
      </button>
    </div>
  )
}
