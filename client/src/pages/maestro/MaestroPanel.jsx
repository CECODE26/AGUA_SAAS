import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { apiUrl } from '../../lib/api'
import { esCorreoInterno } from '../../lib/distribuidora'

/* ── Leaflet default icon fix (Vite bundler) ── */
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const MAPBOX_TOKEN   = import.meta.env.VITE_MAPBOX_TOKEN
const ECUADOR_CENTER = [-1.4924, -78.0028]

const DIAS_LIST = [
  { key: 'lunes',     label: 'Lunes' },
  { key: 'martes',    label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves',    label: 'Jueves' },
  { key: 'viernes',   label: 'Viernes' },
  { key: 'sabado',    label: 'Sábado' },
  { key: 'domingo',   label: 'Domingo' },
]

const HORARIO_DIA = {
  lunes:     { inicio: '07:00', fin: '19:00' },
  martes:    { inicio: '07:00', fin: '19:00' },
  miercoles: { inicio: '07:00', fin: '19:00' },
  jueves:    { inicio: '07:00', fin: '19:00' },
  viernes:   { inicio: '07:00', fin: '19:00' },
  sabado:    { inicio: '07:00', fin: '18:00' },
  domingo:   { inicio: '08:00', fin: '17:00' },
}

function generarSlots(dia) {
  const { inicio, fin } = HORARIO_DIA[dia] || { inicio: '07:00', fin: '19:00' }
  const slots = []
  let [h, m] = inicio.split(':').map(Number)
  const [hF, mF] = fin.split(':').map(Number)
  while (h < hF || (h === hF && m <= mF)) {
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    m += 30; if (m >= 60) { h++; m = 0 }
  }
  return slots
}

const VACIO = {
  nombre: '', cedula: '', email: '', telefono: '',
  callePrincipal: '', calleSecundaria: '', referencia: '', sector: '',
  latitud: '', longitud: '', visitasHorario: [],
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('maestro_token')}`,
  }
}

/* ── Badge de día ── */
function DiaBadge({ dia }) {
  const colores = {
    lunes:     { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    martes:    { bg: '#fdf4ff', color: '#7e22ce', border: '#bae6fd' },
    miercoles: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
    jueves:    { bg: '#fff7ed', color: '#9a3412', border: '#fed7aa' },
    viernes:   { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
    sabado:    { bg: '#fff1f2', color: '#9f1239', border: '#fecdd3' },
    domingo:   { bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4' },
  }
  if (!dia) return null
  const c = colores[dia] || { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' }
  const label = DIAS_LIST.find(d => d.key === dia)?.label ?? dia
  return (
    <span style={{
      background: c.bg, color: c.color,
      border: `1px solid ${c.border}`,
      fontSize: '0.7rem', fontWeight: 700,
      padding: '2px 9px', borderRadius: 999,
    }}>
      {label}
    </span>
  )
}

function DropdownCol({ items, selected, onSelect, width = 70 }) {
  const ref = useRef(null)
  const [arriba, setArriba] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setArriba(rect.bottom + 160 > window.innerHeight)
  }, [])

  return (
    <div ref={ref} style={{
      position: 'absolute', [arriba ? 'bottom' : 'top']: '110%', left: 0, zIndex: 9999,
      background: '#fff', borderRadius: 10, border: '2px solid #bae6fd',
      boxShadow: '0 8px 30px rgba(124,58,237,0.18)',
      padding: 4, display: 'grid', gridTemplateColumns: '1fr', gap: 2,
      maxHeight: 160, overflowY: 'auto', width,
    }}>
      {items.map(n => (
        <div key={n} onClick={() => onSelect(n)}
          style={{
            textAlign: 'center', padding: '4px', borderRadius: 6, cursor: 'pointer',
            fontWeight: n === selected ? 800 : 500, fontSize: '0.78rem',
            background: n === selected ? '#0284c7' : 'transparent',
            color: n === selected ? '#fff' : '#374151',
          }}>
          {String(n).padStart(2, '0')}
        </div>
      ))}
    </div>
  )
}

function TimePicker({ value, onChange }) {
  const [h, m] = (value || '07:00').split(':').map(Number)
  const [abierto, setAbierto] = useState(null)

  function setH(nh) { onChange(`${String(nh).padStart(2,'0')}:${String(m).padStart(2,'0')}`); setAbierto(null) }
  function setM(nm) { onChange(`${String(h).padStart(2,'0')}:${String(nm).padStart(2,'0')}`); setAbierto(null) }

  const horas   = Array.from({ length: 24 }, (_, i) => i)
  const minutos = Array.from({ length: 60 }, (_, i) => i)

  const displayStyle = (activo) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 36, height: 32, fontSize: '1rem', fontWeight: 800,
    background: activo ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'linear-gradient(135deg, #e0f2fe, #f0f9ff)',
    color: activo ? '#fff' : '#0c4a6e',
    borderRadius: 12, border: `2px solid ${activo ? '#0284c7' : '#7dd3fc'}`,
    cursor: 'pointer', userSelect: 'none',
    boxShadow: '0 2px 8px rgba(124,58,237,0.15)', transition: 'all 0.15s',
  })

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
      background: '#f0f9ff', borderRadius: 16, padding: '6px 10px',
      boxShadow: 'inset 0 1px 4px rgba(124,58,237,0.08)' }}>

      <div style={{ position: 'relative' }}>
        <div style={displayStyle(abierto === 'h')} onClick={() => setAbierto(a => a === 'h' ? null : 'h')}>
          {String(h).padStart(2,'0')}
        </div>
        {abierto === 'h' && <DropdownCol items={horas} selected={h} onSelect={setH} />}
      </div>

      <span style={{ fontSize: '1rem', fontWeight: 900, color: '#0284c7', lineHeight: 1 }}>:</span>

      <div style={{ position: 'relative' }}>
        <div style={displayStyle(abierto === 'm')} onClick={() => setAbierto(a => a === 'm' ? null : 'm')}>
          {String(m).padStart(2,'0')}
        </div>
        {abierto === 'm' && <DropdownCol items={minutos} selected={m} onSelect={setM} />}
      </div>
    </div>
  )
}

function VisitasSelector({ value, onChange }) {
  const DIAS_ORDEN = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo']
  const colores = {
    lunes:     { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    martes:    { bg: '#fdf4ff', color: '#7e22ce', border: '#bae6fd' },
    miercoles: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
    jueves:    { bg: '#fff7ed', color: '#9a3412', border: '#fed7aa' },
    viernes:   { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
    sabado:    { bg: '#fff1f2', color: '#9f1239', border: '#fecdd3' },
    domingo:   { bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4' },
  }

  const diasActivos = new Set(value.map(v => v.dia))

  function toggleDia(dia) {
    if (diasActivos.has(dia)) {
      onChange(value.filter(v => v.dia !== dia))
    } else {
      onChange([...value, { dia, hora: '07:00' }])
    }
  }

  function agregarSlot(dia) {
    onChange([...value, { dia, hora: '07:00' }])
  }

  function cambiarHora(idx, hora) {
    onChange(value.map((v, i) => i === idx ? { ...v, hora } : v))
  }

  function quitarSlot(idx) {
    onChange(value.filter((_, i) => i !== idx))
  }

  // Agrupar por día manteniendo orden de semana
  const diasOrdenados = DIAS_ORDEN.filter(d => diasActivos.has(d))

  return (
    <div>
      {/* Chips de días */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        {DIAS_LIST.map(d => {
          const activo = diasActivos.has(d.key)
          return (
            <button key={d.key} type="button"
              className="btn btn-sm fw-bold"
              style={activo
                ? { background: '#0284c7', color: '#fff', border: '1px solid #0284c7' }
                : { background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }}
              onClick={() => toggleDia(d.key)}>
              {d.label}
            </button>
          )
        })}
      </div>

      {diasOrdenados.length > 0 ? (
        <div className="d-flex flex-column gap-3">
          {diasOrdenados.map(dia => {
            const c = colores[dia] || { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' }
            const label = DIAS_LIST.find(d => d.key === dia)?.label ?? dia
            const slots = value.map((v, i) => ({ ...v, _idx: i })).filter(v => v.dia === dia)
            return (
              <div key={dia} className="rounded-2" style={{ background: c.bg, border: `1px solid ${c.border}`, padding: '4px 8px' }}>
                {/* Encabezado del día */}
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: c.color }}>{label}</span>
                  <button type="button" className="btn py-0 px-1 fw-bold"
                    style={{ fontSize: '0.65rem', background: 'rgba(0,0,0,0.06)', color: c.color, border: 'none' }}
                    onClick={() => agregarSlot(dia)}>
                    <i className="bi bi-plus" />+ horario
                  </button>
                </div>
                {/* Slots del día */}
                <div className="d-flex flex-column gap-1">
                  {slots.map((v, si) => (
                    <div key={v._idx} className="d-flex align-items-center gap-2 ps-1" style={{ minHeight: 30 }}>
                      <TimePicker value={v.hora} onChange={hora => cambiarHora(v._idx, hora)} />
                      <button type="button" className="btn p-0"
                        style={{ color: '#ef4444', lineHeight: 1, fontSize: '0.8rem' }}
                        title="Quitar este horario"
                        onClick={() => quitarSlot(v._idx)}>
                        <i className="bi bi-x-circle" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-muted small mb-0">
          <i className="bi bi-info-circle me-1"></i>
          Selecciona los días de visita para este cliente.
        </p>
      )}
    </div>
  )
}

/* ── Parsea un feature de Mapbox y extrae campos de dirección ── */
function parsearDireccion(feat) {
  const ctx    = feat.context || []
  const getCtx = prefix => ctx.find(c => c.id.startsWith(prefix))?.text || ''

  const callePrincipal = feat.place_type?.includes('address') || feat.place_type?.includes('street')
    ? feat.text || ''
    : ''

  const sector = getCtx('neighborhood') || getCtx('locality') || ''
  const ciudad = getCtx('place') || ''
  const referencia = callePrincipal
    ? `${callePrincipal}${feat.address ? ' ' + feat.address : ''}${sector ? ', ' + sector : ''}${ciudad ? ', ' + ciudad : ''}`.trim()
    : ''

  return { callePrincipal, sector, referencia }
}

/* ── Helpers internos del mapa ── */
function ClickHandler({ onClick, onAddress }) {
  useMapEvents({
    click: async e => {
      const { lat, lng } = e.latlng
      onClick(e.latlng)
      if (!onAddress || !MAPBOX_TOKEN) return
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=es&types=address,neighborhood&limit=1`
        const r = await fetch(url)
        const d = await r.json()
        if (d.features?.length > 0) onAddress(parsearDireccion(d.features[0]))
      } catch {}
    },
  })
  return null
}

