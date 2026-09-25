import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiUrl } from '../../lib/api'

export default function ConductorLoginMobile() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showPass, setShowPass] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res  = await fetch(apiUrl('/api/conductores/login'), {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      localStorage.setItem('conductor_token',  data.token)
      localStorage.setItem('conductor_nombre', data.conductor.nombre)
      navigate('/conductor/ruta')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0f1d3e 0%, #1a3a6b 60%, #0066CC 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: '#fff', borderRadius: '24px',
        padding: '32px 24px', width: '100%', maxWidth: '380px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '64px', height: '64px', background: '#0066CC',
            borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 12px', fontSize: '1.8rem',
          }}>
            🚚
          </div>
          <h2 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f1d3e', margin: '0 0 4px' }}>
            Agua Manú
          </h2>
          <p style={{ fontSize: '0.78rem', color: '#888', margin: 0 }}>Acceso para conductores</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Usuario */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#444', display: 'block', marginBottom: '6px' }}>
              Usuario
            </label>
            <input
              type="text"
              placeholder="Tu usuario"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
              style={{
                width: '100%', border: '1.5px solid #e0e0e0',
                borderRadius: '12px', padding: '12px 14px',
                fontSize: '1rem', outline: 'none', boxSizing: 'border-box',
                WebkitUserSelect: 'text', userSelect: 'text',
                WebkitAppearance: 'none',
              }}
            />
          </div>

          {/* Contraseña */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#444', display: 'block', marginBottom: '6px' }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%', border: '1.5px solid #e0e0e0',
                  borderRadius: '12px', padding: '12px 44px 12px 14px',
                  fontSize: '1rem', outline: 'none', boxSizing: 'border-box',
                  WebkitUserSelect: 'text', userSelect: 'text',
                  WebkitAppearance: 'none',
                }}
              />
              <button type="button" onClick={() => setShowPass(p => !p)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#aaa',
                }}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: '#fdecea', color: '#c0392b', borderRadius: '10px',
              padding: '10px 14px', fontSize: '0.8rem', marginBottom: '14px',
            }}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%',
            background: loading ? '#9ca3af' : 'linear-gradient(135deg, #0f1d3e, #0066CC)',
            color: '#fff', border: 'none', borderRadius: '14px',
            padding: '14px', fontWeight: 800, fontSize: '1rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
            {loading
              ? <><span style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Verificando...</>
              : <>🚚 Entrar</>
            }
          </button>
        </form>

        <button onClick={() => navigate('/')} style={{
          width: '100%', background: 'none', border: 'none',
          color: '#0066CC', fontSize: '0.8rem', fontWeight: 600,
          cursor: 'pointer', marginTop: '16px', textAlign: 'center',
        }}>
          ← Volver al inicio
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
