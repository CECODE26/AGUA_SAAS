import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Polygon, CircleMarker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useAuth } from '../../context/AuthContext'
import EditorPoligono, { PUYO, COLORES_ZONA } from '../../components/EditorPoligono'

// Paleta de la pantalla "Gestión de flota" (misma marca del panel)
const NAVY   = '#0f1d3e'
const AZUL   = '#0066CC'
const GRIS   = '#6b7a8c'
const BORDE  = '#e3e8ef'
const AMBAR  = '#b45309'

const formCamionVacio = { placa: '', marca: '', modelo: '', color: '', anio: '' }
const OSM = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

// ── Utilidades de formato ────────────────────────────────────────────────────
const hora = iso => iso ? new Date(iso).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) : '—'
const money = n => `$${Number(n || 0).toFixed(2)}`
function haceCuanto(iso) {
  if (!iso) return null
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1)   return 'ahora mismo'
  if (min < 60)  return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24)    return `hace ${h} h`
  return `hace ${Math.round(h / 24)} d`
}
function fechaCorta(iso) {
  if (!iso) return ''
  const d = new Date(iso), hoy = new Date()
  const mismoDia = d.toDateString() === hoy.toDateString()
  const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1)
  if (mismoDia) return `Hoy ${hora(iso)}`
  if (d.toDateString() === ayer.toDateString()) return `Ayer ${hora(iso)}`
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' }) + ' ' + hora(iso)
}
const iniciales = nombre => (nombre || '').trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('') || '?'

// ── Mini mapa de cobertura (solo lectura) ────────────────────────────────────
function AjustarVista({ puntos }) {
  const map = useMap()
  useEffect(() => {
    if (puntos.length >= 2) map.fitBounds(puntos, { padding: [14, 14] })
    else if (puntos.length === 1) map.setView(puntos[0], 14)
  }, [JSON.stringify(puntos)]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

function MiniMapa({ localidades, gps }) {
  const conForma  = localidades.filter(l => Array.isArray(l.poligono) && l.poligono.length >= 3)
  const puntos    = [...conForma.flatMap(l => l.poligono), ...(gps ? [[gps.lat, gps.lng]] : [])]
  return (
    <MapContainer center={PUYO} zoom={13} zoomControl={false} dragging={false} scrollWheelZoom={false}
      doubleClickZoom={false} touchZoom={false} attributionControl={false}
      style={{ height: 190, borderRadius: 10, border: `1px solid ${BORDE}` }}>
      <TileLayer url={OSM} />
      {conForma.map(l => (
        <Polygon key={l.id} positions={l.poligono}
          pathOptions={l.activo
            ? { color: l.color || '#fd7e14', fillColor: l.color || '#fd7e14', fillOpacity: 0.3, weight: 2 }
            : { color: GRIS, fillColor: GRIS, fillOpacity: 0.15, weight: 1.5, dashArray: '4 4' }} />
      ))}
      {gps && <CircleMarker center={[gps.lat, gps.lng]} radius={7}
        pathOptions={{ color: '#ffffff', fillColor: AZUL, fillOpacity: 1, weight: 3 }} />}
      <AjustarVista puntos={puntos} />
    </MapContainer>
  )
}

// ── Indicador de la ficha ────────────────────────────────────────────────────
function Indicador({ etiqueta, valor, detalle, detalleColor }) {
  return (
    <div className="p-3 px-4 d-flex flex-column gap-1" style={{ borderRight: `1px solid ${BORDE}` }}>
      <div style={{ fontSize: 11, letterSpacing: '.12em', color: GRIS, textTransform: 'uppercase' }}>{etiqueta}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: NAVY, lineHeight: 1 }}>{valor}</div>
      <div style={{ fontSize: 13, color: detalleColor || GRIS }}>{detalle}</div>
    </div>
  )
}

const Punto = ({ color }) => <span className="rounded-circle flex-shrink-0 d-inline-block" style={{ width: 10, height: 10, background: color }} />
const Estado = ({ activo, textoOn = 'Activa', textoOff = 'Inactiva' }) => (
  <span className="d-inline-flex align-items-center gap-2" style={{ fontSize: 14, fontWeight: 500, color: activo ? '#15803d' : GRIS }}>
    <Punto color={activo ? '#22c55e' : '#9aa7b8'} />{activo ? textoOn : textoOff}
  </span>
)

