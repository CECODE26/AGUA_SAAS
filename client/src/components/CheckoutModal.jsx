import { useState, useRef, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useCart } from '../context/CartContext'
import { apiUrl } from '../lib/api'
import { useDistribuidora } from '../context/DistribuidoraContext'

// Fix iconos Leaflet + Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:36px;height:36px;background:#0066CC;border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);border:3px solid #fff;
    box-shadow:0 3px 10px rgba(0,102,204,0.5);
    display:flex;align-items:center;justify-content:center;">
    <span style="transform:rotate(45deg);font-size:14px;">📍</span>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
})

// Componente interno que mueve el pin y escucha clics en el mapa
function PinArrastrable({ position, onChange }) {
  useMapEvents({
    click(e) { onChange(e.latlng.lat, e.latlng.lng) },
  })
  return (
    <Marker
      position={position}
      icon={pinIcon}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const { lat, lng } = e.target.getLatLng()
          onChange(lat, lng)
        },
      }}
    />
  )
}

const PROVINCIAS = [
  'Azuay','Bolívar','Cañar','Carchi','Chimborazo','Cotopaxi','El Oro',
  'Esmeraldas','Guayas','Imbabura','Loja','Los Ríos','Manabí',
  'Morona Santiago','Napo','Orellana','Pastaza','Pichincha',
  'Santa Elena','Santo Domingo de los Tsáchilas','Sucumbíos',
  'Tungurahua','Zamora Chinchipe',
]

const INIT = {
  nombre: '', telefono: '', email: '',
  callePrincipal: '', interseccion: '', numeracion: '',
  referencia: '', sector: '', ciudad: '', provincia: '',
  nota: '',
  lat: null, lng: null,   // coordenadas GPS del cliente (si las otorgó)
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

// Badge pequeño que aparece junto al label cuando el campo fue auto-rellenado por GPS
function GpsBadge() {
  return (
    <span className="ms-1 badge rounded-pill"
      style={{ background: '#cddcf8', color: '#0a1845', fontSize: '0.6rem', fontWeight: 600, verticalAlign: 'middle' }}>
      <i className="bi bi-crosshair me-1"></i>GPS
    </span>
  )
}

// Estilos para campos auto-rellenados (animación de resaltado)
const GPS_STYLE = `
  @keyframes gpsFlash {
    0%   { border-color: #198754; box-shadow: 0 0 0 3px rgba(25,135,84,0.25); background: #d1e8fa; }
    70%  { border-color: #198754; box-shadow: 0 0 0 3px rgba(25,135,84,0.15); background: #edf4ff; }
    100% { border-color: #198754; box-shadow: none; background: #fff; }
  }
  .gps-filled {
    animation: gpsFlash 1.2s ease forwards;
    border-color: #198754 !important;
  }
`

// Busca calles cercanas via Overpass y devuelve la calle que intersecta
async function getInterseccion(lat, lng, callePrincipal) {
  try {
    const query = `[out:json][timeout:6];way(around:120,${lat},${lng})[highway][name];out body;`
    const res   = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST', body: query,
      signal: AbortSignal.timeout(8000),
    })
    const data  = await res.json()
    const roads = (data.elements || [])
      .map(r => r.tags?.name)
      .filter(name => name && name.toLowerCase() !== (callePrincipal || '').toLowerCase())
    return [...new Set(roads)][0] || ''
  } catch {
    return ''
  }
}

