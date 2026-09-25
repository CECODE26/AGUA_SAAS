// Panel de la plataforma Agua Elite: los dueños del SaaS dan de alta distribuidoras,
// las editan, las suspenden y restablecen el acceso de su superadmin.
import { useCallback, useEffect, useState } from 'react'
import { apiUrl } from '../../lib/api'

const NAVY  = '#0f1d3e'
const AZUL  = '#0066CC'
const BORDE = '#e3e8ef'
const CLAVE_TOKEN = 'plataforma_token'

const VACIA = {
  nombre: '', slug: '', dominio: '', colorPrimario: '#0066CC', plan: 'basico',
  telefono: '', whatsapp: '', emailAvisos: '', ciudad: '', provincia: '',
  superadmin: { username: 'superadmin', password: '' },
}

// "Agua del Norte" → "agua-del-norte"
function sugerirSlug(nombre) {
  return nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

function usePlataforma() {
  const [token, setToken] = useState(() => localStorage.getItem(CLAVE_TOKEN))
  const salir = useCallback(() => { localStorage.removeItem(CLAVE_TOKEN); setToken(null) }, [])
  const llamar = useCallback(async (path, opts = {}) => {
    const res = await fetch(apiUrl(`/api/plataforma${path}`), {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers },
    })
    const data = await res.json().catch(() => ({}))
    if (res.status === 401) salir()
    if (!res.ok) throw new Error(data.message || 'No se pudo completar')
    return data
  }, [token, salir])
  const entrar = t => { localStorage.setItem(CLAVE_TOKEN, t); setToken(t) }
  return { token, entrar, salir, llamar }
}

export default function PlataformaPanel() {
  const api = usePlataforma()
  useEffect(() => { document.title = 'Agua Elite · Plataforma' }, [])
  return (
    <div className="min-vh-100" style={{ background: '#f2f6fa' }}>
      {api.token ? <Distribuidoras api={api} /> : <Login api={api} />}
    </div>
  )
}

