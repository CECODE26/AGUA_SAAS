import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function AdminLogin() {
  const { login, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const [form,        setForm]        = useState({ username: '', password: '', codigo: '' })
  const [pideCodigo,  setPideCodigo]  = useState(false)   // 2.º paso: código de la app autenticadora
  const [error,       setError]       = useState('')
  const [ok,          setOk]          = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [showPassword,setShowPassword]= useState(false)

  // "Olvidé mi contraseña": usuario + código del autenticador + contraseña nueva
  const [recuperando, setRecuperando] = useState(false)
  const [rec,         setRec]         = useState({ username: '', codigo: '', nueva: '', repetir: '' })

  async function handleRecuperar(e) {
    e.preventDefault()
    setError(''); setOk('')
    if (rec.nueva !== rec.repetir) { setError('La contraseña nueva no coincide en los dos campos'); return }
    setSubmitting(true)
    try {
      const res  = await fetch('/api/auth/recuperar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: rec.username, codigo: rec.codigo, nueva: rec.nueva }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.message || 'No se pudo restablecer'); return }
      setOk(data.message || 'Contraseña restablecida')
      setForm(f => ({ ...f, username: rec.username, password: '' }))
      setRec({ username: '', codigo: '', nueva: '', repetir: '' })
      setRecuperando(false)
    } finally { setSubmitting(false) }
  }

  useEffect(() => {
    if (!loading && isAuthenticated) navigate('/admin', { replace: true })
  }, [isAuthenticated, loading, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSubmitting(true)
    try {
      const r = await login(form.username, form.password, pideCodigo ? form.codigo : undefined)
      if (r?.requiereCodigo) { setPideCodigo(true); return }
      navigate('/admin', { replace: true })
    } catch (err) {
      if (err.requiereCodigo) setPideCodigo(true)
      setError(err.message)
    } finally { setSubmitting(false) }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #003d7a 0%, #0066CC 60%, #38bdf8 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden', padding: 16,
    }}>

      {/* Círculos decorativos */}
      <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320,
        borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
      <div style={{ position: 'absolute', bottom: -120, left: -60, width: 400, height: 400,
        borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
      <div style={{ position: 'absolute', top: '40%', left: -40, width: 180, height: 180,
        borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: 40, width: 100, height: 100,
        borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: '0 auto 14px',
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <i className="bi bi-droplet-fill" style={{ fontSize: '2rem', color: '#fff' }} />
          </div>
          <h4 style={{ color: '#fff', fontWeight: 800, marginBottom: 4, fontSize: '1.4rem' }}>
            Agua Manú
          </h4>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', margin: 0 }}>
            Panel de Administración
          </p>
        </div>

        {/* Tarjeta */}
        <div style={{
          background: 'rgba(255,255,255,0.97)',
          borderRadius: 24, padding: '36px 32px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.4)',
        }}>
          <h6 style={{ color: '#003d7a', fontWeight: 800, marginBottom: 24, fontSize: '1rem' }}>
            <i className={`bi ${recuperando ? 'bi-key' : 'bi-shield-lock'} me-2`} style={{ color: '#0066CC' }} />
            {recuperando ? 'Recuperar contraseña' : 'Iniciar sesión'}
          </h6>

          {ok && !recuperando && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#166534' }}>
              <i className="bi bi-check-circle-fill" />{ok}
            </div>
          )}

          {recuperando ? (
            <form onSubmit={handleRecuperar}>
              <p style={{ fontSize: '0.8rem', color: '#4b5563', marginBottom: 16 }}>
                Escribe tu usuario, el código de <strong>Google Authenticator</strong> y tu contraseña nueva. Solo funciona si tu cuenta tiene la verificación en dos pasos activada.
              </p>
              {[
                ['username', 'Usuario', 'text', 'Tu usuario'],
                ['codigo', 'Código del autenticador', 'text', '6 dígitos'],
                ['nueva', 'Contraseña nueva', 'password', 'Mínimo 6 caracteres'],
                ['repetir', 'Repetir contraseña nueva', 'password', 'Otra vez'],
              ].map(([k, label, type, ph]) => (
                <div style={{ marginBottom: 14 }} key={k}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#003d7a', display: 'block', marginBottom: 6 }}>{label}</label>
                  <input type={type} placeholder={ph} value={rec[k]} required
                    inputMode={k === 'codigo' ? 'numeric' : undefined} maxLength={k === 'codigo' ? 7 : undefined} minLength={k === 'nueva' || k === 'repetir' ? 6 : undefined}
                    onChange={e => setRec(r => ({ ...r, [k]: e.target.value }))}
                    style={{ width: '100%', padding: '12px 16px', border: '2px solid #bae6fd', borderRadius: 12, fontSize: '0.9rem',
                      outline: 'none', background: '#f0f9ff', color: '#003d7a', boxSizing: 'border-box' }} />
                </div>
              ))}
              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                  display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#dc2626' }}>
                  <i className="bi bi-exclamation-circle-fill" />{error}
                </div>
              )}
              <button type="submit" disabled={submitting} style={{
                width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
                background: submitting ? '#7dd3fc' : 'linear-gradient(135deg, #003d7a, #0066CC)',
                color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {submitting ? <><span className="spinner-border spinner-border-sm" />Guardando...</> : <><i className="bi bi-check-lg" />Restablecer y volver al login</>}
              </button>
              <button type="button" onClick={() => { setRecuperando(false); setError('') }}
                style={{ width: '100%', marginTop: 10, padding: '10px 0', borderRadius: 12, border: '1.5px solid #e5e7eb', background: '#f9fafb', color: '#374151', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                Volver a iniciar sesión
              </button>
            </form>
          ) : (
          <form onSubmit={handleSubmit}>
            {/* Usuario */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#003d7a', display: 'block', marginBottom: 6 }}>
                Usuario
              </label>
              <div style={{ position: 'relative' }}>
                <i className="bi bi-person-fill" style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  color: '#0066CC', fontSize: '0.95rem',
                }} />
                <input type="text" placeholder="Ingresa tu usuario"
                  value={form.username} autoFocus required
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  style={{
                    width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12,
                    border: '2px solid #bae6fd', borderRadius: 12, fontSize: '0.9rem',
                    outline: 'none', background: '#f0f9ff', color: '#003d7a',
                    boxSizing: 'border-box', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#0066CC'}
                  onBlur={e => e.target.style.borderColor = '#bae6fd'}
                />
              </div>
            </div>

            {/* Contraseña */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#003d7a', display: 'block', marginBottom: 6 }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <i className="bi bi-lock-fill" style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  color: '#0066CC', fontSize: '0.95rem',
                }} />
                <input type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                  value={form.password} required
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  style={{
                    width: '100%', paddingLeft: 40, paddingRight: 44, paddingTop: 12, paddingBottom: 12,
                    border: '2px solid #bae6fd', borderRadius: 12, fontSize: '0.9rem',
                    outline: 'none', background: '#f0f9ff', color: '#003d7a',
                    boxSizing: 'border-box', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#0066CC'}
                  onBlur={e => e.target.style.borderColor = '#bae6fd'}
                />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4,
                  }}>
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
                </button>
              </div>
            </div>

            {/* Verificación en dos pasos */}
            {pideCodigo && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#003d7a', display: 'block', marginBottom: 6 }}>
                  Código de verificación
                </label>
                <div style={{ position: 'relative' }}>
                  <i className="bi bi-phone-fill" style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: '#0066CC', fontSize: '0.95rem',
                  }} />
                  <input type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="6 dígitos de tu app autenticadora"
                    value={form.codigo} autoFocus required maxLength={7}
                    onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))}
                    style={{
                      width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12,
                      border: '2px solid #bae6fd', borderRadius: 12, fontSize: '1rem', letterSpacing: '0.2em',
                      outline: 'none', background: '#f0f9ff', color: '#003d7a', boxSizing: 'border-box',
                    }} />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 6 }}>
                  Abre Google Authenticator en tu celular y escribe el código de Agua Manú.
                </div>
              </div>
            )}

            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
                padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
                fontSize: '0.82rem', color: '#dc2626',
              }}>
                <i className="bi bi-exclamation-circle-fill" />{error}
              </div>
            )}

            <button type="submit" disabled={submitting} style={{
              width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
              background: submitting ? '#7dd3fc' : 'linear-gradient(135deg, #003d7a, #0066CC)',
              color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 16px rgba(0,118,62,0.4)', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {submitting
                ? <><span className="spinner-border spinner-border-sm" />Verificando...</>
                : pideCodigo
                  ? <><i className="bi bi-shield-check" />Verificar código</>
                  : <><i className="bi bi-box-arrow-in-right" />Ingresar</>}
            </button>

            <button type="button" onClick={() => { setRecuperando(true); setError(''); setOk(''); setRec(r => ({ ...r, username: form.username })) }}
              style={{ width: '100%', marginTop: 12, background: 'none', border: 'none', color: '#0066CC', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
              ¿Olvidaste tu contraseña?
            </button>
          </form>
          )}

          {/* Link maestro */}
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #e5e7eb' }}>
            <a href="/maestro/login" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 0', borderRadius: 12, border: '1.5px solid #e5e7eb',
              background: '#f9fafb', color: '#374151', textDecoration: 'none',
              fontSize: '0.85rem', fontWeight: 700,
            }}>
              <i className="bi bi-people-fill" style={{ color: '#0284c7' }} />
              Maestro de Clientes
            </a>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, marginBottom: 0 }}>
          <a href="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', textDecoration: 'none' }}>
            ← Volver al sitio
          </a>
        </p>
      </div>
    </div>
  )
}
