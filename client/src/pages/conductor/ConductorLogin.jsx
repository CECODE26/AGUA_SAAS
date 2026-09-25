import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ConductorLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/conductores/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      localStorage.setItem('conductor_token',  data.token)
      localStorage.setItem('conductor_nombre', data.conductor.nombre)
      navigate('/conductor/ruta')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center"
      style={{ background: '#0f1d3e' }}>
      <div className="card border-0 shadow-lg p-4" style={{ width: '100%', maxWidth: 380 }}>
        <div className="text-center mb-4">
          <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
            style={{ width: 60, height: 60, background: '#0066CC' }}>
            <i className="bi bi-truck text-white fs-4"></i>
          </div>
          <h5 className="fw-bold mb-0">Agua Manú</h5>
          <p className="text-muted small">Acceso para conductores</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label small fw-semibold">Usuario</label>
            <input className="form-control" value={username}
              onChange={e => setUsername(e.target.value)} autoComplete="username" required />
          </div>
          <div className="mb-3">
            <label className="form-label small fw-semibold">Contraseña</label>
            <input type="password" className="form-control" value={password}
              onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>
          {error && <div className="alert alert-danger py-2 small">{error}</div>}
          <button type="submit" className="btn w-100 fw-semibold text-white"
            style={{ background: '#0066CC' }} disabled={loading}>
            {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : null}
            Entrar
          </button>
        </form>
      </div>
    </div>
  )
}
