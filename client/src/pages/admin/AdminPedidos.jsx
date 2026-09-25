import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'

const ESTADOS = ['todos', 'pendiente', 'planificado', 'entregado', 'no_entregado', 'suspendido']

const BADGE = {
  pendiente:   { bg: '#fff3cd', color: '#856404', label: 'Pendiente' },
  planificado: { bg: '#e0f2fe', color: '#0369a1', label: 'Planificado' },
  entregado:   { bg: '#cddcf8', color: '#0a1845', label: 'Entregado' },
  no_entregado: { bg: '#ffe5d0', color: '#7a2e0e', label: 'No entregado' },
  suspendido:  { bg: '#f8d7da', color: '#58151c', label: 'Suspendido' },
}

// Cualquier estado desconocido se muestra en gris en vez de romper la página
const badgeDe = estado => BADGE[estado] ?? { bg: '#e2e3e5', color: '#41464b', label: estado }

function formatFecha(iso) {
  return new Date(iso).toLocaleString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminPedidos() {
  const { authFetch } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [filtro, setFiltro] = useState('todos')
  const [loading, setLoading] = useState(true)
  const [actualizando, setActualizando] = useState(null)
  const [expandido, setExpandido] = useState(null)

  async function cargar() {
    const res  = await authFetch('/api/pedidos')
    const data = await res.json()
    // Normalizar: items → productos para compatibilidad con el render
    const normalizados = (data.pedidos || []).map(p => ({
      ...p,
      fecha:     p.creadoEn,
      productos: (p.items || []).map(i => ({
        nombre:   i.producto?.nombre  ?? '',
        cantidad: i.cantidad,
        precio:   `$${parseFloat(i.precioUnitario).toFixed(2)}`,
      })),
    }))
    setPedidos(normalizados)
    setLoading(false)
  }

  useEffect(() => {
    cargar()
    const id = setInterval(cargar, 5000)
    return () => clearInterval(id)
  }, [authFetch])

  async function cambiarEstado(id, nuevoEstado) {
    setActualizando(id)
    await authFetch(`/api/pedidos/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: nuevoEstado }),
    })
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado: nuevoEstado } : p))
    setActualizando(null)
  }

  const filtrados = filtro === 'todos' ? pedidos : pedidos.filter(p => p.estado === filtro)

  const conteos = {
    todos:       pedidos.length,
    pendiente:   pedidos.filter(p => p.estado === 'pendiente').length,
    planificado: pedidos.filter(p => p.estado === 'planificado').length,
    entregado:   pedidos.filter(p => p.estado === 'entregado').length,
    no_entregado: pedidos.filter(p => p.estado === 'no_entregado').length,
    suspendido:  pedidos.filter(p => p.estado === 'suspendido').length,
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="fw-bold mb-0">Pedidos</h5>
          <p className="text-muted small mb-0">{pedidos.length} pedido(s) en total</p>
        </div>
        <button className="btn btn-sm btn-outline-success" onClick={cargar}>
          <i className="bi bi-arrow-clockwise me-1"></i>Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="d-flex gap-2 mb-4 flex-wrap">
        {ESTADOS.map(e => (
          <button
            key={e}
            onClick={() => setFiltro(e)}
            className="btn btn-sm"
            style={{
              borderRadius: '20px',
              border: filtro === e ? 'none' : '1px solid #dee2e6',
              background: filtro === e ? '#0066CC' : '#fff',
              color: filtro === e ? '#fff' : '#555',
              fontWeight: filtro === e ? 700 : 400,
            }}
          >
            {e === 'todos' ? 'Todos' : badgeDe(e).label}
            <span className="ms-1 badge rounded-pill" style={{
              background: filtro === e ? 'rgba(255,255,255,0.3)' : '#e9ecef',
              color: filtro === e ? '#fff' : '#555',
              fontSize: '0.65rem',
            }}>
              {conteos[e]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border" style={{ color: '#0066CC' }} />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-4 p-5 text-center shadow-sm">
          <div style={{ fontSize: '3rem', opacity: 0.3 }}>📦</div>
          <p className="text-muted mt-3">No hay pedidos con este filtro.</p>
        </div>
      ) : (
        <>
        <div className="rounded-4 shadow-sm overflow-hidden admin-table-responsive">
          <div className="table-responsive d-none d-md-block bg-white">
            <table className="table table-hover mb-0">
              <thead style={{ background: '#f8f9fa', fontSize: '0.78rem' }}>
                <tr className="text-muted">
                  <th className="px-4 py-3">#</th>
                  <th className="py-3">Fecha</th>
                  <th className="py-3">Cliente</th>
                  <th className="py-3">Productos</th>
                  <th className="py-3">Total</th>
                  <th className="py-3">Estado</th>
                  <th className="py-3">Cambiar estado</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.85rem' }}>
                {filtrados.map(p => {
                  const b = badgeDe(p.estado)
                  return (
                    <>
                      <tr
                        key={p.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setExpandido(expandido === p.id ? null : p.id)}
                      >
                        <td className="px-4 fw-bold text-muted">#{p.id}</td>
                        <td className="text-muted small">{formatFecha(p.fecha)}</td>
                        <td>
                          <div className="fw-semibold">
                            {p.cliente.nombre}
                            {p.origen === 'express' && (
                              <span className="badge ms-2" style={{ background: '#7c3aed', fontSize: '0.65rem' }}>
                                <i className="bi bi-lightning-charge-fill me-1"></i>Venta exprés
                              </span>
                            )}
                          </div>
                          <div className="text-muted small">{p.cliente.email}</div>
                        </td>
                        <td className="text-muted">{p.productos.length} item(s)</td>
                        <td className="fw-bold">${parseFloat(p.total).toFixed(2)}</td>
                        <td>
                          <span className="badge rounded-pill px-2 py-1" style={{ background: b.bg, color: b.color, fontSize: '0.72rem' }}>
                            {b.label}
                          </span>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <select
                            className="form-select form-select-sm"
                            style={{ minWidth: '130px', fontSize: '0.8rem' }}
                            value={p.estado}
                            disabled={actualizando === p.id}
                            onChange={e => cambiarEstado(p.id, e.target.value)}
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="entregado">Entregado</option>
                            <option value="no_entregado">No entregado</option>
                            <option value="suspendido">Suspendido</option>
                          </select>
                        </td>
                      </tr>

                      {/* Fila expandida con detalles */}
                      {expandido === p.id && (
                        <tr key={`${p.id}-detail`} style={{ background: '#f8fafb' }}>
                          <td colSpan={7} className="px-4 py-3">
                            <div className="row g-3">
                              <div className="col-md-4">
                                <p className="fw-bold small mb-1" style={{ color: '#0066CC' }}>DATOS DEL CLIENTE</p>
                                <p className="mb-1 small"><i className="bi bi-person me-1"></i>{p.cliente.nombre}</p>
                                <p className="mb-1 small"><i className="bi bi-telephone me-1"></i>{p.cliente.telefono}</p>
                                <p className="mb-1 small"><i className="bi bi-envelope me-1"></i>{p.cliente.email}</p>
                                <p className="mb-0 small">
                                  <i className="bi bi-geo-alt me-1"></i>
                                  {p.cliente.callePrincipal
                                    ? [
                                        p.cliente.callePrincipal,
                                        p.cliente.interseccion && `y ${p.cliente.interseccion}`,
                                        p.cliente.numeracion   && `#${p.cliente.numeracion}`,
                                      ].filter(Boolean).join(' ')
                                    : p.cliente.direccion}
                                </p>
                                {p.cliente.referencia && (
                                  <p className="mb-0 small mt-1" style={{ color: '#856404' }}>
                                    <i className="bi bi-signpost me-1"></i>{p.cliente.referencia}
                                  </p>
                                )}
                                {(p.cliente.sector || p.cliente.ciudad) && (
                                  <p className="mb-0 small text-muted mt-1">
                                    <i className="bi bi-building me-1"></i>
                                    {[p.cliente.sector, p.cliente.ciudad, p.cliente.provincia].filter(Boolean).join(', ')}
                                  </p>
                                )}
                                {p.cliente.nota && <p className="mb-0 small text-muted mt-1"><i className="bi bi-chat me-1"></i>{p.cliente.nota}</p>}
                              </div>
                              <div className="col-md-4">
                                <p className="fw-bold small mb-1" style={{ color: '#0066CC' }}>PRODUCTOS</p>
                                {p.productos.map((prod, i) => (
                                  <div key={i} className="d-flex justify-content-between small mb-1">
                                    <span>{prod.nombre} × {prod.cantidad}</span>
                                    <span className="fw-bold">
                                      ${(parseFloat(prod.precio?.replace('$', '') || 0) * prod.cantidad).toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                                <div className="d-flex justify-content-between fw-bold small mt-2 pt-2" style={{ borderTop: '1px solid #dee2e6' }}>
                                  <span>Total</span>
                                  <span style={{ color: '#0066CC' }}>${parseFloat(p.total).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Vista móvil: tarjetas ──────────────────────────── */}
        <div className="d-md-none">
          {filtrados.map(p => {
            const b = badgeDe(p.estado)
            return (
              <div key={p.id} className="bg-white rounded-4 shadow-sm p-3 mb-3">
                {/* Cabecera */}
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <span className="fw-bold text-muted small me-2">#{p.id}</span>
                    <span className="badge rounded-pill px-2" style={{ background: b.bg, color: b.color, fontSize: '0.7rem' }}>
                      {b.label}
                    </span>
                  </div>
                  <span className="text-muted" style={{ fontSize: '0.72rem' }}>{formatFecha(p.fecha)}</span>
                </div>

                {/* Cliente */}
                <div className="fw-semibold">
                  {p.cliente.nombre}
                  {p.origen === 'express' && (
                    <span className="badge ms-2" style={{ background: '#7c3aed', fontSize: '0.65rem' }}>
                      <i className="bi bi-lightning-charge-fill me-1"></i>Venta exprés
                    </span>
                  )}
                </div>
                <div className="text-muted small mb-1">{p.cliente.email} · {p.cliente.telefono}</div>
                <div className="text-muted small mb-2">
                  <i className="bi bi-geo-alt me-1"></i>
                  {p.cliente.callePrincipal
                    ? [p.cliente.callePrincipal, p.cliente.interseccion && `y ${p.cliente.interseccion}`].filter(Boolean).join(' ')
                    : p.cliente.direccion}
                  {p.cliente.referencia && <span className="ms-1" style={{ color: '#856404' }}>· {p.cliente.referencia}</span>}
                </div>

                {/* Productos */}
                <div className="rounded-3 p-2 mb-2" style={{ background: '#f8f9fa', fontSize: '0.8rem' }}>
                  {p.productos.map((prod, i) => (
                    <div key={i} className="d-flex justify-content-between">
                      <span>{prod.nombre} × {prod.cantidad}</span>
                      <span className="fw-bold">${(parseFloat(prod.precio?.replace('$','') || 0) * prod.cantidad).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="d-flex justify-content-between fw-bold mt-1 pt-1" style={{ borderTop: '1px solid #dee2e6', color: '#0066CC' }}>
                    <span>Total</span>
                    <span>${parseFloat(p.total).toFixed(2)}</span>
                  </div>
                </div>

                {/* Selector de estado */}
                <select className="form-select form-select-sm" value={p.estado}
                  disabled={actualizando === p.id}
                  onChange={e => cambiarEstado(p.id, e.target.value)}>
                  <option value="pendiente">Pendiente</option>
                  <option value="entregado">Entregado</option>
                  <option value="no_entregado">No entregado</option>
                  <option value="suspendido">Suspendido</option>
                </select>
              </div>
            )
          })}
        </div>
        </>
      )}
    </>
  )
}
