// Panel de la plataforma Agua Elite.
//   superadmin (el dueño de Agua Elite): ve todas las empresas, el ingreso mensual separado
//     por quién las vendió, entra al panel de cualquiera ("Ingresar") y maneja revendedores.
//   revendedor: activa empresas y ve solo las suyas.
// El menú lateral tiene una sola sección: Empresas.
import { useCallback, useEffect, useState } from 'react'
import { apiUrl } from '../../lib/api'

const NAVY  = '#0f1d3e'
const AZUL  = '#0066CC'
const BORDE = '#e3e8ef'
const CLAVE_TOKEN = 'plataforma_token'

const VACIA = {
  nombre: '', slug: '', dominio: '', colorPrimario: '#0066CC', plan: 'basico', precioMensual: '',
  telefono: '', whatsapp: '', emailAvisos: '', ciudad: '', provincia: '', revendedorId: '',
  admin: { username: 'admin', password: '' },
}

const dinero = n => `$${Number(n || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// "Agua del Norte" → "agua-del-norte"
function sugerirSlug(nombre) {
  return nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

// Dirección del panel de una empresa: dominio propio o <slug>.<dominio de la plataforma>
function urlEmpresa({ slug, dominio }, ruta) {
  const { protocol, hostname, port } = window.location
  if (dominio) return `https://${dominio}${ruta}`
  const raiz = hostname.replace(/^www\./, '')
  return `${protocol}//${slug}.${raiz}${port ? `:${port}` : ''}${ruta}`
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
  return api.token ? <Panel api={api} /> : <Login api={api} />
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
    <div className="d-flex align-items-center justify-content-center min-vh-100 p-3" style={{ background: '#f2f6fa' }}>
      <form onSubmit={enviar} className="bg-white rounded-4 p-4 w-100" style={{ maxWidth: 380, border: `1px solid ${BORDE}` }}>
        <div className="text-center mb-4">
          <i className="bi bi-droplet-half" style={{ fontSize: 32, color: AZUL }}></i>
          <h1 className="h5 fw-bold mt-2 mb-0" style={{ color: NAVY }}>Agua Elite · Plataforma</h1>
          <div className="text-muted small">Superadmin y revendedores</div>
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

// ── Marco con el menú lateral (solo "Empresas") ──────────────────────────────
function Panel({ api }) {
  const [yo, setYo] = useState(null)
  useEffect(() => { api.llamar('/yo').then(d => setYo(d.yo)).catch(() => {}) }, [api])
  const esSuper = yo?.rol !== 'revendedor'

  return (
    <div className="d-flex min-vh-100" style={{ background: '#f2f6fa' }}>
      <aside className="d-none d-md-flex flex-column flex-shrink-0 p-3" style={{ width: 240, background: NAVY, color: '#fff' }}>
        <div className="d-flex align-items-center gap-2 mb-4 px-2">
          <i className="bi bi-droplet-half" style={{ fontSize: 22, color: '#A8E4F0' }}></i>
          <div style={{ lineHeight: 1.2 }}>
            <div className="fw-bold">Agua Elite</div>
            <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: esSuper ? '#a78bfa' : '#8fa3c4' }}>
              {yo ? (esSuper ? 'Superadmin' : 'Revendedor') : ''}
            </div>
          </div>
        </div>
        <nav aria-label="Plataforma">
          <a href="#empresas" className="d-flex align-items-center gap-2 px-3 py-2 rounded-3 text-white text-decoration-none fw-semibold" style={{ background: '#1f3766' }} aria-current="page">
            <i className="bi bi-buildings"></i>Empresas
          </a>
        </nav>
        <div className="mt-auto px-2 small" style={{ color: '#b7c5dc' }}>
          {yo && <div className="mb-2"><i className="bi bi-person-circle me-1"></i>{yo.nombre}</div>}
          <button className="btn btn-sm btn-outline-light w-100" onClick={api.salir}>Salir</button>
        </div>
      </aside>
      <main className="flex-grow-1" style={{ minWidth: 0 }}>
        <div className="d-md-none d-flex align-items-center justify-content-between px-3 py-2" style={{ background: NAVY, color: '#fff' }}>
          <span className="fw-bold"><i className="bi bi-droplet-half me-2"></i>Empresas</span>
          <button className="btn btn-sm btn-outline-light" onClick={api.salir}>Salir</button>
        </div>
        {yo && <Empresas api={api} esSuper={esSuper} />}
      </main>
    </div>
  )
}

