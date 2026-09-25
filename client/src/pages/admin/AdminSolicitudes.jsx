import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'

const BADGE = {
  pendiente: 'bg-warning text-dark',
  aprobada:  'bg-success',
  rechazada: 'bg-danger',
}

const formVacio = { nombre: '', username: '', password: '', telefono: '' }

export default function AdminSolicitudes() {
  const { authFetch } = useAuth()
  const [solicitudes, setSolicitudes] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [form,        setForm]        = useState(formVacio)
  const [enviando,    setEnviando]    = useState(false)
  const [error,       setError]       = useState('')
  const [ok,          setOk]          = useState('')

  async function cargar() {
    const res  = await authFetch('/api/solicitudes')
    const data = await res.json()
    setSolicitudes(data.solicitudes || [])
    setLoading(false)
  }

  useEffect(() => {
    cargar()
    const id = setInterval(cargar, 5000)
    return () => clearInterval(id)
  }, [])

  async function enviarAdmin(e) {
    e.preventDefault()
    setError(''); setOk(''); setEnviando(true)
    const res  = await authFetch('/api/solicitudes', {
      method: 'POST',
      body:   JSON.stringify({
        tipo:           'admin',
        targetNombre:   form.nombre,
        targetUsername: form.username,
        targetPassword: form.password,
        targetTelefono: form.telefono || null,
      }),
    })
    const data = await res.json()
    setEnviando(false)
    if (res.ok) {
      setOk('Solicitud enviada. El superadmin recibirá la petición.')
      setForm(formVacio)
      cargar()
    } else {
      setError(data.message)
    }
  }

  if (loading) return (
    <div className="d-flex justify-content-center py-5">
      <div className="spinner-border" style={{ color: '#0066CC' }} />
    </div>
  )

  return (
    <div>
      <h4 className="fw-bold mb-4" style={{ color: '#0f1d3e' }}>
        <i className="bi bi-send-check-fill me-2" style={{ color: '#0066CC' }}></i>
        Mis Solicitudes
      </h4>

      {/* ── Solicitar nuevo admin ─────────────────────────── */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white border-0 pt-3 fw-semibold">
          <i className="bi bi-person-plus me-2"></i>Solicitar nuevo administrador
        </div>
        <div className="card-body">
          <form onSubmit={enviarAdmin}>
            <div className="row g-3">
              <div className="col-sm-4">
                <label className="form-label small fw-semibold">Nombre completo</label>
                <input className="form-control" placeholder="Ej: María López"
                  value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
              </div>
              <div className="col-sm-4">
                <label className="form-label small fw-semibold">Usuario</label>
                <input className="form-control" placeholder="Ej: maria_admin"
                  value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
              </div>
              <div className="col-sm-4">
                <label className="form-label small fw-semibold">Contraseña inicial</label>
                <input type="password" className="form-control" placeholder="Mínimo 4 caracteres"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={4} />
                <input type="tel" className="form-control mt-2" placeholder="Celular (opcional, ej: 0991234567)"
                  value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
              </div>
            </div>
            {error && <div className="alert alert-danger mt-3 py-2 small">{error}</div>}
            {ok    && <div className="alert alert-success mt-3 py-2 small">{ok}</div>}
            <button type="submit" className="btn mt-3 fw-semibold text-white"
              style={{ background: '#0066CC' }} disabled={enviando}>
              {enviando ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-send me-2"></i>}
              Enviar solicitud
            </button>
          </form>
        </div>
      </div>

      {/* ── Historial ────────────────────────────────────── */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-0 pt-3 fw-semibold">Historial de solicitudes</div>
        <div className="card-body p-0">
          {solicitudes.length === 0 ? (
            <div className="text-center text-muted py-5">
              <i className="bi bi-inbox fs-2 d-block mb-2"></i>
              No has enviado solicitudes aún
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Nombre</th>
                    <th>Usuario</th>
                    <th className="text-center">Estado</th>
                    <th>Nota del superadmin</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudes.map(s => (
                    <tr key={s.id}>
                      <td className="fw-semibold">{s.targetNombre}</td>
                      <td><code className="text-muted">{s.targetUsername || '—'}</code></td>
                      <td className="text-center">
                        <span className={`badge ${BADGE[s.estado]}`}>{s.estado}</span>
                      </td>
                      <td className="text-muted small">{s.nota || '—'}</td>
                      <td style={{ fontSize: '0.8rem' }} className="text-muted">
                        {new Date(s.creadoEn).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
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
  )
}