// Geocodificación inversa — intenta Mapbox primero, luego Nominatim con varios zoom
async function reverseGeocode(lat, lng) {

  // ── Mapbox (si está configurado) ─────────────────────────────────────────
  if (MAPBOX_TOKEN && !MAPBOX_TOKEN.includes('PEGA_TU_TOKEN')) {
    try {
      const res  = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`
        + `?access_token=${MAPBOX_TOKEN}&language=es&types=address,neighborhood,locality,place&limit=1`,
        { signal: AbortSignal.timeout(8000) }
      )
      const data = await res.json()
      const feat = data.features?.[0]
      if (feat) {
        const calle    = feat.text    || ''
        const numero   = feat.address || ''
        const context  = feat.context || []
        const get = (type) => context.find(c => c.id?.startsWith(type))?.text || ''
        const interseccion = await getInterseccion(lat, lng, calle)
        return {
          callePrincipal: calle,
          interseccion,
          numeracion:     numero,
          sector:         get('neighborhood') || get('locality'),
          ciudad:         get('place') || get('locality'),
          provincia:      get('region'),
        }
      }
    } catch {}
  }

  // ── Nominatim — prueba zoom 18, 16 y 14 hasta encontrar calle ────────────
  const nominatim = async (zoom) => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=es&zoom=${zoom}`,
      { headers: { 'User-Agent': 'AguaElite/1.0' }, signal: AbortSignal.timeout(8000) }
    )
    return res.json()
  }

  let a = {}
  for (const zoom of [18, 16, 14]) {
    try {
      const data = await nominatim(zoom)
      a = data.address || {}
      const calle = a.road || a.pedestrian || a.footway || a.path || a.highway || a.cycleway || ''
      if (calle) break  // encontró calle, salir del loop
    } catch {}
  }

  const calle = a.road || a.pedestrian || a.footway || a.path || a.highway || a.cycleway || ''
  const [interseccion] = await Promise.all([getInterseccion(lat, lng, calle)])

  return {
    callePrincipal: calle,
    interseccion,
    numeracion:     a.house_number || '',
    sector:         a.neighbourhood || a.suburb || a.quarter || a.residential || a.hamlet || '',
    ciudad:         a.city || a.town || a.village || a.municipality || a.county || distribuidora?.ciudad || '',
    provincia:      a.state || a.region || 'Pastaza',
  }
}

