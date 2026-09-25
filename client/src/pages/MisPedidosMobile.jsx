import { useState } from 'react'
import { apiUrl } from '../lib/api'
import { useDistribuidora } from '../context/DistribuidoraContext'

const ESTADO = {
  pendiente:  { bg: '#fffbeb', border: '#fcd34d', color: '#92400e', dot: '#f59e0b', label: 'En preparación', icon: '⏳' },
  entregado:  { bg: '#f0fdf4', border: '#86efac', color: '#14532d', dot: '#22c55e', label: 'Entregado',       icon: '✅' },
  suspendido: { bg: '#fff1f2', border: '#fca5a5', color: '#881337', dot: '#f43f5e', label: 'Suspendido',      icon: '❌' },
}

function formatFecha(iso) {
  return new Date(iso).toLocaleDateString('es-EC', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function MisPedidosMobile() {
  const { nombre: nombreMarca, distribuidora } = useDistribuidora()
  const [email,     setEmail]     = useState('')
  const [resultado, setResultado] = useState(null)
  const [cargando,  setCargando]  = useState(false)
  const [error,     setError]     = useState('')
  const [expanded,  setExpanded]  = useState({})

  async function buscar(e) {
    e.preventDefault()
    if (!email.trim()) return
    setCargando(true); setError(''); setResultado(null)
    try {
      const res  = await fetch(apiUrl(`/api/pedidos/cliente/${encodeURIComponent(email.trim())}`))
      const data = await res.json()
      setResultado(data)
    } catch {
      setError('Error al consultar. Intenta nuevamente.')
    } finally { setCargando(false) }
  }

  function toggle(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div style={{ paddingBottom: 96, minHeight: '100vh', background: '#f0f4ff' }}>

      {/* ── HEADER ── */}
      <div style={{
        background: 'linear-gradient(145deg, #003d99 0%, #0066CC 100%)',
        padding: '24px 20px 28px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -50, left: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{
            width: 52, height: 52,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', marginBottom: 12,
          }}>🧾</div>
          <h1 style={{ color: '#fff', fontWeight: 900, fontSize: '1.4rem', margin: '0 0 4px', letterSpacing: -0.5 }}>
            Mis pedidos
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem', margin: 0 }}>
            Consulta el estado de tus entregas
          </p>
        </div>
      </div>

      <div style={{ padding: '16px 14px 0' }}>

        {/* ── FORMULARIO ── */}
        <div style={{
          background: '#fff', borderRadius: 20, padding: 18,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          marginBottom: 16,
        }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 8 }}>
            📧 Tu correo electrónico
          </label>
          <form onSubmit={buscar} style={{ display: 'flex', gap: 8 }}>
            <input
              type="email" placeholder="tu@correo.com"
              value={email} onChange={e => setEmail(e.target.value)} required
              style={{
                flex: 1, border: '1.5px solid #e5e7eb',
                borderRadius: 12, padding: '12px 14px',
                fontSize: '0.88rem', outline: 'none', color: '#1a1a1a',
                background: '#f9fafb',
              }}
            />
            <button type="submit" disabled={cargando} style={{
              background: cargando ? '#93c5fd' : '#0066CC',
              color: '#fff', border: 'none',
              borderRadius: 12, padding: '12px 18px',
              fontWeight: 700, fontSize: '0.85rem',
              cursor: cargando ? 'not-allowed' : 'pointer',
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 4px 12px rgba(0,102,204,0.3)',
              transition: 'background 0.2s',
            }}>
              {cargando
                ? <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                : '🔍'}
              {!cargando && 'Buscar'}
            </button>
          </form>
          {error && <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '8px 0 0' }}>{error}</p>}
        </div>

        {/* ── RESULTADOS ── */}
        {resultado && (
          resultado.pedidos.length === 0 ? (
            <div style={{
              background: '#fff', borderRadius: 20, padding: '40px 24px',
              textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            }}>
              <div style={{ fontSize: '2.8rem', marginBottom: 12 }}>📭</div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f1d3e', marginBottom: 6 }}>Sin pedidos</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.6 }}>
                No encontramos pedidos con<br /><strong style={{ color: '#64748b' }}>{email}</strong>
              </div>
            </div>
          ) : (
            <>
              {/* Saludo cliente */}
              <div style={{
                background: '#fff', borderRadius: 16, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 14,
              }}>
                <div style={{
                  width: 44, height: 44, flexShrink: 0,
                  background: 'linear-gradient(135deg, #0055bb, #0088ee)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 900, fontSize: '1.1rem',
                }}>
                  {resultado.cliente.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f1d3e' }}>
                    {resultado.cliente.nombre}
                  </div>
                  <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>
                    {resultado.pedidos.length} pedido{resultado.pedidos.length !== 1 ? 's' : ''} encontrado{resultado.pedidos.length !== 1 ? 's' : ''}
                  </div>
                </div>
                {/* Mini stats */}
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0066CC' }}>
                    ${resultado.pedidos.reduce((s, p) => s + parseFloat(p.total || 0), 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>total acumulado</div>
                </div>
              </div>

              {/* Pedidos */}
              {resultado.pedidos.map(p => {
                const b   = ESTADO[p.estado] ?? ESTADO.pendiente
                const exp = expanded[p.id]
                return (
                  <div key={p.id} style={{
                    background: '#fff', borderRadius: 20,
                    marginBottom: 12, overflow: 'hidden',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
                    border: `1.5px solid ${exp ? '#0066CC33' : 'transparent'}`,
                    transition: 'border 0.2s',
                  }}>
                    {/* Cabecera del pedido */}
                    <div
                      onClick={() => toggle(p.id)}
                      style={{
                        padding: '14px 16px',
                        display: 'flex', alignItems: 'center', gap: 12,
                        cursor: 'pointer',
                      }}
                    >
                      {/* Dot estado */}
                      <div style={{
                        width: 42, height: 42, flexShrink: 0,
                        background: b.bg, borderRadius: 12,
                        border: `1.5px solid ${b.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.1rem',
                      }}>{b.icon}</div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f1d3e' }}>Pedido #{p.id}</span>
                          <span style={{
                            background: b.bg, color: b.color,
                            fontSize: '0.65rem', fontWeight: 700,
                            padding: '2px 8px', borderRadius: 999,
                            border: `1px solid ${b.border}`,
                          }}>{b.label}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          📅 {formatFecha(p.creadoEn)}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0066CC' }}>
                          ${parseFloat(p.total).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: exp ? '#0066CC' : '#94a3b8', fontWeight: 600 }}>
                          {exp ? '▲ Ocultar' : '▼ Ver detalle'}
                        </div>
                      </div>
                    </div>

                    {/* Detalle expandible */}
                    {exp && (
                      <div style={{ borderTop: '1px solid #f1f5f9', padding: '14px 16px' }}>
                        {/* Items */}
                        <div style={{ background: '#f8fafc', borderRadius: 12, padding: '10px 12px', marginBottom: 12 }}>
                          {p.items.map((item, i) => (
                            <div key={i} style={{
                              display: 'flex', justifyContent: 'space-between',
                              fontSize: '0.8rem', color: '#374151',
                              paddingBottom: i < p.items.length - 1 ? 6 : 0,
                              marginBottom: i < p.items.length - 1 ? 6 : 0,
                              borderBottom: i < p.items.length - 1 ? '1px dashed #e5e7eb' : 'none',
                            }}>
                              <span>
                                <span style={{ marginRight: 5 }}>💧</span>
                                {item.nombre}
                                <span style={{ color: '#94a3b8', marginLeft: 4 }}>× {item.cantidad}</span>
                              </span>
                              <span style={{ fontWeight: 700, color: '#0f1d3e' }}>
                                ${(item.precioUnitario * item.cantidad).toFixed(2)}
                              </span>
                            </div>
                          ))}
                          <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            fontWeight: 900, paddingTop: 8, marginTop: 4,
                            borderTop: '1.5px solid #e5e7eb',
                            color: '#0066CC', fontSize: '0.9rem',
                          }}>
                            <span>Total</span>
                            <span>${parseFloat(p.total).toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Mensaje de estado */}
                        <div style={{
                          background: b.bg, border: `1px solid ${b.border}`,
                          borderRadius: 12, padding: '10px 12px',
                          fontSize: '0.75rem', color: b.color,
                          lineHeight: 1.5, display: 'flex', gap: 8, alignItems: 'flex-start',
                        }}>
                          <span style={{ flexShrink: 0 }}>{b.icon}</span>
                          <span>
                            {p.estado === 'pendiente'  && 'Tu pedido está siendo preparado. Te contactaremos pronto para coordinar la entrega.'}
                            {p.estado === 'entregado'  && `¡Tu pedido fue entregado correctamente! Gracias por confiar en ${nombreMarca}.`}
                            {p.estado === 'suspendido' && `Pedido suspendido. Por favor contáctanos${distribuidora?.telefono ? ` al ${distribuidora.telefono}` : ''} para más información.`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )
        )}

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
