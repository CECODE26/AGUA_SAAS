import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAuth } from '../../context/AuthContext'

// Fix iconos Leaflet + Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Coordenadas del depósito — Puyo, Pastaza, Ecuador
const DEPOSITO = { lat: -1.488252, lng: -78.015242 }

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

// Calcula ruta por calles: Mapbox primero (más fiable), luego dos servidores OSRM como respaldo
async function calcularRutaPorCalles(puntos) {
  if (puntos.length < 2) return []
  const wp = puntos.map(p => `${p.lng},${p.lat}`).join(';')

  // 1. Mapbox Directions
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

  // 2. Valhalla (más estable que OSRM)
  try {
    const body = JSON.stringify({
      locations: puntos.map(p => ({ lon: p.lng, lat: p.lat })),
      costing: 'auto',
      shape_match: 'map_snap',
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

  // 3-4. OSRM servidores públicos
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

// Decodifica polyline6 de Valhalla (precisión 1e-6)
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

// Icono para pedidos sin GPS exacto (posición aproximada)
const sinGpsIcon = L.divIcon({
  className: '',
  html: `<div style="background:#fd7e14;color:#fff;width:30px;height:30px;
    border-radius:50%;display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid #fff;font-size:14px;font-weight:900;">?</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -18],
})

// Icono de depósito
const depositoIcon = L.divIcon({
  className: '',
  html: `<div style="background:#dc3545;color:#fff;width:38px;height:38px;
    border-radius:50%;display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 8px rgba(0,0,0,0.35);border:2px solid #fff;font-size:17px;">🏭</div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
})

// Icono numerado para paradas.
// segundo arg: string de color hex (planificación) ó 'entregado'/'pendiente' (ruta en curso)
function numeradoIcon(num, colorOrEstado) {
  const esColor  = typeof colorOrEstado === 'string' && colorOrEstado.startsWith('#')
  const color    = esColor ? colorOrEstado : (colorOrEstado === 'entregado' ? '#198754' : '#0d6efd')
  const opacity  = (!esColor && colorOrEstado === 'entregado') ? '0.55' : '1'
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};color:#fff;width:34px;height:34px;opacity:${opacity};
      border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid #fff;">
      <span style="transform:rotate(45deg);font-weight:800;font-size:13px">${num}</span>
    </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -36],
  })
}

// Ray casting: punto dentro de polígono [[lat,lng],...]
function puntoEnPoligono(lat, lng, poligono) {
  if (!poligono || poligono.length < 3) return false
  let inside = false
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [yi, xi] = poligono[i]
    const [yj, xj] = poligono[j]
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)
      inside = !inside
  }
  return inside
}

// ¿El punto cae dentro de ALGUNA de las zonas (localidades) del camión?
function puntoEnAlgunaZona(lat, lng, zonas) {
  return Array.isArray(zonas) && zonas.some(pol => puntoEnPoligono(lat, lng, pol))
}

// Geocodificar — usa los campos reales del modelo Prisma Cliente
async function geocodificar(cliente) {
  const { callePrincipal, calleSecundaria, referencia, ciudad } = cliente
  const ciud = ciudad || 'Puyo'
  const prov = 'Pastaza'

  // ── Mapbox (si hay token configurado) ────────────────────────────────────
  if (MAPBOX_TOKEN && !MAPBOX_TOKEN.includes('PEGA_TU_TOKEN')) {
    async function mapbox(q) {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`
          + `?access_token=${MAPBOX_TOKEN}`
          + `&country=ec&language=es&limit=1`
          + `&types=address,neighborhood,locality,place`
          + `&proximity=${DEPOSITO.lng},${DEPOSITO.lat}`
        const res  = await fetch(url)
        const data = await res.json()
        if (data.features?.length > 0) {
          const [lng, lat] = data.features[0].geometry.coordinates
          return { lat, lng, ok: true }
        }
      } catch {}
      return null
    }

    if (callePrincipal && calleSecundaria) {
      const r = await mapbox(`${callePrincipal} y ${calleSecundaria}, ${ciud}, ${prov}, Ecuador`)
      if (r) return r
    }
    if (callePrincipal) {
      const r = await mapbox(`${callePrincipal}, ${ciud}, ${prov}, Ecuador`)
      if (r) return r
    }
    if (referencia) {
      const r = await mapbox(`${referencia}, ${ciud}, ${prov}, Ecuador`)
      if (r) return r
    }
    const r = await mapbox(`${ciud}, ${prov}, Ecuador`)
    if (r) return r
  }

  // ── Nominatim con parámetros estructurados (más preciso) ─────────────────
  async function nominatim(params) {
    try {
      const qs = new URLSearchParams({ ...params, format: 'json', limit: '1', countrycodes: 'ec' })
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${qs}`,
        { headers: { 'Accept-Language': 'es', 'User-Agent': 'AguaPiatua/1.0' } }
      )
      const data = await res.json()
      if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), ok: true }
    } catch {}
    return null
  }

  // 1. Calle principal + calle secundaria (intersección)
  if (callePrincipal && calleSecundaria) {
    const r = await nominatim({ street: `${callePrincipal} y ${calleSecundaria}`, city: ciud, state: prov })
    if (r) return r
  }

  // 2. Solo calle principal
  if (callePrincipal) {
    const r = await nominatim({ street: callePrincipal, city: ciud, state: prov })
    if (r) return r
    // Intentar con query libre
    const r2 = await nominatim({ q: `${callePrincipal}, ${ciud}, ${prov}, Ecuador` })
    if (r2) return r2
  }

  // 3. Referencia como texto libre
  if (referencia) {
    const r = await nominatim({ q: `${referencia}, ${ciud}, ${prov}, Ecuador` })
    if (r) return r
  }

  // 4. Solo la ciudad
  const rCiud = await nominatim({ city: ciud, state: prov })
  if (rCiud) return { ...rCiud, ok: false }

  // 5. Fallback: posición aleatoria cerca del depósito
  return {
    lat: DEPOSITO.lat + (Math.random() - 0.5) * 0.02,
    lng: DEPOSITO.lng + (Math.random() - 0.5) * 0.02,
    ok: false,
  }
}

// Ajustar bounds del mapa cuando cambian las paradas
function FitBounds({ paradas }) {
  const map = useMap()
  const prevLen = useRef(0)
  useEffect(() => {
    const conCoords = paradas.filter(p => p.coords)
    if (conCoords.length === 0 || conCoords.length === prevLen.current) return
    prevLen.current = conCoords.length
    const bounds = [
      [DEPOSITO.lat, DEPOSITO.lng],
      ...conCoords.map(p => [p.coords.lat, p.coords.lng]),
    ]
    try { map.fitBounds(bounds, { padding: [48, 48] }) } catch {}
  }, [paradas, map])
  return null
}