export default function CheckoutModal({ onClose, autoGeo = false }) {
  const { items, total, clearCart } = useCart()
  const { distribuidora } = useDistribuidora()
  const [form, setForm]             = useState(() => ({ ...INIT, ciudad: distribuidora?.ciudad || '', provincia: distribuidora?.provincia || '' }))
  const [estado, setEstado]         = useState('idle')
  // idle | pre-prompt | requesting | geocoding | ok | error | denied | unsupported
  const [geoEstado, setGeoEstado]   = useState('idle')
  const [autoFilled, setAutoFilled] = useState(new Set())
  const autoFilledTimer             = useRef(null)

  // Auto-solicitar GPS al abrir (solo en móvil)
  useEffect(() => {
    if (autoGeo && navigator.geolocation) {
      setGeoEstado('requesting')
      navigator.geolocation.getCurrentPosition(
        (pos) => aplicarCoordenadas(pos.coords.latitude, pos.coords.longitude),
        (err) => setGeoEstado(err.code === 1 ? 'denied' : 'error'),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      )
    }
  }, [])

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  // ── Aplicar campos y animar ──────────────────────────────────────────────
  async function aplicarCoordenadas(lat, lng) {
    setGeoEstado('geocoding')
    try {
      const campos = await reverseGeocode(lat, lng)
      const provinciaMatch = PROVINCIAS.find(p =>
        p.toLowerCase().includes((campos.provincia || '').toLowerCase()) ||
        (campos.provincia || '').toLowerCase().includes(p.toLowerCase())
      )
      const actualizados = {
        callePrincipal: campos.callePrincipal,
        numeracion:     campos.numeracion,
        sector:         campos.sector,
        ciudad:         campos.ciudad,
        provincia:      provinciaMatch || campos.provincia,
        lat, lng,
      }
      setForm(prev => ({
        ...prev,
        ...Object.fromEntries(Object.entries(actualizados).filter(([, v]) => v)),
      }))
      const camposRellenos = new Set(
        Object.entries(campos).filter(([, v]) => v).map(([k]) => k)
      )
      setAutoFilled(camposRellenos)
      clearTimeout(autoFilledTimer.current)
      autoFilledTimer.current = setTimeout(() => setAutoFilled(new Set()), 5000)
      setGeoEstado('ok')
    } catch {
      setForm(prev => ({ ...prev, lat, lng }))
      setGeoEstado('error')
    }
  }

  // ── Pedir coordenadas al navegador ───────────────────────────────────────
  function pedirCoordenadas() {
    setGeoEstado('requesting')
    navigator.geolocation.getCurrentPosition(
      (pos) => aplicarCoordenadas(pos.coords.latitude, pos.coords.longitude),
      (err) => setGeoEstado(err.code === 1 ? 'denied' : 'error'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  // ── Botón principal: verificar permiso antes de pedir ───────────────────
  async function solicitarUbicacion() {
    if (!navigator.geolocation) {
      setGeoEstado('unsupported')
      return
    }
    // Usar Permissions API si está disponible para saber el estado previo
    if (navigator.permissions) {
      try {
        const perm = await navigator.permissions.query({ name: 'geolocation' })
        if (perm.state === 'denied') {
          setGeoEstado('denied')
          return
        }
        if (perm.state === 'granted') {
          // Ya tenemos permiso — ir directo
          pedirCoordenadas()
          return
        }
        // perm.state === 'prompt' → pedir directo sin pre-aviso
        pedirCoordenadas()
        return
      } catch {
        // Permissions API no soportada en este navegador — ir directo
      }
    }
    // Fallback: pedir directo
    pedirCoordenadas()
  }

  // ── Enviar pedido ────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    setEstado('loading')

    const partesCalle = [
      form.callePrincipal,
      form.interseccion && `y ${form.interseccion}`,
      form.numeracion   && `#${form.numeracion}`,
    ].filter(Boolean).join(' ')

    const direccion = [
      partesCalle,
      form.referencia,
      form.sector,
      form.ciudad,
      form.provincia,
    ].filter(Boolean).join(', ')

    try {
      const res = await fetch(apiUrl('/api/pedidos'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: {
            nombre:         form.nombre,
            telefono:       form.telefono,
            email:          form.email,
            callePrincipal: form.callePrincipal,
            interseccion:   form.interseccion,
            numeracion:     form.numeracion,
            referencia:     form.referencia,
            sector:         form.sector,
            ciudad:         form.ciudad,
            provincia:      form.provincia,
            direccion,
            lat:            form.lat,   // coords GPS exactas si el cliente las dio
            lng:            form.lng,
            nota:           form.nota,
          },
          productos: items.map(i => ({ nombre: i.nombre, cantidad: i.cantidad, precio: i.precio })),
          total: total.toFixed(2),
        }),
      })
      if (!res.ok) throw new Error()
      setEstado('success')
      clearCart()
    } catch {
      setEstado('error')
    }
  }

  // ── Mensajes de estado GPS ───────────────────────────────────────────────
  const geoMsg = {
    requesting: { color: '#0d6efd', spinner: true,  text: 'Solicitando GPS... acepta el permiso en tu navegador.' },
    geocoding:  { color: '#0d6efd', spinner: true,  text: 'Ubicación obtenida. Buscando tu dirección...' },
    ok:         { color: '#198754', icon: 'bi-check-circle-fill',       text: 'Dirección completada automáticamente.' },
    error:      { color: '#dc3545', icon: 'bi-exclamation-circle-fill', text: 'No se pudo obtener la dirección. Complétala manualmente.' },
    unsupported:{ color: '#856404', icon: 'bi-geo-alt',                 text: 'Tu navegador no soporta geolocalización.' },
  }[geoEstado] || null

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ zIndex: 1060, background: 'rgba(0,0,0,0.5)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <style>{GPS_STYLE}</style>
      <div className="bg-white rounded-4 p-4 p-md-5 shadow-lg"
        style={{ maxWidth: '560px', width: '94%', maxHeight: '92vh', overflowY: 'auto' }}>

        {estado === 'success' ? (
          <div className="text-center py-4">
            <div style={{ fontSize: '4rem' }}>✅</div>
            <h4 className="fw-bold mt-3 text-verde">¡Pedido confirmado!</h4>
            <p className="text-muted mt-2">
              Gracias por tu pedido. Nos pondremos en contacto contigo a la brevedad para coordinar la entrega.
            </p>
            <button className="btn btn-verde px-5 mt-3" onClick={onClose}>Cerrar</button>
          </div>
        ) : (
          <>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold mb-0">Finalizar pedido</h5>
              <button className="btn-close" onClick={onClose}></button>
            </div>

            {/* Resumen */}
            <div className="rounded-3 p-3 mb-4" style={{ background: '#e8f0fd' }}>
              <p className="fw-bold small text-verde mb-2">RESUMEN DEL PEDIDO</p>
              {items.map(i => (
                <div key={i.nombre} className="d-flex justify-content-between small mb-1">
                  <span>{i.nombre} × {i.cantidad}</span>
                  <span className="fw-bold">
                    ${(parseFloat(i.precio.replace('$', '')) * i.cantidad).toFixed(2)}
                  </span>
                </div>
              ))}
              <hr className="my-2" />
              <div className="d-flex justify-content-between fw-bold">
                <span>Total</span>
                <span className="text-verde">${total.toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit}>

              {/* ── Datos de contacto ─────────────────────────── */}
              <p className="fw-bold text-muted mb-2" style={{ fontSize: '0.72rem', letterSpacing: '1px' }}>
                DATOS DE CONTACTO
              </p>
              <div className="mb-3">
                <label className="form-label small fw-bold">Nombre completo *</label>
                <input name="nombre" type="text" className="form-control"
                  placeholder="Ej. Juan Pérez"
                  value={form.nombre} onChange={handleChange} required />
              </div>
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-bold">Teléfono *</label>
                  <input name="telefono" type="tel" className="form-control"
                    placeholder="0987654321"
                    value={form.telefono} onChange={handleChange}
                    pattern="\d{10}" maxLength={10}
                    title="El teléfono debe tener exactamente 10 dígitos"
                    required />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-bold">Correo electrónico *</label>
                  <input name="email" type="email" className="form-control"
                    placeholder="juan@correo.com"
                    value={form.email} onChange={handleChange} required />
                </div>
              </div>

              {/* ── Dirección de entrega ──────────────────────── */}
              <div className="d-flex justify-content-between align-items-center mb-2 mt-3">
                <p className="fw-bold text-muted mb-0" style={{ fontSize: '0.72rem', letterSpacing: '1px' }}>
                  DIRECCIÓN DE ENTREGA
                </p>

                {/* Botón GPS — oculto cuando hay panel expandido */}
                {!['pre-prompt', 'denied'].includes(geoEstado) && (
                  <button
                    type="button"
                    onClick={solicitarUbicacion}
                    disabled={['requesting', 'geocoding'].includes(geoEstado)}
                    className="btn btn-sm d-flex align-items-center gap-1 fw-semibold"
                    style={{
                      background: geoEstado === 'ok' ? '#cddcf8' : 'linear-gradient(135deg,#e7f1ff,#d4eeff)',
                      color:      geoEstado === 'ok' ? '#0a1845' : '#084298',
                      border: 'none', fontSize: '0.75rem', borderRadius: '20px', padding: '5px 14px',
                      boxShadow: '0 2px 8px rgba(13,110,253,0.15)',
                    }}
                  >
                    {['requesting','geocoding'].includes(geoEstado)
                      ? <span className="spinner-border spinner-border-sm" style={{ width: '12px', height: '12px' }}></span>
                      : <i className={`bi ${geoEstado === 'ok' ? 'bi-geo-alt-fill' : 'bi-crosshair'}`}
                           style={{ fontSize: '0.9rem' }}></i>
                    }
                    {geoEstado === 'ok' ? 'Ubicación detectada' : 'Usar mi ubicación'}
                  </button>
                )}
              </div>

              {/* ── Panel PRE-AVISO: antes de que el navegador pida permiso ── */}
              {geoEstado === 'pre-prompt' && (
                <div className="rounded-3 p-3 mb-3"
                  style={{ background: 'linear-gradient(135deg,#e7f1ff,#f0f6ff)', border: '1px solid #c5d8ff' }}>
                  <div className="d-flex gap-3">
                    <div style={{ fontSize: '2rem', flexShrink: 0 }}>📍</div>
                    <div className="flex-grow-1">
                      <p className="fw-bold mb-1" style={{ fontSize: '0.85rem', color: '#084298' }}>
                        Autorizar acceso a tu ubicación
                      </p>
                      <p className="mb-2" style={{ fontSize: '0.78rem', color: '#555', lineHeight: 1.4 }}>
                        Usaremos tu ubicación GPS <b>solo para completar tu dirección</b> de entrega automáticamente.
                        No la guardamos ni la compartimos con terceros.
                      </p>
                      <div className="d-flex gap-2">
                        <button type="button" className="btn btn-sm fw-bold"
                          style={{ background: '#0d6efd', color: '#fff', borderRadius: '8px', fontSize: '0.78rem' }}
                          onClick={pedirCoordenadas}>
                          <i className="bi bi-geo-alt-fill me-1"></i>
                          Permitir y completar dirección
                        </button>
                        <button type="button" className="btn btn-sm"
                          style={{ background: 'transparent', color: '#888', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.78rem' }}
                          onClick={() => setGeoEstado('idle')}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Panel PERMISO DENEGADO: instrucciones para reactivar ── */}
              {geoEstado === 'denied' && (
                <div className="rounded-3 p-3 mb-3"
                  style={{ background: '#fff8e1', border: '1px solid #ffd54f' }}>
                  <div className="d-flex gap-3">
                    <div style={{ fontSize: '1.8rem', flexShrink: 0 }}>🔒</div>
                    <div className="flex-grow-1">
                      <p className="fw-bold mb-1" style={{ fontSize: '0.85rem', color: '#7a4f00' }}>
                        Permiso de ubicación bloqueado
                      </p>
                      <p className="mb-2" style={{ fontSize: '0.77rem', color: '#6b4c00', lineHeight: 1.4 }}>
                        Tu navegador bloqueó el acceso. Para activarlo:
                      </p>
                      <ol className="mb-2 ps-3" style={{ fontSize: '0.77rem', color: '#6b4c00', lineHeight: 1.7 }}>
                        <li>Toca el <b>ícono de candado 🔒</b> o <b>ⓘ</b> en la barra de dirección</li>
                        <li>Selecciona <b>"Permisos del sitio"</b> o <b>"Configuración del sitio"</b></li>
                        <li>En <b>"Ubicación"</b>, cámbialo a <b>"Permitir"</b></li>
                        <li>Recarga la página y vuelve a intentarlo</li>
                      </ol>
                      <div className="d-flex gap-2 flex-wrap">
                        <button type="button" className="btn btn-sm fw-bold"
                          style={{ background: '#f59e0b', color: '#fff', borderRadius: '8px', fontSize: '0.75rem' }}
                          onClick={() => { setGeoEstado('idle'); window.location.reload() }}>
                          <i className="bi bi-arrow-clockwise me-1"></i>
                          Recargar página
                        </button>
                        <button type="button" className="btn btn-sm"
                          style={{ background: 'transparent', color: '#888', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.75rem' }}
                          onClick={() => setGeoEstado('idle')}>
                          Completar manualmente
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mensaje de estado GPS (requesting / geocoding / ok / error / unsupported) */}
              {geoMsg && (
                <div className="rounded-3 px-3 py-2 mb-3 d-flex align-items-center gap-2"
                  style={{ background: `${geoMsg.color}12`, fontSize: '0.75rem', color: geoMsg.color }}>
                  {geoMsg.spinner
                    ? <span className="spinner-border spinner-border-sm" style={{ width: '13px', height: '13px', borderWidth: '2px' }}></span>
                    : <i className={`bi ${geoMsg.icon}`}></i>
                  }
                  {geoMsg.text}
                </div>
              )}

              {/* ── Mapa ajustador de pin (cuando hay coords GPS) ── */}
              {form.lat && form.lng && (
                <div className="mb-3">
                  <label className="form-label small fw-bold d-flex align-items-center gap-1">
                    <i className="bi bi-map-fill" style={{ color: '#0066CC' }}></i>
                    Ajusta tu ubicación exacta
                  </label>
                  <div className="rounded-3 overflow-hidden mb-1" style={{ height: '220px', border: '2px solid #c5d8ff' }}>
                    <MapContainer
                      key={`${form.lat}-${form.lng}`}
                      center={[form.lat, form.lng]}
                      zoom={17}
                      style={{ height: '100%', width: '100%' }}
                      zoomControl={true}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap'
                      />
                      <PinArrastrable
                        position={[form.lat, form.lng]}
                        onChange={async (lat, lng) => {
                          setForm(prev => ({ ...prev, lat, lng }))
                          setGeoEstado('geocoding')
                          try {
                            const campos = await reverseGeocode(lat, lng)
                            const provinciaMatch = PROVINCIAS.find(p =>
                              p.toLowerCase().includes((campos.provincia || '').toLowerCase()) ||
                              (campos.provincia || '').toLowerCase().includes(p.toLowerCase())
                            )
                            setForm(prev => ({
                              ...prev,
                              lat, lng,
                              ...(campos.callePrincipal && { callePrincipal: campos.callePrincipal }),
                              ...(campos.interseccion   && { interseccion: campos.interseccion }),
                              ...(campos.numeracion     && { numeracion: campos.numeracion }),
                              ...(campos.sector         && { sector: campos.sector }),
                              ...(campos.ciudad         && { ciudad: campos.ciudad }),
                              ...(provinciaMatch        && { provincia: provinciaMatch }),
                            }))
                          } catch {}
                          setGeoEstado('ok')
                        }}
                      />
                    </MapContainer>
                  </div>
                  <p className="text-muted mb-0" style={{ fontSize: '0.7rem' }}>
                    <i className="bi bi-hand-index me-1"></i>
                    Arrastra el pin o toca el mapa para ajustar tu posición exacta
                  </p>
                </div>
              )}

              <div className="mb-3">
                <label className="form-label small fw-bold">
                  Calle principal *
                </label>
                <input name="callePrincipal" type="text"
                  className={`form-control ${autoFilled.has('callePrincipal') ? 'gps-filled' : ''}`}
                  placeholder={form.lat ? 'Ubicación insertada del mapa' : 'Ej. Av. Eloy Alfaro'}
                  value={form.lat ? '' : form.callePrincipal} onChange={handleChange}
                  readOnly={!!form.lat}
                  style={form.lat ? { background: '#f0f5ff', cursor: 'default' } : {}}
                  required={!form.lat} />
                {form.lat && (
                  <div className="d-flex align-items-center gap-1 mt-1" style={{ fontSize: '0.7rem', color: '#0066CC' }}>
                    <i className="bi bi-geo-alt-fill"></i>
                    Ubicación detectada del mapa
                  </div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label small fw-bold">
                  Intersección
                </label>
                <div className="input-group">
                  <span className="input-group-text text-muted" style={{ fontSize: '0.8rem' }}>y</span>
                  <input name="interseccion" type="text"
                    className={`form-control ${autoFilled.has('interseccion') ? 'gps-filled' : ''}`}
                    placeholder={form.lat ? 'Ubicación insertada del mapa' : 'Ej. Luis Molina'}
                    value={form.lat ? '' : form.interseccion} onChange={handleChange}
                    readOnly={!!form.lat}
                    style={form.lat ? { background: '#f0f5ff', cursor: 'default' } : {}} />
                </div>
                {form.lat && (
                  <div className="d-flex align-items-center gap-1 mt-1" style={{ fontSize: '0.7rem', color: '#0066CC' }}>
                    <i className="bi bi-geo-alt-fill"></i>
                    Ubicación detectada del mapa
                  </div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label small fw-bold">Referencia</label>
                <input name="referencia" type="text" className="form-control"
                  placeholder="Ej. Frente al parque central, junto a la farmacia..."
                  value={form.referencia} onChange={handleChange} />
                <div className="form-text" style={{ fontSize: '0.7rem' }}>Punto de referencia para el repartidor</div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-bold">
                  Barrio / Sector
                  {autoFilled.has('sector') && <GpsBadge />}
                </label>
                <input name="sector" type="text"
                  className={`form-control ${autoFilled.has('sector') ? 'gps-filled' : ''}`}
                  placeholder="Ej. Barrio Central, Los Pinos..."
                  value={form.sector} onChange={handleChange} />
              </div>

              <div className="row g-2 mb-4">
                <div className="col-6">
                  <label className="form-label small fw-bold">
                    Ciudad *
                    {autoFilled.has('ciudad') && <GpsBadge />}
                  </label>
                  <input name="ciudad" type="text"
                    className={`form-control ${autoFilled.has('ciudad') ? 'gps-filled' : ''}`}
                    value={form.ciudad} onChange={handleChange} required />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-bold">
                    Provincia *
                    {autoFilled.has('provincia') && <GpsBadge />}
                  </label>
                  <select name="provincia"
                    className={`form-select ${autoFilled.has('provincia') ? 'gps-filled' : ''}`}
                    value={form.provincia} onChange={handleChange} required>
                    {PROVINCIAS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ── Nota ─────────────────────────────────────── */}
              <div className="mb-4">
                <label className="form-label small fw-bold">Nota adicional (opcional)</label>
                <textarea name="nota" className="form-control" rows="2"
                  placeholder="Horario preferido, instrucciones especiales..."
                  value={form.nota} onChange={handleChange} />
              </div>

              {estado === 'error' && (
                <div className="alert alert-danger py-2 small">
                  Hubo un error al procesar tu pedido. Intenta nuevamente o llámanos.
                </div>
              )}

              <button type="submit" className="btn btn-verde w-100 py-2 fw-bold"
                disabled={estado === 'loading'}>
                {estado === 'loading'
                  ? <span className="spinner-border spinner-border-sm me-2"></span>
                  : <i className="bi bi-check-circle me-2"></i>
                }
                Confirmar pedido
              </button>
              <p className="text-muted text-center mt-2" style={{ fontSize: '0.75rem' }}>
                Sin pago online. Te contactamos para coordinar la entrega y el pago.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
