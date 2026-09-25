import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { MapContainer, TileLayer, Polygon, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import EditorPoligono, { PUYO, COLORES_ZONA } from '../../components/EditorPoligono'

const colorDe = (loc, i) => loc.color || COLORES_ZONA[i % COLORES_ZONA.length]

// Encuadra el mapa general para que se vean todas las rutas activas
function AjustarVista({ poligonos }) {
  const map = useMap()
  useEffect(() => {
    const puntos = poligonos.flat()
    if (puntos.length >= 3) {
      try { map.fitBounds(L.latLngBounds(puntos), { padding: [30, 30] }) } catch { /* polígono corrupto: se ignora */ }
    }
  }, [map, poligonos.length])
  return null
}

export default function AdminRutas() {
  const { authFetch } = useAuth()
  const [localidades, setLocalidades] = useState([])
  const [camiones,    setCamiones]    = useState([])
  const [cargando,    setCargando]    = useState(true)
  const [aviso,       setAviso]       = useState(null)   // { tipo: 'error' | 'ok', texto }
  const [creando,     setCreando]     = useState(false)
  const [nuevo,       setNuevo]       = useState({ nombre: '', camionId: '' })
  const [editando,    setEditando]    = useState(null)   // id de la ruta cuyo mapa está abierto

  useEffect(() => {
    (async () => {
      const [rl, rc] = await Promise.all([authFetch('/api/localidades'), authFetch('/api/camiones')])
      const [dl, dc] = await Promise.all([rl.json(), rc.json()])
      if (rl.ok) setLocalidades(dl.localidades)
      if (rc.ok) setCamiones(dc.camiones.filter(c => c.activo))
      setCargando(false)
    })()
  }, [])

  function avisar(tipo, texto) {
    setAviso({ tipo, texto })
    if (tipo === 'ok') setTimeout(() => setAviso(a => (a?.texto === texto ? null : a)), 4000)
  }

  // Lee el mensaje del servidor (p. ej. el 409 de cruce de rutas) y lo muestra
  async function fallo(res) {
    const d = await res.json().catch(() => ({}))
    avisar('error', d.message || 'No se pudo completar la operación')
    return null
  }

  const acciones = {
    crear: async (coords) => {
      if (!nuevo.nombre.trim()) { avisar('error', 'Ponle un nombre a la ruta'); return }
      const res = await authFetch('/api/localidades', {
        method: 'POST',
        body: JSON.stringify({
          nombre: nuevo.nombre.trim(),
          poligono: coords,
          camionId: nuevo.camionId || null,
          color: COLORES_ZONA[localidades.length % COLORES_ZONA.length],
        }),
      })
      if (!res.ok) return fallo(res)
      const d = await res.json()
      setLocalidades(prev => [...prev, d.localidad])
      setNuevo({ nombre: '', camionId: '' }); setCreando(false)
      avisar('ok', `Ruta "${d.localidad.nombre}" creada`)
    },
    renombrar: async (id, nombre) => {
      const res = await authFetch(`/api/localidades/${id}`, { method: 'PUT', body: JSON.stringify({ nombre }) })
      if (!res.ok) return fallo(res)
      const d = await res.json()
      setLocalidades(prev => prev.map(l => l.id === id ? d.localidad : l))
    },
    toggle: async (loc) => {
      const res = await authFetch(`/api/localidades/${loc.id}`, { method: 'PUT', body: JSON.stringify({ activo: !loc.activo }) })
      if (!res.ok) return fallo(res)
      const d = await res.json()
      setLocalidades(prev => prev.map(l => l.id === loc.id ? d.localidad : l))
    },
    reasignar: async (id, camionId) => {
      const res = await authFetch(`/api/localidades/${id}/asignar`, { method: 'PATCH', body: JSON.stringify({ camionId }) })
      if (!res.ok) return fallo(res)
      const d = await res.json()
      setLocalidades(prev => prev.map(l => l.id === id ? d.localidad : l))
      avisar('ok', camionId ? 'Ruta asignada' : 'Ruta enviada al pool sin asignar')
    },
    editarZona: async (id, poligono) => {
      const res = await authFetch(`/api/localidades/${id}/poligono`, { method: 'PATCH', body: JSON.stringify({ poligono }) })
      if (!res.ok) return fallo(res)
      const d = await res.json()
      setLocalidades(prev => prev.map(l => l.id === id ? d.localidad : l))
      setEditando(null)
      avisar('ok', 'Zona actualizada')
    },
    // La confirmación es un botón en la fila (sin confirm() del navegador, que Chrome puede bloquear)
    borrar: async (id) => {
      const res = await authFetch(`/api/localidades/${id}`, { method: 'DELETE' })
      if (!res.ok) return fallo(res)
      setLocalidades(prev => prev.filter(l => l.id !== id))
      if (editando === id) setEditando(null)
    },
  }

  const activasConMapa = localidades.filter(l => l.activo && Array.isArray(l.poligono) && l.poligono.length >= 3)
  const rutaEnEdicion  = localidades.find(l => l.id === editando)

  // Referencias para el editor: todas las rutas activas menos la editada
  const referencias = (excluirId) => localidades
    .filter(l => l.activo && l.id !== excluirId && Array.isArray(l.poligono) && l.poligono.length >= 3)
    .map((l, i) => ({
      placa: l.camion ? `${l.nombre} (${l.camion.placa})` : l.nombre,
      poligono: l.poligono,
      color: colorDe(l, i),
    }))

  if (cargando) return <div className="text-center text-muted py-5">Cargando rutas…</div>

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-1">
        <h3 className="fw-bold mb-0" style={{ color: '#0f1d3e' }}>
          <i className="bi bi-signpost-split-fill me-2" style={{ color: '#0066CC' }}></i>Rutas de reparto
        </h3>
        <button className="btn btn-primary btn-sm fw-semibold" onClick={() => { setCreando(c => !c); setEditando(null) }}>
          <i className="bi bi-plus-lg me-1"></i>Nueva ruta
        </button>
      </div>
      <p className="text-muted small mb-3">
        Crea rutas, asígnalas a los camiones y contrólalas desde un solo lugar.
        El sistema no permite que las rutas de camiones distintos se crucen, así cada pedido tiene un único camión responsable.
      </p>

      {aviso && (
        <div className={`alert py-2 small d-flex align-items-center gap-2 ${aviso.tipo === 'error' ? 'alert-danger' : 'alert-success'}`}>
          <i className={`bi ${aviso.tipo === 'error' ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'}`}></i>
          <span className="flex-grow-1">{aviso.texto}</span>
          <button className="btn-close btn-sm ms-2" onClick={() => setAviso(null)}></button>
        </div>
      )}

      {/* ── Mapa general ── */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="fw-semibold small mb-2" style={{ color: '#0f1d3e' }}>
            <i className="bi bi-map-fill me-1" style={{ color: '#0066CC' }}></i>
            Mapa general
            <span className="text-muted ms-2 fw-normal">· {activasConMapa.length} rutas activas</span>
          </div>
          <MapContainer center={PUYO} zoom={13} style={{ height: 380, borderRadius: 10 }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {activasConMapa.map((l, i) => (
              <Polygon key={l.id} positions={l.poligono}
                pathOptions={{ color: colorDe(l, i), fillColor: colorDe(l, i), fillOpacity: 0.18, weight: 2 }}>
                <Tooltip permanent direction="center">
                  {l.nombre}{l.camion ? ` · ${l.camion.placa}` : ''}
                </Tooltip>
              </Polygon>
            ))}
            <AjustarVista poligonos={activasConMapa.map(l => l.poligono)} />
          </MapContainer>
        </div>
      </div>

      {/* ── Crear nueva ruta ── */}
      {creando && (
        <div className="card border-0 shadow-sm mb-4" style={{ borderLeft: '4px solid #0066CC' }}>
          <div className="card-body">
            <div className="fw-semibold small mb-2" style={{ color: '#0066CC' }}>
              <i className="bi bi-plus-circle me-1"></i>Nueva ruta
            </div>
            <div className="row g-2 mb-1">
              <div className="col-12 col-md-6">
                <input className="form-control form-control-sm" placeholder="Nombre de la ruta * (ej: RUTA CENTRO L-M-V)"
                  value={nuevo.nombre} onChange={e => setNuevo(n => ({ ...n, nombre: e.target.value }))} />
              </div>
              <div className="col-12 col-md-6">
                <select className="form-select form-select-sm" value={nuevo.camionId}
                  onChange={e => setNuevo(n => ({ ...n, camionId: e.target.value }))}>
                  <option value="">— Sin camión (queda en el pool) —</option>
                  {camiones.map(c => <option key={c.id} value={c.id}>{c.placa} · {c.marca}</option>)}
                </select>
              </div>
            </div>
            <EditorPoligono otrosPoligonos={referencias(null)} nombreZona={nuevo.nombre.trim()}
              onGuardar={acciones.crear}
              onCancelar={() => { setCreando(false); setNuevo({ nombre: '', camionId: '' }) }} />
          </div>
        </div>
      )}

      {/* ── Lista de rutas ── */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="fw-semibold small mb-2" style={{ color: '#0f1d3e' }}>
            <i className="bi bi-list-ul me-1" style={{ color: '#0066CC' }}></i>
            Todas las rutas
            <span className="badge rounded-pill ms-2" style={{ background: '#0066CC' }}>{localidades.length}</span>
          </div>

          {localidades.length === 0 ? (
            <div className="text-center text-muted small py-4">
              <i className="bi bi-signpost d-block fs-3 mb-1"></i>
              Aún no hay rutas. Crea la primera con el botón «Nueva ruta».
            </div>
          ) : (
            localidades.map((loc, i) => (
              <FilaRuta key={loc.id} loc={loc} color={colorDe(loc, i)} camiones={camiones}
                acciones={acciones} abrirMapa={() => { setEditando(loc.id); setCreando(false) }} />
            ))
          )}
        </div>
      </div>

      {/* ── Editor de la ruta seleccionada ── */}
      {rutaEnEdicion && (
        <div className="card border-0 shadow-sm mb-4" style={{ borderLeft: '4px solid #0066CC' }}>
          <div className="card-body">
            <div className="fw-semibold small mb-1" style={{ color: '#0066CC' }}>
              <i className="bi bi-pentagon me-1"></i>Editar zona de “{rutaEnEdicion.nombre}”
              {rutaEnEdicion.camion && <span className="text-muted ms-2 fw-normal">camión {rutaEnEdicion.camion.placa}</span>}
            </div>
            <EditorPoligono poligonoInicial={rutaEnEdicion.poligono} otrosPoligonos={referencias(rutaEnEdicion.id)}
              nombreZona={rutaEnEdicion.nombre} zonaActiva={rutaEnEdicion.activo}
              onGuardar={coords => acciones.editarZona(rutaEnEdicion.id, coords)}
              onCancelar={() => setEditando(null)} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Fila de una ruta en la lista ─────────────────────────────────────────────
function FilaRuta({ loc, color, camiones, acciones, abrirMapa }) {
  const [editNombre, setEditNombre] = useState(false)
  const [nombre,     setNombre]     = useState(loc.nombre)
  const [confirmar,  setConfirmar]  = useState(false)   // "¿Borrar?" en la propia fila
  useEffect(() => { setNombre(loc.nombre) }, [loc.nombre])

  return (
    <div className="d-flex align-items-center gap-2 py-2 border-bottom flex-wrap">
      <span className="rounded-circle flex-shrink-0" style={{ width: 12, height: 12, background: color }} />
      {editNombre ? (
        <input className="form-control form-control-sm" style={{ maxWidth: 220 }} value={nombre} autoFocus
          onChange={e => setNombre(e.target.value)}
          onBlur={() => { const n = nombre.trim(); if (n && n !== loc.nombre) acciones.renombrar(loc.id, n); setEditNombre(false) }}
          onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }} />
      ) : (
        <span className={`fw-semibold small ${loc.activo ? '' : 'text-muted text-decoration-line-through'}`}
          role="button" onClick={() => setEditNombre(true)} title="Clic para renombrar">
          {loc.nombre}
        </span>
      )}
      {!loc.camion && (
        <span className="badge bg-warning text-dark" style={{ fontSize: '0.65rem' }}>sin asignar</span>
      )}
      <div className="ms-auto d-flex align-items-center gap-1">
        <select className="form-select form-select-sm" style={{ width: 150 }}
          value={loc.camionId ?? ''} onChange={e => acciones.reasignar(loc.id, e.target.value ? +e.target.value : null)}
          title="Asignar a un camión">
          <option value="">— Sin asignar —</option>
          {camiones.map(c => <option key={c.id} value={c.id}>{c.placa}</option>)}
        </select>
        <button className="btn btn-sm btn-outline-secondary" title="Editar zona en el mapa" onClick={abrirMapa}>
          <i className="bi bi-pentagon"></i>
        </button>
        <div className="form-check form-switch m-0" title={loc.activo ? 'Activa' : 'Inactiva'}>
          <input className="form-check-input" type="checkbox" checked={loc.activo} style={{ cursor: 'pointer' }}
            onChange={() => acciones.toggle(loc)} />
        </div>
        {confirmar ? (
          <span className="d-inline-flex align-items-center gap-1 small">
            <span className="text-danger fw-semibold">¿Borrar?</span>
            <button className="btn btn-sm btn-danger py-0 px-2" onClick={() => { setConfirmar(false); acciones.borrar(loc.id) }}>Sí</button>
            <button className="btn btn-sm btn-outline-secondary py-0 px-2" onClick={() => setConfirmar(false)}>No</button>
          </span>
        ) : (
          <button className="btn btn-sm btn-outline-danger" title="Borrar" onClick={() => setConfirmar(true)}>
            <i className="bi bi-trash3"></i>
          </button>
        )}
      </div>
    </div>
  )
}