function FlyTo({ target }) {
  const map = useMap()
  useEffect(() => {
    if (!target) return
    const [lat, lng] = target.split(',').map(Number)
    map.flyTo([lat, lng], 16, { duration: 1 })
  }, [target])
  return null
}

/* ── Componente: mapa con geocodificación ── */
function MapaPicker({ latitud, longitud, onChange, onAddress }) {
  const [query,      setQuery]     = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando,   setBuscando]  = useState(false)
  const [flyTarget,  setFlyTarget] = useState(null)
  const ESTILOS_MAPA = [
    { id: 'satellite-streets-v12', label: '🛰 Satélite' },
    { id: 'streets-v12',           label: '🗺 Calles'   },
  ]
  const [estiloIdx, setEstiloIdx] = useState(0)
  const estiloActual = ESTILOS_MAPA[estiloIdx]

  const pos    = latitud && longitud ? [parseFloat(latitud), parseFloat(longitud)] : null
  const center = pos || ECUADOR_CENTER
  const zoom   = pos ? 16 : 14

  /* Geocodificación con debounce 400ms */
  useEffect(() => {
    if (!query || query.length < 3) { setResultados([]); return }
    const t = setTimeout(async () => {
      setBuscando(true)
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=ec&language=es&limit=5`
        const r = await fetch(url)
        const d = await r.json()
        setResultados(d.features || [])
      } catch {}
      finally { setBuscando(false) }
    }, 400)
    return () => clearTimeout(t)
  }, [query])

  function seleccionar(feat) {
    const [lng, lat] = feat.center
    onChange(lat.toFixed(6), lng.toFixed(6))
    setFlyTarget(`${lat},${lng}`)
    setQuery(feat.place_name)
    setResultados([])
    if (onAddress) onAddress(parsearDireccion(feat))
  }

  return (
    <div>
      {/* Buscador */}
      <div className="position-relative mb-2">
        <div className="input-group">
          <span className="input-group-text bg-light border-end-0">
            <i className="bi bi-search text-muted"></i>
          </span>
          <input
            className="form-control border-start-0"
            placeholder="Buscar dirección: calle, barrio, ciudad…"
            value={query}
            onChange={e => { setQuery(e.target.value); if (!e.target.value) setResultados([]) }}
            autoComplete="off"
            onBlur={() => setTimeout(() => setResultados([]), 200)}
          />
          {buscando && (
            <span className="input-group-text bg-light border-start-0">
              <span className="spinner-border spinner-border-sm text-muted" />
            </span>
          )}
        </div>
        {resultados.length > 0 && (
          <ul className="list-group position-absolute w-100 shadow-lg"
            style={{ zIndex: 10000, top: '100%', left: 0, maxHeight: 220, overflowY: 'auto' }}>
            {resultados.map(f => (
              <li key={f.id}
                className="list-group-item list-group-item-action py-2 px-3"
                style={{ cursor: 'pointer', fontSize: '0.82rem' }}
                onMouseDown={e => { e.preventDefault(); seleccionar(f) }}>
                <i className="bi bi-geo-alt me-2" style={{ color: '#0284c7' }} />
                {f.place_name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Mapa */}
      <div style={{ position: 'relative', height: 280, borderRadius: 12, overflow: 'hidden', border: '2px solid #bae6fd' }}>
        {/* Selector de estilo */}
        <div style={{
          position: 'absolute', top: 8, right: 8, zIndex: 1000,
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {ESTILOS_MAPA.map((e, i) => (
            <button key={e.id} type="button" onClick={() => setEstiloIdx(i)}
              style={{
                background: i === estiloIdx ? '#0284c7' : 'rgba(255,255,255,0.92)',
                color: i === estiloIdx ? '#fff' : '#374151',
                border: `1px solid ${i === estiloIdx ? '#0284c7' : '#d1d5db'}`,
                borderRadius: 7, padding: '3px 9px', fontSize: '0.7rem',
                fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                whiteSpace: 'nowrap',
              }}>
              {e.label}
            </button>
          ))}
        </div>
        <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            key={estiloActual.id}
            attribution='&copy; <a href="https://www.mapbox.com/">Mapbox</a>'
            url={`https://api.mapbox.com/styles/v1/mapbox/${estiloActual.id}/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`}
            tileSize={512}
            zoomOffset={-1}
          />
          <ClickHandler
            onClick={latlng => onChange(latlng.lat.toFixed(6), latlng.lng.toFixed(6))}
            onAddress={onAddress}
          />
          <FlyTo target={flyTarget} />
          {pos && (
            <Marker
              position={pos}
              draggable
              eventHandlers={{
                dragend: async e => {
                  const { lat, lng } = e.target.getLatLng()
                  onChange(lat.toFixed(6), lng.toFixed(6))
                  if (!onAddress || !MAPBOX_TOKEN) return
                  try {
                    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=es&types=address,neighborhood&limit=1`
                    const r = await fetch(url)
                    const d = await r.json()
                    if (d.features?.length > 0) onAddress(parsearDireccion(d.features[0]))
                  } catch {}
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      <p className="form-text mt-1 mb-0">
        <i className="bi bi-hand-index-fill me-1" style={{ color: '#0284c7' }} />
        Busca la dirección, haz clic en el mapa o arrastra el marcador para ajustar la ubicación exacta.
      </p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════ */
export default function MaestroPanel() {
  const navigate  = useNavigate()
  const nombre    = localStorage.getItem('maestro_nombre') || 'Maestro'

  const [clientes,  setClientes]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [busqueda,  setBusqueda]  = useState('')
  const [filtroDia, setFiltroDia] = useState('')
  const [filtroExtra, setFiltroExtra] = useState('')   // '' | 'app' | 'sin_dias' | 'nuevos'
  const [resumen,   setResumen]   = useState({ total: 0, nuevos: 0, sinDias: 0, app: 0 })

  const [ordenNombre, setOrdenNombre] = useState('asc')

  const [modal,     setModal]     = useState(false)
  const [editando,  setEditando]  = useState(null)
  const [form,      setForm]      = useState(VACIO)
  const [guardando,    setGuardando]    = useState(false)
  const [errorForm,    setErrorForm]    = useState('')
  const [gpsLoading,   setGpsLoading]   = useState(false)
  const [ubicacionOk,  setUbicacionOk]  = useState(false)

  function logout() {
    localStorage.removeItem('maestro_token')
    localStorage.removeItem('maestro_nombre')
    navigate('/maestro/login', { replace: true })
  }

  const cargar = useCallback(async () => {
    const params = new URLSearchParams()
    if (busqueda)  params.set('q',   busqueda)
    if (filtroDia) params.set('dia', filtroDia)
    if (filtroExtra) params.set('solo', filtroExtra)
    try {
      const res  = await fetch(apiUrl(`/api/maestro/clientes?${params}`), { headers: authHeaders() })
      if (res.status === 401) { logout(); return }
      const data = await res.json()
      setClientes(data.clientes || [])
      if (data.resumen) setResumen(data.resumen)
    } catch {}
    finally { setLoading(false) }
  }, [busqueda, filtroDia, filtroExtra])

  useEffect(() => {
    if (!localStorage.getItem('maestro_token')) { navigate('/maestro/login', { replace: true }); return }
    cargar()
  }, [cargar])

  /* ── GPS del navegador ── */
  function capturarGPS() {
    if (!navigator.geolocation) return alert('Tu navegador no soporta geolocalización')
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(p => ({ ...p, latitud: pos.coords.latitude.toFixed(6), longitud: pos.coords.longitude.toFixed(6) }))
        setGpsLoading(false)
        setUbicacionOk(true)
        setTimeout(() => setUbicacionOk(false), 4000)
      },
      () => { alert('No se pudo obtener la ubicación. Verifica los permisos.'); setGpsLoading(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  /* ── Abrir modal ── */
  function abrirNuevo() { setEditando(null); setForm(VACIO); setErrorForm(''); setModal(true) }
  function abrirEditar(c) {
    setEditando(c.id)
    setForm({
      nombre:          c.nombre          || '',
      cedula:          c.cedula          || '',
      email:           esCorreoInterno(c.email) ? '' : (c.email || ''),
      telefono:        c.telefono        || '',
      callePrincipal:  c.callePrincipal  || '',
      calleSecundaria: c.calleSecundaria || '',
      referencia:      c.referencia      || '',
      sector:          c.sector          || '',
      latitud:         c.latitud  != null ? String(c.latitud)  : '',
      longitud:        c.longitud != null ? String(c.longitud) : '',
      visitasHorario:  Array.isArray(c.visitasHorario) ? c.visitasHorario : [],
    })
    setErrorForm(''); setModal(true)
  }

  /* ── Guardar ── */
  async function guardar(e) {
    e.preventDefault()
    if (!form.latitud || !form.longitud) {
      setErrorForm('📍 La ubicación GPS es obligatoria para que el cliente aparezca en el mapa del conductor. Usa el mapa o el botón GPS para marcar su posición.')
      document.getElementById('mapa-picker')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setGuardando(true); setErrorForm('')
    try {
      const url    = editando ? `/api/maestro/clientes/${editando}` : '/api/maestro/clientes'
      const method = editando ? 'PUT' : 'POST'
      const res    = await fetch(apiUrl(url), { method, headers: authHeaders(), body: JSON.stringify(form) })
      if (res.status === 401 || res.status === 403) { logout(); return }
      const data   = await res.json()
      if (!res.ok) throw new Error(data.message || 'Error al guardar')
      setModal(false)
      cargar()
    } catch (err) { setErrorForm(err.message) }
    finally { setGuardando(false) }
  }

  /* ── Eliminar ── */
  async function eliminar(id) {
    if (!confirm('¿Eliminar este cliente? Solo es posible si no tiene pedidos.')) return
    try {
      const res  = await fetch(apiUrl(`/api/maestro/clientes/${id}`), { method: 'DELETE', headers: authHeaders() })
      if (res.status === 401 || res.status === 403) { logout(); return }
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      cargar()
    } catch (err) { alert(err.message) }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div style={{ minHeight: '100vh', background: '#f0f9ff' }}>

      {/* ── NAVBAR ── */}
      <nav className="navbar" style={{ background: '#0284c7', padding: '0 24px' }}>
        <div className="d-flex align-items-center gap-3" style={{ height: 56 }}>
          <div className="d-flex align-items-center justify-content-center rounded-3"
            style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)' }}>
            <i className="bi bi-people-fill text-white"></i>
          </div>
          <div>
            <span className="fw-bold text-white" style={{ fontSize: '0.95rem' }}>Maestro de Clientes</span>
            <span className="ms-2 text-white opacity-50" style={{ fontSize: '0.78rem' }}>· {nombre}</span>
          </div>
        </div>
        <button className="btn btn-sm text-white opacity-75" onClick={logout} style={{ fontSize: '0.78rem' }}>
          <i className="bi bi-box-arrow-right me-1"></i>Salir
        </button>
      </nav>

      <div className="container-fluid" style={{ maxWidth: 1100, padding: '24px 16px' }}>

        {/* ── CABECERA ── */}
        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
          <div>
            <h4 className="fw-bold mb-0" style={{ color: '#0c4a6e' }}>
              <i className="bi bi-people me-2" style={{ color: '#0284c7' }}></i>
              Base de clientes
            </h4>
            <p className="text-muted small mb-0">
              {resumen.total || clientes.length} clientes registrados
              {resumen.app > 0 && <> · <span style={{ color: '#047857', fontWeight: 600 }}>{resumen.app} desde la app</span></>}
            </p>
            <div className="d-flex flex-wrap gap-2 mt-2">
              {resumen.nuevos > 0 && (
                <button type="button" className="badge border-0"
                  style={{ background: filtroExtra === 'nuevos' ? '#b45309' : '#fef3c7', color: filtroExtra === 'nuevos' ? '#fff' : '#b45309', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => setFiltroExtra(f => f === 'nuevos' ? '' : 'nuevos')}>
                  <i className="bi bi-stars me-1"></i>{resumen.nuevos} nuevo{resumen.nuevos !== 1 ? 's' : ''} esta semana
                </button>
              )}
              {resumen.sinDias > 0 && (
                <button type="button" className="badge border-0"
                  style={{ background: filtroExtra === 'sin_dias' ? '#c2410c' : '#ffedd5', color: filtroExtra === 'sin_dias' ? '#fff' : '#c2410c', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => setFiltroExtra(f => f === 'sin_dias' ? '' : 'sin_dias')}>
                  <i className="bi bi-calendar-x me-1"></i>{resumen.sinDias} sin registrar días de visita
                </button>
              )}
            </div>
          </div>
          <button className="btn fw-bold" style={{ background: '#0284c7', color: '#fff' }}
            onClick={abrirNuevo}>
            <i className="bi bi-person-plus me-2"></i>Nuevo cliente
          </button>
        </div>

        {/* ── FILTROS ── */}
        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 16 }}>
          <div className="card-body py-3 px-4">
            <div className="row g-3 align-items-center">
              <div className="col-md-6">
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="bi bi-search text-muted"></i>
                  </span>
                  <input type="text" className="form-control border-start-0"
                    placeholder="Buscar por nombre, cédula o teléfono…"
                    value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                </div>
              </div>
              <div className="col-md-2">
                <select className="form-select" value={filtroDia} onChange={e => setFiltroDia(e.target.value)}>
                  <option value="">Todos los días</option>
                  {DIAS_LIST.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                </select>
              </div>
              <div className="col-md-2">
                <select className="form-select" value={filtroExtra} onChange={e => setFiltroExtra(e.target.value)}>
                  <option value="">Todos los clientes</option>
                  <option value="app">Solo registrados en la app</option>
                  <option value="sin_dias">Sin registrar días de visita</option>
                  <option value="nuevos">Nuevos esta semana</option>
                </select>
              </div>
              <div className="col-md-2">
                <button className="btn btn-light w-100" onClick={() => { setBusqueda(''); setFiltroDia(''); setFiltroExtra('') }}>
                  <i className="bi bi-x-circle me-1"></i>Limpiar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── TABLA ── */}
        <div className="card border-0 shadow-sm" style={{ borderRadius: 16 }}>
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border" style={{ color: '#0284c7' }} />
              </div>
            ) : clientes.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-people fs-2 d-block mb-2"></i>
                {busqueda || filtroDia || filtroExtra ? 'Sin resultados para ese filtro' : 'Aún no hay clientes registrados'}
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                        onClick={() => setOrdenNombre(o => o === 'asc' ? 'desc' : 'asc')}>
                        Nombre
                        <i className={`bi ms-1 ${ordenNombre === 'asc' ? 'bi-sort-alpha-down' : 'bi-sort-alpha-up'}`}
                          style={{ color: '#0284c7', fontSize: '0.85rem' }} />
                      </th>
                      <th>Cédula / RUC</th>
                      <th>Teléfono</th>
                      <th className="text-center">Origen</th>
                      <th>Dirección</th>
                      <th className="text-center">GPS</th>
                      <th className="text-center">Visitas</th>
                      <th className="text-center">Hora</th>
                      <th className="text-end">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...clientes].sort((a, b) =>
                      ordenNombre === 'asc'
                        ? a.nombre.localeCompare(b.nombre, 'es')
                        : b.nombre.localeCompare(a.nombre, 'es')
                    ).map(c => (
                      <tr key={c.id} style={(!c.latitud || !c.longitud) ? { background: '#fff5f5', borderLeft: '3px solid #ef4444' } : {}}>
                        <td>
                          <div className="fw-semibold" style={{ color: '#0c4a6e' }}>
                            {c.nombre}
                            {c.nuevo && (
                              <span className="badge ms-2" style={{ background: '#fef3c7', color: '#b45309', fontSize: '0.62rem', fontWeight: 800, verticalAlign: 'middle' }}>NUEVO</span>
                            )}
                          </div>
                          {c.email && !esCorreoInterno(c.email) && (
                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>{c.email}</div>
                          )}
                        </td>
                        <td><code className="text-muted small">{c.cedula || '—'}</code></td>
                        <td>{c.telefono}</td>
                        <td className="text-center">
                          {c.origen === 'app' ? (
                            <span className="badge" style={{ background: '#ecfdf5', color: '#047857', fontSize: '0.68rem', fontWeight: 700 }}>
                              <i className="bi bi-phone-fill me-1"></i>App
                            </span>
                          ) : c.origen === 'maestro' ? (
                            <span className="badge" style={{ background: '#f5f3ff', color: '#6d28d9', fontSize: '0.68rem', fontWeight: 700 }}>
                              <i className="bi bi-person-badge-fill me-1"></i>Maestro
                            </span>
                          ) : (
                            <span className="badge" style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '0.68rem', fontWeight: 700 }}>
                              <i className="bi bi-globe2 me-1"></i>Web
                            </span>
                          )}
                        </td>
                        <td style={{ maxWidth: 220 }}>
                          <div style={{ fontSize: '0.8rem', color: '#374151' }}>
                            {[c.callePrincipal, c.calleSecundaria, c.referencia].filter(Boolean).join(', ') || '—'}
                          </div>
                          {c.sector && <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{c.sector}</div>}
                        </td>
                        <td className="text-center">
                          {c.latitud && c.longitud ? (
                            <div className="d-flex flex-column gap-1 align-items-center">
                              <a href={`https://maps.google.com/?q=${c.latitud},${c.longitud}`}
                                target="_blank" rel="noreferrer"
                                className="badge text-decoration-none"
                                style={{ background: '#d1fae5', color: '#065f46', fontSize: '0.7rem' }}>
                                <i className="bi bi-geo-alt-fill me-1"></i>Ver mapa
                              </a>
                              <a href={`https://www.google.com/maps?q=&layer=c&cbll=${c.latitud},${c.longitud}`}
                                target="_blank" rel="noreferrer"
                                className="badge text-decoration-none"
                                style={{ background: '#dbeafe', color: '#1e40af', fontSize: '0.7rem' }}>
                                <i className="bi bi-camera-fill me-1"></i>Street View
                              </a>
                            </div>
                          ) : (
                            <div className="d-flex flex-column align-items-center gap-1">
                              <span className="badge" style={{ background: '#fee2e2', color: '#dc2626', fontSize: '0.7rem', fontWeight: 700 }}>
                                <i className="bi bi-exclamation-triangle-fill me-1"></i>Sin ubicación
                              </span>
                              <span style={{ fontSize: '0.65rem', color: '#dc2626' }}>No aparece en la ruta</span>
                            </div>
                          )}
                        </td>
                        <td className="text-center">
                          {Array.isArray(c.visitasHorario) && c.visitasHorario.length > 0 ? (
                            <div className="d-flex flex-wrap gap-1 justify-content-center">
                              {c.visitasHorario.slice().sort((a,b) => ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'].indexOf(a.dia) - ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'].indexOf(b.dia)).map((v, i) => (
                                <span key={i} style={{ fontSize: '0.68rem', fontWeight: 700, background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', borderRadius: 999, padding: '2px 7px', whiteSpace: 'nowrap' }}>
                                  {DIAS_LIST.find(d => d.key === v.dia)?.label ?? v.dia}
                                </span>
                              ))}
                            </div>
                          ) : c.diaSemana ? (
                            <DiaBadge dia={c.diaSemana} />
                          ) : c.origen === 'app' ? (
                            <span className="badge" title="Se registró en la app pero omitió elegir sus días de visita"
                              style={{ background: '#ffedd5', color: '#c2410c', fontSize: '0.66rem', fontWeight: 700, whiteSpace: 'normal', lineHeight: 1.25, maxWidth: 150 }}>
                              <i className="bi bi-calendar-x me-1"></i>Cliente sin registrar días de visitas fijas
                            </span>
                          ) : (
                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>—</span>
                          )}
                        </td>
                        <td className="text-center">
                          {Array.isArray(c.visitasHorario) && c.visitasHorario.length > 0 ? (
                            <div className="d-flex flex-wrap gap-1 justify-content-center">
                              {c.visitasHorario.slice().sort((a,b) => ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'].indexOf(a.dia) - ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'].indexOf(b.dia)).map((v, i) => (
                                <span key={i} style={{ fontSize: '0.68rem', fontWeight: 700, background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: 999, padding: '2px 7px', whiteSpace: 'nowrap' }}>
                                  <i className="bi bi-clock me-1" style={{ fontSize: '0.6rem' }} />{v.hora}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>—</span>
                          )}
                        </td>
                        <td className="text-end">
                          <div className="d-flex gap-2 justify-content-end">
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => abrirEditar(c)}>
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => eliminar(c.id)}>
                              <i className="bi bi-trash3"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════
          MODAL NUEVO / EDITAR
      ══════════════════════════════════ */}
      {modal && (
        <div className="modal d-flex align-items-center justify-content-center"
          style={{ display: 'flex !important', background: 'rgba(0,0,0,0.5)', position: 'fixed', inset: 0, zIndex: 1050 }}
          onClick={e => { if (e.target === e.currentTarget) setModal(false) }}>

          <div className="bg-white rounded-4 shadow-lg"
            style={{ width: '100%', maxWidth: 740, maxHeight: '94vh', overflowY: 'auto', margin: '0 16px' }}>

            {/* Header */}
            <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
              <h5 className="fw-bold mb-0" style={{ color: '#0c4a6e' }}>
                <i className="bi bi-person-plus me-2" style={{ color: '#0284c7' }}></i>
                {editando ? 'Editar cliente' : 'Nuevo cliente'}
              </h5>
              <button className="btn-close" onClick={() => setModal(false)} />
            </div>

            <form onSubmit={guardar} className="p-4">
              <div className="row g-3">

                {/* Nombre */}
                <div className="col-12">
                  <label className="form-label fw-bold small">Nombres completos <span className="text-danger">*</span></label>
                  <input className="form-control" placeholder="Juan Carlos Pérez López"
                    value={form.nombre} onChange={e => f('nombre', e.target.value)} required />
                </div>

                {/* Cédula / RUC */}
                <div className="col-md-6">
                  <label className="form-label fw-bold small">Cédula / RUC</label>
                  <input className="form-control" placeholder="1712345678"
                    value={form.cedula} onChange={e => f('cedula', e.target.value)} />
                </div>

                {/* Teléfono */}
                <div className="col-md-6">
                  <label className="form-label fw-bold small">Teléfono <span className="text-danger">*</span></label>
                  <input className="form-control" placeholder="0987654321"
                    value={form.telefono} onChange={e => f('telefono', e.target.value)} required />
                </div>

                {/* Correo */}
                <div className="col-12">
                  <label className="form-label fw-bold small">Correo electrónico</label>
                  <input type="email" className="form-control" placeholder="juan@correo.com"
                    value={form.email} onChange={e => f('email', e.target.value)} />
                  <div className="form-text">Opcional. Permite al cliente consultar sus pedidos desde la app.</div>
                </div>

                {/* Dirección */}
                <div className="col-12">
                  <label className="form-label fw-bold small text-uppercase" style={{ color: '#0284c7', letterSpacing: 1 }}>
                    Dirección
                  </label>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold small">Calle principal</label>
                  <input className="form-control" placeholder="Av. Amazonas"
                    value={form.callePrincipal} onChange={e => f('callePrincipal', e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold small">Calle secundaria / Intersección</label>
                  <input className="form-control" placeholder="y Calle Oriente"
                    value={form.calleSecundaria} onChange={e => f('calleSecundaria', e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold small">Referencia</label>
                  <input className="form-control" placeholder="Frente al parque central"
                    value={form.referencia} onChange={e => f('referencia', e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold small">Sector / Barrio</label>
                  <input className="form-control" placeholder="Barrio Las Palmas"
                    value={form.sector} onChange={e => f('sector', e.target.value)} />
                </div>

                {/* ── MAPA ── */}
                <div className="col-12">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <label className="form-label fw-bold small text-uppercase mb-0" style={{ color: '#0284c7', letterSpacing: 1 }}>
                      <i className="bi bi-map me-1"></i>Ubicación GPS
                    </label>
                    <button type="button"
                      className="btn btn-sm fw-bold"
                      style={{ background: '#f3e8ff', color: '#0284c7', border: '1px solid #bae6fd', fontSize: '0.78rem' }}
                      onClick={capturarGPS} disabled={gpsLoading}>
                      {gpsLoading
                        ? <><span className="spinner-border spinner-border-sm me-1" style={{ width: 12, height: 12 }}></span>Capturando...</>
                        : <><i className="bi bi-crosshair me-1"></i>Usar mi ubicación actual</>}
                    </button>
                  </div>

                  <div id="mapa-picker">
                  <MapaPicker
                    latitud={form.latitud}
                    longitud={form.longitud}
                    onChange={(lat, lng) => {
                      setForm(p => ({ ...p, latitud: lat, longitud: lng }))
                      setUbicacionOk(true)
                      setTimeout(() => setUbicacionOk(false), 4000)
                    }}
                    onAddress={({ callePrincipal, sector, referencia }) => setForm(p => ({
                      ...p,
                      ...(callePrincipal ? { callePrincipal } : {}),
                      ...(sector        ? { sector }         : {}),
                      ...(referencia && !p.referencia ? { referencia } : {}),
                    }))}
                  />
                  </div>
                  {ubicacionOk && (
                    <div className="alert py-2 small mt-2 mb-0 d-flex align-items-center gap-2"
                      style={{ background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' }}>
                      <i className="bi bi-geo-alt-fill"></i>
                      Ubicación tomada del mapa exitosa
                    </div>
                  )}

                  {/* Coords de solo lectura */}
                  {(form.latitud || form.longitud) && (
                    <div className="d-flex gap-2 mt-2">
                      <div style={{ flex: 1 }}>
                        <label className="form-label small mb-1 text-muted">Latitud</label>
                        <input className="form-control form-control-sm font-monospace" readOnly
                          value={form.latitud} style={{ background: '#f8f5ff', color: '#0369a1' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="form-label small mb-1 text-muted">Longitud</label>
                        <input className="form-control form-control-sm font-monospace" readOnly
                          value={form.longitud} style={{ background: '#f8f5ff', color: '#0369a1' }} />
                      </div>
                      <div className="d-flex align-items-end pb-1 gap-1">
                        <a href={`https://maps.google.com/?q=${form.latitud},${form.longitud}`}
                          target="_blank" rel="noreferrer"
                          className="btn btn-sm"
                          style={{ background: '#d1fae5', color: '#065f46', border: 'none', whiteSpace: 'nowrap' }}>
                          <i className="bi bi-box-arrow-up-right me-1"></i>Ver
                        </a>
                        <a href={`https://www.google.com/maps?q=&layer=c&cbll=${form.latitud},${form.longitud}`}
                          target="_blank" rel="noreferrer"
                          className="btn btn-sm"
                          style={{ background: '#dbeafe', color: '#1e40af', border: 'none', whiteSpace: 'nowrap' }}>
                          <i className="bi bi-camera-fill me-1"></i>Street View
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Visitas semanales */}
                <div className="col-12">
                  <label className="form-label fw-bold small text-uppercase" style={{ color: '#0284c7', letterSpacing: 1 }}>
                    <i className="bi bi-calendar-week me-1"></i>Días y horarios de visita
                  </label>
                  <div className="p-3 rounded-3" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                    <VisitasSelector
                      value={form.visitasHorario}
                      onChange={v => f('visitasHorario', v)}
                    />
                  </div>
                </div>

              </div>

              {errorForm && (
                <div className="alert alert-danger small d-flex align-items-center gap-2 mt-3 mb-0">
                  <i className="bi bi-exclamation-circle-fill"></i>{errorForm}
                </div>
              )}

              <div className="d-flex justify-content-end gap-2 mt-4">
                <button type="button" className="btn btn-light fw-bold" onClick={() => setModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn fw-bold"
                  style={{ background: '#0284c7', color: '#fff' }} disabled={guardando}>
                  {guardando
                    ? <><span className="spinner-border spinner-border-sm me-2"></span>Guardando...</>
                    : <><i className="bi bi-check-lg me-2"></i>{editando ? 'Actualizar' : 'Guardar cliente'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