// Item arrastrable
function ParadaItem({ parada, index, onMarcarEntregado }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: parada.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1 }

  const BADGE = {
    pendiente: { bg: '#cfe2ff', color: '#084298', label: 'Pendiente' },
    entregado: { bg: '#cddcf8', color: '#0a1845', label: 'Entregado' },
  }
  const b = BADGE[parada.estadoRuta] ?? BADGE.pendiente

  return (
    <div ref={setNodeRef} style={style} className="bg-white rounded-3 p-3 mb-2 shadow-sm">
      <div className="d-flex align-items-start gap-2">
        {/* Drag handle */}
        <div {...attributes} {...listeners}
          style={{ cursor: 'grab', color: '#ccc', paddingTop: '3px', fontSize: '1.1rem' }}>
          <i className="bi bi-grip-vertical"></i>
        </div>

        {/* Número */}
        <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
          style={{ width: '28px', height: '28px', background: '#0d6efd', fontSize: '0.8rem' }}>
          {index + 1}
        </div>

        {/* Contenido */}
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <div className="d-flex justify-content-between align-items-start gap-1 flex-wrap">
            <span className="fw-bold small">{parada.cliente.nombre}</span>
            <span className="badge rounded-pill px-2"
              style={{ background: b.bg, color: b.color, fontSize: '0.68rem' }}>{b.label}</span>
          </div>
          <p className="text-muted mb-0" style={{ fontSize: '0.78rem' }}>
            <i className="bi bi-geo-alt me-1"></i>
            {[parada.cliente.callePrincipal, parada.cliente.calleSecundaria && `y ${parada.cliente.calleSecundaria}`].filter(Boolean).join(' ') || '—'}
          </p>
          {parada.cliente.referencia && (
            <p className="mb-1" style={{ fontSize: '0.72rem', color: '#856404' }}>
              <i className="bi bi-signpost me-1"></i>{parada.cliente.referencia}
            </p>
          )}
          <p className="text-muted mb-1" style={{ fontSize: '0.78rem' }}>
            <i className="bi bi-telephone me-1"></i>{parada.cliente.telefono}
          </p>
          <p className="mb-0" style={{ fontSize: '0.78rem', color: '#444' }}>
            {parada.productos.map(p => `${p.nombre} ×${p.cantidad}`).join(' · ')}
          </p>
          {/* Indicador de precisión de coordenadas */}
          {parada.coords?.gps && (
            <p className="mb-0 mt-1" style={{ fontSize: '0.68rem', color: '#198754' }}>
              <i className="bi bi-crosshair me-1"></i>Ubicación GPS exacta del cliente
            </p>
          )}
          {parada.coords && !parada.coords.ok && (
            <p className="mb-0 mt-1" style={{ fontSize: '0.68rem', color: '#856404' }}>
              <i className="bi bi-exclamation-triangle me-1"></i>Posición aproximada
            </p>
          )}
          {!parada.coords && (
            <p className="mb-0 mt-1" style={{ fontSize: '0.68rem', color: '#0d6efd' }}>
              <span className="spinner-border spinner-border-sm me-1" style={{ width: '10px', height: '10px' }}></span>
              Localizando...
            </p>
          )}
        </div>

        {/* Botón entregar */}
        {parada.estadoRuta !== 'entregado' && (
          <button className="btn btn-sm flex-shrink-0"
            style={{ background: '#cddcf8', color: '#0a1845', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
            onClick={() => onMarcarEntregado(parada.id)}>
            <i className="bi bi-check-lg me-1"></i>Entregar
          </button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COLORES disponibles para rutas
const COLORES_RUTA = ['#0d6efd','#dc3545','#198754','#fd7e14','#6f42c1','#0dcaf0','#d63384','#20c997']

// ── Item en columna "Disponibles" ────────────────────────────────────────────
function PedidoDisponibleItem({ p, onAgregar, enZona }) {
  return (
    <div className="rounded-3 p-2 mb-2 border d-flex align-items-start gap-2"
      style={{
        fontSize: '0.8rem',
        background: enZona ? (p.coords?.gps ? '#f8f9fa' : '#fff8f0') : '#fffbf0',
        borderColor: enZona ? (p.coords?.gps ? '#e9ecef' : '#fd7e14') : '#fde68a',
        opacity: enZona ? 1 : 0.8,
      }}>
      <div className="flex-grow-1" style={{ minWidth: 0 }}>
        <div className="d-flex align-items-center gap-1 fw-semibold flex-wrap">
          <span>#{p.id} {p.cliente?.nombre}</span>
          {!p.coords?.gps && (
            <span className="badge ms-1" style={{ background: '#fd7e14', fontSize: '0.62rem' }}>
              <i className="bi bi-geo-alt-fill me-1"></i>Sin GPS
            </span>
          )}
        </div>
        <div className="text-muted">{p.cliente?.telefono}</div>
        <div className="text-muted">{p.productos.map(pr => `${pr.nombre} ×${pr.cantidad}`).join(', ')}</div>
      </div>
      <button
        className="btn btn-sm flex-shrink-0"
        style={{ background: 'transparent', border: 'none', color: '#0066CC', padding: '0 4px', fontSize: '1rem', lineHeight: 1 }}
        title="Agregar a la ruta"
        onClick={onAgregar}
      >
        <i className="bi bi-plus-lg"></i>
      </button>
    </div>
  )
}

// ── Item arrastrable en la columna "En esta ruta" ─────────────────────────────
function SortableRouteItem({ p, idx, onQuitar, conductorNombre }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id })
  return (
    <div ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        fontSize: '0.8rem',
        background: p.coords?.gps ? '#f0f7ff' : '#fff8f0',
        borderColor: p.coords?.gps ? '#cfe2ff' : '#fd7e14',
      }}
      className="rounded-3 p-2 mb-2 border d-flex align-items-start gap-2"
    >
      <span {...attributes} {...listeners}
        className="text-muted flex-shrink-0"
        style={{ cursor: 'grab', fontSize: '0.85rem', marginTop: 2 }}>
        <i className="bi bi-grip-vertical"></i>
      </span>
      <span className="fw-bold rounded-circle text-white d-flex align-items-center justify-content-center flex-shrink-0"
        style={{ width: 22, height: 22, background: '#0066CC', fontSize: '0.7rem', marginTop: 1 }}>
        {idx + 1}
      </span>
      <div className="flex-grow-1" style={{ minWidth: 0 }}>
        <div className="fw-semibold">
          #{p.id} {p.cliente?.nombre}
          {conductorNombre && (
            <span className="badge ms-1" style={{ background: '#16a34a', fontSize: '0.62rem', verticalAlign: 'middle' }}>
              <i className="bi bi-truck me-1"></i>{conductorNombre}
            </span>
          )}
        </div>
        <div className="text-muted">{p.cliente?.telefono}</div>
        <div className="text-muted">{p.productos.map(pr => `${pr.nombre} ×${pr.cantidad}`).join(', ')}</div>
      </div>
      <button
        className="btn btn-sm flex-shrink-0"
        style={{ background: 'transparent', border: 'none', color: '#dc3545', padding: '0 4px', fontSize: '1rem', lineHeight: 1 }}
        title="Quitar de la ruta"
        onClick={onQuitar}
      >
        <i className="bi bi-x-lg"></i>
      </button>
    </div>
  )
}

// ── Componente de Planificación ───────────────────────────────────────────────
function PlanificacionTab({ authFetch }) {
  const manana = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] }

  const [fecha,          setFecha]          = useState(manana())
  const [allPendientes,  setAllPendientes]  = useState([])
  const [enRutaIds,      setEnRutaIds]      = useState([])
  const [cargando,       setCargando]       = useState(true)
  const [conductores,    setConductores]    = useState([])
  const [camiones,       setCamiones]       = useState([])
  const [localidades,    setLocalidades]    = useState([])
  const [conductorId,    setConductorId]    = useState('')
  const [rutaId,         setRutaId]         = useState(null)
  const [guardando,      setGuardando]      = useState(false)
  const [guardadoOk,     setGuardadoOk]     = useState(false)
  const [eliminando,     setEliminando]     = useState(false)
  const [rutaCalles,     setRutaCalles]     = useState([])
  const [calculandoRuta, setCalculandoRuta] = useState(false)
  const [previewZona,    setPreviewZona]    = useState(null)
  const [asignandoZona,  setAsignandoZona]  = useState(false)
  const [guardandoTodas, setGuardandoTodas] = useState(false)
  const [guardadasOk,    setGuardadasOk]    = useState(false)
  const [pollingActivo,  setPollingActivo]  = useState(false)
  const geocodificadosRef  = useRef(new Set())
  const rutaKeyRef         = useRef('')
  const autoOptimizadoRef  = useRef(false)
  const zonasActivasRef    = useRef([])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const disponibles = useMemo(
    () => allPendientes.filter(p => p.estado === 'pendiente' && !enRutaIds.includes(p.id)),
    [allPendientes, enRutaIds]
  )
  const enRuta = useMemo(
    () => enRutaIds.map(id => allPendientes.find(p => p.id === id)).filter(Boolean),
    [allPendientes, enRutaIds]
  )

  // Zonas activas del camión del conductor seleccionado (múltiples localidades)
  const zonasActivas = useMemo(() => {
    if (!conductorId) return []
    const conductor = conductores.find(c => c.id === parseInt(conductorId))
    const camion = camiones.find(c => c.conductor?.id === parseInt(conductorId) || c.id === conductor?.camionId)
    if (!camion) return []
    return localidades
      .filter(l => l.camionId === camion.id && l.activo && Array.isArray(l.poligono) && l.poligono.length >= 3)
      .map(l => l.poligono)
  }, [conductorId, conductores, camiones, localidades])

  const hayZona = zonasActivas.length > 0

  const disponiblesEnZona = useMemo(() => {
    if (!hayZona) return disponibles
    return disponibles.filter(p => p.coords && puntoEnAlgunaZona(p.coords.lat, p.coords.lng, zonasActivas))
  }, [disponibles, zonasActivas, hayZona])

  const disponiblesFueraZona = useMemo(() => {
    if (!hayZona) return []
    const enZonaIds = new Set(disponiblesEnZona.map(p => p.id))
    return disponibles.filter(p => !enZonaIds.has(p.id))
  }, [disponibles, disponiblesEnZona, hayZona])

  // Mantener ref sincronizado para usar dentro de cargar()
  useEffect(() => { zonasActivasRef.current = zonasActivas }, [zonasActivas])

  // ── Cargar conductores activos + camiones con polígonos ───────────────────
  useEffect(() => {
    Promise.all([
      authFetch('/api/conductores').then(r => r.json()),
      authFetch('/api/camiones').then(r => r.json()),
      authFetch('/api/localidades').then(r => r.json()),
    ]).then(([dataCon, dataCam, dataLoc]) => {
      const activos = (dataCon.conductores || []).filter(c => c.activo)
      setConductores(activos)
      setCamiones(dataCam.camiones || [])
      setLocalidades(dataLoc.localidades || [])
      if (activos.length > 0 && !conductorId) setConductorId(String(activos[0].id))
    }).catch(() => {})
  }, [authFetch])

  // ── Carga de pedidos pendientes y planificados ─────────────────────────────
  const cargar = useCallback(async () => {
    // Traer tanto pendientes como planificados para poder mostrar los items
    // ya asignados a rutas en la columna "Ruta planificada"
    const [resPendiente, resPlanificado] = await Promise.all([
      authFetch('/api/pedidos?estado=pendiente'),
      authFetch('/api/pedidos?estado=planificado'),
    ])
    const [dataPendiente, dataPlanificado] = await Promise.all([
      resPendiente.json(),
      resPlanificado.json(),
    ])
    const norm = p => ({
      ...p,
      coords: (() => {
        const lat = p.latitud ?? p.cliente?.latitud
        const lng = p.longitud ?? p.cliente?.longitud
        return lat && lng ? { lat, lng, ok: true, gps: true } : null
      })(),
      productos: (p.items || []).map(i => ({ nombre: i.producto?.nombre ?? '', cantidad: i.cantidad })),
    })
    const todos = [
      ...(dataPendiente.pedidos  || []),
      ...(dataPlanificado.pedidos || []),
    ].map(norm)
    const todosIds = todos.map(p => p.id)
    setAllPendientes(todos)
    setEnRutaIds(prev => {
      const filtered = prev.filter(id => todosIds.includes(id))
      // Si ya se optimizó y hay zona activa, auto-agregar nuevos pedidos que lleguen en zona
      if (autoOptimizadoRef.current && zonasActivasRef.current.length > 0) {
        const enRutaSet = new Set(filtered)
        const nuevosEnZona = todos.filter(p =>
          p.estado === 'pendiente' &&
          !enRutaSet.has(p.id) &&
          p.coords &&
          puntoEnAlgunaZona(p.coords.lat, p.coords.lng, zonasActivasRef.current)
        )
        return [...filtered, ...nuevosEnZona.map(p => p.id)]
      }
      return filtered
    })
    setCargando(false)
    geocodificadosRef.current = new Set()
  }, [authFetch])

  useEffect(() => {
    cargar()
    const id = setInterval(cargar, 5000)
    return () => clearInterval(id)
  }, [cargar])

  // ── Polling silencioso cada 2 segundos cuando pollingActivo es true ────────
  useEffect(() => {
    if (!pollingActivo) return
    const id = setInterval(() => cargar(), 2000)
    return () => clearInterval(id)
  }, [pollingActivo, cargar])

  // ── Cuando cambia fecha+conductor: cargar ruta guardada si existe ──────────
  useEffect(() => {
    if (!fecha || !conductorId) { setRutaId(null); return }
    setEnRutaIds([])
    autoOptimizadoRef.current = false
    rutaKeyRef.current = ''
    authFetch(`/api/planrutas?fecha=${fecha}`)
      .then(r => r.json())
      .then(d => {
        const ruta = (d.rutas || []).find(r => r.conductorId === parseInt(conductorId))
        if (!ruta) { setRutaId(null); return }
        setRutaId(ruta.id)
        // Los items ya vienen en el GET /api/planrutas?fecha=... — no hace falta un segundo fetch
        const idsOrdenados = [...(ruta.items ?? [])]
          .sort((a, b) => a.orden - b.orden)
          .map(i => i.pedidoId)
        if (idsOrdenados.length > 0) setEnRutaIds(idsOrdenados)
      })
      .catch(() => {})
  }, [fecha, conductorId, authFetch])

  // ── Geocodificación de pedidos sin coords ─────────────────────────────────
  useEffect(() => {
    const sinCoords = allPendientes.filter(p => !p.coords && !geocodificadosRef.current.has(p.id))
    if (sinCoords.length === 0) return
    sinCoords.forEach(p => geocodificadosRef.current.add(p.id))
    sinCoords.forEach((parada, i) => {
      setTimeout(async () => {
        const coords = await geocodificar(parada.cliente)
        setAllPendientes(prev => prev.map(p => p.id === parada.id ? { ...p, coords } : p))
        if (coords.ok) {
          authFetch(`/api/pedidos/clientes/${parada.cliente.id}/coords`, {
            method: 'PATCH',
            body: JSON.stringify({ latitud: coords.lat, longitud: coords.lng }),
          }).catch(() => {})
        }
      }, i * 1100)
    })
  }, [allPendientes, authFetch])

  // ── Ruta por calles: recalcula cuando cambia enRuta ───────────────────────
  useEffect(() => {
    const conCoords = enRuta.filter(p => p.coords)
    if (conCoords.length === 0) { setRutaCalles([]); return }
    if (enRuta.some(p => !p.coords)) return

    const key = conCoords.map(p => `${p.id}@${p.coords.lat.toFixed(5)},${p.coords.lng.toFixed(5)}`).join('|')
    if (key === rutaKeyRef.current) return
    rutaKeyRef.current = key

    const puntos = [DEPOSITO, ...conCoords.map(p => ({ lat: p.coords.lat, lng: p.coords.lng })), DEPOSITO]
    setCalculandoRuta(true)
    calcularRutaPorCalles(puntos)
      .then(coords => { if (coords.length > 1) setRutaCalles(coords) })
      .finally(() => setCalculandoRuta(false))
  }, [enRuta])

  // ── Vecino más cercano (pure): recibe array de paradas, devuelve IDs ordenados ─
  function nearestNeighborIds(paradas) {
    function dist(a, b) {
      const R = 6371
      const dLat = (b.lat - a.lat) * Math.PI / 180
      const dLng = (b.lng - a.lng) * Math.PI / 180
      const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2
      return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x))
    }
    const conCoords = paradas.filter(p => p.coords)
    const sinCoords = paradas.filter(p => !p.coords)
    const ordenadas = [], restantes = [...conCoords]
    let actual = DEPOSITO
    while (restantes.length > 0) {
      let minIdx = 0, minDist = dist(actual, restantes[0].coords)
      for (let i = 1; i < restantes.length; i++) {
        const d = dist(actual, restantes[i].coords)
        if (d < minDist) { minDist = d; minIdx = i }
      }
      ordenadas.push(restantes[minIdx])
      actual = restantes[minIdx].coords
      restantes.splice(minIdx, 1)
    }
    return [...ordenadas, ...sinCoords].map(p => p.id)
  }

  // ── Agregar a la ruta y re-optimizar automáticamente ──────────────────────
  function agregarARoute(p) {
    setEnRutaIds(prev => {
      const todasLasParadas = [...prev, p.id].map(id => allPendientes.find(x => x.id === id)).filter(Boolean)
      return nearestNeighborIds(todasLasParadas)
    })
    rutaKeyRef.current = ''
  }

  async function quitarDeRuta(id) {
    const nuevosIds = enRutaIds.filter(x => x !== id)
    setEnRutaIds(nuevosIds)
    if (rutaId) {
      await authFetch(`/api/planrutas/${rutaId}`, {
        method: 'PUT',
        body: JSON.stringify({ conductorId: parseInt(conductorId), items: nuevosIds }),
      }).catch(() => {})
    }
  }

  function handleDragEnd(event) {
    const { active, over } = event
    if (active.id !== over?.id) {
      setEnRutaIds(prev => {
        const oldIndex = prev.indexOf(active.id)
        const newIndex = prev.indexOf(over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  // ── Optimizar: re-ordena TODA la ruta asignada + disponibles de la zona ───
  function optimizarPorCercania() {
    const todasLasParadas = hayZona
      ? [...enRuta, ...disponiblesEnZona]
      : [...enRuta, ...disponibles]
    if (todasLasParadas.length === 0) return
    rutaKeyRef.current = ''
    setEnRutaIds(nearestNeighborIds(todasLasParadas))
    autoOptimizadoRef.current = true
  }

  // ── Guardar ruta ───────────────────────────────────────────────────────────
  async function guardarRuta() {
    if (!conductorId || enRutaIds.length === 0) return
    setGuardando(true)
    try {
      const items = enRutaIds
      if (rutaId) {
        await authFetch(`/api/planrutas/${rutaId}`, {
          method: 'PUT',
          body: JSON.stringify({ conductorId: parseInt(conductorId), items }),
        })
      } else {
        const conductor = conductores.find(c => c.id === parseInt(conductorId))
        const resCrear = await authFetch('/api/planrutas', {
          method: 'POST',
          body: JSON.stringify({
            nombre: `${conductor?.nombre ?? 'Ruta'} – ${fecha}`,
            fecha,
            conductorId: parseInt(conductorId),
            color: '#0066CC',
          }),
        })
        const dataCrear = await resCrear.json()
        if (dataCrear.ruta?.id) {
          setRutaId(dataCrear.ruta.id)
          await authFetch(`/api/planrutas/${dataCrear.ruta.id}`, {
            method: 'PUT',
            body: JSON.stringify({ items }),
          })
        }
      }
      await cargar()
      setGuardadoOk(true)
      setTimeout(() => setGuardadoOk(false), 3000)
    } catch {
    } finally {
      setGuardando(false)
    }
  }

  async function eliminarRuta() {
    if (!rutaId) return
    if (!window.confirm('¿Eliminar esta ruta? Los pedidos volverán a disponibles.')) return
    setEliminando(true)
    try {
      await authFetch(`/api/planrutas/${rutaId}`, { method: 'DELETE' })
      setRutaId(null)
      setEnRutaIds([])
      await cargar()
    } catch {}
    setEliminando(false)
  }

  async function asignarPorZonas() {
    setAsignandoZona(true)
    try {
      const res  = await authFetch('/api/planrutas/asignar-por-zona', {
        method: 'POST',
        body:   JSON.stringify({ fecha, guardar: false }),
      })
      const data = await res.json()
      if (data.message) { alert(data.message); return }
      setPreviewZona(data)
      autoOptimizadoRef.current = true
      setPollingActivo(true)
    } catch {}
    setAsignandoZona(false)
  }

  async function confirmarAsignacion() {
    setGuardandoTodas(true)
    try {
      await authFetch('/api/planrutas/asignar-por-zona', {
        method: 'POST',
        body:   JSON.stringify({ fecha, guardar: true }),
      })
      setPreviewZona(null)
      setGuardadasOk(true)
      setTimeout(() => setGuardadasOk(false), 3000)
      await cargar()
      // Recargar ruta del conductor seleccionado
      const res = await authFetch(`/api/planrutas?fecha=${fecha}`)
      const d   = await res.json()
      const ruta = (d.rutas || []).find(r => r.conductorId === parseInt(conductorId))
      if (ruta) {
        setRutaId(ruta.id)
        const ids = [...(ruta.items ?? [])].sort((a, b) => a.orden - b.orden).map(i => i.pedidoId)
        if (ids.length > 0) setEnRutaIds(ids)
      }
    } catch {}
    setGuardandoTodas(false)
  }

  const conCoordsRuta  = enRuta.filter(p => p.coords)
  const geocodificando = allPendientes.some(p => !p.coords)
  const centroPlan     = conCoordsRuta.length > 0
    ? [conCoordsRuta.reduce((s,p) => s + p.coords.lat, 0) / conCoordsRuta.length,
       conCoordsRuta.reduce((s,p) => s + p.coords.lng, 0) / conCoordsRuta.length]
    : [DEPOSITO.lat, DEPOSITO.lng]
  const lineaPlan = conCoordsRuta.length > 0
    ? [[DEPOSITO.lat, DEPOSITO.lng], ...conCoordsRuta.map(p => [p.coords.lat, p.coords.lng]), [DEPOSITO.lat, DEPOSITO.lng]]
    : []

  const conductorActual = conductores.find(c => c.id === parseInt(conductorId))

  if (cargando) return (
    <div className="d-flex justify-content-center align-items-center py-5">
      <div className="spinner-border" style={{ color: '#0066CC' }} />
    </div>
  )

  return (
    <div>
      {/* ── Barra de configuración ────────────────────────────────────────── */}
      <div className="card border-0 shadow-sm mb-3 p-3">
        <div className="d-flex align-items-center gap-3 flex-wrap">

          {/* Fecha */}
          <div className="d-flex align-items-center gap-2">
            <label className="fw-semibold small text-muted mb-0" style={{ whiteSpace: 'nowrap' }}>
              <i className="bi bi-calendar3 me-1"></i>Fecha de entrega:
            </label>
            <input
              type="date"
              className="form-control form-control-sm"
              style={{ width: 'auto' }}
              value={fecha}
              onChange={e => setFecha(e.target.value)}
            />
          </div>

          {/* Conductor */}
          <div className="d-flex align-items-center gap-2">
            <label className="fw-semibold small text-muted mb-0" style={{ whiteSpace: 'nowrap' }}>
              <i className="bi bi-truck me-1"></i>Camión:
            </label>
            {conductores.length === 0 ? (
              <span className="text-muted small">Sin conductores activos</span>
            ) : (
              <select
                className="form-select form-select-sm"
                style={{ width: 'auto', minWidth: 200 }}
                value={conductorId}
                onChange={e => setConductorId(e.target.value)}
              >
                {conductores.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}{c.camion ? ` — ${c.camion.placa}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Estado ruta guardada */}
          {rutaId && (
            <span className="badge" style={{ background: '#d1fae5', color: '#065f46', fontSize: '0.75rem' }}>
              <i className="bi bi-check-circle me-1"></i>Ruta guardada (ID {rutaId})
            </span>
          )}

          {/* Acciones */}
          <div className="d-flex gap-2 ms-auto flex-wrap">
            <button
              className="btn btn-sm fw-semibold text-white"
              style={{ background: '#0891b2' }}
              onClick={asignarPorZonas}
              disabled={asignandoZona || allPendientes.filter(p => p.estado === 'pendiente').length === 0}
              title="Distribuye todos los pedidos pendientes a las rutas según la zona de cada camión"
            >
              {asignandoZona
                ? <><span className="spinner-border spinner-border-sm me-1" style={{width:12,height:12}}></span>Calculando...</>
                : <><i className="bi bi-diagram-3 me-1"></i>Asignar a sus rutas</>
              }
            </button>
            <button
              className="btn btn-sm fw-semibold text-white"
              style={{ background: guardadoOk ? '#198754' : '#0066CC' }}
              onClick={guardarRuta}
              disabled={guardando || !conductorId || enRutaIds.length === 0}
            >
              {guardando
                ? <><span className="spinner-border spinner-border-sm me-1" style={{width:12,height:12}}></span>Guardando...</>
                : guardadoOk
                  ? <><i className="bi bi-check-lg me-1"></i>¡Guardado!</>
                  : <><i className="bi bi-floppy me-1"></i>Guardar ruta{conductorActual ? ` — ${conductorActual.nombre}` : ''}</>
              }
            </button>
            {rutaId && (
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={eliminarRuta}
                disabled={eliminando}
                title="Eliminar esta ruta — los pedidos vuelven a disponibles"
              >
                {eliminando
                  ? <span className="spinner-border spinner-border-sm" style={{width:12,height:12}}></span>
                  : <i className="bi bi-trash"></i>
                }
              </button>
            )}
            {pollingActivo && (
              <button
                className="btn btn-sm"
                style={{ background: '#f87171', color: 'white' }}
                onClick={() => { setPollingActivo(false); autoOptimizadoRef.current = false }}
                title="Detener monitoreo de pedidos"
              >
                <i className="bi bi-stop-circle me-1"></i>Detener monitoreo
              </button>
            )}
            <button className="btn btn-sm btn-outline-secondary" onClick={cargar}>
              <i className="bi bi-arrow-clockwise"></i>
            </button>
          </div>
        </div>

        {/* Info pedidos + geocodificación */}
        <div className="d-flex align-items-center gap-3 mt-2" style={{ fontSize: '0.8rem' }}>
          <span className="text-muted">
            <span className="fw-semibold text-dark">{allPendientes.length}</span> pedido(s) pendientes en total
          </span>
          {geocodificando && (
            <span className="text-muted">
              <span className="spinner-border spinner-border-sm me-1" style={{width:10,height:10}}></span>
              Localizando direcciones...
            </span>
          )}
          {!geocodificando && calculandoRuta && (
            <span className="text-muted">
              <span className="spinner-border spinner-border-sm me-1" style={{width:10,height:10}}></span>
              Calculando ruta por calles...
            </span>
          )}
          {!geocodificando && !calculandoRuta && rutaCalles.length > 1 && (
            <span style={{ color: '#198754', fontSize: '0.78rem' }}>
              <i className="bi bi-check-circle me-1"></i>Ruta por calles lista
            </span>
          )}
          {pollingActivo && (
            <span style={{ color: '#0891b2', fontSize: '0.78rem', marginLeft: 'auto' }}>
              <span className="spinner-border spinner-border-sm me-1" style={{width:10,height:10}}></span>
              <strong>Monitoreando pedidos</strong> cada 2 segundos
            </span>
          )}
        </div>
      </div>

      {/* ── Panel preview asignación por zonas ────────────────────────────── */}
      {previewZona && (() => {
        const COLORES_PREVIEW = ['#0066CC','#dc3545','#198754','#fd7e14','#6f42c1','#0dcaf0','#d63384','#20c997']
        return (
          <div className="mb-3 rounded-3 overflow-hidden" style={{ border: '1px solid #bfdbfe' }}>
            {/* Cabecera */}
            <div className="d-flex align-items-center justify-content-between px-3 py-2" style={{ background: '#eff6ff' }}>
              <span className="fw-semibold" style={{ color: '#1e40af' }}>
                <i className="bi bi-diagram-3 me-2"></i>
                Vista previa — <strong>{previewZona.conductores.reduce((s, c) => s + c.pedidos.length, 0)}</strong> pedidos a asignar
              </span>
              <button className="btn btn-sm btn-outline-secondary py-0" onClick={() => setPreviewZona(null)}>
                <i className="bi bi-x"></i>
              </button>
            </div>

            {/* Mapa */}
            <MapContainer
              center={[DEPOSITO.lat, DEPOSITO.lng]}
              zoom={13}
              style={{ height: 420, width: '100%' }}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {/* Polígonos de zona por conductor */}
              {previewZona.conductores.map((c, i) => {
                const conductor = conductores.find(con => con.id === c.conductorId)
                const camion    = camiones.find(cam =>
                  cam.conductor?.id === c.conductorId || cam.id === conductor?.camionId
                )
                if (!camion) return null
                const zonas = localidades.filter(l =>
                  l.camionId === camion.id && l.activo && Array.isArray(l.poligono) && l.poligono.length >= 3
                )
                return zonas.map(l => (
                  <Polygon
                    key={`${c.conductorId}-${l.id}`}
                    positions={l.poligono}
                    pathOptions={{ color: COLORES_PREVIEW[i % COLORES_PREVIEW.length], fillOpacity: 0.12, weight: 2 }}
                  />
                ))
              })}
              {/* Pines de pedidos por conductor */}
              {previewZona.conductores.map((c, i) =>
                c.pedidos.map(pv => {
                  const pedido = allPendientes.find(p => p.id === pv.id)
                  if (!pedido?.coords) return null
                  return (
                    <CircleMarker
                      key={pv.id}
                      center={[pedido.coords.lat, pedido.coords.lng]}
                      radius={9}
                      pathOptions={{ color: '#fff', fillColor: COLORES_PREVIEW[i % COLORES_PREVIEW.length], fillOpacity: 1, weight: 2 }}
                    >
                      <Popup>
                        <strong>#{pv.id}</strong> {pv.cliente}<br />
                        <span style={{ color: COLORES_PREVIEW[i % COLORES_PREVIEW.length] }}>
                          <i className="bi bi-truck me-1"></i>{c.nombre}
                        </span>
                      </Popup>
                    </CircleMarker>
                  )
                })
              )}
              {/* Pines sin zona */}
              {previewZona.sinZona.map(pv => {
                const pedido = allPendientes.find(p => p.id === pv.id)
                if (!pedido?.coords) return null
                return (
                  <CircleMarker
                    key={pv.id}
                    center={[pedido.coords.lat, pedido.coords.lng]}
                    radius={9}
                    pathOptions={{ color: '#fff', fillColor: '#f59e0b', fillOpacity: 1, weight: 2 }}
                  >
                    <Popup>
                      <strong>#{pv.id}</strong> {pv.cliente}<br />
                      <span style={{ color: '#92400e' }}>⚠️ Sin zona asignada</span>
                    </Popup>
                  </CircleMarker>
                )
              })}
            </MapContainer>

            {/* Leyenda + acciones */}
            <div className="px-3 py-2 d-flex align-items-center flex-wrap gap-2" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              {previewZona.conductores.map((c, i) => (
                <span key={c.conductorId} className="d-flex align-items-center gap-1 small">
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: COLORES_PREVIEW[i % COLORES_PREVIEW.length], display: 'inline-block' }}></span>
                  <span className="fw-semibold">{c.nombre}</span>
                  <span className="text-muted">({c.pedidos.length})</span>
                </span>
              ))}
              {previewZona.sinZona.length > 0 && (
                <span className="d-flex align-items-center gap-1 small">
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
                  <span className="text-muted">Sin zona ({previewZona.sinZona.length})</span>
                </span>
              )}
              <div className="ms-auto d-flex gap-2">
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setPreviewZona(null)}>
                  Cancelar
                </button>
                <button
                  className="btn btn-sm fw-semibold text-white"
                  style={{ background: guardadasOk ? '#198754' : '#16a34a' }}
                  onClick={confirmarAsignacion}
                  disabled={guardandoTodas || previewZona.conductores.length === 0}
                >
                  {guardandoTodas
                    ? <><span className="spinner-border spinner-border-sm me-1" style={{width:12,height:12}}></span>Guardando...</>
                    : guardadasOk
                      ? <><i className="bi bi-check-lg me-1"></i>¡Rutas guardadas!</>
                      : <><i className="bi bi-floppy me-1"></i>Guardar todas las rutas</>
                  }
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      <div className="row g-3">
        {/* Lista de pedidos disponibles */}
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 pt-3 pb-2 d-flex align-items-center justify-content-between">
              <span className="fw-bold small text-uppercase text-muted">Disponibles</span>
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-secondary">{disponibles.length}</span>
                {hayZona && (
                  <span className="badge" style={{ background: '#d1fae5', color: '#065f46', fontSize: '0.65rem' }}>
                    <i className="bi bi-pentagon-fill me-1"></i>Zona activa
                  </span>
                )}
              </div>
            </div>
            <div className="card-body p-2" style={{ overflowY: 'auto', maxHeight: 520 }}>
              {disponibles.length === 0 ? (
                <p className="text-muted text-center small py-3">Sin pedidos disponibles</p>
              ) : (
                <>
                  {/* En zona */}
                  {hayZona && disponiblesEnZona.length > 0 && (
                    <div className="small fw-semibold text-uppercase mb-1 px-1" style={{ color: '#065f46', fontSize: '0.65rem' }}>
                      <i className="bi bi-geo-fill me-1"></i>En zona ({disponiblesEnZona.length})
                    </div>
                  )}
                  {(hayZona ? disponiblesEnZona : disponibles).map(p => (
                    <PedidoDisponibleItem key={p.id} p={p} onAgregar={() => agregarARoute(p)} enZona />
                  ))}

                  {/* Fuera de zona */}
                  {hayZona && disponiblesFueraZona.length > 0 && (
                    <>
                      <div className="small fw-semibold text-uppercase mb-1 mt-2 px-1" style={{ color: '#92400e', fontSize: '0.65rem' }}>
                        <i className="bi bi-geo me-1"></i>Fuera de zona ({disponiblesFueraZona.length})
                      </div>
                      {disponiblesFueraZona.map(p => (
                        <PedidoDisponibleItem key={p.id} p={p} onAgregar={() => agregarARoute(p)} enZona={false} />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Lista de pedidos en ruta */}
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 pt-3 pb-2 d-flex align-items-center justify-content-between">
              <span className="fw-bold small text-uppercase text-muted">Ruta planificada</span>
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-success">{enRuta.length}</span>
              </div>
            </div>
            <div className="card-body p-2" style={{ overflowY: 'auto', maxHeight: 520 }}>
              {enRuta.length === 0 ? (
                <p className="text-muted text-center small py-3">Agrega pedidos desde la columna izquierda</p>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={enRutaIds} strategy={verticalListSortingStrategy}>
                    {enRuta.map((p, idx) => (
                      <SortableRouteItem
                        key={p.id}
                        p={p}
                        idx={idx}
                        conductorNombre={conductores.find(c => c.id === parseInt(conductorId))?.nombre ?? ''}
                        onQuitar={() => quitarDeRuta(p.id)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        </div>

        {/* Mapa */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm overflow-hidden" style={{ height: 520 }}>
            <MapContainer center={centroPlan} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBounds paradas={enRuta} />
              {zonasActivas.map((pol, i) => (
                <Polygon
                  key={i}
                  positions={pol}
                  pathOptions={{ color: '#0066CC', fillColor: '#0066CC', fillOpacity: 0.08, weight: 2, dashArray: '6,4' }}
                />
              ))}
              <Marker position={[DEPOSITO.lat, DEPOSITO.lng]} icon={depositoIcon}>
                <Popup><b>🏭 Planta Agua Manú</b></Popup>
              </Marker>
              {rutaCalles.length > 1
                ? <Polyline positions={rutaCalles} color="#0066CC" weight={4} opacity={0.9} />
                : lineaPlan.length > 2 && <Polyline positions={lineaPlan} color="#0066CC" weight={4} opacity={0.9} />
              }
              {enRuta.filter(p => p.coords).map((p, idx) => (
                <Marker key={`${p.id}-${idx}`} position={[p.coords.lat, p.coords.lng]}
                  icon={numeradoIcon(idx + 1, p.coords.gps ? '#0066CC' : '#fd7e14')}>
                  <Popup>
                    <b>Parada {idx + 1} — #{p.id}</b><br />
                    {p.cliente?.nombre}<br />
                    {p.productos.map(pr => `${pr.nombre} ×${pr.cantidad}`).join(', ')}<br />
                    <b>${parseFloat(p.total || 0).toFixed(2)}</b>
                    {!p.coords.gps && <><br /><span style={{ color:'#fd7e14', fontSize:'0.8rem' }}>⚠ Posición aproximada</span></>}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminLogistica() {
  const { authFetch } = useAuth()
  const [tab, setTab] = useState('planificacion')
  const [paradas, setParadas] = useState([])
  const [loading, setLoading] = useState(true)
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null)
  const [fecha, setFecha] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })
  const [rutaCalles, setRutaCalles] = useState([])
  const [calculandoRuta, setCalculandoRuta] = useState(false)
  const [fechaEntrega, setFechaEntrega] = useState(() => new Date().toISOString().split('T')[0])
  const geocodificadosRef      = useRef(new Set())
  const rutaKeyRef             = useRef('')
  const autoOptimizadoParadas  = useRef(false)
  const printRef = useRef()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // ── Cargar rutas planificadas para la fecha de entrega ────────────────────
  const cargarPedidos = useCallback(async () => {
    const res  = await authFetch(`/api/planrutas?fecha=${fechaEntrega}`)
    const data = await res.json()
    const rutas = data.rutas || []
    const quitadosIds = new Set(JSON.parse(localStorage.getItem('logistica_quitados') || '[]'))

    // Aplanar todos los ítems de todas las rutas de hoy (en el orden guardado)
    const pedidosDeRutas = rutas.flatMap(r =>
      (r.items || []).filter(i => i.pedido).map(i => i.pedido)
    ).filter(p => !quitadosIds.has(p.id))

    setParadas(prev => {
      const prevMap = new Map(prev.map(p => [p.id, p]))
      return pedidosDeRutas.map(pedido => {
        const existing = prevMap.get(pedido.id)
        if (existing) return existing   // conservar coords y estadoRuta ya asignados
        return {
          ...pedido,
          estadoRuta: pedido.estado === 'entregado' ? 'entregado' : 'pendiente',
          coords: null,
          productos: (pedido.items || []).map(i => ({
            nombre:   i.producto?.nombre ?? '',
            cantidad: i.cantidad,
          })),
        }
      })
    })

    setUltimaActualizacion(new Date())
    setLoading(false)
    // El orden ya viene del plan guardado → no re-optimizar
    autoOptimizadoParadas.current = true
  }, [authFetch, fechaEntrega])

  // Carga inicial
  useEffect(() => {
    cargarPedidos()
  }, [cargarPedidos])

  // Auto-refresh cada 60 segundos
  useEffect(() => {
    const timer = setInterval(cargarPedidos, 5000)
    return () => clearInterval(timer)
  }, [cargarPedidos])

  // ── Geocodificar automáticamente cualquier parada sin coords ───────────────
  useEffect(() => {
    const sinCoords = paradas.filter(p => !p.coords && !geocodificadosRef.current.has(p.id))
    if (sinCoords.length === 0) return

    // Marca como "en proceso" para evitar llamadas duplicadas
    sinCoords.forEach(p => geocodificadosRef.current.add(p.id))

    // Geocodifica con un delay de 1.1s entre llamadas (límite Nominatim)
    sinCoords.forEach((parada, i) => {
      // Si el cliente compartió su GPS exacto, usarlo directamente
      if (parada.cliente.latitud && parada.cliente.longitud) {
        setParadas(prev =>
          prev.map(p => p.id === parada.id
            ? { ...p, coords: { lat: parada.cliente.latitud, lng: parada.cliente.longitud, ok: true, gps: true } }
            : p
          )
        )
        return
      }
      setTimeout(async () => {
        const coords = await geocodificar(parada.cliente)
        setParadas(prev =>
          prev.map(p => p.id === parada.id ? { ...p, coords } : p)
        )
      }, i * 1100)
    })
  }, [paradas])

  // ── Calcular ruta por calles ───────────────────────────────────────────────
  const calcularRutaOSRM = useCallback(async (puntos) => {
    if (puntos.length < 2) { setRutaCalles([]); return }
    setCalculandoRuta(true)
    try {
      const coords = await calcularRutaPorCalles(puntos)
      if (coords.length > 1) setRutaCalles(coords)
    } finally {
      setCalculandoRuta(false)
    }
  }, [])

  // Recalcula la ruta por calles; auto-ordena por cercanía la primera vez
  useEffect(() => {
    const conCoords = paradas.filter(p => p.coords)
    const sinCoords = paradas.filter(p => !p.coords)

    if (sinCoords.length > 0 || conCoords.length === 0) return

    // Auto-ordenar una sola vez cuando todas las paradas tienen coords
    if (!autoOptimizadoParadas.current) {
      autoOptimizadoParadas.current = true
      function dist(a, b) {
        const R = 6371
        const dLat = (b.lat - a.lat) * Math.PI / 180
        const dLng = (b.lng - a.lng) * Math.PI / 180
        const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2
        return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x))
      }
      const ordenadas = []
      const restantes = [...conCoords]
      let actual = DEPOSITO
      while (restantes.length > 0) {
        let minIdx = 0, minDist = dist(actual, restantes[0].coords)
        for (let i = 1; i < restantes.length; i++) {
          const d = dist(actual, restantes[i].coords)
          if (d < minDist) { minDist = d; minIdx = i }
        }
        ordenadas.push(restantes[minIdx])
        actual = restantes[minIdx].coords
        restantes.splice(minIdx, 1)
      }
      setParadas(prev => {
        const sinC = prev.filter(p => !p.coords)
        return [...ordenadas, ...sinC]
      })
      return
    }

    const key = conCoords.map(p => `${p.id}@${p.coords.lat.toFixed(5)},${p.coords.lng.toFixed(5)}`).join('|')
    if (key === rutaKeyRef.current) return
    rutaKeyRef.current = key

    const puntos = [DEPOSITO, ...conCoords.map(p => ({ lat: p.coords.lat, lng: p.coords.lng })), DEPOSITO]
    calcularRutaOSRM(puntos)
  }, [paradas, calcularRutaOSRM])

  // ── Optimizar paradas por cercanía (vecino más cercano desde DEPOSITO) ─────
  function optimizarPorCercania() {
    setParadas(prev => {
      const conCoords = prev.filter(p => p.coords)
      const sinCoords = prev.filter(p => !p.coords)
      if (conCoords.length < 2) return prev

      function dist(a, b) {
        const R = 6371
        const dLat = (b.lat - a.lat) * Math.PI / 180
        const dLng = (b.lng - a.lng) * Math.PI / 180
        const x = Math.sin(dLat / 2) ** 2 +
          Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
        return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
      }

      const ordenadas = []
      const restantes = [...conCoords]
      let actual = DEPOSITO
      while (restantes.length > 0) {
        let minIdx = 0
        let minDist = dist(actual, restantes[0].coords)
        for (let i = 1; i < restantes.length; i++) {
          const d = dist(actual, restantes[i].coords)
          if (d < minDist) { minDist = d; minIdx = i }
        }
        ordenadas.push(restantes[minIdx])
        actual = restantes[minIdx].coords
        restantes.splice(minIdx, 1)
      }
      return [...ordenadas, ...sinCoords]
    })
  }

  // ── Drag-and-drop ──────────────────────────────────────────────────────────
  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    setParadas(prev => {
      const oldIdx = prev.findIndex(p => p.id === active.id)
      const newIdx = prev.findIndex(p => p.id === over.id)
      return arrayMove(prev, oldIdx, newIdx)
    })
  }

  // ── Marcar entregado ───────────────────────────────────────────────────────
  function marcarEntregado(id) {
    setParadas(prev => prev.map(p => p.id === id ? { ...p, estadoRuta: 'entregado' } : p))
    authFetch(`/api/pedidos/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: 'entregado' }),
    })
  }

  // ── Línea de ruta azul ─────────────────────────────────────────────────────
  const paradасConCoords = paradas.filter(p => p.coords)
  const lineaRuta = paradасConCoords.length > 0
    ? [
        [DEPOSITO.lat, DEPOSITO.lng],
        ...paradасConCoords.map(p => [p.coords.lat, p.coords.lng]),
        [DEPOSITO.lat, DEPOSITO.lng],
      ]
    : []

  const pendientesCount = paradas.filter(p => p.estadoRuta !== 'entregado').length
  const entregadosCount = paradas.filter(p => p.estadoRuta === 'entregado').length
  const geocodificando = paradas.some(p => !p.coords)

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading && tab === 'entrega') {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5 gap-2">
        <div className="spinner-border" style={{ color: '#0d6efd' }} />
        <span className="text-muted small">Cargando pedidos...</span>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #hoja-ruta, #hoja-ruta * { visibility: visible !important; }
          #hoja-ruta { position: fixed !important; inset: 0; padding: 2rem; background: white; }
        }
      `}</style>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <ul className="nav nav-pills mb-4 gap-1">
        {[
          { key: 'planificacion', label: 'Planificación del día siguiente', icon: 'bi-calendar2-check' },
          { key: 'entrega',       label: 'Entrega en curso',                icon: 'bi-truck' },
        ].map(t => (
          <li key={t.key} className="nav-item">
            <button className={`nav-link fw-semibold ${tab === t.key ? 'active' : ''}`}
              style={tab === t.key ? { background: '#0066CC' } : {}}
              onClick={() => setTab(t.key)}>
              <i className={`bi ${t.icon} me-2`}></i>{t.label}
            </button>
          </li>
        ))}
      </ul>

      {tab === 'planificacion' && <PlanificacionTab authFetch={authFetch} />}
      {tab === 'entrega' && <>

      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
        <div>
          <h5 className="fw-bold mb-0">
            Logística de entrega
            {(geocodificando || calculandoRuta) && (
              <span className="ms-2 badge rounded-pill"
                style={{ background: '#cfe2ff', color: '#084298', fontSize: '0.72rem', fontWeight: 500 }}>
                <span className="spinner-border spinner-border-sm me-1"
                  style={{ width: '10px', height: '10px' }}></span>
                {geocodificando ? 'Localizando direcciones...' : 'Calculando ruta por calles...'}
              </span>
            )}
          </h5>
          <p className="text-muted small mb-0">
            {paradas.length} parada(s) · {entregadosCount} entregada(s) · {pendientesCount} pendiente(s)
            {ultimaActualizacion && (
              <span className="ms-2 opacity-50">
                · Actualizado {ultimaActualizacion.toLocaleTimeString('es-EC')}
              </span>
            )}
          </p>
        </div>

        <div className="d-flex gap-2 flex-wrap align-items-center">
          <input
            type="date"
            className="form-control form-control-sm"
            value={fechaEntrega}
            onChange={e => setFechaEntrega(e.target.value)}
            style={{ width: 'auto' }}
          />
          <button className="btn btn-sm btn-outline-primary" onClick={cargarPedidos}>
            <i className="bi bi-arrow-clockwise me-1"></i>Actualizar
          </button>
          <button
            className="btn btn-sm fw-semibold text-white"
            style={{ background: '#7c3aed' }}
            onClick={optimizarPorCercania}
            disabled={paradas.filter(p => p.coords).length < 2}
            title="Reordena las paradas de más cercana a más lejana desde la planta"
          >
            <i className="bi bi-magic me-1"></i>Optimizar ruta
          </button>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => window.print()}>
            <i className="bi bi-printer me-1"></i>Imprimir
          </button>
        </div>
      </div>

      {paradas.length === 0 ? (
        <div className="bg-white rounded-4 p-5 text-center shadow-sm">
          <div style={{ fontSize: '3.5rem', opacity: 0.25 }}>🚚</div>
          <h6 className="fw-bold mt-3">No hay rutas planificadas</h6>
          <p className="text-muted small mb-0">
            No se encontraron rutas guardadas para el {new Date(fechaEntrega + 'T12:00').toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })}.
            Planifica y guarda una ruta en la pestaña <strong>Planificación</strong> primero.
          </p>
        </div>
      ) : (
        <div className="row g-3">

          {/* ── Lista drag-and-drop ───────────────────── */}
          <div className="col-12 col-md-4 d-flex flex-column">
            <div className="bg-white rounded-4 shadow-sm p-3 d-flex flex-column" style={{ height: '520px', overflow: 'hidden' }}>
              <p className="fw-bold text-muted mb-2" style={{ fontSize: '0.72rem', letterSpacing: '1px' }}>
                RUTA DEL {new Date(fechaEntrega + 'T12:00').toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
              </p>

              {/* Origen */}
              <div className="d-flex align-items-center gap-2 p-2 rounded-3 mb-2"
                style={{ background: '#fff5f5', border: '1px dashed #dc3545' }}>
                <span style={{ fontSize: '1.1rem' }}>🏭</span>
                <div>
                  <div className="fw-bold" style={{ fontSize: '0.78rem', color: '#dc3545' }}>Punto de salida</div>
                  <div className="text-muted" style={{ fontSize: '0.72rem' }}>Puyo, Pastaza, Ecuador</div>
                </div>
              </div>

              {/* Paradas — scroll independiente */}
              <div className="flex-grow-1 logistica-scroll" style={{ overflowY: 'auto', overflowX: 'hidden', paddingRight: '2px' }}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={paradas.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    {paradas.map((parada, index) => (
                      <ParadaItem
                        key={parada.id}
                        parada={parada}
                        index={index}
                        onMarcarEntregado={marcarEntregado}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>

              {/* Regreso */}
              <div className="d-flex align-items-center gap-2 p-2 rounded-3 mt-2"
                style={{ background: '#fff5f5', border: '1px dashed #dc3545' }}>
                <span style={{ fontSize: '1.1rem' }}>🏭</span>
                <div className="fw-bold" style={{ fontSize: '0.78rem', color: '#dc3545' }}>Regreso al depósito</div>
              </div>

              {/* Totales del día */}
              <div className="mt-2 pt-2 d-flex justify-content-between small fw-bold"
                style={{ borderTop: '1px solid #eee', color: '#0d6efd' }}>
                <span>{paradas.length} entrega(s)</span>
                <span>${paradas.reduce((s, p) => s + parseFloat(p.total), 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* ── Mapa ──────────────────────────────────── */}
          <div className="col-12 col-md-8">
            <div className="rounded-4 shadow-sm overflow-hidden" style={{ height: '520px' }}>
              <MapContainer
                center={[DEPOSITO.lat, DEPOSITO.lng]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <FitBounds paradas={paradas} />

                {/* Depósito */}
                <Marker position={[DEPOSITO.lat, DEPOSITO.lng]} icon={depositoIcon}>
                  <Popup>
                    <b>🏭 Depósito Agua Manú</b><br />
                    Puyo, Pastaza, Ecuador, Pastaza
                  </Popup>
                </Marker>

                {/* Marcadores de paradas */}
                {paradas.map((parada, index) =>
                  parada.coords ? (
                    <Marker
                      key={parada.id}
                      position={[parada.coords.lat, parada.coords.lng]}
                      icon={numeradoIcon(index + 1, parada.estadoRuta)}
                    >
                      <Popup>
                        <div style={{ minWidth: '190px', fontSize: '13px' }}>
                          <b style={{ color: '#0d6efd' }}>Parada #{index + 1} · Pedido #{parada.id}</b>
                          <hr style={{ margin: '6px 0' }} />
                          <b>{parada.cliente.nombre}</b><br />
                          📍 {[parada.cliente.callePrincipal, parada.cliente.calleSecundaria && `y ${parada.cliente.calleSecundaria}`].filter(Boolean).join(' ') || '—'}<br />
                          {parada.cliente.referencia && <>🚩 {parada.cliente.referencia}<br /></>}
                          {parada.cliente.ciudad && <>🏘 {parada.cliente.ciudad}<br /></>}
                          📞 {parada.cliente.telefono}<br />
                          ✉️ {parada.cliente.email}
                          <hr style={{ margin: '6px 0' }} />
                          {parada.productos.map(p => (
                            <div key={p.nombre}>• {p.nombre} × {p.cantidad}</div>
                          ))}
                          <hr style={{ margin: '6px 0' }} />
                          <b>Total: ${parseFloat(parada.total).toFixed(2)}</b>
                          {!parada.coords.ok && (
                            <div style={{ color: '#856404', fontSize: '11px', marginTop: '4px' }}>
                              ⚠️ Posición aproximada
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  ) : null
                )}

                {/* ── Ruta por calles (OSRM) — si aún no está disponible muestra línea directa como fallback ── */}
                {rutaCalles.length > 1 ? (
                  <Polyline
                    positions={rutaCalles}
                    color="#0d6efd"
                    weight={5}
                    opacity={0.85}
                  />
                ) : lineaRuta.length > 2 && (
                  <Polyline
                    positions={lineaRuta}
                    color="#0d6efd"
                    weight={3}
                    opacity={0.45}
                    dashArray="10 8"
                  />
                )}
              </MapContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Hoja de ruta imprimible ────────────────────────────────────────── */}
      <div id="hoja-ruta" style={{ display: 'none' }}>
        <style>{`#hoja-ruta { display: block !important; font-family: Arial, sans-serif; }`}</style>
        <div style={{ borderBottom: '3px solid #0d6efd', paddingBottom: '12px', marginBottom: '20px' }}>
          <h2 style={{ color: '#0d6efd', margin: 0 }}>🚚 Hoja de Ruta — Agua Manú</h2>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: '13px' }}>
            {new Date(fecha + 'T12:00').toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            &nbsp;·&nbsp; {paradas.length} entrega(s)
            &nbsp;·&nbsp; Total: ${paradas.reduce((s, p) => s + parseFloat(p.total), 0).toFixed(2)}
            &nbsp;·&nbsp; Generado: {new Date().toLocaleTimeString('es-EC')}
          </p>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#e7f1ff' }}>
              {['#', 'Cliente', 'Dirección', 'Teléfono', 'Productos', 'Total', 'Firma'].map(h => (
                <th key={h} style={{ border: '1px solid #ccc', padding: '7px 10px', textAlign: h === 'Total' ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paradas.map((p, i) => (
              <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9ff' }}>
                <td style={{ border: '1px solid #ccc', padding: '7px 10px', fontWeight: 'bold', color: '#0d6efd' }}>{i + 1}</td>
                <td style={{ border: '1px solid #ccc', padding: '7px 10px' }}>
                  <strong>{p.cliente.nombre}</strong><br />
                  <span style={{ color: '#888', fontSize: '10px' }}>{p.cliente.email}</span>
                </td>
                <td style={{ border: '1px solid #ccc', padding: '7px 10px' }}>
                  {[p.cliente.callePrincipal, p.cliente.calleSecundaria && `y ${p.cliente.calleSecundaria}`].filter(Boolean).join(' ') || '—'}
                  {p.cliente.referencia && (
                    <div style={{ color: '#856404', fontSize: '10px', marginTop: '2px' }}>
                      🚩 {p.cliente.referencia}
                    </div>
                  )}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '7px 10px' }}>{p.cliente.telefono}</td>
                <td style={{ border: '1px solid #ccc', padding: '7px 10px' }}>
                  {p.productos.map(pr => `${pr.nombre} ×${pr.cantidad}`).join(', ')}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '7px 10px', textAlign: 'right', fontWeight: 'bold' }}>
                  ${parseFloat(p.total).toFixed(2)}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '7px 10px', width: '80px' }}></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#e7f1ff', fontWeight: 'bold' }}>
              <td colSpan={5} style={{ border: '1px solid #ccc', padding: '7px 10px', textAlign: 'right' }}>TOTAL DEL DÍA</td>
              <td style={{ border: '1px solid #ccc', padding: '7px 10px', textAlign: 'right', color: '#0d6efd' }}>
                ${paradas.reduce((s, p) => s + parseFloat(p.total), 0).toFixed(2)}
              </td>
              <td style={{ border: '1px solid #ccc', padding: '7px 10px' }}></td>
            </tr>
          </tfoot>
        </table>
        <div style={{ marginTop: '20px', fontSize: '11px', color: '#888', borderTop: '1px solid #ddd', paddingTop: '10px' }}>
          Punto de salida y regreso: Puyo, Pastaza, Ecuador, Pastaza, Ecuador
        </div>
      </div>

      {/* cierre del tab entrega */}
      </>}
    </>
  )
}
