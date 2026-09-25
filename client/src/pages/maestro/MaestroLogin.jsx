import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiUrl } from '../../lib/api'
import { useDistribuidora } from '../../context/DistribuidoraContext'

export default function MaestroLogin() {
  const { nombre: nombreMarca } = useDistribuidora()
  const navigate = useNavigate()
  const [form,       setForm]       = useState({ username: '', password: '' })
  const [error,      setError]      = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPwd,    setShowPwd]    = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSubmitting(true)
    try {
      const res  = await fetch(apiUrl('/api/maestro/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Error de acceso')
      localStorage.setItem('maestro_token',  data.token)
      localStorage.setItem('maestro_nombre', data.maestro.nombre)
      navigate('/maestro', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally { setSubmitting(false) }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 60%, #38bdf8 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden', padding: 16,
    }}>

      {/* Círculos decorativos de fondo */}
      <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320,
        borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
      <div style={{ position: 'absolute', bottom: -120, left: -60, width: 400, height: 400,
        borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
      <div style={{ position: 'absolute', top: '40%', left: -40, width: 180, height: 180,
        borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: 40, width: 100, height: 100,
        borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>

        {/* Header con logo y marca */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: '0 auto 14px',
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <i className="bi bi-people-fill" style={{ fontSize: '2rem', color: '#fff' }} />
          </div>
          <h4 style={{ color: '#fff', fontWeight: 800, marginBottom: 4, fontSize: '1.4rem' }}>
            {nombreMarca}
          </h4>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', margin: 0 }}>
            Portal Maestro de Clientes
          </p>
        </div>

        {/* Tarjeta */}
        <div style={{
          background: 'rgba(255,255,255,0.97)',
          borderRadius: 24,
          padding: '36px 32px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.4)',
        }}>
          <h6 style={{ color: '#0c4a6e', fontWeight: 800, marginBottom: 24, fontSize: '1rem' }}>
            <i className="bi bi-shield-lock me-2" style={{ color: '#0284c7' }} />
            Iniciar sesión
          </h6>

          <form onSubmit={handleSubmit}>
            {/* Usuario */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0c4a6e', display: 'block', marginBottom: 6 }}>
                Usuario
              </label>
              <div style={{ position: 'relative' }}>
                <i className="bi bi-person-fill" style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  color: '#0284c7', fontSize: '0.95rem',
                }} />
                <input
                  type="text"
                  placeholder="Ingresa tu usuario"
                  value={form.username}
                  autoFocus
                  required
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  style={{
                    width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12,
                    border: '2px solid #bae6fd', borderRadius: 12, fontSize: '0.9rem',
                    outline: 'none', background: '#f0f9ff', color: '#0c4a6e',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#0284c7'}
                  onBlur={e => e.target.style.borderColor = '#bae6fd'}
                />
              </div>
            </div>

            {/* Contraseña */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0c4a6e', display: 'block', marginBottom: 6 }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <i className="bi bi-lock-fill" style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  color: '#0284c7', fontSize: '0.95rem',
                }} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  required
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  style={{
                    width: '100%', paddingLeft: 40, paddingRight: 44, paddingTop: 12, paddingBottom: 12,
                    border: '2px solid #bae6fd', borderRadius: 12, fontSize: '0.9rem',
                    outline: 'none', background: '#f0f9ff', color: '#0c4a6e',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#0284c7'}
                  onBlur={e => e.target.style.borderColor = '#bae6fd'}
                />
                <button type="button" onClick={() => setShowPwd(p => !p)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4,
                  }}>
                  <i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'}`} />
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
                padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
                fontSize: '0.82rem', color: '#dc2626',
              }}>
                <i className="bi bi-exclamation-circle-fill" />
                {error}
              </div>
            )}

            <button type="submit" disabled={submitting} style={{
              width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
              background: submitting ? '#a78bfa' : 'linear-gradient(135deg, #0369a1, #0284c7)',
              color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 16px rgba(124,58,237,0.4)', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {submitting
                ? <><span className="spinner-border spinner-border-sm" />Verificando...</>
                : <><i className="bi bi-box-arrow-in-right" />Ingresar</>}
            </button>
          </form>
        </div>

        {/* Link admin */}
        <p style={{ textAlign: 'center', marginTop: 20, marginBottom: 0 }}>
          <a href="/admin/login" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', textDecoration: 'none' }}>
            ← Acceso administrador
          </a>
        </p>
      </div>
    </div>
  )
}
