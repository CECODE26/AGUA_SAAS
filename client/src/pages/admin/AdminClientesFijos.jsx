import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'

function ModalConfirmar({ cliente, onCancelar, onConfirmar, eliminando }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050,
      }}
      onClick={() => !eliminando && onCancelar()}
    >
      <div
        style={{
          background: '#fff', borderRadius: 16, padding: 28, maxWidth: 380, width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-3">
          <div style={{ fontSize: '2.5rem' }}>🗑️</div>
          <h6 className="fw-bold mt-2 mb-1">Eliminar cliente fijo</h6>
          <p className="text-muted small mb-0">
            ¿Seguro que deseas eliminar a <strong>{cliente.nombre}</strong>?
            Esta acción no se puede deshacer.
          </p>
        </div>
        <div className="d-flex gap-2 justify-content-center mt-3">
          <button className="btn btn-light" onClick={onCancelar} disabled={eliminando}>
            Cancelar
          </button>
          <button className="btn btn-danger fw-semibold" onClick={onConfirmar} disabled={eliminando}>
            {eliminando && <span className="spinner-border spinner-border-sm me-1" />}
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

// De dónde salió el cliente: se registró en la app, lo creó el Maestro, o compró en la web
const ORIGEN = {
  app:     { label: 'App',     bg: '#ecfdf5', color: '#047857', icon: 'bi-phone-fill' },
  maestro: { label: 'Maestro', bg: '#f5f3ff', color: '#6d28d9', icon: 'bi-person-badge-fill' },
  web:     { label: 'Web',     bg: '#eff6ff', color: '#1d4ed8', icon: 'bi-globe2' },
}
function OrigenBadge({ origen }) {
  const o = ORIGEN[origen] ?? ORIGEN.web
  return (
    <span className="badge" style={{ background: o.bg, color: o.color, fontSize: '0.68rem', fontWeight: 700 }}>
      <i className={`bi ${o.icon} me-1`}></i>{o.label}
    </span>
  )
}
function NuevoTag() {
  return (
    <span className="badge ms-2" style={{ background: '#fef3c7', color: '#b45309', fontSize: '0.62rem', fontWeight: 800, verticalAlign: 'middle' }}>
      NUEVO
    </span>
  )
}

const DIAS = [
  { value: '',          label: 'Todos' },
  { value: 'lunes',     label: 'Lunes' },
  { value: 'martes',    label: 'Martes' },
  { value: 'miercoles', label: 'Miércoles' },
  { value: 'jueves',    label: 'Jueves' },
  { value: 'viernes',   label: 'Viernes' },
  { value: 'sabado',    label: 'Sábado' },
  { value: 'domingo',   label: 'Domingo' },
]

const DIA_COLORES = {
  lunes:     { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  martes:    { bg: '#fdf4ff', color: '#7e22ce', border: '#e9d5ff' },
  miercoles: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  jueves:    { bg: '#fff7ed', color: '#9a3412', border: '#fed7aa' },
  viernes:   { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
  sabado:    { bg: '#fff1f2', color: '#9f1239', border: '#fecdd3' },
  domingo:   { bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4' },
}

function DiaBadge({ dia }) {
  if (!dia) return <span className="text-muted small">—</span>
  const c = DIA_COLORES[dia] || { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' }
  const label = DIAS.find(d => d.value === dia)?.label ?? dia
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      fontSize: '0.7rem', fontWeight: 700, padding: '2px 9px', borderRadius: 999,
    }}>
      {label}
    </span>
  )
}

/* Distribución de clientes por día */
function ResumenDias({ clientes }) {
  const conteo = DIAS.slice(1).map(d => ({
    ...d,
    count: clientes.filter(c => c.diaSemana === d.value).length,
  })).filter(d => d.count > 0)

  if (conteo.length === 0) return null
  return (
    <div className="d-flex flex-wrap gap-2 mb-4">
      {conteo.map(d => {
        const c = DIA_COLORES[d.value] || {}
        return (
          <div key={d.value} className="px-3 py-2 rounded-3 d-flex align-items-center gap-2"
            style={{ background: c.bg, border: `1px solid ${c.border}` }}>
            <span className="fw-bold" style={{ color: c.color, fontSize: '1.1rem' }}>{d.count}</span>
            <span style={{ color: c.color, fontSize: '0.78rem', fontWeight: 600 }}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function AdminClientesFijos() {
  const { authFetch } = useAuth()

  const [clientes,   setClientes]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [busqueda,   setBusqueda]   = useState('')
  const [filtroDia,  setFiltroDia]  = useState('')
  const [expandido,   setExpandido]   = useState(null)
  const [refreshKey,  setRefreshKey]  = useState(0)
  const [menuAbierto, setMenuAbierto] = useState(null)
  const [confirmando, setConfirmando] = useState(null)
  const [eliminando,  setEliminando]  = useState(false)

  useEffect(() => {
    let cancelado = false
    if (!clientes.length) setLoading(true)
    const params = new URLSearchParams()
    if (busqueda)  params.set('q',   busqueda)
    if (filtroDia) params.set('dia', filtroDia)
    authFetch(`/api/maestro/admin/clientes?${params}`)
      .then(r => r.json())
      .then(d => { if (!cancelado) { setClientes(d.clientes || []); setLoading(false) } })
      .catch(() => { if (!cancelado) setLoading(false) })
    return () => { cancelado = true }
  }, [busqueda, filtroDia, authFetch, refreshKey])

  useEffect(() => {
    const id = setInterval(() => setRefreshKey(k => k + 1), 5000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    function cerrar() { setMenuAbierto(null) }
    document.addEventListener('click', cerrar)
    return () => document.removeEventListener('click', cerrar)
  }, [])

  const cargar = () => setRefreshKey(k => k + 1)

  async function eliminarCliente() {
    setEliminando(true)
    try {
      const res  = await authFetch(`/api/usuarios/${confirmando.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) {
        alert(data.message || 'No se pudo eliminar el cliente')
      } else {
        setConfirmando(null)
        cargar()
      }
    } catch {
      alert('Error de conexión')
    }
    setEliminando(false)
  }

  const sinFiltro = !busqueda && !filtroDia

  function filaCliente(c) {
    return [
      c.nombre,
      c.cedula || '—',
      c.telefono,
      c.email && !c.email.includes('@aguamanu.local') ? c.email : '—',
      [c.callePrincipal, c.calleSecundaria].filter(Boolean).join(' y ') || '—',
      c.referencia || '—',
      c.sector || '—',
      DIAS.find(d => d.value === c.diaSemana)?.label ?? '—',
      c.latitud && c.longitud ? `${c.latitud}, ${c.longitud}` : 'Sin GPS',
      c._count?.pedidos ?? 0,
    ]
  }

  function exportarPDF() {
    if (clientes.length === 0) return
    const doc = new jsPDF({ orientation: 'landscape' })
    const fecha = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })

    doc.setFontSize(16)
    doc.text('Clientes Fijos — Agua Manú', 14, 18)
    doc.setFontSize(9)
    doc.setTextColor(100)
    doc.text(`Generado: ${fecha}  ·  Total: ${clientes.length} cliente${clientes.length !== 1 ? 's' : ''}`, 14, 25)
    if (busqueda || filtroDia) {
      const filtros = [busqueda && `Búsqueda: "${busqueda}"`, filtroDia && `Día: ${DIAS.find(d => d.value === filtroDia)?.label}`].filter(Boolean).join('  ·  ')
      doc.text(`Filtros activos: ${filtros}`, 14, 31)
    }
    doc.setTextColor(0)

    autoTable(doc, {
      startY: busqueda || filtroDia ? 35 : 30,
      head: [['Nombre', 'Cédula', 'Teléfono', 'Email', 'Dirección', 'Referencia', 'Sector', 'Día visita', 'GPS', 'Pedidos']],
      body: clientes.map(filaCliente),
      theme: 'striped',
      headStyles: { fillColor: [124, 58, 237], fontSize: 8 },
      bodyStyles: { fontSize: 7.5 },
      columnStyles: { 4: { cellWidth: 40 }, 5: { cellWidth: 30 } },
    })

    const sufijo = filtroDia ? `-${filtroDia}` : ''
    doc.save(`clientes-fijos${sufijo}-${fecha.replace(/\//g, '-')}.pdf`)
  }

  function exportarExcel() {
    if (clientes.length === 0) return
    const filas = clientes.map(c => ({
      'Nombre':      c.nombre,
      'Cédula/RUC':  c.cedula || '',
      'Teléfono':    c.telefono,
      'Email':       c.email && !c.email.includes('@aguamanu.local') ? c.email : '',
      'Calle principal': c.callePrincipal || '',
      'Calle secundaria': c.calleSecundaria || '',
      'Referencia':  c.referencia || '',
      'Sector':      c.sector || '',
      'Día de visita': DIAS.find(d => d.value === c.diaSemana)?.label ?? '',
      'Latitud':     c.latitud || '',
      'Longitud':    c.longitud || '',
      'Pedidos':     c._count?.pedidos ?? 0,
      'Registrado':  new Date(c.creadoEn).toLocaleDateString('es-EC'),
    }))
    const ws = XLSX.utils.json_to_sheet(filas)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes Fijos')
    const sufijo = filtroDia ? `-${filtroDia}` : ''
    XLSX.writeFile(wb, `clientes-fijos${sufijo}.xlsx`)
  }

  return (
    <>
      {confirmando && (
        <ModalConfirmar
          cliente={confirmando}
          onCancelar={() => setConfirmando(null)}
          onConfirmar={eliminarCliente}
          eliminando={eliminando}
        />
      )}

      {/* ── Cabecera ── */}
      <div className="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h5 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <span className="d-flex align-items-center justify-content-center rounded-3"
              style={{ width: 32, height: 32, background: '#f3e8ff' }}>
              <i className="bi bi-person-vcard-fill" style={{ color: '#7c3aed' }}></i>
            </span>
            Clientes Fijos
          </h5>
          <p className="text-muted small mb-0">
            Gestionados por el Maestro de Clientes ·{' '}
            <span className="fw-semibold" style={{ color: '#7c3aed' }}>
              {clientes.length} cliente{clientes.length !== 1 ? 's' : ''}
            </span>
            {' '}— los cambios del maestro aparecen aquí en tiempo real
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-sm btn-light" onClick={cargar} title="Actualizar">
            <i className="bi bi-arrow-clockwise me-1"></i>Actualizar
          </button>
          <button className="btn btn-sm btn-danger fw-semibold" onClick={exportarPDF}
            disabled={clientes.length === 0} title="Exportar PDF">
            <i className="bi bi-filetype-pdf me-1"></i>PDF
          </button>
          <button className="btn btn-sm btn-success fw-semibold" onClick={exportarExcel}
            disabled={clientes.length === 0} title="Exportar Excel">
            <i className="bi bi-file-earmark-excel me-1"></i>Excel
          </button>
          <a href="/maestro" target="_blank" rel="noreferrer"
            className="btn btn-sm fw-semibold"
            style={{ background: '#7c3aed', color: '#fff' }}>
            <i className="bi bi-box-arrow-up-right me-1"></i>Ir al portal Maestro
          </a>
        </div>
      </div>

      {/* ── Resumen por día ── */}
      {sinFiltro && <ResumenDias clientes={clientes} />}

      {/* ── Filtros ── */}
      <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 14 }}>
        <div className="card-body py-3 px-4">
          <div className="row g-3 align-items-center">
            <div className="col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input type="text" className="form-control border-start-0"
                  placeholder="Buscar por nombre, cédula o teléfono…"
                  value={busqueda} onChange={e => setBusqueda(e.target.value)} />
              </div>
            </div>
            <div className="col-md-4">
              <select className="form-select" value={filtroDia} onChange={e => setFiltroDia(e.target.value)}>
                {DIAS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <button className="btn btn-light w-100" onClick={() => { setBusqueda(''); setFiltroDia('') }}
                disabled={!busqueda && !filtroDia}>
                <i className="bi bi-x-circle me-1"></i>Limpiar filtros
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabla ── */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border" style={{ color: '#7c3aed' }} />
            </div>
          ) : clientes.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-person-vcard fs-2 d-block mb-2" style={{ color: '#a78bfa' }}></i>
              {busqueda || filtroDia
                ? 'Sin resultados para ese filtro'
                : 'El Maestro de Clientes aún no ha registrado ningún cliente fijo'}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ minWidth: 180 }}>Nombre</th>
                    <th>Cédula / RUC</th>
                    <th>Teléfono</th>
                    <th className="text-center">Origen</th>
                    <th style={{ minWidth: 200 }}>Dirección</th>
                    <th className="text-center">GPS</th>
                    <th className="text-center" style={{ minWidth: 100 }}>Día visita</th>
                    <th className="text-center">Pedidos</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map(c => (
                    <>
                      <tr key={c.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setExpandido(expandido === c.id ? null : c.id)}>
                        <td>
                          <div className="fw-semibold" style={{ color: '#1e1b4b' }}>{c.nombre}{c.nuevo && <NuevoTag />}</div>
                          {c.email && !c.email.includes('@aguamanu.local') && (
                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>{c.email}</div>
                          )}
                        </td>
                        <td>
                          {c.cedula
                            ? <code className="text-muted small">{c.cedula}</code>
                            : <span className="text-muted small">—</span>}
                        </td>
                        <td className="fw-semibold">{c.telefono}</td>
                        <td className="text-center"><OrigenBadge origen={c.origen} /></td>
                        <td style={{ maxWidth: 220 }}>
                          <div style={{ fontSize: '0.8rem', color: '#374151' }}>
                            {[c.callePrincipal, c.calleSecundaria].filter(Boolean).join(' y ') || '—'}
                          </div>
                          {c.referencia && (
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{c.referencia}</div>
                          )}
                          {c.sector && (
                            <div style={{ fontSize: '0.7rem', color: '#a78bfa', fontWeight: 600 }}>{c.sector}</div>
                          )}
                        </td>
                        <td className="text-center">
                          {c.latitud && c.longitud ? (
                            <a href={`https://maps.google.com/?q=${c.latitud},${c.longitud}`}
                              target="_blank" rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="badge text-decoration-none"
                              style={{ background: '#d1fae5', color: '#065f46', fontSize: '0.7rem' }}>
                              <i className="bi bi-geo-alt-fill me-1"></i>Ver
                            </a>
                          ) : (
                            <span className="badge bg-light text-muted" style={{ fontSize: '0.7rem' }}>Sin GPS</span>
                          )}
                        </td>
                        <td className="text-center">
                          {Array.isArray(c.visitasHorario) && c.visitasHorario.length > 0 ? (
                            <div className="d-flex flex-wrap gap-1 justify-content-center">
                              {c.visitasHorario.map((v, i) => (
                                <span key={i} title={v.hora ? `a las ${v.hora}` : ''}>
                                  <DiaBadge dia={v.dia} />
                                </span>
                              ))}
                            </div>
                          ) : (
                            <DiaBadge dia={c.diaSemana} />
                          )}
                        </td>
                        <td className="text-center">
                          <span className="badge rounded-pill"
                            style={{
                              background: c._count?.pedidos > 0 ? '#eff6ff' : '#f1f5f9',
                              color:      c._count?.pedidos > 0 ? '#1d4ed8' : '#94a3b8',
                              fontSize: '0.72rem', fontWeight: 700,
                            }}>
                            {c._count?.pedidos ?? 0}
                          </span>
                        </td>
                        <td style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                          <button
                            className="btn btn-sm btn-light"
                            style={{ fontSize: '1rem', lineHeight: 1, padding: '2px 8px' }}
                            onClick={e => { e.stopPropagation(); setMenuAbierto(menuAbierto === c.id ? null : c.id) }}
                            title="Opciones"
                          >
                            ⋮
                          </button>
                          {menuAbierto === c.id && (
                            <div
                              style={{
                                position: 'absolute', right: 8, top: '100%', zIndex: 200,
                                background: '#fff', borderRadius: 10, minWidth: 140,
                                boxShadow: '0 4px 20px rgba(0,0,0,0.15)', border: '1px solid #f0f0f0',
                              }}
                              onClick={e => e.stopPropagation()}
                            >
                              <button
                                className="btn btn-sm w-100 text-start text-danger"
                                style={{ borderRadius: 10, padding: '8px 14px', fontWeight: 600 }}
                                onClick={() => { setMenuAbierto(null); setConfirmando(c) }}
                              >
                                <i className="bi bi-trash3 me-2"></i>Eliminar
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Fila expandida */}
                      {expandido === c.id && (
                        <tr key={`${c.id}-exp`} style={{ background: '#faf5ff' }}>
                          <td colSpan={8} className="px-4 py-3">
                            <div className="row g-3">
                              <div className="col-md-4">
                                <p className="text-muted small mb-1 fw-bold text-uppercase" style={{ letterSpacing: 0.5 }}>Dirección completa</p>
                                <p className="mb-0 small">
                                  {c.callePrincipal || '—'}
                                  {c.calleSecundaria && <> y {c.calleSecundaria}</>}
                                  {c.referencia && <><br /><span className="text-muted">{c.referencia}</span></>}
                                  {c.sector && <><br /><span style={{ color: '#7c3aed', fontWeight: 600 }}>{c.sector}</span></>}
                                </p>
                              </div>
                              {c.latitud && c.longitud && (
                                <div className="col-md-4">
                                  <p className="text-muted small mb-1 fw-bold text-uppercase" style={{ letterSpacing: 0.5 }}>Coordenadas GPS</p>
                                  <p className="mb-1 font-monospace small" style={{ color: '#7c3aed' }}>
                                    {c.latitud}, {c.longitud}
                                  </p>
                                  <a href={`https://maps.google.com/?q=${c.latitud},${c.longitud}`}
                                    target="_blank" rel="noreferrer"
                                    className="btn btn-sm"
                                    style={{ background: '#d1fae5', color: '#065f46', fontSize: '0.75rem' }}>
                                    <i className="bi bi-map me-1"></i>Abrir en Google Maps
                                  </a>
                                </div>
                              )}
                              <div className="col-md-4">
                                <p className="text-muted small mb-1 fw-bold text-uppercase" style={{ letterSpacing: 0.5 }}>Información adicional</p>
                                <p className="mb-1 small">
                                  <span className="text-muted">Email: </span>
                                  {c.email && !c.email.includes('@aguamanu.local') ? c.email : '—'}
                                </p>
                                <p className="mb-1 small">
                                  <span className="text-muted">Registrado: </span>
                                  {new Date(c.creadoEn).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Footer info */}
      {!loading && clientes.length > 0 && (
        <p className="text-muted small text-center mt-3 mb-0">
          <i className="bi bi-info-circle me-1"></i>
          Haz clic en una fila para ver el detalle completo · Los datos son gestionados desde el{' '}
          <a href="/maestro" target="_blank" rel="noreferrer" style={{ color: '#7c3aed' }}>Portal Maestro de Clientes</a>
        </p>
      )}
    </>
  )
}
