import { useState } from 'react'
import { apiUrl } from '../lib/api'

const BADGE = {
  pendiente:  { bg: '#fff3cd', color: '#856404', label: 'Pendiente',  icon: 'bi-clock' },
  entregado:  { bg: '#cddcf8', color: '#0a1845', label: 'Entregado',  icon: 'bi-check-circle-fill' },
  suspendido: { bg: '#f8d7da', color: '#58151c', label: 'Suspendido', icon: 'bi-x-circle-fill' },
}

function formatFecha(iso) {
  return new Date(iso).toLocaleDateString('es-EC', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function MisPedidos() {
  const [email, setEmail]       = useState('')
  const [resultado, setResultado] = useState(null)  // null | { cliente, pedidos }
  const [cargando, setCargando] = useState(false)
  const [error, setError]       = useState('')

  async function buscar(e) {
    e.preventDefault()
    if (!email.trim()) return
    setCargando(true)
    setError('')
    setResultado(null)
    try {
      const res  = await fetch(apiUrl(`/api/pedidos/cliente/${encodeURIComponent(email.trim())}`))
      const data = await res.json()
      setResultado(data)
    } catch {
      setError('Error al consultar. Intenta nuevamente.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={{ paddingTop: '110px', paddingBottom: '60px', minHeight: '100vh', background: '#f8fafb' }}>
      <div className="container" style={{ maxWidth: '680px' }}>

        {/* Cabecera */}
        <div className="text-center mb-5">
          <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
            style={{ width: '64px', height: '64px', background: '#e8f0fd' }}>
            <i className="bi bi-receipt fs-3" style={{ color: '#0066CC' }}></i>
          </div>
          <h2 className="fw-bold mb-1" style={{ color: '#0f1d3e' }}>Mis pedidos</h2>
          <p className="text-muted">Ingresa tu correo electrónico para ver el historial de tus pedidos.</p>
        </div>

        {/* Formulario de búsqueda */}
        <form onSubmit={buscar} className="bg-white rounded-4 shadow-sm p-4 mb-4">
          <label className="form-label fw-bold small">Correo electrónico</label>
          <div className="input-group">
            <span className="input-group-text bg-white">
              <i className="bi bi-envelope text-muted"></i>
            </span>
            <input
              type="email"
              className="form-control border-start-0 ps-0"
              placeholder="tu@correo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="btn fw-bold text-white px-4"
              style={{ background: '#0066CC' }} disabled={cargando}>
              {cargando
                ? <span className="spinner-border spinner-border-sm"></span>
                : <><i className="bi bi-search me-1"></i>Buscar</>
              }
            </button>
          </div>
          {error && <div className="text-danger small mt-2">{error}</div>}
        </form>

        {/* Resultados */}
        {resultado && (
          <>
            {resultado.pedidos.length === 0 ? (
              <div className="bg-white rounded-4 shadow-sm p-5 text-center">
                <i className="bi bi-inbox fs-1 d-block mb-3 text-muted"></i>
                <h6 className="fw-bold">No encontramos pedidos</h6>
                <p className="text-muted small mb-0">
                  No hay pedidos registrados con el correo <strong>{email}</strong>.
                  <br />Asegúrate de usar el mismo correo con el que hiciste tu pedido.
                </p>
              </div>
            ) : (
              <>
                {/* Saludo */}
                <div className="d-flex align-items-center gap-2 mb-4">
                  <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                    style={{ width: '40px', height: '40px', background: '#0066CC', flexShrink: 0, fontSize: '1rem' }}>
                    {resultado.cliente.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="fw-bold" style={{ color: '#0f1d3e' }}>Hola, {resultado.cliente.nombre}</div>
                    <div className="text-muted small">{resultado.pedidos.length} pedido(s) encontrado(s)</div>
                  </div>
                </div>

                {/* Lista de pedidos */}
                {resultado.pedidos.map(p => {
                  const b = BADGE[p.estado] ?? BADGE.pendiente
                  return (
                    <div key={p.id} className="bg-white rounded-4 shadow-sm p-4 mb-3">
                      {/* Fila superior */}
                      <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
                        <div>
                          <span className="fw-bold" style={{ color: '#0f1d3e', fontSize: '1.05rem' }}>
                            Pedido #{p.id}
                          </span>
                          <div className="text-muted small mt-1">
                            <i className="bi bi-calendar3 me-1"></i>{formatFecha(p.creadoEn)}
                          </div>
                        </div>
                        <span className="badge rounded-pill px-3 py-2 d-flex align-items-center gap-1"
                          style={{ background: b.bg, color: b.color, fontSize: '0.8rem' }}>
                          <i className={`bi ${b.icon}`}></i>
                          {b.label}
                        </span>
                      </div>

                      {/* Productos */}
                      <div className="rounded-3 p-3 mb-3" style={{ background: '#f8fafb' }}>
                        {p.items.map((item, i) => (
                          <div key={i} className="d-flex justify-content-between align-items-center small mb-1">
                            <span>
                              <i className="bi bi-droplet-fill me-1" style={{ color: '#0066CC', fontSize: '0.7rem' }}></i>
                              {item.nombre}
                              <span className="text-muted ms-1">× {item.cantidad}</span>
                            </span>
                            <span className="fw-bold">
                              ${(item.precioUnitario * item.cantidad).toFixed(2)}
                            </span>
                          </div>
                        ))}
                        <div className="d-flex justify-content-between fw-bold pt-2 mt-1"
                          style={{ borderTop: '1px solid #dee2e6', color: '#0066CC' }}>
                          <span>Total</span>
                          <span>${parseFloat(p.total).toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Mensaje según estado */}
                      {p.estado === 'pendiente' && (
                        <div className="d-flex align-items-center gap-2 small"
                          style={{ color: '#856404' }}>
                          <i className="bi bi-info-circle"></i>
                          Tu pedido está siendo preparado. Te contactaremos pronto para coordinar la entrega.
                        </div>
                      )}
                      {p.estado === 'entregado' && (
                        <div className="d-flex align-items-center gap-2 small"
                          style={{ color: '#0a1845' }}>
                          <i className="bi bi-check-circle-fill"></i>
                          Pedido entregado correctamente. ¡Gracias por tu compra!
                        </div>
                      )}
                      {p.estado === 'suspendido' && (
                        <div className="d-flex align-items-center gap-2 small"
                          style={{ color: '#58151c' }}>
                          <i className="bi bi-telephone-fill"></i>
                          Pedido suspendido. Por favor contáctanos al (03) 2936000.
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