function Login({ api }) {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setCargando(true); setError('')
    try {
      const d = await api.llamar('/login', { method: 'POST', body: JSON.stringify(form) })
      api.entrar(d.token)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 p-3">
      <form onSubmit={enviar} className="bg-white rounded-4 p-4 w-100" style={{ maxWidth: 380, border: `1px solid ${BORDE}` }}>
        <div className="text-center mb-4">
          <i className="bi bi-droplet-half" style={{ fontSize: 32, color: AZUL }}></i>
          <h1 className="h5 fw-bold mt-2 mb-0" style={{ color: NAVY }}>Agua Elite · Plataforma</h1>
          <div className="text-muted small">Solo para el equipo de la plataforma</div>
        </div>
        {error && <div className="alert alert-danger py-2 small">{error}</div>}
        <label className="form-label small fw-semibold" htmlFor="p-user">Usuario</label>
        <input id="p-user" className="form-control mb-3" autoComplete="username" value={form.username}
          onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
        <label className="form-label small fw-semibold" htmlFor="p-pass">Contraseña</label>
        <input id="p-pass" type="password" className="form-control mb-4" autoComplete="current-password" value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
        <button className="btn w-100 fw-semibold text-white" style={{ background: AZUL }} disabled={cargando}>
          {cargando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}

function Distribuidoras({ api }) {
  const [lista, setLista] = useState(null)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [editando, setEditando] = useState(null)   // null | 'nueva' | distribuidora
  const [detalle, setDetalle] = useState(null)     // distribuidora con sus admins

  const cargar = useCallback(async () => {
    try { setLista((await api.llamar('/distribuidoras')).distribuidoras) } catch (e) { setError(e.message) }
  }, [api])
  useEffect(() => { cargar() }, [cargar])

  async function alternarActivo(d) {
    const accion = d.activo ? 'suspender' : 'reactivar'
    if (d.activo && !window.confirm(`¿Suspender ${d.nombre}? Su sitio, su panel y sus apps dejarán de funcionar.`)) return
    try {
      await api.llamar(`/distribuidoras/${d.id}`, { method: 'PATCH', body: JSON.stringify({ activo: !d.activo }) })
      setOk(`${d.nombre}: ${accion === 'suspender' ? 'suspendida' : 'reactivada'}`)
      cargar()
    } catch (e) { setError(e.message) }
  }

  async function verDetalle(d) {
    try { setDetalle((await api.llamar(`/distribuidoras/${d.id}`)).distribuidora) } catch (e) { setError(e.message) }
  }

  return (
    <div className="container py-4" style={{ maxWidth: 1100 }}>
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-2 mb-3">
        <div>
          <div style={{ fontSize: 12, letterSpacing: '.14em', color: '#6b7a8c', textTransform: 'uppercase' }}>Agua Elite · Plataforma</div>
          <h1 className="h3 fw-bold mb-0" style={{ color: NAVY }}>Distribuidoras</h1>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-sm fw-semibold text-white" style={{ background: AZUL }} onClick={() => setEditando('nueva')}>
            <i className="bi bi-plus-lg me-1"></i>Nueva distribuidora
          </button>
          <button className="btn btn-sm btn-outline-secondary" onClick={api.salir}>Salir</button>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 small d-flex justify-content-between"><span>{error}</span><button className="btn-close btn-sm" onClick={() => setError('')}></button></div>}
      {ok && <div className="alert alert-success py-2 small d-flex justify-content-between"><span>{ok}</span><button className="btn-close btn-sm" onClick={() => setOk('')}></button></div>}

      {editando && (
        <FormDistribuidora
          api={api}
          inicial={editando === 'nueva' ? null : editando}
          onCerrar={() => setEditando(null)}
          onGuardada={d => { setEditando(null); setOk(`${d.nombre} guardada`); cargar() }}
        />
      )}

      {detalle && <Detalle api={api} d={detalle} onCerrar={() => setDetalle(null)} onOk={setOk} onError={setError} />}

      <div className="bg-white rounded-3 overflow-hidden" style={{ border: `1px solid ${BORDE}` }}>
        {!lista ? (
          <div className="d-flex justify-content-center py-5"><div className="spinner-border" style={{ color: AZUL }} /></div>
        ) : lista.length === 0 ? (
          <div className="text-center text-muted py-5">Todavía no hay distribuidoras. Crea la primera.</div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0" style={{ fontSize: 14 }}>
              <thead style={{ background: '#f8fafc', fontSize: 11, letterSpacing: '.1em', color: '#6b7a8c', textTransform: 'uppercase' }}>
                <tr>
                  <th className="ps-3 fw-medium">Distribuidora</th>
                  <th className="fw-medium">Dirección web</th>
                  <th className="fw-medium text-end">Pedidos</th>
                  <th className="fw-medium text-end">Clientes</th>
                  <th className="fw-medium text-end">Choferes</th>
                  <th className="fw-medium">Estado</th>
                  <th className="pe-3 fw-medium text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lista.map(d => (
                  <tr key={d.id}>
                    <td className="ps-3">
                      <div className="d-flex align-items-center gap-2">
                        <span className="rounded-circle d-inline-block" style={{ width: 12, height: 12, background: d.colorPrimario }} aria-hidden="true"></span>
                        <div>
                          <div className="fw-semibold">{d.nombre}</div>
                          <div className="text-muted small">{d.slug} · plan {d.plan}</div>
                        </div>
                      </div>
                    </td>
                    <td className="small">{d.dominio || <span className="text-muted">subdominio {d.slug}</span>}</td>
                    <td className="text-end">{d._count.pedidos}</td>
                    <td className="text-end">{d._count.clientes}</td>
                    <td className="text-end">{d._count.conductores}</td>
                    <td>
                      {d.activo
                        ? <span className="badge rounded-pill" style={{ background: '#e7f6ee', color: '#166534' }}>Activa</span>
                        : <span className="badge rounded-pill" style={{ background: '#fdecec', color: '#991b1b' }}>Suspendida</span>}
                    </td>
                    <td className="pe-3 text-end text-nowrap">
                      <button className="btn btn-sm btn-link text-decoration-none" onClick={() => verDetalle(d)}>Accesos</button>
                      <button className="btn btn-sm btn-link text-decoration-none" onClick={() => setEditando(d)}>Editar</button>
                      <button className={`btn btn-sm btn-link text-decoration-none ${d.activo ? 'text-danger' : 'text-success'}`} onClick={() => alternarActivo(d)}>
                        {d.activo ? 'Suspender' : 'Reactivar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function FormDistribuidora({ api, inicial, onCerrar, onGuardada }) {
  const nueva = !inicial
  const [form, setForm] = useState(() => nueva ? VACIA : {
    ...VACIA,
    ...Object.fromEntries(Object.keys(VACIA).filter(k => k !== 'superadmin').map(k => [k, inicial[k] ?? ''])),
  })
  const [slugTocado, setSlugTocado] = useState(!nueva)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  function cambiar(e) {
    const { name, value } = e.target
    setForm(f => {
      const sig = { ...f, [name]: value }
      if (name === 'nombre' && !slugTocado) sig.slug = sugerirSlug(value)
      return sig
    })
    if (name === 'slug') setSlugTocado(true)
  }

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true); setError('')
    const { superadmin, ...datos } = form
    try {
      const d = nueva
        ? await api.llamar('/distribuidoras', { method: 'POST', body: JSON.stringify({ ...datos, superadmin }) })
        : await api.llamar(`/distribuidoras/${inicial.id}`, { method: 'PATCH', body: JSON.stringify(datos) })
      onGuardada(d.distribuidora)
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  const campo = (name, label, props = {}) => (
    <div className={props.col || 'col-md-6'}>
      <label className="form-label small fw-semibold mb-1" htmlFor={`d-${name}`}>{label}</label>
      <input id={`d-${name}`} name={name} className="form-control" value={form[name] ?? ''} onChange={cambiar} {...props.input} />
      {props.ayuda && <div className="form-text">{props.ayuda}</div>}
    </div>
  )

  return (
    <form onSubmit={guardar} className="bg-white rounded-3 p-4 mb-3" style={{ border: `1px solid ${AZUL}` }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h6 fw-bold mb-0" style={{ color: NAVY }}>{nueva ? 'Nueva distribuidora' : `Editar ${inicial.nombre}`}</h2>
        <button type="button" className="btn-close" aria-label="Cerrar" onClick={onCerrar}></button>
      </div>
      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      <div className="row g-3">
        {campo('nombre', 'Nombre comercial', { input: { required: true } })}
        {campo('slug', 'Identificador', { input: { required: true, pattern: '[a-z0-9][a-z0-9-]{1,38}[a-z0-9]' }, ayuda: 'Minúsculas, números y guiones. Es su subdominio y el código de sus apps.' })}
        {campo('dominio', 'Dominio propio (opcional)', { input: { placeholder: 'aguanorte.com' } })}
        <div className="col-md-3">
          <label className="form-label small fw-semibold mb-1" htmlFor="d-color">Color</label>
          <input id="d-color" name="colorPrimario" type="color" className="form-control form-control-color w-100" value={form.colorPrimario || '#0066CC'} onChange={cambiar} />
        </div>
        {campo('plan', 'Plan', { col: 'col-md-3' })}
        {campo('telefono', 'Teléfono')}
        {campo('whatsapp', 'WhatsApp')}
        {campo('emailAvisos', 'Correo de avisos', { input: { type: 'email' } })}
        {campo('ciudad', 'Ciudad', { col: 'col-md-3' })}
        {campo('provincia', 'Provincia', { col: 'col-md-3' })}
      </div>

      {nueva && (
        <div className="rounded-3 p-3 mt-3" style={{ background: '#f8fafc', border: `1px solid ${BORDE}` }}>
          <div className="fw-semibold small mb-2">Primer superadmin (el dueño de la distribuidora)</div>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small mb-1" htmlFor="d-su-user">Usuario</label>
              <input id="d-su-user" className="form-control" required value={form.superadmin.username}
                onChange={e => setForm(f => ({ ...f, superadmin: { ...f.superadmin, username: e.target.value } }))} />
            </div>
            <div className="col-md-6">
              <label className="form-label small mb-1" htmlFor="d-su-pass">Contraseña inicial</label>
              <input id="d-su-pass" type="password" className="form-control" required minLength={8} autoComplete="new-password" value={form.superadmin.password}
                onChange={e => setForm(f => ({ ...f, superadmin: { ...f.superadmin, password: e.target.value } }))} />
              <div className="form-text">Mínimo 8 caracteres. Pídele que la cambie y active la verificación en dos pasos.</div>
            </div>
          </div>
        </div>
      )}

      <div className="d-flex justify-content-end gap-2 mt-3">
        <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>Cancelar</button>
        <button className="btn fw-semibold text-white" style={{ background: AZUL }} disabled={guardando}>
          {guardando ? 'Guardando…' : nueva ? 'Crear distribuidora' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

function Detalle({ api, d, onCerrar, onOk, onError }) {
  const [reset, setReset] = useState(null)   // { id, username, nueva }

  async function restablecer(e) {
    e.preventDefault()
    try {
      await api.llamar(`/distribuidoras/${d.id}/admins/${reset.id}/password`, { method: 'PATCH', body: JSON.stringify({ nueva: reset.nueva }) })
      onOk(`Contraseña de ${reset.username} (${d.nombre}) restablecida`)
      setReset(null)
    } catch (err) { onError(err.message) }
  }

  return (
    <div className="bg-white rounded-3 p-4 mb-3" style={{ border: `1px solid ${BORDE}` }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h6 fw-bold mb-0" style={{ color: NAVY }}>Accesos de {d.nombre}</h2>
        <button type="button" className="btn-close" aria-label="Cerrar" onClick={onCerrar}></button>
      </div>
      <table className="table table-sm align-middle mb-0" style={{ fontSize: 14 }}>
        <tbody>
          {d.admins.map(a => (
            <tr key={a.id}>
              <td className="fw-semibold">{a.username}</td>
              <td>{a.rol}</td>
              <td>{a.activo ? 'Activo' : 'Inactivo'}</td>
              <td className="text-end">
                {reset?.id === a.id ? (
                  <form onSubmit={restablecer} className="d-inline-flex gap-1">
                    <input type="password" className="form-control form-control-sm" placeholder="Contraseña nueva" minLength={8} required autoFocus
                      aria-label={`Contraseña nueva para ${a.username}`} value={reset.nueva} onChange={e => setReset(r => ({ ...r, nueva: e.target.value }))} />
                    <button className="btn btn-sm text-white" style={{ background: AZUL }}>Guardar</button>
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setReset(null)}>Cancelar</button>
                  </form>
                ) : (
                  <button className="btn btn-sm btn-link text-decoration-none" onClick={() => setReset({ id: a.id, username: a.username, nueva: '' })}>
                    Restablecer contraseña
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
