import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'

const NAVY  = '#0f1d3e'
const AZUL  = '#0066CC'
const GRIS  = '#6b7a8c'
const BORDE = '#e3e8ef'
const ORO   = '#d9982e'
const ORO_BG = 'linear-gradient(135deg,#fae3a0,#eeb94c)'

const TIPOS = {
  gana:   { label: 'Ganó sellos',     color: '#16a34a' },
  premio: { label: 'Completó tarjeta', color: ORO },
  canje:  { label: 'Usó su premio',   color: AZUL },
  caduca: { label: 'Sellos vencidos', color: '#dc2626' },
  ajuste: { label: 'Ajuste manual',   color: '#7c3aed' },
}
const ORIGENES = { app: 'pedido', express: 'venta exprés', visita: 'cliente fijo', admin: 'panel' }

function Tarjeta({ titulo, icono, extra, children }) {
  return (
    <div className="bg-white rounded-3" style={{ border: `1px solid ${BORDE}` }}>
      <div className="px-4 py-3 fw-semibold d-flex align-items-center gap-2" style={{ borderBottom: `1px solid ${BORDE}`, color: NAVY }}>
        <i className={`bi ${icono}`} style={{ color: AZUL }}></i>{titulo}
        {extra && <div className="ms-auto">{extra}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

const Etiqueta = ({ children }) => (
  <div style={{ fontSize: 11, letterSpacing: '.12em', color: GRIS, textTransform: 'uppercase', marginBottom: 6 }}>{children}</div>
)

function Kpi({ label, valor, icono, color = NAVY, nota }) {
  return (
    <div className="bg-white rounded-3 p-3 h-100" style={{ border: `1px solid ${BORDE}` }}>
      <div className="d-flex align-items-center gap-2" style={{ fontSize: 12, color: GRIS, fontWeight: 600 }}>
        <i className={`bi ${icono}`}></i>{label}
      </div>
      <div className="fw-bold mt-1" style={{ fontSize: 26, color, letterSpacing: '-0.5px' }}>{valor}</div>
      {nota && <div style={{ fontSize: 11.5, color: GRIS }}>{nota}</div>}
    </div>
  )
}

// Barra de sellos: un segmento por bidón
function Sellos({ sellos, meta, premio }) {
  return (
    <div className="d-flex gap-1" style={{ minWidth: 150 }}>
      {Array.from({ length: meta }, (_, i) => (
        <span key={i} style={{
          flex: 1, height: 7, borderRadius: 3,
          background: premio ? ORO : i < sellos ? '#16a34a' : '#e3e8ef',
        }} />
      ))}
    </div>
  )
}

function fecha(d) {
  return new Date(d).toLocaleString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function AdminFidelidad() {
  const { authFetch, rol } = useAuth()
  const esSuper = rol === 'superadmin'

  const [resumen,   setResumen]   = useState(null)
  const [productos, setProductos] = useState([])
  const [form,      setForm]      = useState(null)
  const [error,     setError]     = useState('')
  const [ok,        setOk]        = useState('')
  const [guardando, setGuardando] = useState(false)
  const [confirmarApagar, setConfirmarApagar] = useState(false)

  // Detalle de un cliente
  const [clientes, setClientes] = useState([])
  const [busca,    setBusca]    = useState('')
  const [elegido,  setElegido]  = useState(null)     // { id, nombre }
  const [movs,     setMovs]     = useState(null)
  const [ajuste,   setAjuste]   = useState({ sellos: '', nota: '' })

  async function cargar() {
    const [r, p] = await Promise.all([
      authFetch('/api/fidelidad/resumen'),
      fetch('/api/productos?all=true'),
    ])
    if (r.ok) {
      const d = await r.json()
      setResumen(d)
      setForm(formDesde(d.config))
    }
    if (p.ok) setProductos((await p.json()).productos || [])
  }
  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    authFetch('/api/usuarios').then(r => r.ok ? r.json() : { usuarios: [] }).then(d => setClientes(d.usuarios || []))
  }, [authFetch])

  function formDesde(c) {
    return {
      activo:           c.activo,
      sellosParaPremio: c.sellosParaPremio,
      tipoPremio:       c.tipoPremio || 'producto',
      productoPremioId: c.productoPremioId ?? '',
      descuentoPct:     c.descuentoPct ?? 15,
      productosQueSuman: Array.isArray(c.productosQueSuman) && c.productosQueSuman.length
        ? c.productosQueSuman.map(Number)
        : (c.productoPremioId ? [c.productoPremioId] : []),
      sumaApp:          c.sumaApp,
      sumaExpress:      c.sumaExpress,
      sumaVisitaFija:   c.sumaVisitaFija,
      caducidadMeses:   c.caducidadMeses ?? 0,
      maxPremiosPorMes: c.maxPremiosPorMes ?? 0,
    }
  }

  function aviso(tipo, msg) { if (tipo === 'ok') { setOk(msg); setError('') } else { setError(msg); setOk('') } }

  async function guardar(cambios = {}) {
    const f = { ...form, ...cambios }
    if (f.activo && f.tipoPremio === 'producto' && !f.productoPremioId) { aviso('error', 'Elige qué producto se regala antes de activar el programa'); return }
    if (f.activo && !f.productosQueSuman.length) { aviso('error', 'Marca al menos un producto que sume sellos'); return }
    setGuardando(true)
    const body = {
      activo:           f.activo,
      sellosParaPremio: Number(f.sellosParaPremio),
      tipoPremio:       f.tipoPremio,
      productoPremioId: f.productoPremioId ? Number(f.productoPremioId) : null,
      descuentoPct:     Number(f.descuentoPct) || null,
      productosQueSuman: f.productosQueSuman.length ? f.productosQueSuman : null,
      sumaApp:          f.sumaApp,
      sumaExpress:      f.sumaExpress,
      sumaVisitaFija:   f.sumaVisitaFija,
      caducidadMeses:   Number(f.caducidadMeses) > 0 ? Number(f.caducidadMeses) : null,
      maxPremiosPorMes: Number(f.maxPremiosPorMes) > 0 ? Number(f.maxPremiosPorMes) : null,
    }
    const res = await authFetch('/api/fidelidad/config', { method: 'PUT', body: JSON.stringify(body) })
    const d = await res.json().catch(() => ({}))
    setGuardando(false)
    if (!res.ok) { aviso('error', d.message || 'No se pudo guardar'); return }
    setForm(formDesde(d.config))
    aviso('ok', cambios.activo === true ? 'Programa activado: desde ahora cada entrega suma sellos'
      : cambios.activo === false ? 'Programa apagado: las entregas ya no suman sellos'
      : 'Reglas guardadas')
    setConfirmarApagar(false)
    cargar()
  }

  async function verCliente(c) {
    setElegido(c); setMovs(null); setAjuste({ sellos: '', nota: '' })
    const r = await authFetch(`/api/fidelidad/movimientos/${c.id}`)
    if (r.ok) setMovs((await r.json()).movimientos)
  }

  async function aplicarAjuste() {
    const sellos = parseInt(ajuste.sellos)
    if (!Number.isInteger(sellos) || sellos === 0) { aviso('error', 'Escribe cuántos sellos sumar (ej. 2) o restar (ej. -1)'); return }
    if (!ajuste.nota.trim()) { aviso('error', 'Escribe el motivo del ajuste'); return }
    const res = await authFetch('/api/fidelidad/ajuste', { method: 'POST', body: JSON.stringify({ clienteId: elegido.id, sellos, nota: ajuste.nota }) })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { aviso('error', d.message || 'No se pudo aplicar'); return }
    aviso('ok', `Ajuste aplicado a ${elegido.nombre}`)
    verCliente(elegido)
    cargar()
  }

  const encontrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (q.length < 2) return []
    return clientes.filter(c => `${c.nombre} ${c.telefono || ''} ${c.email || ''}`.toLowerCase().includes(q)).slice(0, 6)
  }, [busca, clientes])

  if (!resumen || !form) return <div className="d-flex justify-content-center py-5"><div className="spinner-border" style={{ color: AZUL }} /></div>

  const meta     = resumen.config.sellosParaPremio
  const premio   = productos.find(p => p.id === Number(form.productoPremioId))
  const textoForm = form.tipoPremio === 'descuento'
    ? `${form.descuentoPct || 0} % de descuento`
    : premio ? `1 ${premio.nombre} gratis` : 'un producto gratis'
  const activo   = resumen.config.activo
  const bloqueado = !esSuper

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const alternarProducto = id => set('productosQueSuman',
    form.productosQueSuman.includes(id) ? form.productosQueSuman.filter(x => x !== id) : [...form.productosQueSuman, id])

  return (
    <div className="d-flex flex-column gap-4" style={{ maxWidth: 1100 }}>

      {/* Encabezado */}
      <div className="d-flex flex-wrap align-items-center gap-3">
        <div>
          <h4 className="fw-bold mb-1" style={{ color: NAVY }}>Tarjeta de fidelidad</h4>
          <div style={{ color: GRIS, fontSize: 14 }}>
            Cada {meta} compras que suman sellos, el cliente gana {resumen.textoPremio} en su siguiente pedido.
          </div>
        </div>
        <div className="ms-auto d-flex align-items-center gap-2">
          <span className="rounded-pill px-3 py-1 fw-semibold" style={{
            fontSize: 13, background: activo ? '#e1f3ea' : '#eef1f5', color: activo ? '#15803d' : GRIS,
          }}>
            <i className={`bi ${activo ? 'bi-check-circle-fill' : 'bi-pause-circle'} me-1`}></i>
            {activo ? 'Activo' : 'Apagado'}
          </span>
          {esSuper && (activo
            ? (confirmarApagar
                ? <>
                    <span style={{ fontSize: 13, color: GRIS }}>¿Apagar? Los sellos ganados se conservan.</span>
                    <button className="btn btn-sm btn-danger" disabled={guardando} onClick={() => guardar({ activo: false })}>Sí, apagar</button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => setConfirmarApagar(false)}>No</button>
                  </>
                : <button className="btn btn-sm btn-outline-secondary" onClick={() => setConfirmarApagar(true)}>Apagar</button>)
            : <button className="btn btn-sm fw-semibold text-white" style={{ background: '#16a34a' }} disabled={guardando}
                onClick={() => guardar({ activo: true })}>
                <i className="bi bi-play-fill me-1"></i>Activar programa
              </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 mb-0">{error}</div>}
      {ok    && <div className="alert alert-success py-2 mb-0">{ok}</div>}
      {!activo && (
        <div className="rounded-3 px-4 py-3 d-flex align-items-center gap-3" style={{ background: '#fff8e6', border: '1px solid #f3dca4', color: '#7a5a12', fontSize: 14 }}>
          <i className="bi bi-info-circle-fill" style={{ fontSize: 18 }}></i>
          <div>El programa está <b>apagado</b>: las entregas no suman sellos y los clientes no ven su tarjeta.
            {esSuper ? ' Revisa las reglas y pulsa "Activar programa" cuando quieras empezar.' : ' Solo el superadmin puede activarlo.'}</div>
        </div>
      )}

      {/* Números */}
      <div className="row g-3">
        <div className="col-6 col-lg-3"><Kpi label="Clientes con sellos" valor={resumen.conTarjeta} icono="bi-people" /></div>
        <div className="col-6 col-lg-3"><Kpi label="Premios por usar" valor={resumen.premiosListos} icono="bi-gift" color={ORO} nota="clientes con bidón gratis" /></div>
        <div className="col-6 col-lg-3"><Kpi label="Premios usados este mes" valor={resumen.canjesMes} icono="bi-droplet-fill" color={AZUL} /></div>
        <div className="col-6 col-lg-3"><Kpi label="Costo del mes" valor={`$${resumen.costoMes.toFixed(2)}`} icono="bi-cash-coin"
          nota="productos regalados y descuentos" /></div>
      </div>

      <div className="row g-4">
        {/* Reglas */}
        <div className="col-lg-6">
          <Tarjeta titulo="Reglas del programa" icono="bi-sliders"
            extra={bloqueado && <span style={{ fontSize: 12, color: GRIS, fontWeight: 400 }}><i className="bi bi-lock me-1"></i>Solo superadmin</span>}>
            <fieldset disabled={bloqueado} className="d-flex flex-column gap-4">
              <div style={{ maxWidth: 220 }}>
                <Etiqueta>Compras para ganar el premio</Etiqueta>
                <input type="number" min={2} max={100} className="form-control" value={form.sellosParaPremio}
                  onChange={e => set('sellosParaPremio', e.target.value)} />
              </div>

              <div>
                <Etiqueta>Qué gana el cliente</Etiqueta>
                <div className="d-flex flex-column gap-2">
                  {[['producto', 'Un producto gratis', 'bi-gift'], ['descuento', 'Un descuento en su pedido', 'bi-percent']].map(([v, l, ic]) => (
                    <label key={v} className="d-flex align-items-center gap-2 rounded-3 px-3 py-2" style={{
                      cursor: 'pointer', fontSize: 14, border: `1.5px solid ${form.tipoPremio === v ? AZUL : BORDE}`, background: form.tipoPremio === v ? '#f0f6ff' : '#fff',
                    }}>
                      <input type="radio" className="form-check-input m-0" name="tipoPremio" checked={form.tipoPremio === v} onChange={() => set('tipoPremio', v)} />
                      <i className={`bi ${ic}`} style={{ color: AZUL }}></i><span className="fw-semibold">{l}</span>
                      {form.tipoPremio === v && v === 'producto' && (
                        <select className="form-select form-select-sm ms-auto" style={{ maxWidth: 220 }} value={form.productoPremioId}
                          onChange={e => set('productoPremioId', e.target.value ? Number(e.target.value) : '')}>
                          <option value="">Elegir producto…</option>
                          {productos.filter(p => p.activo).map(p => <option key={p.id} value={p.id}>{p.nombre} · ${Number(p.precio).toFixed(2)}</option>)}
                        </select>
                      )}
                      {form.tipoPremio === v && v === 'descuento' && (
                        <div className="ms-auto d-flex align-items-center gap-1">
                          {[10, 15, 25, 50].map(n => (
                            <button key={n} type="button" onClick={() => set('descuentoPct', n)} className="btn btn-sm"
                              style={{ background: Number(form.descuentoPct) === n ? AZUL : '#eef3fa', color: Number(form.descuentoPct) === n ? '#fff' : NAVY, fontWeight: 600 }}>{n} %</button>
                          ))}
                          <input type="number" min={5} max={100} className="form-control form-control-sm" style={{ width: 70 }}
                            value={form.descuentoPct} onChange={e => set('descuentoPct', e.target.value)} />
                        </div>
                      )}
                    </label>
                  ))}
                </div>
                {form.tipoPremio === 'descuento' && (
                  <div style={{ fontSize: 12, color: GRIS, marginTop: 6 }}>El descuento se aplica a todo el siguiente pedido que haga el cliente desde la app.</div>
                )}
              </div>

              <div>
                <Etiqueta>Qué productos suman sellos</Etiqueta>
                <div className="d-flex flex-column gap-2">
                  {productos.filter(p => p.activo).map(p => (
                    <label key={p.id} className="d-flex align-items-center gap-2" style={{ fontSize: 14, cursor: 'pointer' }}>
                      <input type="checkbox" className="form-check-input m-0" checked={form.productosQueSuman.includes(p.id)} onChange={() => alternarProducto(p.id)} />
                      {p.nombre} <span style={{ color: GRIS }}>· ${Number(p.precio).toFixed(2)}</span>
                    </label>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: GRIS, marginTop: 6 }}>Cada unidad entregada de estos productos es un sello: puedes marcar la recarga y el envase. Lo regalado nunca suma.</div>
              </div>

              <div>
                <Etiqueta>Suman sellos las ventas por</Etiqueta>
                <div className="d-flex flex-wrap gap-3">
                  {[['sumaApp', 'Pedidos (app y web)'], ['sumaExpress', 'Venta exprés del chofer'], ['sumaVisitaFija', 'Clientes fijos']].map(([k, l]) => (
                    <label key={k} className="d-flex align-items-center gap-2" style={{ fontSize: 14, cursor: 'pointer' }}>
                      <input type="checkbox" className="form-check-input m-0" checked={form[k]} onChange={e => set(k, e.target.checked)} />{l}
                    </label>
                  ))}
                </div>
              </div>

              <div className="row g-3">
                <div className="col-6">
                  <Etiqueta>Los sellos vencen</Etiqueta>
                  <select className="form-select" value={form.caducidadMeses} onChange={e => set('caducidadMeses', e.target.value)}>
                    <option value={0}>Nunca</option>
                    {[3, 6, 12].map(m => <option key={m} value={m}>Sin comprar {m} meses</option>)}
                  </select>
                </div>
                <div className="col-6">
                  <Etiqueta>Máximo de premios al mes</Etiqueta>
                  <select className="form-select" value={form.maxPremiosPorMes} onChange={e => set('maxPremiosPorMes', e.target.value)}>
                    <option value={0}>Sin límite</option>
                    {[1, 2, 3].map(m => <option key={m} value={m}>{m} por cliente</option>)}
                  </select>
                </div>
              </div>

              {esSuper && (
                <div>
                  <button className="btn fw-semibold text-white" style={{ background: AZUL }} disabled={guardando} onClick={() => guardar()}>
                    {guardando ? 'Guardando…' : 'Guardar reglas'}
                  </button>
                </div>
              )}
            </fieldset>
          </Tarjeta>
        </div>

        {/* Vista previa + cerca del premio */}
        <div className="col-lg-6 d-flex flex-column gap-4">
          <div className="rounded-4 p-4 text-white" style={{ background: 'linear-gradient(150deg,#22524a,#163a34)' }}>
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div style={{ fontSize: 11, letterSpacing: '.14em', color: '#8fb8aa', fontWeight: 700 }}>ASÍ LO VE EL CLIENTE</div>
                <div className="fw-bold" style={{ fontSize: 17 }}>Premio: {textoForm}</div>
              </div>
              <span className="rounded-pill px-2 py-1 fw-bold" style={{ background: ORO_BG, color: '#4a3208', fontSize: 12 }}>7 / {form.sellosParaPremio || meta}</span>
            </div>
            <div className="d-grid mt-3" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, maxWidth: 300 }}>
              {Array.from({ length: Math.min(Number(form.sellosParaPremio) || meta, 20) }, (_, i) => (
                <div key={i} className="rounded-circle d-flex align-items-center justify-content-center" style={{
                  aspectRatio: '1', background: i < 7 ? 'radial-gradient(circle at 35% 30%,#3bb28f,#1f7b63)' : 'rgba(255,255,255,.1)',
                  border: i < 7 ? 'none' : '1.5px dashed rgba(255,255,255,.3)',
                }}>
                  {i < 7 && <i className="bi bi-droplet-fill" style={{ fontSize: 13 }}></i>}
                </div>
              ))}
            </div>
            <div className="mt-3" style={{ fontSize: 13, color: '#f1dca3' }}>Te faltan {Math.max(0, (Number(form.sellosParaPremio) || meta) - 7)} para ganar {textoForm}</div>
          </div>

          <Tarjeta titulo="Clientes cerca del premio" icono="bi-trophy">
            {resumen.cerca.length === 0 ? (
              <div style={{ color: GRIS, fontSize: 14 }}>Todavía no hay clientes cerca de su bidón gratis.</div>
            ) : (
              <div className="d-flex flex-column">
                {resumen.cerca.map(c => (
                  <button key={c.id} onClick={() => verCliente(c)}
                    className="d-flex align-items-center gap-3 py-2 border-0 bg-transparent text-start w-100"
                    style={{ borderBottom: `1px solid ${BORDE}` }}>
                    <div className="flex-grow-1">
                      <div className="fw-semibold" style={{ fontSize: 14, color: NAVY }}>{c.nombre}</div>
                      <div style={{ fontSize: 12, color: GRIS }}>{c.sector || 'Sin sector'}</div>
                    </div>
                    <Sellos sellos={c.sellos} meta={meta} premio={c.premiosDisponibles > 0} />
                    {c.premiosDisponibles > 0
                      ? <span className="rounded-pill px-2 py-1 fw-bold" style={{ background: ORO_BG, color: '#4a3208', fontSize: 11.5, whiteSpace: 'nowrap' }}>
                          {c.premiosDisponibles > 1 ? `${c.premiosDisponibles} premios` : 'Premio listo'}
                        </span>
                      : <span className="fw-bold" style={{ fontSize: 13, color: NAVY, minWidth: 42, textAlign: 'right' }}>{c.sellos}/{meta}</span>}
                  </button>
                ))}
              </div>
            )}
          </Tarjeta>
        </div>
      </div>

      {/* Buscar un cliente y ver su historial */}
      <Tarjeta titulo="Tarjeta de un cliente" icono="bi-person-lines-fill">
        <div className="position-relative" style={{ maxWidth: 420 }}>
          <input className="form-control" placeholder="Buscar por nombre, teléfono o correo" value={busca} onChange={e => setBusca(e.target.value)} />
          {encontrados.length > 0 && (
            <div className="position-absolute bg-white rounded-3 shadow-sm w-100 mt-1" style={{ border: `1px solid ${BORDE}`, zIndex: 5 }}>
              {encontrados.map(c => (
                <button key={c.id} className="d-block w-100 text-start border-0 bg-transparent px-3 py-2"
                  onClick={() => { verCliente(c); setBusca('') }}>
                  <div className="fw-semibold" style={{ fontSize: 14 }}>{c.nombre}</div>
                  <div style={{ fontSize: 12, color: GRIS }}>{c.telefono || c.email}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {elegido && (
          <div className="mt-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <div className="fw-bold" style={{ fontSize: 16, color: NAVY }}>{elegido.nombre}</div>
              <button className="btn btn-sm btn-link text-secondary ms-auto" onClick={() => { setElegido(null); setMovs(null) }}>Cerrar</button>
            </div>
            <div className="row g-4">
              <div className="col-lg-7">
                <Etiqueta>Historial</Etiqueta>
                {!movs ? <div className="spinner-border spinner-border-sm" style={{ color: AZUL }} />
                  : movs.length === 0 ? <div style={{ color: GRIS, fontSize: 14 }}>Sin movimientos todavía.</div>
                  : (
                    <table className="table table-sm align-middle mb-0" style={{ fontSize: 13.5 }}>
                      <tbody>
                        {movs.map(m => (
                          <tr key={m.id}>
                            <td style={{ color: GRIS, whiteSpace: 'nowrap' }}>{fecha(m.creadoEn)}</td>
                            <td><span className="fw-semibold" style={{ color: TIPOS[m.tipo]?.color }}>{TIPOS[m.tipo]?.label || m.tipo}</span></td>
                            <td style={{ color: GRIS }}>{m.nota || (m.pedidoId ? `Pedido #${m.pedidoId}` : '')}{m.origen ? ` · ${ORIGENES[m.origen] || m.origen}` : ''}</td>
                            <td className="text-end fw-bold" style={{ color: m.sellos > 0 ? '#16a34a' : m.sellos < 0 ? GRIS : NAVY }}>
                              {m.tipo === 'canje' ? 'premio' : m.sellos > 0 ? `+${m.sellos}` : m.sellos}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
              </div>
              {esSuper && (
                <div className="col-lg-5">
                  <Etiqueta>Ajuste manual</Etiqueta>
                  <div className="d-flex flex-column gap-2">
                    <input type="number" className="form-control" placeholder="Sellos: 2 para sumar, -1 para quitar"
                      value={ajuste.sellos} onChange={e => setAjuste(a => ({ ...a, sellos: e.target.value }))} />
                    <input className="form-control" placeholder="Motivo (obligatorio)"
                      value={ajuste.nota} onChange={e => setAjuste(a => ({ ...a, nota: e.target.value }))} />
                    <button className="btn btn-outline-primary fw-semibold" onClick={aplicarAjuste}>Aplicar ajuste</button>
                    <div style={{ fontSize: 12, color: GRIS }}>Queda guardado con tu usuario y el motivo.</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Tarjeta>
    </div>
  )
}
