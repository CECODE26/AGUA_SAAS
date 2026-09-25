import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContextMobile'

const BADGE = {
  pendiente:   { bg: '#fff8e1', color: '#856404', label: 'Pendiente',   icon: '🕐' },
  planificado: { bg: '#e0f2fe', color: '#0369a1', label: 'Planificado', icon: '🚚' },
  entregado:   { bg: '#e8f0fd', color: '#0a1845', label: 'Entregado',   icon: '✅' },
  no_entregado: { bg: '#ffe5d0', color: '#7a2e0e', label: 'No entregado', icon: '📪' },
  suspendido:  { bg: '#fdecea', color: '#58151c', label: 'Suspendido',  icon: '❌' },
}

const FILTROS = ['todos', 'pendiente', 'planificado', 'entregado', 'no_entregado', 'suspendido']

function formatFecha(iso) {
  return new Date(iso).toLocaleDateString('es-EC', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminPedidosMobile() {
  const { authFetch } = useAuth()
  const [pedidos, setPedidos]     = useState([])
  const [filtro, setFiltro]       = useState('todos')
  const [loading, setLoading]     = useState(true)
  const [actualizando, setActualizando] = useState(null)
  const [expandido, setExpandido] = useState(null)

  async function cargar() {
    try {
      const res  = await authFetch('/api/pedidos')
      const data = await res.json()
      const norm = (data.pedidos || []).map(p => ({
        ...p,
        productos: (p.items || []).map(i => ({
          nombre:   i.producto?.nombre ?? i.nombre ?? '',
          cantidad: i.cantidad,
          precio:   parseFloat(i.precioUnitario).toFixed(2),
        })),
      }))
      setPedidos(norm)
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    cargar()
    const id = setInterval(cargar, 5000)
    return () => clearInterval(id)
  }, [authFetch])

  async function cambiarEstado(id, nuevoEstado) {
    setActualizando(id)
    await authFetch(`/api/pedidos/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: nuevoEstado }),
    })
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado: nuevoEstado } : p))
    setActualizando(null)
  }

  const filtrados = filtro === 'todos' ? pedidos : pedidos.filter(p => p.estado === filtro)
  const conteos = {
    todos:       pedidos.length,
    pendiente:   pedidos.filter(p => p.estado === 'pendiente').length,
    planificado: pedidos.filter(p => p.estado === 'planificado').length,
    entregado:   pedidos.filter(p => p.estado === 'entregado').length,
    suspendido:  pedidos.filter(p => p.estado === 'suspendido').length,
  }

  return (
    <div style={{ padding: '12px', paddingBottom: '90px', minHeight: '100vh', background: '#f8f9fa' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f1d3e', margin: 0 }}>Pedidos</h2>
          <p style={{ fontSize: '0.72rem', color: '#888', margin: 0 }}>{pedidos.length} en total</p>
        </div>
        <button
          onClick={cargar}
          style={{
            background: '#e8f0fd', border: 'none', borderRadius: '10px',
            padding: '8px 14px', fontSize: '0.8rem', fontWeight: 700,
            color: '#0066CC', cursor: 'pointer',
          }}
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '14px' }}>
        {FILTROS.map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            style={{
              whiteSpace: 'nowrap', flexShrink: 0,
              background: filtro === f ? '#0066CC' : '#fff',
              color: filtro === f ? '#fff' : '#666',
              border: filtro === f ? 'none' : '1.5px solid #e0e0e0',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '0.75rem', fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({conteos[f]})
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '60px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#0066CC', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: '60px', color: '#888' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📭</div>
          <p style={{ fontSize: '0.85rem' }}>No hay pedidos {filtro !== 'todos' ? `con estado "${filtro}"` : ''}</p>
        </div>
      ) : (
        filtrados.map(p => {
          const b    = BADGE[p.estado] ?? BADGE.pendiente
          const open = expandido === p.id
          return (
            <div key={p.id} style={{
              background: '#fff', borderRadius: '16px',
              marginBottom: '10px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
              overflow: 'hidden',
            }}>
              {/* Fila principal — tap para expandir */}
              <div
                onClick={() => setExpandido(open ? null : p.id)}
                style={{ padding: '14px 16px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f1d3e' }}>
                      Pedido #{p.id}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '2px' }}>
                      📅 {formatFecha(p.creadoEn)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '3px' }}>
                      👤 {p.cliente?.nombre || '—'} · 📞 {p.cliente?.telefono || '—'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span style={{
                      background: b.bg, color: b.color,
                      fontSize: '0.7rem', fontWeight: 700,
                      padding: '3px 10px', borderRadius: '20px',
                    }}>
                      {b.icon} {b.label}
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0066CC' }}>
                      ${parseFloat(p.total).toFixed(2)}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#bbb' }}>{open ? '▲' : '▼'}</span>
                  </div>
                </div>
              </div>

              {/* Detalle expandido */}
              {open && (
                <div style={{ borderTop: '1px solid #f0f0f0', padding: '14px 16px' }}>
                  {/* Dirección */}
                  <div style={{ fontSize: '0.75rem', color: '#555', marginBottom: '10px' }}>
                    📍 {p.cliente?.direccion || [p.cliente?.callePrincipal, p.cliente?.ciudad].filter(Boolean).join(', ') || '—'}
                  </div>

                  {/* Productos */}
                  <div style={{ background: '#f8fafb', borderRadius: '10px', padding: '10px', marginBottom: '12px' }}>
                    {p.productos.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#444', marginBottom: '4px' }}>
                        <span>💧 {item.nombre} × {item.cantidad}</span>
                        <span style={{ fontWeight: 700 }}>${(parseFloat(item.precio) * item.cantidad).toFixed(2)}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, paddingTop: '6px', borderTop: '1px solid #e5e7eb', color: '#0066CC', fontSize: '0.82rem' }}>
                      <span>Total</span>
                      <span>${parseFloat(p.total).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Botones de estado */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['pendiente', 'entregado', 'suspendido'].map(est => (
                      <button
                        key={est}
                        onClick={() => cambiarEstado(p.id, est)}
                        disabled={p.estado === est || actualizando === p.id}
                        style={{
                          flex: 1, minWidth: '80px',
                          background: p.estado === est ? BADGE[est].bg : '#f0f0f0',
                          color: p.estado === est ? BADGE[est].color : '#555',
                          border: 'none', borderRadius: '10px',
                          padding: '8px 6px', fontSize: '0.72rem', fontWeight: 700,
                          cursor: p.estado === est ? 'default' : 'pointer',
                          opacity: actualizando === p.id ? 0.6 : 1,
                        }}
                      >
                        {BADGE[est].icon} {BADGE[est].label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
