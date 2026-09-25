import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'

const BADGE = {
  pendiente: 'bg-warning text-dark',
  aprobada:  'bg-success',
  rechazada: 'bg-danger',
}

const TIPO_LABEL = {
  admin: 'Nuevo admin',
}

const TIPO_BADGE = {
  admin: 'bg-secondary',
}

export default function SuperAdminSolicitudes() {
  const { authFetch } = useAuth()
  const [solicitudes, setSolicitudes] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [filtro,      setFiltro]      = useState('pendiente')
  const [procesando,  setProcesando]  = useState(null)
  const [notaModal,   setNotaModal]   = useState({ open: false, id: null, accion: null, nota: '' })

  async function cargar(estado) {
    const params = estado !== 'todas' ? `?estado=${estado}` : ''
    const res    = await authFetch(`/api/superadmin/solicitudes${params}`)
    const data   = await res.json()
    setSolicitudes(data.solicitudes || [])
    setLoading(false)
  }

  useEffect(() => {
    cargar(filtro)
    const id = setInterval(() => cargar(filtro), 5000)
    return () => clearInterval(id)
  }, [filtro])

  function abrirModal(id, accion) {
    setNotaModal({ open: true, id, accion, nota: '' })
  }

  async function confirmarAccion() {
    const { id, accion, nota } = notaModal
    setProcesando(id)
    setNotaModal({ open: false, id: null, accion: null, nota: '' })

    const res = await authFetch(`/api/superadmin/solicitudes/${id}/${accion}`, {
      method: 'POST',
      body:   JSON.stringify({ nota }),
    })
    setProcesando(null)
    if (res.ok) {
      cargar(filtro)
    } else {
      const data = await res.json()
      alert(data.message || 'Error al procesar solicitud')
    }
  }

  return (
    <div>
      <h4 className="fw-bold mb-1" style={{ color: '#0f1d3e' }}>
        <i className="bi bi-bell-fill me-2" style={{ color: '#7c3aed' }}></i>
        Solicitudes de activación
      </h4>
      <p className="text-muted small mb-4">Revisa y aprueba las peticiones de los administradores.</p>

      {/* Filtros */}
      <div className="d-flex gap-2 mb-4">
        {['pendiente', 'aprobada', 'rechazada', 'todas'].map(e => (
          <button key={e} onClick={() => setFiltro(e)}
            className={`btn btn-sm ${filtro === e ? 'text-white' : 'btn-outline-secondary'}`}
            style={filtro === e ? { background: '#7c3aed', borderColor: '#7c3aed' } : {}}>
            {e.charAt(0).toUpperCase() + e.slice(1)}
          </button>
        ))}
      </div>

      {/* Modal nota */}
      {notaModal.open && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0">
                <h6 className="modal-title fw-bold">
                  {notaModal.accion === 'aprobar' ? 'Aprobar solicitud' : 'Rechazar solicitud'}
                </h6>
              </div>
              <div className="modal-body">
                <label className="form-label small fw-semibold">Nota (opcional)</label>
                <textarea className="form-control" rows={3} placeholder="Ej: Todo en orden, cuenta activada"
                  value={notaModal.nota} onChange={e => setNotaModal(m => ({ ...m, nota: e.target.value }))} />
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-secondary btn-sm"
                  onClick={() => setNotaModal({ open: false, id: null, accion: null, nota: '' })}>
                  Cancelar
                </button>
                <button className="btn btn-sm text-white"
                  style={{ background: notaModal.accion === 'aprobar' ? '#0066CC' : '#dc3545' }}
                  onClick={confirmarAccion}>
                  {notaModal.accion === 'aprobar' ? 'Confirmar aprobación' : 'Confirmar rechazo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="d-flex justify-content-center py-5">
              <div className="spinner-border" style={{ color: '#7c3aed' }} />
            </div>
          ) : solicitudes.length === 0 ? (
            <div className="text-center text-muted py-5">
              <i className="bi bi-check2-all fs-2 d-block mb-2"></i>
              No hay solicitudes {filtro !== 'todas' ? filtro + 's' : ''}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Tipo</th>
                    <th>Nombre / Conductor</th>
                    <th>Usuario</th>
                    <th>Detalle</th>
                    <th>Solicitado por</th>
                    <th className="text-center">Estado</th>
                    <th>Nota</th>
                    <th>Fecha</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudes.map(s => (
                    <>
                      <tr key={s.id}>
                        <td>
                          <span className={`badge ${TIPO_BADGE[s.tipo] || 'bg-secondary'}`}>
                            {TIPO_LABEL[s.tipo] || s.tipo}
                          </span>
                        </td>
                        <td className="fw-semibold">{s.targetNombre}</td>
                        <td><code className="text-muted">{s.targetUsername || '—'}</code></td>
                        <td className="text-muted small">—</td>
                        <td className="text-muted small">{s.solicitadoPor}</td>
                        <td className="text-center">
                          <span className={`badge ${BADGE[s.estado]}`}>{s.estado}</span>
                        </td>
                        <td className="text-muted small">{s.nota || '—'}</td>
                        <td style={{ fontSize: '0.8rem' }} className="text-muted">
                          {new Date(s.creadoEn).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="text-end">
                          {s.estado === 'pendiente' && (
                            <div className="d-flex gap-1 justify-content-end">
                              <button className="btn btn-sm text-white"
                                style={{ background: '#0066CC' }}
                                onClick={() => abrirModal(s.id, 'aprobar')}
                                disabled={procesando === s.id}>
                                <i className="bi bi-check-lg"></i>
                              </button>
                              <button className="btn btn-sm btn-outline-danger"
                                onClick={() => abrirModal(s.id, 'rechazar')}
                                disabled={procesando === s.id}>
                                <i className="bi bi-x-lg"></i>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>

                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
