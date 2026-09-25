import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'

const NAVY  = '#0f1d3e'
const AZUL  = '#0066CC'
const GRIS  = '#6b7a8c'
const BORDE = '#e3e8ef'

function Tarjeta({ titulo, icono, children }) {
  return (
    <div className="bg-white rounded-3" style={{ border: `1px solid ${BORDE}` }}>
      <div className="px-4 py-3 fw-semibold d-flex align-items-center gap-2" style={{ borderBottom: `1px solid ${BORDE}`, color: NAVY }}>
        <i className={`bi ${icono}`} style={{ color: AZUL }}></i>{titulo}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

// Campo de contraseña con "ojito" para ver/ocultar lo escrito
function CampoPassword({ value, onChange, placeholder, style, autoFocus, required, minLength }) {
  const [ver, setVer] = useState(false)
  return (
    <div className="input-group input-group-sm" style={style}>
      <input type={ver ? 'text' : 'password'} className="form-control form-control-sm" placeholder={placeholder}
        value={value} onChange={onChange} autoFocus={autoFocus} required={required} minLength={minLength} />
      <button type="button" className="btn btn-outline-secondary" tabIndex={-1} title={ver ? 'Ocultar' : 'Ver contraseña'} onClick={() => setVer(v => !v)}>
        <i className={`bi ${ver ? 'bi-eye-slash' : 'bi-eye'}`}></i>
      </button>
    </div>
  )
}

const Etiqueta = ({ children }) => (
  <div style={{ fontSize: 11, letterSpacing: '.12em', color: GRIS, textTransform: 'uppercase', marginBottom: 4 }}>{children}</div>
)

export default function AdminCuenta() {
  const { authFetch } = useAuth()
  const [cuenta,   setCuenta]   = useState(null)
  const [error,    setError]    = useState('')
  const [ok,       setOk]       = useState('')
  const [guardando, setGuardando] = useState(false)

  const [telefono, setTelefono] = useState('')

  // Verificación en dos pasos
  const [pasoTotp,  setPasoTotp]  = useState('idle')   // idle | password | qr
  const [pwdTotp,   setPwdTotp]   = useState('')
  const [qr,        setQr]        = useState(null)      // { qr, secret }
  const [codTotp,   setCodTotp]   = useState('')
  const [codLogin,  setCodLogin]  = useState('')
  const [desact,    setDesact]    = useState(false)
  const [pwdDesact, setPwdDesact] = useState('')
  const [codDesact, setCodDesact] = useState('')

  // Cambio de contraseña
  const [pw, setPw] = useState({ actual: '', nueva: '', repetir: '', codigo: '' })

  async function cargar() {
    const res = await authFetch('/api/auth/me')
    if (res.ok) { const d = await res.json(); setCuenta(d.admin); setTelefono(d.admin.telefono || '') }
  }
  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function aviso(tipo, msg) { if (tipo === 'ok') { setOk(msg); setError('') } else { setError(msg); setOk('') } }

  async function llamar(url, body, method = 'POST') {
    setGuardando(true)
    const res = await authFetch(url, { method, body: JSON.stringify(body) })
    const d = await res.json().catch(() => ({}))
    setGuardando(false)
    if (!res.ok) { aviso('error', d.message || 'No se pudo completar'); return null }
    return d
  }

  async function guardarTelefono() {
    const d = await llamar('/api/auth/me', { telefono }, 'PUT')
    if (d) { setCuenta(d.admin); aviso('ok', 'Celular guardado') }
  }

  async function iniciarTotp() {
    const d = await llamar('/api/auth/totp/iniciar', { password: pwdTotp })
    if (d) { setQr(d); setPasoTotp('qr'); setPwdTotp(''); setError('') }
  }
  async function confirmarTotp() {
    const d = await llamar('/api/auth/totp/confirmar', { codigo: codTotp })
    if (d) { setCuenta(d.admin); setPasoTotp('idle'); setQr(null); setCodTotp(''); aviso('ok', 'Verificación en dos pasos activada') }
  }
  async function cambiarTotpLogin(activar) {
    if (!codLogin) { aviso('error', 'Escribe el código de tu app para confirmar'); return }
    const d = await llamar('/api/auth/totp/login', { activar, codigo: codLogin }, 'PUT')
    if (d) { setCuenta(d.admin); setCodLogin(''); aviso('ok', activar ? 'Ahora también se pedirá el código al iniciar sesión' : 'Ya no se pedirá el código al iniciar sesión') }
  }
  async function desactivarTotp() {
    const d = await llamar('/api/auth/totp/desactivar', { password: pwdDesact, codigo: codDesact })
    if (d) { setCuenta(d.admin); setDesact(false); setPwdDesact(''); setCodDesact(''); aviso('ok', 'Verificación en dos pasos desactivada') }
  }

  async function cambiarPassword(e) {
    e.preventDefault()
    if (pw.nueva !== pw.repetir) { aviso('error', 'La contraseña nueva no coincide en los dos campos'); return }
    const d = await llamar('/api/auth/cambiar-password', { actual: pw.actual, nueva: pw.nueva, codigo: pw.codigo })
    if (d) { setPw({ actual: '', nueva: '', repetir: '', codigo: '' }); aviso('ok', 'Contraseña actualizada. Úsala en tu próximo inicio de sesión.') }
  }

  if (!cuenta) return <div className="d-flex justify-content-center py-5"><div className="spinner-border" style={{ color: AZUL }} /></div>

  return (
    <div className="d-flex flex-column gap-4" style={{ maxWidth: 820 }}>
      <div>
        <div style={{ fontSize: 12, letterSpacing: '.14em', color: GRIS, textTransform: 'uppercase' }}>Seguridad</div>
        <h3 className="fw-bold mb-1" style={{ color: NAVY }}>Mi cuenta</h3>
        <div className="text-muted small">Tus datos de contacto, la verificación en dos pasos y tu contraseña.</div>
      </div>

      {error && <div className="alert alert-danger py-2 small mb-0 d-flex justify-content-between"><span>{error}</span><button className="btn-close btn-sm" onClick={() => setError('')}></button></div>}
      {ok    && <div className="alert alert-success py-2 small mb-0 d-flex justify-content-between"><span>{ok}</span><button className="btn-close btn-sm" onClick={() => setOk('')}></button></div>}

      {/* ── Datos ───────────────────────────────────────────── */}
      <Tarjeta titulo="Datos de la cuenta" icono="bi-person-circle">
        <div className="row g-3 align-items-end">
          <div className="col-6 col-md-3"><Etiqueta>Usuario</Etiqueta><div className="fw-semibold">{cuenta.username}</div></div>
          <div className="col-6 col-md-3"><Etiqueta>Rol</Etiqueta><div className="fw-semibold text-capitalize">{cuenta.rol}</div></div>
          <div className="col-12 col-md-4">
            <Etiqueta>Celular</Etiqueta>
            <input type="tel" className="form-control form-control-sm" placeholder="Ej: 0991234567" value={telefono} onChange={e => setTelefono(e.target.value)} />
          </div>
          <div className="col-12 col-md-2">
            <button className="btn btn-sm w-100 text-white fw-semibold" style={{ background: AZUL }} disabled={guardando} onClick={guardarTelefono}>Guardar</button>
          </div>
        </div>
      </Tarjeta>

      {/* ── Verificación en dos pasos ───────────────────────── */}
      <Tarjeta titulo="Verificación en dos pasos" icono="bi-shield-lock-fill">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div className="d-flex align-items-center gap-2">
            <span className={`badge ${cuenta.totpActivo ? 'bg-success' : 'bg-secondary'}`}>{cuenta.totpActivo ? 'Activa' : 'No activada'}</span>
            <span className="small text-muted">
              {cuenta.totpActivo
                ? 'Tu celular con la app autenticadora protege el cambio de contraseña.'
                : 'Protege tu cuenta con un código de 6 dígitos desde Google Authenticator (gratis).'}
            </span>
          </div>
          {!cuenta.totpActivo && pasoTotp === 'idle' && (
            <button className="btn btn-sm text-white fw-semibold" style={{ background: AZUL }} onClick={() => setPasoTotp('password')}>
              <i className="bi bi-qr-code me-1"></i>Activar
            </button>
          )}
        </div>

        {!cuenta.totpActivo && pasoTotp === 'password' && (
          <div className="rounded-3 p-3" style={{ background: '#f0f7ff' }}>
            <div className="small mb-2">Para empezar, confirma tu contraseña actual:</div>
            <div className="d-flex flex-wrap gap-2">
              <CampoPassword style={{ maxWidth: 280 }} placeholder="Contraseña actual"
                value={pwdTotp} onChange={e => setPwdTotp(e.target.value)} autoFocus />
              <button className="btn btn-sm text-white fw-semibold" style={{ background: AZUL }} disabled={guardando || !pwdTotp} onClick={iniciarTotp}>Continuar</button>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => { setPasoTotp('idle'); setPwdTotp('') }}>Cancelar</button>
            </div>
          </div>
        )}

        {!cuenta.totpActivo && pasoTotp === 'qr' && qr && (
          <div className="rounded-3 p-3 d-flex flex-wrap gap-4" style={{ background: '#f0f7ff' }}>
            <img src={qr.qr} alt="Código QR para la app autenticadora" width={200} height={200} style={{ background: '#fff', borderRadius: 8, border: `1px solid ${BORDE}` }} />
            <div className="flex-grow-1" style={{ minWidth: 260 }}>
              <ol className="small ps-3 mb-2">
                <li>Instala <strong>Google Authenticator</strong> en tu celular (Play Store / App Store).</li>
                <li>Ábrela, toca <strong>+</strong> y <strong>escanea este código QR</strong>.</li>
                <li>Escribe aquí el código de 6 dígitos que te muestra:</li>
              </ol>
              <div className="d-flex flex-wrap gap-2">
                <input type="text" inputMode="numeric" className="form-control form-control-sm" style={{ maxWidth: 160, letterSpacing: '.2em' }} placeholder="000000"
                  value={codTotp} onChange={e => setCodTotp(e.target.value)} maxLength={7} autoFocus />
                <button className="btn btn-sm text-white fw-semibold" style={{ background: AZUL }} disabled={guardando || codTotp.length < 6} onClick={confirmarTotp}>Confirmar</button>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => { setPasoTotp('idle'); setQr(null); setCodTotp('') }}>Cancelar</button>
              </div>
              <div className="text-muted mt-2" style={{ fontSize: 12 }}>Si no puedes escanear, escribe esta clave en la app: <code>{qr.secret}</code></div>
            </div>
          </div>
        )}

        {cuenta.totpActivo && (
          <div className="d-flex flex-column gap-3">
            <div className="rounded-3 p-3" style={{ background: '#f8fafb', border: `1px solid ${BORDE}` }}>
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div>
                  <div className="fw-semibold small">Pedir el código también al iniciar sesión</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>{cuenta.totpLogin ? 'Activado: al entrar al panel se pide contraseña y código.' : 'Desactivado: solo se pide el código para cambiar la contraseña.'}</div>
                </div>
                <div className="d-flex gap-2">
                  <input type="text" inputMode="numeric" className="form-control form-control-sm" style={{ maxWidth: 130 }} placeholder="Código" value={codLogin} onChange={e => setCodLogin(e.target.value)} maxLength={7} />
                  <button className={`btn btn-sm fw-semibold ${cuenta.totpLogin ? 'btn-outline-secondary' : 'text-white'}`} style={cuenta.totpLogin ? {} : { background: AZUL }}
                    disabled={guardando} onClick={() => cambiarTotpLogin(!cuenta.totpLogin)}>
                    {cuenta.totpLogin ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            </div>
            {!desact ? (
              <button className="btn btn-sm btn-link text-decoration-none p-0 text-start" style={{ color: GRIS }} onClick={() => setDesact(true)}>Quitar la verificación en dos pasos…</button>
            ) : (
              <div className="rounded-3 p-3" style={{ background: '#fff4e5', border: '1px solid #f2c063' }}>
                <div className="small mb-2">Para quitarla, confirma tu contraseña y el código actual de la app:</div>
                <div className="d-flex flex-wrap gap-2">
                  <CampoPassword style={{ maxWidth: 240 }} placeholder="Contraseña" value={pwdDesact} onChange={e => setPwdDesact(e.target.value)} />
                  <input type="text" inputMode="numeric" className="form-control form-control-sm" style={{ maxWidth: 130 }} placeholder="Código" value={codDesact} onChange={e => setCodDesact(e.target.value)} maxLength={7} />
                  <button className="btn btn-sm btn-danger fw-semibold" disabled={guardando} onClick={desactivarTotp}>Sí, quitar</button>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setDesact(false)}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        )}
      </Tarjeta>

      {/* ── Cambiar contraseña ──────────────────────────────── */}
      <Tarjeta titulo="Cambiar contraseña" icono="bi-key-fill">
        {!cuenta.totpActivo ? (
          <div className="d-flex align-items-center gap-2 small" style={{ color: '#b45309' }}>
            <i className="bi bi-exclamation-circle"></i>
            Para cambiar la contraseña primero activa la verificación en dos pasos (arriba). Así nadie puede cambiarla sin tu celular.
          </div>
        ) : (
          <form onSubmit={cambiarPassword} className="row g-3">
            <div className="col-12 col-md-6"><Etiqueta>Contraseña actual</Etiqueta><CampoPassword required value={pw.actual} onChange={e => setPw(p => ({ ...p, actual: e.target.value }))} /></div>
            <div className="col-12 col-md-6"><Etiqueta>Código de tu app</Etiqueta><input type="text" inputMode="numeric" className="form-control form-control-sm" required maxLength={7} placeholder="000000" value={pw.codigo} onChange={e => setPw(p => ({ ...p, codigo: e.target.value }))} /></div>
            <div className="col-12 col-md-6"><Etiqueta>Contraseña nueva</Etiqueta><CampoPassword required minLength={6} value={pw.nueva} onChange={e => setPw(p => ({ ...p, nueva: e.target.value }))} /></div>
            <div className="col-12 col-md-6"><Etiqueta>Repetir contraseña nueva</Etiqueta><CampoPassword required minLength={6} value={pw.repetir} onChange={e => setPw(p => ({ ...p, repetir: e.target.value }))} /></div>
            <div className="col-12">
              <button type="submit" className="btn btn-sm text-white fw-semibold" style={{ background: AZUL }} disabled={guardando}>
                <i className="bi bi-check-lg me-1"></i>Cambiar contraseña
              </button>
            </div>
          </form>
        )}
      </Tarjeta>
    </div>
  )
}
