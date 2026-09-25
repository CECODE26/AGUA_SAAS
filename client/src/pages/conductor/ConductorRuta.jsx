import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const DEPOSITO = { lat: -1.488252, lng: -78.015242 }

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

async function calcularRutaPorCalles(puntos) {
  if (puntos.length < 2) return []
  const wp = puntos.map(p => `${p.lng},${p.lat}`).join(';')

  if (MAPBOX_TOKEN && !MAPBOX_TOKEN.includes('PEGA_TU_TOKEN')) {
    try {
      const res  = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${wp}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`,
        { signal: AbortSignal.timeout(8000) }
      )
      const data = await res.json()
      if (data.routes?.[0]) {
        return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
      }
    } catch {}
  }

  // 2. Valhalla
  try {
    const body = JSON.stringify({
      locations: puntos.map(p => ({ lon: p.lng, lat: p.lat })),
      costing: 'auto',
    })
    const res  = await fetch('https://valhalla1.openstreetmap.de/route', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
      signal: AbortSignal.timeout(10000),
    })
    const data = await res.json()
    if (data.trip?.legs) {
      const coords = data.trip.legs.flatMap(leg =>
        leg.shape ? decodePolyline6(leg.shape) : []
      )
      if (coords.length > 1) return coords
    }
  } catch {}

  // 3-4. OSRM
  const ROUTERS = [
    `https://routing.openstreetmap.de/routed-car/route/v1/driving/${wp}?overview=full&geometries=geojson`,
    `https://router.project-osrm.org/route/v1/driving/${wp}?overview=full&geometries=geojson`,
  ]
  for (const url of ROUTERS) {
    try {
      const res  = await fetch(url, { signal: AbortSignal.timeout(10000) })
      const data = await res.json()
      if (data.routes?.[0]) {
        return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
      }
    } catch {}
  }
  return []
}

function decodePolyline6(encoded) {
  const coords = []; let lat = 0, lng = 0, i = 0
  while (i < encoded.length) {
    let b, shift = 0, result = 0
    do { b = encoded.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lat += (result & 1) ? ~(result >> 1) : (result >> 1)
    shift = 0; result = 0
    do { b = encoded.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lng += (result & 1) ? ~(result >> 1) : (result >> 1)
    coords.push([lat / 1e6, lng / 1e6])
  }
  return coords
}

// Geocodificación con Nominatim (misma lógica que logística)
async function geocodificar(cliente) {
  const { callePrincipal, calleSecundaria, referencia, ciudad } = cliente
  const ciud = ciudad || 'Puyo'
  const prov = 'Pastaza'

  async function nominatim(params) {
    try {
      const qs  = new URLSearchParams({ ...params, format: 'json', limit: '1', countrycodes: 'ec' })
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${qs}`,
        { headers: { 'Accept-Language': 'es', 'User-Agent': 'AguaPiatua/1.0' } }
      )
      const data = await res.json()
      if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    } catch {}
    return null
  }

  if (callePrincipal && calleSecundaria) {
    const r = await nominatim({ street: `${callePrincipal} y ${calleSecundaria}`, city: ciud, state: prov })
    if (r) return r
  }
  if (callePrincipal) {
    const r = await nominatim({ street: callePrincipal, city: ciud, state: prov })
    if (r) return r
  }
  if (referencia) {
    const r = await nominatim({ q: `${referencia}, ${ciud}, ${prov}, Ecuador` })
    if (r) return r
  }
  const r = await nominatim({ city: ciud, state: prov })
  return r ?? { lat: DEPOSITO.lat + (Math.random() - 0.5) * 0.01, lng: DEPOSITO.lng + (Math.random() - 0.5) * 0.01 }
}

const depositoIcon = L.divIcon({
  className: '',
  html: `<div style="background:#dc3545;color:#fff;width:38px;height:38px;
    border-radius:50%;display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 8px rgba(0,0,0,0.35);border:2px solid #fff;font-size:17px;">🏭</div>`,
  iconSize: [38, 38], iconAnchor: [19, 19],
})

function paradaIcon(num, entregado, color) {
  const bg = entregado ? '#198754' : (color || '#0d6efd')
  return L.divIcon({
    className: '',
    html: `<div style="background:${bg};color:#fff;width:34px;height:34px;opacity:${entregado ? 0.6 : 1};
      border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;
      justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid #fff;">
      <span style="transform:rotate(45deg);font-weight:800;font-size:13px">${entregado ? '✓' : num}</span>
    </div>`,
    iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -36],
  })
}

export default function ConductorRuta() {
  const [ruta,       setRuta]       = useState(null)
  const [coords,     setCoords]     = useState({})   // { pedidoId: {lat, lng} }
  const [loading,    setLoading]    = useState(true)
  const [rutaCalles, setRutaCalles] = useState([])
  const [entregando, setEntregando] = useState(null)
  const navigate      = useNavigate()
  const nombre        = localStorage.getItem('conductor_nombre') || 'Conductor'
  const token         = localStorage.getItem('conductor_token')
  const geocodedRef   = useRef(new Set())
  const osrmKeyRef    = useRef('')

  // Carga la ruta
  useEffect(() => {
    if (!token) { navigate('/conductor/login'); return }
    fetch('/api/conductores/mi-ruta', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => { if (r.status === 401 || r.status === 403) { navigate('/conductor/login') } return r.json() })
      .then(data => { setRuta(data.ruta); setLoading(false) })
      .catch(() => setLoading(false))
  }, [token, navigate])

  // Geocodificación: GPS directo o Nominatim como fallback
  useEffect(() => {
    if (!ruta) return
    ruta.items.forEach((item, i) => {
      if (geocodedRef.current.has(item.pedidoId)) return
      geocodedRef.current.add(item.pedidoId)

      if (item.cliente.latitud && item.cliente.longitud) {
        setCoords(prev => ({ ...prev, [item.pedidoId]: { lat: item.cliente.latitud, lng: item.cliente.longitud } }))
        return
      }
      // Geocodificar con delay para no saturar Nominatim
      setTimeout(async () => {
        const c = await geocodificar(item.cliente)
        setCoords(prev => ({ ...prev, [item.pedidoId]: c }))
      }, i * 1100)
    })
  }, [ruta])

  // OSRM cuando todos los items tienen coords
  useEffect(() => {
    if (!ruta || ruta.items.length === 0) return
    const todosConCoords = ruta.items.every(i => coords[i.pedidoId])
    if (!todosConCoords) return

    const puntos = ruta.items.map(i => coords[i.pedidoId]).filter(Boolean)
    const key = puntos.map(p => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|')
    if (key === osrmKeyRef.current) return
    osrmKeyRef.current = key

    ;(async () => {
      const coords = await calcularRutaPorCalles([DEPOSITO, ...puntos, DEPOSITO])
      if (coords.length > 1) setRutaCalles(coords)
    })()
  }, [ruta, coords])

  async function marcarEntregado(pedidoId) {
    setEntregando(pedidoId)
    await fetch(`/api/conductores/mi-ruta/pedidos/${pedidoId}`, {
      method:  'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
    setRuta(prev => ({
      ...prev,
      items: prev.items.map(i => i.pedidoId === pedidoId ? { ...i, estado: 'entregado' } : i),
    }))
    setEntregando(null)
  }

  function logout() {
    localStorage.removeItem('conductor_token')
    localStorage.removeItem('conductor_nombre')
    navigate('/conductor/login')
  }

  if (loading) return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: '#0f1d3e' }}>
      <div className="spinner-border text-light"></div>
    </div>
  )

  const pendientes   = ruta?.items.filter(i => i.estado !== 'entregado').length ?? 0
  const entregados   = ruta?.items.filter(i => i.estado === 'entregado').length ?? 0
  const color        = ruta?.color ?? '#0d6efd'

  const puntosConCoords = ruta?.items.map(i => coords[i.pedidoId]).filter(Boolean) ?? []
  const centro = puntosConCoords.length > 0
    ? [puntosConCoords[0].lat, puntosConCoords[0].lng]
    : [DEPOSITO.lat, DEPOSITO.lng]

  const lineaFallback = puntosConCoords.length > 0
    ? [[DEPOSITO.lat, DEPOSITO.lng], ...puntosConCoords.map(p => [p.lat, p.lng]), [DEPOSITO.lat, DEPOSITO.lng]]
    : []

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafb' }}>

      {/* Header */}
      <header className="d-flex align-items-center justify-content-between px-3 py-2 sticky-top"
        style={{ background: '#0f1d3e', zIndex: 100 }}>
        <div className="d-flex align-items-center gap-2">
          <div className="rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: 36, height: 36, background: '#0066CC' }}>
            <i className="bi bi-truck text-white"></i>
          </div>
          <div>
            <div className="text-white fw-bold" style={{ fontSize: '0.9rem', lineHeight: 1.2 }}>{nombre}</div>
            <div className="text-white-50" style={{ fontSize: '0.72rem' }}>
              {ruta ? ruta.nombre : 'Sin ruta asignada hoy'}
            </div>
          </div>
        </div>
        <button className="btn btn-sm text-white-50 border-0 bg-transparent" onClick={logout}>
          <i className="bi bi-box-arrow-right fs-5"></i>
        </button>
      </header>

      {!ruta ? (
        <div className="d-flex flex-column align-items-center justify-content-center py-5 text-center px-3"
          style={{ minHeight: 'calc(100vh - 56px)' }}>
          <i className="bi bi-calendar-x fs-1 text-muted d-block mb-3"></i>
          <h5 className="fw-bold">Sin ruta para hoy</h5>
          <p className="text-muted small">El administrador aún no ha planificado tu ruta de hoy.<br />Vuelve más tarde.</p>
        </div>
      ) : (
        <>
          {/* Resumen */}
          <div className="d-flex gap-2 px-3 py-2" style={{ borderBottom: '1px solid #e5e7eb' }}>
            <div className="flex-grow-1 text-center rounded-3 py-2" style={{ background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <div className="fw-bold fs-5">{ruta.items.length}</div>
              <div className="text-muted" style={{ fontSize: '0.72rem' }}>Total</div>
            </div>
            <div className="flex-grow-1 text-center rounded-3 py-2" style={{ background: '#fff3cd', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <div className="fw-bold fs-5" style={{ color: '#856404' }}>{pendientes}</div>
              <div style={{ fontSize: '0.72rem', color: '#856404' }}>Pendientes</div>
            </div>
            <div className="flex-grow-1 text-center rounded-3 py-2" style={{ background: '#cddcf8', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <div className="fw-bold fs-5" style={{ color: '#0a1845' }}>{entregados}</div>
              <div style={{ fontSize: '0.72rem', color: '#0a1845' }}>Entregados</div>
            </div>
          </div>

          {/* Mapa */}
          <div style={{ height: 280 }}>
            <MapContainer center={centro} zoom={14} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[DEPOSITO.lat, DEPOSITO.lng]} icon={depositoIcon}>
                <Popup><b>🏭 Depósito</b></Popup>
              </Marker>

              {/* Línea OSRM por calles — mientras carga muestra línea punteada */}
              {rutaCalles.length > 1
                ? <Polyline positions={rutaCalles} color={color} weight={5} opacity={0.85} />
                : lineaFallback.length > 2 && <Polyline positions={lineaFallback} color={color} weight={3} opacity={0.45} dashArray="10 8" />
              }

              {ruta.items.map(item => {
                const c = coords[item.pedidoId]
                if (!c) return null
                return (
                  <Marker key={item.pedidoId}
                    position={[c.lat, c.lng]}
                    icon={paradaIcon(item.orden, item.estado === 'entregado', color)}>
                    <Popup>
                      <b>Parada {item.orden} · {item.cliente.nombre}</b><br />
                      {item.productos.map(p => `${p.nombre} ×${p.cantidad}`).join(', ')}<br />
                      <b>${parseFloat(item.total).toFixed(2)}</b>
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>
          </div>

          {/* Lista de paradas */}
          <div className="px-3 py-3" style={{ paddingBottom: 80 }}>
            {ruta.items.map(item => (
              <div key={item.pedidoId} className="card border-0 shadow-sm mb-3"
                style={{ opacity: item.estado === 'entregado' ? 0.65 : 1 }}>
                <div className="card-body py-3 px-3">
                  <div className="d-flex align-items-start gap-3">
                    {/* Número */}
                    <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 fw-bold text-white"
                      style={{ width: 34, height: 34, background: item.estado === 'entregado' ? '#198754' : color, fontSize: '0.85rem' }}>
                      {item.estado === 'entregado' ? <i className="bi bi-check-lg"></i> : item.orden}
                    </div>

                    <div className="flex-grow-1">
                      <div className="fw-bold">{item.cliente.nombre}</div>
                      <div className="text-muted small">
                        <i className="bi bi-geo-alt me-1"></i>
                        {[item.cliente.callePrincipal, item.cliente.calleSecundaria && `y ${item.cliente.calleSecundaria}`].filter(Boolean).join(' ') || '—'}
                      </div>
                      {item.cliente.referencia && (
                        <div style={{ fontSize: '0.78rem', color: '#856404' }}>
                          <i className="bi bi-signpost me-1"></i>{item.cliente.referencia}
                        </div>
                      )}
                      <div className="small text-muted mt-1">
                        {item.productos.map(p => `${p.nombre} ×${p.cantidad}`).join(' · ')}
                      </div>
                      <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                        <a href={`tel:${item.cliente.telefono}`} className="btn btn-sm btn-outline-secondary py-0 px-2"
                          style={{ fontSize: '0.78rem' }}>
                          <i className="bi bi-telephone me-1"></i>{item.cliente.telefono}
                        </a>
                        {item.cliente.latitud && (
                          <a href={`https://maps.google.com/?q=${item.cliente.latitud},${item.cliente.longitud}`}
                            target="_blank" rel="noreferrer"
                            className="btn btn-sm btn-outline-primary py-0 px-2"
                            style={{ fontSize: '0.78rem' }}>
                            <i className="bi bi-map me-1"></i>Ver en Maps
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="text-end flex-shrink-0">
                      <div className="fw-bold mb-2">${parseFloat(item.total).toFixed(2)}</div>
                      {item.estado === 'entregado' ? (
                        <span className="badge bg-success">Entregado</span>
                      ) : (
                        <button className="btn btn-sm fw-semibold text-white"
                          style={{ background: '#0066CC', fontSize: '0.78rem' }}
                          disabled={entregando === item.pedidoId}
                          onClick={() => marcarEntregado(item.pedidoId)}>
                          {entregando === item.pedidoId
                            ? <span className="spinner-border spinner-border-sm"></span>
                            : <><i className="bi bi-check-lg me-1"></i>Entregar</>}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