function Empresas({ api, esSuper }) {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [editando, setEditando] = useState(null)       // null | 'nueva' | empresa
  const [detalle, setDetalle] = useState(null)         // empresa con usuarios y registro
  const [verRevendedores, setVerRevendedores] = useState(false)
  const [revendedores, setRevendedores] = useState([])
  const [entrando, setEntrando] = useState(null)

  const cargar = useCallback(async () => {
    try {
      setDatos(await api.llamar('/distribuidoras'))
      if (esSuper) setRevendedores((await api.llamar('/revendedores')).revendedores)
    } catch (e) { setError(e.message) }
  }, [api, esSuper])
  useEffect(() => { cargar() }, [cargar])

  async function ingresar(d) {
    setEntrando(d.id); setError('')
    try {
      const r = await api.llamar(`/distribuidoras/${d.id}/ingresar`, { method: 'POST' })
      const volver = `${window.location.origin}/plataforma`
      window.location.assign(urlEmpresa(r, `/soporte/entrar#t=${encodeURIComponent(r.token)}&v=${encodeURIComponent(volver)}`))
    } catch (e) { setError(e.message); setEntrando(null) }
  }

  async function alternarActivo(d) {
    if (d.activo && !window.confirm(`¿Suspender ${d.nombre}? Su sitio, su panel y sus apps dejarán de funcionar.`)) return
    try {
      await api.llamar(`/distribuidoras/${d.id}`, { method: 'PATCH', body: JSON.stringify({ activo: !d.activo }) })
      setOk(`${d.nombre}: ${d.activo ? 'suspendida' : 'reactivada'}`)
      cargar()
    } catch (e) { setError(e.message) }
  }

  async function verDetalle(d) {
    try {
      const { distribuidora } = await api.llamar(`/distribuidoras/${d.id}`)
      const registro = esSuper ? (await api.llamar(`/distribuidoras/${d.id}/registro`)).registro : []
      setDetalle({ ...distribuidora, registro })
    } catch (e) { setError(e.message) }
  }

  const lista = datos?.distribuidoras
  const r = datos?.resumen

  return (
    <div className="container-fluid py-4 px-3 px-lg-4" id="empresas" style={{ maxWidth: 1240 }}>
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-2 mb-3">
        <div>
          <div style={{ fontSize: 12, letterSpacing: '.14em', color: '#6b7a8c', textTransform: 'uppercase' }}>{esSuper ? 'Superadmin' : 'Revendedor'}</div>
          <h1 className="h3 fw-bold mb-0" style={{ color: NAVY }}>Empresas</h1>
        </div>
        <div className="d-flex gap-2">
          {esSuper && (
            <button className="btn btn-sm fw-semibold" style={{ border: `1px solid ${AZUL}`, color: AZUL }} onClick={() => setVerRevendedores(v => !v)} aria-expanded={verRevendedores}>
              <i className="bi bi-people me-1"></i>Revendedores
            </button>
          )}
          <button className="btn btn-sm fw-semibold text-white" style={{ background: AZUL }} onClick={() => setEditando('nueva')}>
            <i className="bi bi-plus-lg me-1"></i>Activar empresa
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 small d-flex justify-content-between"><span>{error}</span><button className="btn-close btn-sm" onClick={() => setError('')} aria-label="Cerrar"></button></div>}
      {ok && <div className="alert alert-success py-2 small d-flex justify-content-between"><span>{ok}</span><button className="btn-close btn-sm" onClick={() => setOk('')} aria-label="Cerrar"></button></div>}

      {r && <Resumen r={r} esSuper={esSuper} demos={datos.demosActivas} />}

      {verRevendedores && esSuper && <Revendedores api={api} lista={revendedores} onCambio={cargar} onOk={setOk} onError={setError} />}

      {editando && (
        <FormEmpresa api={api} esSuper={esSuper} revendedores={revendedores}
          inicial={editando === 'nueva' ? null : editando}
          onCerrar={() => setEditando(null)}
          onGuardada={d => { setEditando(null); setOk(`${d.nombre} guardada`); cargar() }} />
      )}

      {detalle && <Detalle api={api} d={detalle} esSuper={esSuper} onCerrar={() => setDetalle(null)} onOk={setOk} onError={setError} />}

      <div className="bg-white rounded-3 overflow-hidden" style={{ border: `1px solid ${BORDE}` }}>
        {!lista ? (
          <div className="d-flex justify-content-center py-5"><div className="spinner-border" style={{ color: AZUL }} role="status"><span className="visually-hidden">Cargando</span></div></div>
        ) : lista.length === 0 ? (
          <div className="text-center text-muted py-5">Todavía no hay empresas. Activa la primera.</div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0" style={{ fontSize: 14 }}>
              <thead style={{ background: '#f8fafc', fontSize: 11, letterSpacing: '.1em', color: '#6b7a8c', textTransform: 'uppercase' }}>
                <tr>
                  <th className="ps-3 fw-medium">Empresa</th>
                  <th className="fw-medium">Vendida por</th>
                  <th className="fw-medium text-end">Precio / mes</th>
                  <th className="fw-medium text-end">Pedidos</th>
                  <th className="fw-medium text-end">Clientes</th>
                  <th className="fw-medium">Estado</th>
                  <th className="pe-3 fw-medium text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lista.map(d => (
                  <tr key={d.id}>
                    <td className="ps-3">
                      <div className="d-flex align-items-center gap-2">
                        <span className="rounded-circle d-inline-block flex-shrink-0" style={{ width: 12, height: 12, background: d.colorPrimario }} aria-hidden="true"></span>
                        <div>
                          <div className="fw-semibold">{d.nombre}</div>
                          <div className="text-muted small">{d.dominio || `${d.slug}`} · plan {d.plan}</div>
                        </div>
                      </div>
                    </td>
                    <td className="small">
                      {d.activadaPor?.rol === 'revendedor'
                        ? <><i className="bi bi-person-badge me-1 text-muted"></i>{d.activadaPor.nombre}</>
                        : <span className="text-muted">Directo</span>}
                    </td>
                    <td className="text-end">{d.precioMensual != null ? dinero(d.precioMensual) : <span className="text-muted">—</span>}</td>
                    <td className="text-end">{d._count.pedidos}</td>
                    <td className="text-end">{d._count.clientes}</td>
                    <td>
                      {d.activo
                        ? <span className="badge rounded-pill" style={{ background: '#e7f6ee', color: '#166534' }}>Activa</span>
                        : <span className="badge rounded-pill" style={{ background: '#fdecec', color: '#991b1b' }}>Suspendida</span>}
                    </td>
                    <td className="pe-3 text-end text-nowrap">
                      {esSuper && (
                        <button className="btn btn-sm fw-semibold text-white me-1" style={{ background: AZUL }} onClick={() => ingresar(d)} disabled={!d.activo || entrando === d.id}
                          title={d.activo ? `Entrar al panel de ${d.nombre}` : 'Reactívala para entrar'}>
                          {entrando === d.id ? 'Entrando…' : <><i className="bi bi-box-arrow-in-right me-1"></i>Ingresar</>}
                        </button>
                      )}
                      <button className="btn btn-sm btn-link text-decoration-none" onClick={() => verDetalle(d)}>Accesos</button>
                      <button className="btn btn-sm btn-link text-decoration-none" onClick={() => setEditando(d)}>Editar</button>
                      {esSuper && (
                        <button className={`btn btn-sm btn-link text-decoration-none ${d.activo ? 'text-danger' : 'text-success'}`} onClick={() => alternarActivo(d)}>
                          {d.activo ? 'Suspender' : 'Reactivar'}
                        </button>
                      )}
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

function Tarjeta({ titulo, valor, nota, destacado }) {
  return (
    <div className="bg-white rounded-3 p-3 h-100" style={{ border: `1px solid ${destacado ? AZUL : BORDE}` }}>
      <div className="small text-muted">{titulo}</div>
      <div className="fw-bold" style={{ fontSize: 26, color: NAVY }}>{valor}</div>
      {nota && <div className="small text-muted">{nota}</div>}
    </div>
  )
}

// Ventas de Agua Elite: lo que pagan las empresas activas, separado por quién las vendió
function Resumen({ r, esSuper, demos }) {
  return (
    <div className="mb-3">
      <div className="row g-3">
        <div className="col-6 col-lg-3"><Tarjeta destacado titulo="Ingreso mensual" valor={dinero(r.ingresoMensual)} nota={`${r.empresasActivas} empresa${r.empresasActivas === 1 ? '' : 's'} activa${r.empresasActivas === 1 ? '' : 's'}`} /></div>
        {esSuper ? (
          <>
            <div className="col-6 col-lg-3"><Tarjeta titulo="Vendido por ti" valor={dinero(r.directo.ingresoMensual)} nota={`${r.directo.empresas} empresa${r.directo.empresas === 1 ? '' : 's'}`} /></div>
            <div className="col-6 col-lg-3"><Tarjeta titulo="Vendido por revendedores" valor={dinero(r.ingresoMensual - r.directo.ingresoMensual)} nota={`${r.porRevendedor.reduce((t, x) => t + x.empresas, 0)} empresa(s)`} /></div>
            <div className="col-6 col-lg-3"><Tarjeta titulo="Suspendidas" valor={r.empresasSuspendidas} nota={demos != null ? `${demos} demo${demos === 1 ? '' : 's'} abierta${demos === 1 ? '' : 's'} ahora` : null} /></div>
          </>
        ) : (
          <div className="col-6 col-lg-3"><Tarjeta titulo="Suspendidas" valor={r.empresasSuspendidas} /></div>
        )}
      </div>
      {esSuper && r.porRevendedor.length > 0 && (
        <div className="bg-white rounded-3 mt-3 p-3" style={{ border: `1px solid ${BORDE}` }}>
          <div className="small fw-semibold mb-2" style={{ color: NAVY }}>Ventas por revendedor</div>
          <table className="table table-sm mb-0" style={{ fontSize: 14 }}>
            <thead><tr className="text-muted small"><th className="fw-medium">Revendedor</th><th className="fw-medium text-end">Empresas activas</th><th className="fw-medium text-end">Ingreso mensual</th></tr></thead>
            <tbody>{r.porRevendedor.map(x => <tr key={x.id}><td>{x.nombre}</td><td className="text-end">{x.empresas}</td><td className="text-end">{dinero(x.ingresoMensual)}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Revendedores({ api, lista, onCambio, onOk, onError }) {
  const [form, setForm] = useState({ nombre: '', username: '', password: '', telefono: '', email: '' })
  const cambiar = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  async function crear(e) {
    e.preventDefault()
    try {
      await api.llamar('/revendedores', { method: 'POST', body: JSON.stringify(form) })
      onOk(`Revendedor ${form.nombre} creado. Entra en esta misma página con su usuario.`)
      setForm({ nombre: '', username: '', password: '', telefono: '', email: '' })
      onCambio()
    } catch (err) { onError(err.message) }
  }
  async function alternar(r) {
    try {
      await api.llamar(`/revendedores/${r.id}`, { method: 'PATCH', body: JSON.stringify({ activo: !r.activo }) })
      onCambio()
    } catch (err) { onError(err.message) }
  }

  return (
    <div className="bg-white rounded-3 p-4 mb-3" style={{ border: `1px solid ${BORDE}` }}>
      <h2 className="h6 fw-bold mb-3" style={{ color: NAVY }}>Revendedores</h2>
      {lista.length > 0 && (
        <table className="table table-sm align-middle" style={{ fontSize: 14 }}>
          <tbody>
            {lista.map(r => (
              <tr key={r.id}>
                <td className="fw-semibold">{r.nombre}</td>
                <td className="text-muted">{r.username}</td>
                <td className="text-muted">{[r.telefono, r.email].filter(Boolean).join(' · ')}</td>
                <td>{r._count.empresasActivadas} empresa(s)</td>
                <td>{r.activo ? 'Activo' : 'Inactivo'}</td>
                <td className="text-end"><button className="btn btn-sm btn-link text-decoration-none" onClick={() => alternar(r)}>{r.activo ? 'Desactivar' : 'Activar'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form onSubmit={crear} className="row g-2 align-items-end">
        {[['nombre', 'Nombre', 'text'], ['username', 'Usuario', 'text'], ['password', 'Contraseña', 'password'], ['telefono', 'Teléfono', 'tel'], ['email', 'Correo', 'email']].map(([k, l, t]) => (
          <div className="col-md" key={k}>
            <label className="form-label small mb-1" htmlFor={`rv-${k}`}>{l}</label>
            <input id={`rv-${k}`} name={k} type={t} className="form-control form-control-sm" value={form[k]} onChange={cambiar}
              required={['nombre', 'username', 'password'].includes(k)} minLength={k === 'password' ? 8 : undefined} autoComplete={k === 'password' ? 'new-password' : undefined} />
          </div>
        ))}
        <div className="col-md-auto"><button className="btn btn-sm text-white fw-semibold" style={{ background: AZUL }}>Crear revendedor</button></div>
      </form>
    </div>
  )
}

function FormEmpresa({ api, esSuper, revendedores, inicial, onCerrar, onGuardada }) {
  const nueva = !inicial
  const [form, setForm] = useState(() => nueva ? VACIA : {
    ...VACIA,
    ...Object.fromEntries(Object.keys(VACIA).filter(k => !['admin', 'revendedorId'].includes(k)).map(k => [k, inicial[k] ?? ''])),
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
    const { admin, revendedorId, ...datos } = form
    if (!esSuper && !nueva) { delete datos.slug; delete datos.dominio; delete datos.plan; delete datos.precioMensual }
    try {
      const d = nueva
        ? await api.llamar('/distribuidoras', { method: 'POST', body: JSON.stringify({ ...datos, admin, ...(esSuper && revendedorId ? { revendedorId } : {}) }) })
        : await api.llamar(`/distribuidoras/${inicial.id}`, { method: 'PATCH', body: JSON.stringify(datos) })
      onGuardada(d.distribuidora)
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  const bloqueado = !esSuper && !nueva
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
        <h2 className="h6 fw-bold mb-0" style={{ color: NAVY }}>{nueva ? 'Activar empresa' : `Editar ${inicial.nombre}`}</h2>
        <button type="button" className="btn-close" aria-label="Cerrar" onClick={onCerrar}></button>
      </div>
      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      <div className="row g-3">
        {campo('nombre', 'Nombre comercial', { input: { required: true } })}
        {campo('slug', 'Identificador', { input: { required: true, pattern: '[a-z0-9][a-z0-9-]{1,38}[a-z0-9]', disabled: bloqueado }, ayuda: 'Minúsculas, números y guiones. Es su subdominio y el código de sus apps.' })}
        {campo('dominio', 'Dominio propio (opcional)', { input: { placeholder: 'aguanorte.com', disabled: bloqueado } })}
        <div className="col-md-3">
          <label className="form-label small fw-semibold mb-1" htmlFor="d-color">Color</label>
          <input id="d-color" name="colorPrimario" type="color" className="form-control form-control-color w-100" value={form.colorPrimario || '#0066CC'} onChange={cambiar} />
        </div>
        {campo('plan', 'Plan', { col: 'col-md-3', input: { disabled: bloqueado } })}
        {(esSuper || nueva) && campo('precioMensual', 'Precio mensual (USD)', { col: 'col-md-3', input: { type: 'number', min: 0, step: '0.01', inputMode: 'decimal' } })}
        {esSuper && nueva && revendedores.length > 0 && (
          <div className="col-md-3">
            <label className="form-label small fw-semibold mb-1" htmlFor="d-rev">Vendida por</label>
            <select id="d-rev" name="revendedorId" className="form-select" value={form.revendedorId} onChange={cambiar}>
              <option value="">Directo (tú)</option>
              {revendedores.filter(r => r.activo).map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </div>
        )}
        {campo('telefono', 'Teléfono')}
        {campo('whatsapp', 'WhatsApp')}
        {campo('emailAvisos', 'Correo de avisos', { input: { type: 'email' } })}
        {campo('ciudad', 'Ciudad', { col: 'col-md-3' })}
        {campo('provincia', 'Provincia', { col: 'col-md-3' })}
      </div>

      {nueva && (
        <div className="rounded-3 p-3 mt-3" style={{ background: '#f8fafc', border: `1px solid ${BORDE}` }}>
          <div className="fw-semibold small mb-2">Administrador de la empresa</div>
          <div className="text-muted small mb-2">Ve solo el espacio de su empresa: pedidos, productos, clientes, logística, fidelidad y reportes.</div>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small mb-1" htmlFor="d-ad-user">Usuario</label>
              <input id="d-ad-user" className="form-control" required value={form.admin.username}
                onChange={e => setForm(f => ({ ...f, admin: { ...f.admin, username: e.target.value } }))} />
            </div>
            <div className="col-md-6">
              <label className="form-label small mb-1" htmlFor="d-ad-pass">Contraseña inicial</label>
              <input id="d-ad-pass" type="password" className="form-control" required minLength={8} autoComplete="new-password" value={form.admin.password}
                onChange={e => setForm(f => ({ ...f, admin: { ...f.admin, password: e.target.value } }))} />
              <div className="form-text">Mínimo 8 caracteres. Pídele que la cambie y active la verificación en dos pasos.</div>
            </div>
          </div>
        </div>
      )}

      <div className="d-flex justify-content-end gap-2 mt-3">
        <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>Cancelar</button>
        <button className="btn fw-semibold text-white" style={{ background: AZUL }} disabled={guardando}>
          {guardando ? 'Guardando…' : nueva ? 'Activar empresa' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

function Detalle({ api, d, esSuper, onCerrar, onOk, onError }) {
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
      <table className="table table-sm align-middle" style={{ fontSize: 14 }}>
        <tbody>
          {d.admins.map(a => (
            <tr key={a.id}>
              <td className="fw-semibold">{a.username}</td>
              <td>{a.rol === 'superadmin' ? 'superadmin (antiguo)' : 'administrador'}</td>
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
                  <button className="btn btn-sm btn-link text-decoration-none" onClick={() => setReset({ id: a.id, username: a.username, nueva: '' })}>Restablecer contraseña</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {esSuper && (
        <>
          <div className="small fw-semibold mt-3 mb-2" style={{ color: NAVY }}>Lo que hiciste dentro de esta empresa</div>
          {d.registro.length === 0 ? (
            <div className="text-muted small">Todavía no has ingresado a su panel.</div>
          ) : (
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              <table className="table table-sm mb-0" style={{ fontSize: 13 }}>
                <tbody>
                  {d.registro.map(x => (
                    <tr key={x.id}>
                      <td className="text-muted text-nowrap">{new Date(x.creadoEn).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td>{x.plataformaAdmin?.nombre}</td>
                      <td className="text-nowrap"><code>{x.metodo === 'INGRESO' ? 'Ingresó al panel' : `${x.metodo} ${x.ruta}`}</code></td>
                      <td className="text-muted">{x.estado ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