// ── Página ───────────────────────────────────────────────────────────────────
export default function AdminCamiones() {
  const { authFetch } = useAuth()

  const [camiones,    setCamiones]    = useState([])
  const [conductores, setConductores] = useState([])
  const [localidades, setLocalidades] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [guardando,   setGuardando]   = useState(false)

  const [seleccionado, setSeleccionado] = useState(null)   // id del camión de la ficha
  const [fichaAbierta, setFichaAbierta] = useState(false)  // la ficha solo se abre con "Gestionar"
  const [resumen,      setResumen]      = useState(null)
  const fichaRef = useRef(null)

  // Paneles de la ficha
  const [registrando,      setRegistrando]      = useState(false)
  const [formCamion,       setFormCamion]       = useState(formCamionVacio)
  const [editando,         setEditando]         = useState(false)
  const [formEdit,         setFormEdit]         = useState(formCamionVacio)
  const [asignando,        setAsignando]        = useState(false)
  const [conductorSel,     setConductorSel]     = useState('')
  const [creandoConductor, setCreandoConductor] = useState(false)
  const [formConductor,    setFormConductor]    = useState({ nombre: '', username: '', password: '', telefono: '' })
  const [verHistorial,     setVerHistorial]     = useState(false)
  const [tomando,          setTomando]          = useState(false)
  const [seleccion,        setSeleccion]        = useState([])
  const [nuevaRuta,        setNuevaRuta]        = useState(false)
  const [nuevoNombre,      setNuevoNombre]      = useState('')
  const [editandoZona,     setEditandoZona]     = useState(null)
  const [renombrando,      setRenombrando]      = useState(null)
  const [nombreTmp,        setNombreTmp]        = useState('')
  const [confirmandoBorrar, setConfirmandoBorrar] = useState(null)  // id de la ruta pendiente de confirmar
  const [confirmarCamion,   setConfirmarCamion]   = useState(null)  // 'desactivar' | 'eliminar' (confirmación en la ficha)

  // Si el servidor está reiniciando, el sondeo simplemente reintenta en la próxima vuelta
  async function cargar() {
    try {
      const [resCam, resCon, resLoc] = await Promise.all([
        authFetch('/api/camiones'), authFetch('/api/conductores'), authFetch('/api/localidades'),
      ])
      if (!resCam.ok || !resCon.ok || !resLoc.ok) return
      const [dataCam, dataCon, dataLoc] = await Promise.all([resCam.json(), resCon.json(), resLoc.json()])
      setCamiones(dataCam.camiones || [])
      setConductores(dataCon.conductores || [])
      setLocalidades(dataLoc.localidades || [])
      setLoading(false)
    } catch {
      /* sin conexión momentánea: se reintenta en el siguiente sondeo */
    }
  }

  async function cargarResumen(id) {
    if (!id) { setResumen(null); return }
    try {
      const res = await authFetch(`/api/camiones/${id}/resumen`)
      if (res.ok) setResumen(await res.json())
    } catch {
      /* idem */
    }
  }

  useEffect(() => {
    cargar()
    const t = setInterval(cargar, 5000)
    return () => clearInterval(t)
  }, [])

  // Camión seleccionado: el primero activo si no hay uno elegido
  useEffect(() => {
    if (camiones.length === 0) { setSeleccionado(null); return }
    if (!seleccionado || !camiones.some(c => c.id === seleccionado)) {
      setSeleccionado((camiones.find(c => c.activo) || camiones[0]).id)
    }
  }, [camiones]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!fichaAbierta) return
    cargarResumen(seleccionado)
    const t = setInterval(() => cargarResumen(seleccionado), 15000)
    return () => clearInterval(t)
  }, [seleccionado, fichaAbierta]) // eslint-disable-line react-hooks/exhaustive-deps

  // Al abrir la ficha, llevar la vista hasta ella
  useEffect(() => {
    if (fichaAbierta && fichaRef.current) fichaRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [fichaAbierta, seleccionado])

  function gestionar(id) {
    setSeleccionado(id); setFichaAbierta(true); cerrarPaneles()
  }
  function cerrarFicha() {
    setFichaAbierta(false); cerrarPaneles()
  }

  const cam = camiones.find(c => c.id === seleccionado) || null

  // Ruta libre = sin camión (pool) o desactivada: cualquier camión activo puede tomarla
  const rutasLibres  = useMemo(() => localidades.filter(l => l.camionId == null || !l.activo), [localidades])
  const libresAjenas = cam ? rutasLibres.filter(l => l.camionId !== cam.id) : []
  const misRutas     = cam ? localidades.filter(l => l.camionId === cam.id) : []
  const sinConductor = camiones.filter(c => c.activo && !c.conductor)
  const rutasDe      = id => localidades.filter(l => l.camionId === id)

  const referencias = localidades
    .filter(l => l.activo && l.id !== editandoZona && Array.isArray(l.poligono) && l.poligono.length >= 3)
    .map((l, i) => ({ placa: l.nombre, poligono: l.poligono, color: l.color || COLORES_ZONA[i % COLORES_ZONA.length] }))

  function conductoresDisponibles(camionId) {
    return conductores.filter(c => !c.camion || c.camion.id === camionId)
  }

  function cerrarPaneles() {
    setEditando(false); setAsignando(false); setCreandoConductor(false); setVerHistorial(false)
    setTomando(false); setSeleccion([]); setNuevaRuta(false); setNuevoNombre(''); setEditandoZona(null)
    setConfirmandoBorrar(null); setConfirmarCamion(null)
  }

  async function respuesta(res) {
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setError(d.message || 'No se pudo completar la acción'); return null }
    return d
  }

  // ── Camión ────────────────────────────────────────────────────────────────
  async function crearCamion(e) {
    e.preventDefault()
    setError(''); setGuardando(true)
    const d = await respuesta(await authFetch('/api/camiones', { method: 'POST', body: JSON.stringify(formCamion) }))
    setGuardando(false)
    if (!d) return
    setCamiones(prev => [...prev, d.camion])
    setFormCamion(formCamionVacio); setRegistrando(false)
    setSeleccionado(d.camion.id)
  }

  async function guardarEdicion() {
    setError(''); setGuardando(true)
    const d = await respuesta(await authFetch(`/api/camiones/${cam.id}`, { method: 'PUT', body: JSON.stringify(formEdit) }))
    setGuardando(false)
    if (!d) return
    setCamiones(prev => prev.map(c => c.id === cam.id ? d.camion : c))
    setEditando(false)
  }

  // Activar/desactivar (la confirmación de desactivar es una franja en la ficha, sin confirm() del navegador)
  async function cambiarActivo(camion) {
    const d = await respuesta(await authFetch(`/api/camiones/${camion.id}`, { method: 'PUT', body: JSON.stringify({ activo: !camion.activo }) }))
    setConfirmarCamion(null)
    if (d) { await cargar(); cargarResumen(camion.id) }
  }

  async function toggleRutaLibre(camion) {
    const d = await respuesta(await authFetch(`/api/camiones/${camion.id}`, { method: 'PUT', body: JSON.stringify({ rutaLibre: !camion.rutaLibre }) }))
    if (d) setCamiones(prev => prev.map(c => c.id === camion.id ? d.camion : c))
  }

  async function eliminar(camion) {
    const d = await respuesta(await authFetch(`/api/camiones/${camion.id}`, { method: 'DELETE' }))
    setConfirmarCamion(null)
    if (d) { setCamiones(prev => prev.filter(c => c.id !== camion.id)); setFichaAbierta(false) }
  }

  // ── Conductor ─────────────────────────────────────────────────────────────
  async function asignarConductor() {
    setGuardando(true)
    const d = await respuesta(await authFetch(`/api/camiones/${cam.id}/asignar`, {
      method: 'PATCH', body: JSON.stringify({ conductorId: conductorSel || null }),
    }))
    setGuardando(false)
    if (!d) return
    await cargar(); cargarResumen(cam.id)
    setAsignando(false); setConductorSel('')
  }

  async function crearConductor() {
    if (!formConductor.nombre || !formConductor.username || !formConductor.password) return
    setGuardando(true)
    const d = await respuesta(await authFetch('/api/conductores', {
      method: 'POST', body: JSON.stringify({ ...formConductor, camionId: cam.id }),
    }))
    setGuardando(false)
    if (!d) return
    await cargar(); cargarResumen(cam.id)
    setCreandoConductor(false); setFormConductor({ nombre: '', username: '', password: '', telefono: '' })
  }

  // ── Rutas (localidades) ───────────────────────────────────────────────────
  const colorParaNueva = () => COLORES_ZONA[localidades.length % COLORES_ZONA.length]
  const actualizarLoc = loc => setLocalidades(prev => prev.map(l => l.id === loc.id ? loc : l))

  const rutas = {
    crear: async (nombre, poligono) => {
      const d = await respuesta(await authFetch('/api/localidades', {
        method: 'POST', body: JSON.stringify({ nombre, poligono, camionId: cam.id, color: colorParaNueva() }),
      }))
      if (d) { setLocalidades(prev => [...prev, d.localidad]); cargarResumen(cam.id) }
      return !!d
    },
    renombrar: async (id, nombre) => {
      const d = await respuesta(await authFetch(`/api/localidades/${id}`, { method: 'PUT', body: JSON.stringify({ nombre }) }))
      if (d) actualizarLoc(d.localidad)
    },
    toggle: async (loc) => {
      const d = await respuesta(await authFetch(`/api/localidades/${loc.id}`, { method: 'PUT', body: JSON.stringify({ activo: !loc.activo }) }))
      if (d) { actualizarLoc(d.localidad); cargarResumen(cam.id) }
    },
    // Un camión toma una ruta libre (sin camión o desactivada): se asigna y se activa
    tomar: async (id) => {
      const d = await respuesta(await authFetch(`/api/localidades/${id}/tomar`, { method: 'PATCH', body: JSON.stringify({ camionId: cam.id }) }))
      if (d) actualizarLoc(d.localidad)
      return !!d
    },
    editarZona: async (id, poligono) => {
      const d = await respuesta(await authFetch(`/api/localidades/${id}/poligono`, { method: 'PATCH', body: JSON.stringify({ poligono }) }))
      if (d) actualizarLoc(d.localidad)
      return !!d
    },
    // Sin confirm() del navegador (Chrome puede bloquearlo): la confirmación es un botón en la propia fila
    borrar: async (loc) => {
      const d = await respuesta(await authFetch(`/api/localidades/${loc.id}`, { method: 'DELETE' }))
      setConfirmandoBorrar(null)
      if (d) { setLocalidades(prev => prev.filter(l => l.id !== loc.id)); cargarResumen(cam.id) }
    },
  }

  if (loading) return (
    <div className="d-flex justify-content-center py-5"><div className="spinner-border" style={{ color: AZUL }} /></div>
  )

  const locEnEdicion = misRutas.find(l => l.id === editandoZona)
  const gps = resumen?.ultimaSenal && resumen.ultimaSenal.lat != null ? resumen.ultimaSenal : null

  return (
    <div className="d-flex flex-column gap-4">

      {/* ── Cabecera ─────────────────────────────────────────── */}
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-3">
        <div>
          <div style={{ fontSize: 12, letterSpacing: '.14em', color: GRIS, textTransform: 'uppercase' }}>Control de distribución</div>
          <h3 className="fw-bold mb-1" style={{ color: NAVY }}>Gestión de flota</h3>
          <div className="text-muted small">Vehículos, conductores y rutas de reparto.</div>
        </div>
        <button className="btn fw-semibold text-white" style={{ background: AZUL, padding: '10px 18px', borderRadius: 10 }}
          onClick={() => { setRegistrando(r => !r); setFormCamion(formCamionVacio) }}>
          <i className={`bi ${registrando ? 'bi-x-lg' : 'bi-plus-lg'} me-2`}></i>{registrando ? 'Cancelar' : 'Registrar camión'}
        </button>
      </div>

      {/* ── Pestañas ─────────────────────────────────────────── */}
      <div className="d-flex gap-4" style={{ borderBottom: `1px solid ${BORDE}`, fontSize: 15 }}>
        <Link to="/admin/conductores" className="pb-2 text-decoration-none fw-medium" style={{ color: GRIS }}>Conductores</Link>
        <span className="pb-2 fw-semibold" style={{ color: AZUL, borderBottom: `2px solid ${AZUL}` }}>Camiones</span>
        <Link to="/admin/logistica/rutas" className="pb-2 text-decoration-none fw-medium" style={{ color: GRIS }}>Rutas</Link>
      </div>

      {error && (
        <div className="alert alert-danger py-2 small d-flex justify-content-between align-items-center mb-0">
          {error}<button className="btn-close btn-sm" onClick={() => setError('')}></button>
        </div>
      )}

      {/* ── Registrar camión ─────────────────────────────────── */}
      {registrando && (
        <form onSubmit={crearCamion} className="bg-white rounded-3 p-3" style={{ border: `1px solid ${BORDE}` }}>
          <div className="fw-semibold mb-2" style={{ color: NAVY }}><i className="bi bi-truck-front me-2" style={{ color: AZUL }}></i>Nuevo camión</div>
          <div className="row g-2">
            {[['placa', 'Placa *', true], ['marca', 'Marca *', true], ['modelo', 'Modelo', false], ['color', 'Color', false]].map(([k, ph, req]) => (
              <div className="col-6 col-md-2" key={k}>
                <input className="form-control form-control-sm" placeholder={ph} required={req}
                  value={formCamion[k]} onChange={e => setFormCamion(f => ({ ...f, [k]: e.target.value }))} />
              </div>
            ))}
            <div className="col-6 col-md-2">
              <input type="number" className="form-control form-control-sm" placeholder="Año"
                value={formCamion.anio} onChange={e => setFormCamion(f => ({ ...f, anio: e.target.value }))} />
            </div>
            <div className="col-6 col-md-2">
              <button type="submit" className="btn btn-sm w-100 fw-semibold text-white" style={{ background: AZUL }} disabled={guardando}>
                <i className="bi bi-check-lg me-1"></i>Crear
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ── Aviso ────────────────────────────────────────────── */}
      {(rutasLibres.length > 0 || sinConductor.length > 0) && (
        <div className="bg-white rounded-3 px-3 py-2 d-flex flex-wrap align-items-center justify-content-between gap-2"
          style={{ border: `1px solid ${BORDE}`, fontSize: 14 }}>
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-exclamation-circle" style={{ color: AMBAR, fontSize: 18 }}></i>
            <span>
              {rutasLibres.length > 0 && <><strong>{rutasLibres.length} ruta{rutasLibres.length !== 1 ? 's' : ''} libre{rutasLibres.length !== 1 ? 's' : ''}</strong> espera{rutasLibres.length === 1 ? '' : 'n'} camión
                {' '}({rutasLibres.filter(l => l.camionId == null).length} sin asignar, {rutasLibres.filter(l => l.camionId != null).length} desactivada{rutasLibres.filter(l => l.camionId != null).length !== 1 ? 's' : ''}).</>}
              {sinConductor.length > 0 && <> {sinConductor.map(c => c.placa).join(', ')} sin conductor.</>}
            </span>
          </div>
          {rutasLibres.length > 0 && cam?.activo && (
            <button className="btn btn-link btn-sm fw-semibold p-0 text-decoration-none" style={{ color: AZUL }}
              onClick={() => { gestionar(cam.id); setTomando(true) }}>Ver rutas libres</button>
          )}
        </div>
      )}

      {/* ── Registro de vehículos ────────────────────────────── */}
      <div className="bg-white rounded-3 overflow-hidden" style={{ border: `1px solid ${BORDE}` }}>
        <div className="d-flex align-items-center justify-content-between px-3 py-3" style={{ borderBottom: `1px solid ${BORDE}` }}>
          <div className="fw-semibold" style={{ color: NAVY, fontSize: 17 }}>Registro de vehículos</div>
          <div className="text-muted small">{camiones.length} vehículo{camiones.length !== 1 ? 's' : ''}</div>
        </div>
        {camiones.length === 0 ? (
          <div className="text-center text-muted py-5"><i className="bi bi-truck fs-1 d-block mb-2"></i>No hay camiones registrados</div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0" style={{ fontSize: 14 }}>
              <thead style={{ background: '#f8fafc', fontSize: 11, letterSpacing: '.1em', color: GRIS, textTransform: 'uppercase' }}>
                <tr><th className="ps-3 fw-medium">Vehículo</th><th className="fw-medium">Conductor</th><th className="fw-medium">Cobertura</th><th className="fw-medium">Estado</th><th className="pe-3 fw-medium">Detalle</th></tr>
              </thead>
              <tbody>
                {camiones.map(c => {
                  const r = rutasDe(c.id), act = r.filter(l => l.activo).length
                  const sel = fichaAbierta && c.id === seleccionado
                  return (
                    <tr key={c.id} role="button" onClick={() => gestionar(c.id)} style={{ background: sel ? '#eef4fc' : undefined }}>
                      <td className="ps-3">
                        <div className="fw-semibold" style={{ color: c.activo ? NAVY : GRIS, fontSize: 16 }}>{c.placa}</div>
                        <div className="text-muted small">{c.marca} {c.modelo || ''}{c.anio ? ` · ${c.anio}` : ''}</div>
                      </td>
                      <td>{c.conductor ? c.conductor.nombre : <span style={{ color: c.activo ? AMBAR : GRIS }}>{c.activo ? 'Sin conductor' : '—'}</span>}</td>
                      <td>
                        {r.length === 0 ? <span className="text-muted">Sin rutas</span> : (
                          <><div className="fw-medium">{act} ruta{act !== 1 ? 's' : ''} activa{act !== 1 ? 's' : ''}</div>
                          {r.length - act > 0 && <div className="text-muted small">{r.length - act} desactivada{r.length - act !== 1 ? 's' : ''}</div>}</>
                        )}
                      </td>
                      <td><Estado activo={c.activo} textoOn="Activo" textoOff="Inactivo" /></td>
                      <td className="pe-3">
                        <button className="btn btn-sm fw-semibold" style={sel
                          ? { border: '1px solid #c9d6ea', background: '#ffffff', color: NAVY }
                          : { border: `1px solid ${AZUL}`, background: '#ffffff', color: AZUL }}>
                          <i className={`bi ${sel ? 'bi-folder2-open' : 'bi-sliders'} me-1`}></i>{sel ? 'Ficha abierta' : 'Gestionar'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Ficha operativa (solo al pulsar "Gestionar") ─────── */}
      {cam && fichaAbierta && (
        <div ref={fichaRef} className="bg-white rounded-3 overflow-hidden" style={{ border: `1px solid ${BORDE}`, scrollMarginTop: 16 }}>

          {/* Cabecera */}
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 p-3 px-4" style={{ background: NAVY, color: '#fff' }}>
            <div className="d-flex align-items-center gap-3">
              <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: 52, height: 52, background: '#1f3766' }}>
                <i className="bi bi-truck-front-fill" style={{ fontSize: 24 }}></i>
              </div>
              <div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: '.04em' }}>{cam.placa}</span>
                  <span className="rounded-pill px-2 py-1 d-inline-flex align-items-center gap-1"
                    style={{ background: cam.activo ? '#123d2a' : '#3a4256', color: cam.activo ? '#4ade80' : '#c7cfdb', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                    <Punto color={cam.activo ? '#4ade80' : '#9aa7b8'} />{cam.activo ? 'Operativo' : 'Inactivo'}
                  </span>
                </div>
                {editando ? (
                  <div className="d-flex flex-wrap gap-1 mt-1">
                    {[['marca', 'Marca'], ['modelo', 'Modelo'], ['color', 'Color']].map(([k, ph]) => (
                      <input key={k} className="form-control form-control-sm" style={{ width: 90 }} placeholder={ph}
                        value={formEdit[k]} onChange={e => setFormEdit(f => ({ ...f, [k]: e.target.value }))} />
                    ))}
                    <input type="number" className="form-control form-control-sm" style={{ width: 80 }} placeholder="Año"
                      value={formEdit.anio} onChange={e => setFormEdit(f => ({ ...f, anio: e.target.value }))} />
                    <button className="btn btn-sm btn-success" onClick={guardarEdicion} disabled={guardando}><i className="bi bi-check-lg"></i></button>
                    <button className="btn btn-sm btn-outline-light" onClick={() => setEditando(false)}><i className="bi bi-x-lg"></i></button>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: '#b7c5dc' }}>
                    {cam.marca} {cam.modelo || ''}{cam.color ? ` · ${cam.color}` : ''}{cam.anio ? ` · ${cam.anio}` : ''}
                    {cam.rutaLibre ? ' · Ruta libre activada (recibe pedidos fuera de zona)' : ''}
                  </div>
                )}
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button className="btn btn-sm text-white fw-semibold" style={{ border: '1px solid #3a5285' }}
                onClick={() => { cerrarPaneles(); setEditando(true); setFormEdit({ marca: cam.marca, modelo: cam.modelo || '', color: cam.color || '', anio: cam.anio || '' }) }}>
                Editar datos
              </button>
              <button className="btn btn-sm text-white fw-semibold" style={{ border: '1px solid #3a5285' }}
                onClick={() => { const v = !verHistorial; cerrarPaneles(); setVerHistorial(v) }}>Historial</button>
              <button className="btn btn-sm fw-semibold" style={{ background: '#fff', color: NAVY }}
                onClick={() => cam.activo ? setConfirmarCamion('desactivar') : cambiarActivo(cam)}>
                {cam.activo ? 'Desactivar camión' : 'Activar camión'}
              </button>
              {!cam.conductor && (
                <button className="btn btn-sm text-white" style={{ border: '1px solid #3a5285' }} title="Eliminar camión" onClick={() => setConfirmarCamion('eliminar')}>
                  <i className="bi bi-trash3"></i>
                </button>
              )}
              <button className="btn btn-sm text-white" style={{ border: '1px solid #3a5285' }} title="Cerrar ficha" onClick={cerrarFicha}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
          </div>

          {/* Confirmación en la propia ficha (desactivar / eliminar) */}
          {confirmarCamion && (
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 px-4 py-2"
              style={{ background: '#fff4e5', borderBottom: `1px solid ${BORDE}`, fontSize: 14 }}>
              <div>
                {confirmarCamion === 'desactivar' ? (
                  <>Desactivar <strong>{cam.placa}</strong>:{' '}
                    {cam.conductor ? <>el chofer <strong>{cam.conductor.nombre}</strong> quedará libre; </> : null}
                    {misRutas.length > 0 ? <>sus <strong>{misRutas.length}</strong> ruta{misRutas.length !== 1 ? 's' : ''} pasarán a rutas libres; </> : null}
                    dejará de recibir pedidos.</>
                ) : (
                  <>Eliminar <strong>{cam.placa}</strong> definitivamente. Esta acción no se puede deshacer.</>
                )}
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-danger fw-semibold"
                  onClick={() => confirmarCamion === 'desactivar' ? cambiarActivo(cam) : eliminar(cam)}>
                  Sí, {confirmarCamion === 'desactivar' ? 'desactivar' : 'eliminar'}
                </button>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setConfirmarCamion(null)}>No</button>
              </div>
            </div>
          )}

          {/* Indicadores */}
          <div className="row g-0" style={{ borderBottom: `1px solid ${BORDE}` }}>
            <div className="col-6 col-lg-3"><Indicador etiqueta="Rutas activas" valor={resumen ? resumen.rutasActivas : '—'}
              detalle={resumen ? `${resumen.rutasInactivas} desactivada${resumen.rutasInactivas !== 1 ? 's' : ''}` : ''} /></div>
            <div className="col-6 col-lg-3"><Indicador etiqueta="Paradas de hoy" valor={resumen ? resumen.paradasHoy.total : '—'}
              detalle={!resumen ? '' : !cam.conductor ? 'Sin conductor asignado' : resumen.paradasHoy.total === 0 ? 'Sin ruta para hoy'
                : `${resumen.paradasHoy.entregadas} entregada${resumen.paradasHoy.entregadas !== 1 ? 's' : ''} · ${resumen.paradasHoy.pendientes} pendiente${resumen.paradasHoy.pendientes !== 1 ? 's' : ''}${resumen.paradasHoy.noEntregadas ? ` · ${resumen.paradasHoy.noEntregadas} no entregada${resumen.paradasHoy.noEntregadas !== 1 ? 's' : ''}` : ''}`}
              detalleColor={resumen?.paradasHoy.entregadas ? '#15803d' : undefined} /></div>
            <div className="col-6 col-lg-3"><Indicador etiqueta="Ventas exprés hoy" valor={resumen ? resumen.ventasExpresHoy.cantidad : '—'}
              detalle={resumen ? `${money(resumen.ventasExpresHoy.total)} registrados` : ''} /></div>
            <div className="col-6 col-lg-3"><Indicador etiqueta="Última señal GPS" valor={resumen?.ultimaSenal ? hora(resumen.ultimaSenal.at) : '—'}
              detalle={resumen?.ultimaSenal ? haceCuanto(resumen.ultimaSenal.at) : (cam.conductor ? 'Sin señal registrada' : 'Sin conductor asignado')} /></div>
          </div>

          <div className="row g-0">
            {/* Columna izquierda: conductor + cobertura */}
            <div className="col-12 col-lg-4 p-3 px-4 d-flex flex-column gap-4" style={{ borderRight: `1px solid ${BORDE}` }}>
              <div className="d-flex flex-column gap-2">
                <div style={{ fontSize: 11, letterSpacing: '.12em', color: GRIS, textTransform: 'uppercase' }}>Conductor responsable</div>
                {cam.conductor ? (
                  <div className="d-flex align-items-center gap-3">
                    <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                      style={{ width: 46, height: 46, background: AZUL, fontSize: 15 }}>{iniciales(cam.conductor.nombre)}</div>
                    <div>
                      <div className="fw-semibold" style={{ fontSize: 16 }}>{cam.conductor.nombre}</div>
                      <div className="text-muted small">usuario {cam.conductor.username}{resumen?.rutaHoy ? ` · en ruta desde ${hora(resumen.rutaHoy.creadoEn)}` : ''}</div>
                    </div>
                  </div>
                ) : (
                  <div className="fw-semibold" style={{ color: AMBAR, fontSize: 16 }}>Sin asignar</div>
                )}
                <div className="d-flex flex-wrap gap-2">
                  <button className="btn btn-sm fw-semibold bg-white" style={{ border: '1px solid #c9d6ea', color: NAVY }}
                    onClick={() => { const v = !asignando; cerrarPaneles(); setAsignando(v); setConductorSel(cam.conductor?.id?.toString() || '') }}>
                    <i className="bi bi-person-check me-1"></i>{cam.conductor ? 'Reasignar' : 'Asignar conductor'}
                  </button>
                  {!cam.conductor && (
                    <button className="btn btn-sm fw-semibold bg-white" style={{ border: '1px solid #c9d6ea', color: NAVY }}
                      onClick={() => { const v = !creandoConductor; cerrarPaneles(); setCreandoConductor(v); setFormConductor({ nombre: '', username: '', password: '', telefono: '' }) }}>
                      <i className="bi bi-person-plus me-1"></i>Nuevo conductor
                    </button>
                  )}
                </div>

                {asignando && (
                  <div className="d-flex gap-2 flex-wrap">
                    <select className="form-select form-select-sm flex-grow-1" value={conductorSel} onChange={e => setConductorSel(e.target.value)}>
                      <option value="">— Sin conductor —</option>
                      {conductoresDisponibles(cam.id).map(c => (
                        <option key={c.id} value={c.id}>{c.nombre} ({c.username}){c.camion ? ' ← actual' : ''}</option>
                      ))}
                    </select>
                    <button className="btn btn-sm text-white" style={{ background: AZUL }} onClick={asignarConductor} disabled={guardando}>Confirmar</button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => setAsignando(false)}>Cancelar</button>
                  </div>
                )}

                {creandoConductor && (
                  <div className="rounded-3 p-3 d-flex flex-column gap-2" style={{ background: '#f0f7ff' }}>
                    <div className="fw-semibold small" style={{ color: AZUL }}><i className="bi bi-person-plus-fill me-1"></i>Nuevo conductor para {cam.placa}</div>
                    <input className="form-control form-control-sm" placeholder="Nombre completo *" value={formConductor.nombre}
                      onChange={e => setFormConductor(f => ({ ...f, nombre: e.target.value }))} />
                    <input className="form-control form-control-sm" placeholder="Usuario *" value={formConductor.username}
                      onChange={e => setFormConductor(f => ({ ...f, username: e.target.value }))} />
                    <input type="password" className="form-control form-control-sm" placeholder="Contraseña *" value={formConductor.password}
                      onChange={e => setFormConductor(f => ({ ...f, password: e.target.value }))} />
                    <input type="tel" className="form-control form-control-sm" placeholder="Celular (opcional)" value={formConductor.telefono}
                      onChange={e => setFormConductor(f => ({ ...f, telefono: e.target.value }))} />
                    <div className="d-flex gap-2">
                      <button className="btn btn-sm text-white fw-semibold" style={{ background: AZUL }} onClick={crearConductor} disabled={guardando}>
                        {guardando ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="bi bi-check-lg me-1"></i>}Crear conductor
                      </button>
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => setCreandoConductor(false)}>Cancelar</button>
                    </div>
                  </div>
                )}

                {verHistorial && (
                  <div className="rounded-3 p-3" style={{ background: '#f8fafb', fontSize: 13 }}>
                    <div className="fw-semibold mb-2" style={{ color: NAVY }}>Historial de choferes</div>
                    {(resumen?.historial || []).length === 0 ? <div className="text-muted">Sin registros.</div> : (
                      (resumen?.historial || []).map((h, i) => (
                        <div key={i} className="d-flex justify-content-between gap-2 py-1" style={{ borderTop: i ? `1px solid ${BORDE}` : 'none' }}>
                          <span>{h.conductorNombre}</span>
                          <span className="text-muted text-nowrap">{fechaCorta(h.asignadoEn)}{h.removidoEn ? ` → ${fechaCorta(h.removidoEn)}` : ' · actual'}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="d-flex flex-column gap-2">
                <div className="d-flex align-items-center justify-content-between">
                  <div style={{ fontSize: 11, letterSpacing: '.12em', color: GRIS, textTransform: 'uppercase' }}>Cobertura</div>
                  <Link to="/admin/logistica/rutas" className="small fw-semibold text-decoration-none" style={{ color: AZUL }}>Ampliar mapa</Link>
                </div>
                {misRutas.length === 0 && !gps ? (
                  <div className="text-center text-muted small py-4 rounded-3" style={{ background: '#f8fafb', border: `1px solid ${BORDE}` }}>
                    <i className="bi bi-geo d-block fs-4 mb-1"></i>Sin rutas dibujadas
                  </div>
                ) : (
                  <MiniMapa localidades={misRutas} gps={gps} />
                )}
                <div className="d-flex flex-column gap-1" style={{ fontSize: 13 }}>
                  {misRutas.map(l => (
                    <div key={l.id} className="d-flex align-items-center gap-2">
                      <Punto color={l.activo ? (l.color || '#fd7e14') : '#b4bcc8'} />
                      <span style={{ color: l.activo ? undefined : GRIS }}>{l.nombre}</span>
                      <span className="ms-auto text-muted">{l.activo ? 'activa' : 'desactivada'}</span>
                    </div>
                  ))}
                  {gps && <div className="d-flex align-items-center gap-2"><Punto color={AZUL} /><span>Camión ahora</span><span className="ms-auto text-muted">{haceCuanto(gps.at)}</span></div>}
                </div>
                <div className="form-check form-switch d-flex align-items-center gap-2 mt-1 ps-0" title="Los pedidos que no caen en ninguna zona se asignan a este camión">
                  <input className="form-check-input ms-0" type="checkbox" role="switch" checked={!!cam.rutaLibre} style={{ cursor: 'pointer' }} onChange={() => toggleRutaLibre(cam)} />
                  <span className="small fw-semibold" style={{ color: cam.rutaLibre ? '#7c3aed' : GRIS }}><i className="bi bi-compass me-1"></i>Ruta libre (pedidos fuera de zona)</span>
                </div>
              </div>
            </div>

            {/* Columna derecha: rutas + actividad */}
            <div className="col-12 col-lg-8 p-3 px-4 d-flex flex-column gap-4">
              <div className="d-flex flex-column gap-2">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                  <div className="fw-semibold" style={{ color: NAVY, fontSize: 17 }}>Rutas de reparto</div>
                  <div className="d-flex gap-2">
                    {cam.activo && libresAjenas.length > 0 && (
                      <button className="btn btn-sm fw-semibold" style={{ border: '1px solid #f2c063', background: '#fff8ea', color: AMBAR }}
                        onClick={() => { const v = !tomando; cerrarPaneles(); setTomando(v) }}>
                        <i className="bi bi-inbox me-1"></i>Tomar ruta libre
                        <span className="badge rounded-pill ms-1" style={{ background: '#f2c063', color: '#5b3406' }}>{libresAjenas.length}</span>
                      </button>
                    )}
                    {cam.activo && (
                      <button className="btn btn-sm text-white fw-semibold" style={{ background: AZUL }}
                        onClick={() => { const v = !nuevaRuta; cerrarPaneles(); setNuevaRuta(v) }}>
                        <i className="bi bi-plus-lg me-1"></i>Nueva ruta
                      </button>
                    )}
                  </div>
                </div>

                {tomando && (
                  <div className="rounded-3 p-3 d-flex flex-column gap-2" style={{ border: '1px solid #f2c063', background: '#fffbf2' }}>
                    <div className="d-flex justify-content-between flex-wrap gap-2">
                      <div className="fw-semibold" style={{ color: '#7a4a0b' }}>Rutas libres para {cam.placa}</div>
                      <div className="small" style={{ color: '#8a6a3a' }}>marca una o varias y confirma</div>
                    </div>
                    {libresAjenas.map(l => (
                      <label key={l.id} className="d-flex align-items-center gap-2 py-1 small" style={{ cursor: 'pointer', borderTop: '1px solid #f1e3c6' }}>
                        <input type="checkbox" className="form-check-input m-0" checked={seleccion.includes(l.id)}
                          onChange={e => setSeleccion(s => e.target.checked ? [...s, l.id] : s.filter(x => x !== l.id))} />
                        <Punto color={l.color || '#fd7e14'} />
                        <span className="fw-semibold">{l.nombre}</span>
                        <span className={`badge ${l.camionId ? 'bg-secondary' : 'bg-warning text-dark'}`} style={{ fontSize: '0.65rem' }}>
                          {l.camionId ? `inactiva · era de ${l.camion?.placa ?? 'otro camión'}` : 'sin camión'}
                        </span>
                      </label>
                    ))}
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                      <div className="small" style={{ color: '#8a6a3a' }}>Al confirmar quedan activas en este camión. Si una se cruza con una ruta activa de otro camión, el sistema la rechaza y te dice cuál.</div>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => { setTomando(false); setSeleccion([]) }}>Cancelar</button>
                        <button className="btn btn-sm text-white fw-semibold" style={{ background: AZUL }} disabled={seleccion.length === 0}
                          onClick={async () => { for (const id of seleccion) await rutas.tomar(id); setSeleccion([]); setTomando(false); cargarResumen(cam.id) }}>
                          <i className="bi bi-check-lg me-1"></i>Asignar {seleccion.length || ''} a {cam.placa}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {nuevaRuta && (
                  <div className="rounded-3 p-3" style={{ background: '#f0f7ff' }}>
                    <div className="fw-semibold small mb-2" style={{ color: AZUL }}><i className="bi bi-plus-circle me-1"></i>Nueva ruta para {cam.placa}</div>
                    <input className="form-control form-control-sm mb-1" placeholder="Nombre de la ruta * (ej: RUTA CENTRO L-M-V)"
                      value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} />
                    <EditorPoligono otrosPoligonos={referencias} nombreZona={nuevoNombre.trim()}
                      onGuardar={async coords => {
                        if (!nuevoNombre.trim()) { alert('Ponle un nombre a la ruta'); return }
                        if (await rutas.crear(nuevoNombre.trim(), coords)) { setNuevoNombre(''); setNuevaRuta(false) }
                      }}
                      onCancelar={() => { setNuevaRuta(false); setNuevoNombre('') }} />
                  </div>
                )}

                <div className="rounded-3 overflow-hidden" style={{ border: `1px solid ${BORDE}` }}>
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0" style={{ fontSize: 14 }}>
                      <thead style={{ background: '#f8fafc', fontSize: 11, letterSpacing: '.1em', color: GRIS, textTransform: 'uppercase' }}>
                        <tr><th className="ps-3 fw-medium">Ruta</th><th className="fw-medium">Estado</th><th className="pe-3 fw-medium text-end">Acciones</th></tr>
                      </thead>
                      <tbody>
                        {misRutas.length === 0 && (
                          <tr><td colSpan={3} className="text-center text-muted py-4">Sin rutas. Crea una o toma una ruta libre.</td></tr>
                        )}
                        {misRutas.map(l => (
                          <tr key={l.id}>
                            <td className="ps-3">
                              <div className="d-flex align-items-center gap-2">
                                <Punto color={l.activo ? (l.color || '#fd7e14') : '#b4bcc8'} />
                                {renombrando === l.id ? (
                                  <input className="form-control form-control-sm" style={{ maxWidth: 240 }} value={nombreTmp} autoFocus
                                    onChange={e => setNombreTmp(e.target.value)}
                                    onBlur={() => { const n = nombreTmp.trim(); if (n && n !== l.nombre) rutas.renombrar(l.id, n); setRenombrando(null) }}
                                    onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setRenombrando(null) }} />
                                ) : (
                                  <div>
                                    <div className="fw-medium" role="button" title="Clic para renombrar" style={{ color: l.activo ? undefined : GRIS }}
                                      onClick={() => { setRenombrando(l.id); setNombreTmp(l.nombre) }}>{l.nombre}</div>
                                    <div className="text-muted" style={{ fontSize: 12 }}>
                                      {Array.isArray(l.poligono) ? `${l.poligono.length} puntos` : 'sin dibujo'}{!l.activo ? ' · libre para otro camión' : ''}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td><Estado activo={l.activo} /></td>
                            <td className="pe-3 text-end text-nowrap">
                              {confirmandoBorrar === l.id ? (
                                <span className="d-inline-flex align-items-center gap-1 small">
                                  <span className="text-danger fw-semibold">¿Borrar "{l.nombre}"?</span>
                                  <button className="btn btn-sm btn-danger py-0 px-2" onClick={() => rutas.borrar(l)}>Sí, borrar</button>
                                  <button className="btn btn-sm btn-outline-secondary py-0 px-2" onClick={() => setConfirmandoBorrar(null)}>No</button>
                                </span>
                              ) : (
                                <>
                                  <button className="btn btn-link btn-sm fw-semibold text-decoration-none px-1" style={{ color: AZUL }}
                                    onClick={() => { cerrarPaneles(); setEditandoZona(l.id) }}>Editar zona</button>
                                  <button className="btn btn-link btn-sm fw-semibold text-decoration-none px-1" style={{ color: l.activo ? GRIS : AZUL }}
                                    onClick={() => rutas.toggle(l)}>{l.activo ? 'Desactivar' : 'Reactivar'}</button>
                                  <button className="btn btn-link btn-sm fw-semibold text-decoration-none px-1 text-danger" onClick={() => setConfirmandoBorrar(l.id)}>Borrar</button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {locEnEdicion && (
                  <div className="rounded-3 p-3" style={{ background: '#f0f7ff' }}>
                    <div className="fw-semibold small mb-1" style={{ color: AZUL }}><i className="bi bi-pentagon me-1"></i>Editar zona de “{locEnEdicion.nombre}”</div>
                    <EditorPoligono poligonoInicial={locEnEdicion.poligono} otrosPoligonos={referencias}
                      nombreZona={locEnEdicion.nombre} zonaActiva={locEnEdicion.activo}
                      onGuardar={async coords => { if (await rutas.editarZona(locEnEdicion.id, coords)) setEditandoZona(null) }}
                      onCancelar={() => setEditandoZona(null)} />
                  </div>
                )}
              </div>

              <div className="d-flex flex-column gap-2">
                <div className="fw-semibold" style={{ color: NAVY, fontSize: 17 }}>Actividad reciente</div>
                {(resumen?.actividad || []).length === 0 ? (
                  <div className="text-muted small">Sin actividad registrada todavía.</div>
                ) : (
                  <div className="d-flex flex-column">
                    {resumen.actividad.map((a, i) => (
                      <div key={i} className="d-flex gap-3 py-2" style={{ borderTop: `1px solid ${BORDE}`, fontSize: 14 }}>
                        <div className="text-muted flex-shrink-0" style={{ width: 92, fontSize: 12, paddingTop: 2 }}>{fechaCorta(a.cuando)}</div>
                        <div>{a.texto}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
