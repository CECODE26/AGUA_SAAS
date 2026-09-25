import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'

const formVacio = { nombre: '', username: '', password: '', camionId: '', telefono: '' }

export default function AdminConductores() {
  const { authFetch, rol } = useAuth()
  const esSuperAdmin = rol === 'superadmin'
  const [conductores, setConductores] = useState([])
  const [camiones,    setCamiones]    = useState([])
  const [loading,     setLoading]     = useState(true)

  const [error,     setError]     = useState('')
  const [ok,        setOk]        = useState('')
  const [guardando, setGuardando] = useState(false)
  const [editando,  setEditando]  = useState(null)
  const [form,      setForm]      = useState(formVacio)

  async function cargar() {
    const [resCon, resCam] = await Promise.all([
      authFetch('/api/conductores'),
      authFetch('/api/camiones'),
    ])
    const dataCon = await resCon.json()
    const dataCam = await resCam.json()
    setConductores(dataCon.conductores || [])
    setCamiones(dataCam.camiones || [])
    setLoading(false)
  }

  async function crearConductor(e) {
    e.preventDefault()
    setError(''); setOk(''); setGuardando(true)
    const body = { nombre: form.nombre, username: form.username, password: form.password, telefono: form.telefono || null }
    if (form.camionId) body.camionId = parseInt(form.camionId)
    const res  = await authFetch('/api/conductores', { method: 'POST', body: JSON.stringify(body) })
    const data = await res.json()
    setGuardando(false)
    if (!res.ok) { setError(data.message); return }
    setOk('Conductor creado correctamente')
    setForm(formVacio)
    cargar()
  }

  useEffect(() => {
    cargar()
    const id = setInterval(cargar, 5000)
    return () => clearInterval(id)
  }, [])

  async function toggleActivo(conductor) {
    const res  = await authFetch(`/api/superadmin/conductores/${conductor.id}/activo`, {
      method: 'PATCH',
      body:   JSON.stringify({ activo: !conductor.activo }),
    })
    const data = await res.json()
    setConductores(prev => prev.map(c => c.id === conductor.id ? data.conductor : c))
  }

  async function cambiarPassword(id, password) {
    if (!password) return
    await authFetch(`/api/conductores/${id}`, {
      method: 'PUT',
      body:   JSON.stringify({ password }),
    })
    setEditando(null)
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este conductor?')) return
    await authFetch(`/api/conductores/${id}`, { method: 'DELETE' })
    setConductores(prev => prev.filter(c => c.id !== id))
  }

  if (loading) return <div className="d-flex justify-content-center py-5"><div className="spinner-border" style={{ color: '#0066CC' }} /></div>

  return (
    <div>
      <h4 className="fw-bold mb-4" style={{ color: '#0f1d3e' }}>
        <i className="bi bi-person-badge-fill me-2" style={{ color: '#0066CC' }}></i>
        Conductores
      </h4>

      {/* Formulario crear conductor */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white fw-semibold border-0 pt-3">
          <i className="bi bi-person-plus-fill me-2" style={{ color: '#0066CC' }}></i>
          Nuevo conductor
        </div>
        <div className="card-body">
          <form onSubmit={crearConductor}>
            <div className="row g-2">
              <div className="col-12 col-sm-3">
                <input className="form-control form-control-sm" placeholder="Nombre completo *"
                  value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
              </div>
              <div className="col-6 col-sm-2">
                <input className="form-control form-control-sm" placeholder="Usuario *"
                  value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
              </div>
              <div className="col-6 col-sm-2">
                <input type="password" className="form-control form-control-sm" placeholder="Contraseña *"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={4} />
              </div>
              <div className="col-6 col-sm-2">
                <input type="tel" className="form-control form-control-sm" placeholder="Celular"
                  value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
              </div>
              <div className="col-12 col-sm-3">
                <select className="form-select form-select-sm"
                  value={form.camionId} onChange={e => setForm(f => ({ ...f, camionId: e.target.value }))}>
                  <option value="">— Camión (opcional) —</option>
                  {camiones.filter(c => !c.conductor).map(c => (
                    <option key={c.id} value={c.id}>{c.placa} · {c.marca} {c.modelo || ''}</option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-sm-2">
                <button type="submit" className="btn btn-sm w-100 fw-semibold text-white"
                  style={{ background: '#0066CC' }} disabled={guardando}>
                  {guardando ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="bi bi-plus-lg me-1"></i>}
                  Crear
                </button>
              </div>
            </div>
            {error && <div className="alert alert-danger mt-2 py-2 small mb-0">{error}</div>}
            {ok    && <div className="alert alert-success mt-2 py-2 small mb-0">{ok}</div>}
          </form>
        </div>
      </div>

      {/* ── Lista conductores ────────────────────────── */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {conductores.length === 0 ? (
            <div className="text-center text-muted py-5">
              <i className="bi bi-truck fs-2 d-block mb-2"></i>
              Aún no hay conductores registrados
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Nombre</th>
                    <th>Usuario</th>
                    <th>Camión asignado</th>
                    <th className="text-center">Estado</th>
                    <th>Acceso</th>
                    {esSuperAdmin && <th className="text-end">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {conductores.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div className="fw-semibold">{c.nombre}</div>
                        {c.telefono && <div className="text-muted small"><i className="bi bi-telephone me-1"></i>{c.telefono}</div>}
                      </td>
                      <td><code className="text-muted">{c.username}</code></td>
                      <td>
                        {c.camion ? (
                          <div>
                            <span className="badge bg-dark font-monospace me-1">{c.camion.placa}</span>
                            <span className="text-muted small">{c.camion.marca} {c.camion.modelo || ''}</span>
                          </div>
                        ) : (
                          <span className="badge bg-warning text-dark">
                            <i className="bi bi-exclamation-triangle me-1"></i>Sin camión
                          </span>
                        )}
                      </td>
                      <td className="text-center">
                        <span className={`badge ${c.activo ? 'bg-success' : 'bg-secondary'}`}>
                          {c.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.78rem' }}>
                        <span className="text-muted">/conductor/login</span>
                      </td>
                      {esSuperAdmin && (
                        <td className="text-end">
                          <div className="d-flex gap-2 justify-content-end flex-wrap">
                            {/* Toggle activo */}
                            <button className={`btn btn-sm ${c.activo ? 'btn-outline-warning' : 'btn-outline-success'}`}
                              onClick={() => toggleActivo(c)} title={c.activo ? 'Desactivar' : 'Activar'}>
                              <i className={`bi ${c.activo ? 'bi-pause-circle' : 'bi-play-circle'}`}></i>
                            </button>

                            {/* Cambiar contraseña */}
                            {editando === c.id ? (
                              <div className="d-flex gap-1">
                                <input id={`pwd-${c.id}`} type="password" className="form-control form-control-sm"
                                  placeholder="Nueva clave" style={{ width: 120 }} />
                                <button className="btn btn-sm btn-success"
                                  onClick={() => cambiarPassword(c.id, document.getElementById(`pwd-${c.id}`).value)}>
                                  <i className="bi bi-check-lg"></i>
                                </button>
                                <button className="btn btn-sm btn-secondary" onClick={() => setEditando(null)}>
                                  <i className="bi bi-x-lg"></i>
                                </button>
                              </div>
                            ) : (
                              <button className="btn btn-sm btn-outline-secondary"
                                onClick={() => setEditando(c.id)} title="Cambiar contraseña">
                                <i className="bi bi-key"></i>
                              </button>
                            )}

                            {/* Eliminar */}
                            <button className="btn btn-sm btn-outline-danger" onClick={() => eliminar(c.id)}>
                              <i className="bi bi-trash3"></i>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
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
