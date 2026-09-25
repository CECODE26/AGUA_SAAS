import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContextMobile'
import { useDistribuidora } from '../../context/DistribuidoraContext'

export default function AdminLoginMobile() {
  const { nombre: nombreMarca } = useDistribuidora()
  const { login, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm]           = useState({ username: '', password: '' })
  const [error, setError]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPass, setShowPass]   = useState(false)

  useEffect(() => {
    if (!loading && isAuthenticated) navigate('/admin/pedidos', { replace: true })
  }, [isAuthenticated, loading, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(form.username, form.password)
      navigate('/admin/pedidos', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #003380 0%, #0066CC 55%, #0099ee 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '24px',
        padding: '32px 24px',
        width: '100%',
        maxWidth: '380px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '64px', height: '64px',
            background: '#0066CC',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <svg viewBox="0 0 24 30" fill="none" style={{ width: '28px', height: '36px' }}>
              <path d="M12 2C12 2 3 12 3 18C3 23 7.03 27 12 27C16.97 27 21 23 21 18C21 12 12 2 12 2Z" fill="#fff" />
            </svg>
          </div>
          <h2 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0066CC', margin: '0 0 4px' }}>
            {nombreMarca}
          </h2>
          <p style={{ fontSize: '0.78rem', color: '#888', margin: 0 }}>Panel de Administración</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Usuario */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#444', display: 'block', marginBottom: '6px' }}>
              Usuario
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                fontSize: '1rem', color: '#aaa',
              }}>👤</span>
              <input
                type="text"
                placeholder="admin"
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                required
                autoFocus
                style={{
                  width: '100%', border: '1.5px solid #e0e0e0',
                  borderRadius: '12px', padding: '12px 14px 12px 38px',
                  fontSize: '1rem', outline: 'none', boxSizing: 'border-box',
                  WebkitUserSelect: 'text', userSelect: 'text',
                  WebkitAppearance: 'none',
                }}
              />
            </div>
          </div>

          {/* Contraseña */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#444', display: 'block', marginBottom: '6px' }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                fontSize: '1rem', color: '#aaa',
              }}>🔒</span>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required
                style={{
                  width: '100%', border: '1.5px solid #e0e0e0',
                  borderRadius: '12px', padding: '12px 44px 12px 38px',
                  fontSize: '1rem', outline: 'none', boxSizing: 'border-box',
                  WebkitUserSelect: 'text', userSelect: 'text',
                  WebkitAppearance: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#aaa',
                }}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: '#fdecea', color: '#c0392b',
              borderRadius: '10px', padding: '10px 14px',
              fontSize: '0.8rem', marginBottom: '14px',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              background: submitting ? '#9ca3af' : 'linear-gradient(135deg, #0066CC, #0088dd)',
              color: '#fff', border: 'none',
              borderRadius: '14px', padding: '14px',
              fontWeight: 800, fontSize: '1rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            {submitting
              ? <><span style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Verificando...</>
              : <>🔓 Entrar</>
            }
          </button>
        </form>

        <button
          onClick={() => navigate('/')}
          style={{
            width: '100%', background: 'none', border: 'none',
            color: '#0066CC', fontSize: '0.8rem', fontWeight: 600,
            cursor: 'pointer', marginTop: '16px', textAlign: 'center',
          }}
        >
          ← Volver al inicio
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
