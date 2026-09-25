import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiUrl } from '../../lib/api'

const DEPOSITO = { lat: -1.488252, lng: -78.015242 }
const GPS_INTERVAL_MS = 30_000 // ping cada 30 segundos

const BADGE = {
  pendiente: { bg: '#fffbeb', color: '#92400e', dot: '#f59e0b', label: 'Pendiente' },
  entregado: { bg: '#f0fdf4', color: '#14532d', dot: '#22c55e', label: 'Entregado' },
}

export default function ConductorRutaMobile() {
  const [ruta,        setRuta]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [entregando,  setEntregando]  = useState(null)
  const [tab,         setTab]         = useState('pendientes')
  const [nuevoPedido, setNuevoPedido] = useState(null) // notificación flotante
  const esRef = useRef(null)
  const navigate = useNavigate()
  const nombre   = localStorage.getItem('conductor_nombre') || 'Conductor'
  const token    = localStorage.getItem('conductor_token')

  // ── Cargar ruta inicial ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { navigate('/conductor/login'); return }
    fetch(apiUrl('/api/conductores/mi-ruta'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (r.status === 401 || r.status === 403) { navigate('/conductor/login'); return null }
        return r.json()
      })
      .then(data => { if (data) setRuta(data.ruta); setLoading(false) })
      .catch(() => setLoading(false))
  }, [token, navigate])

  // ── GPS ping cada 30s ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !navigator.geolocation) return
    function enviarUbicacion() {
      navigator.geolocation.getCurrentPosition(pos => {
        fetch(apiUrl('/api/conductores/mi-ubicacion'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        }).catch(() => {})
      }, () => {})
    }
    enviarUbicacion()
    const id = setInterval(enviarUbicacion, GPS_INTERVAL_MS)
    return () => clearInterval(id)
  }, [token])

  // ── SSE: escuchar nuevos pedidos asignados ───────────────────────────────────
  useEffect(() => {
    if (!token) return
    const es = new EventSource(apiUrl(`/api/conductores/eventos?token=${token}`))
    esRef.current = es
    es.onmessage = e => {
      try {
        const data = JSON.parse(e.data)
        if (data.tipo === 'nuevo_pedido') {
          setRuta(prev => {
            if (!prev) return prev
            const yaExiste = prev.items.some(i => i.pedidoId === data.pedido.pedidoId)
            if (yaExiste) return prev
            const nuevoItem = { ...data.pedido, orden: (prev.items.length || 0) + 1 }
            return { ...prev, items: [...prev.items, nuevoItem] }
          })
          setNuevoPedido(data.pedido)
          setTimeout(() => setNuevoPedido(null), 6000)
        }
      } catch {}
    }
    return () => { es.close(); esRef.current = null }
  }, [token])

  async function marcarEntregado(pedidoId) {
    setEntregando(pedidoId)
    await fetch(apiUrl(`/api/conductores/mi-ruta/pedidos/${pedidoId}`), {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
    setRuta(prev => ({
      ...prev,
      items: prev.items.map(i => i.pedidoId === pedidoId ? { ...i, estado: 'entregado' } : i),
    }))
    setEntregando(null)
  }

  function logout() {
    localStorage.removeItem('conductor_token')
    localStorage.removeItem('conductor_nombre')
    navigate('/conductor/login')
  }

  function abrirMaps(lat, lng) {
    window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f1d3e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#60a5fa', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Cargando tu ruta…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const pendientes = ruta?.items.filter(i => i.estado !== 'entregado') ?? []
  const entregados = ruta?.items.filter(i => i.estado === 'entregado') ?? []
  const total      = ruta?.items.length ?? 0
  const progreso   = total > 0 ? Math.round((entregados.length / total) * 100) : 0
  const listaActual = tab === 'pendientes' ? pendientes : entregados

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4ff', paddingBottom: 32 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes slideDown { from { transform: translateY(-100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>

      {/* ── NOTIFICACIÓN NUEVO PEDIDO ── */}
      {nuevoPedido && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: 'linear-gradient(135deg, #16a34a, #22c55e)',
          color: '#fff', padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 4px 20px rgba(22,163,74,0.5)',
          animation: 'slideDown 0.4s ease',
        }}>
          <span style={{ fontSize: '1.5rem' }}>🚨</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: '0.9rem' }}>¡Nuevo pedido asignado!</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
              {nuevoPedido.cliente?.nombre} · ${parseFloat(nuevoPedido.total).toFixed(2)}
            </div>
          </div>
          <button onClick={() => setNuevoPedido(null)} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none',
            borderRadius: 8, color: '#fff', padding: '4px 10px',
            cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
          }}>✕</button>
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{
        background: 'linear-gradient(145deg, #0f1d3e 0%, #1e3a6e 100%)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, flexShrink: 0,
              background: 'linear-gradient(135deg, #0055bb, #0088ee)',
              borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem',
            }}>🚚</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.2 }}>{nombre}</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.68rem' }}>
                {ruta ? ruta.nombre : 'Sin ruta asignada hoy'}
              </div>
            </div>
          </div>
          <button onClick={logout} style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: '8px 12px',
            color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
          }}>Salir 🚪</button>
        </div>

        {ruta && (
          <>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, padding: '4px 14px 14px' }}>
              {[
                { label: 'Total',      value: total,            bg: 'rgba(255,255,255,0.08)', color: '#fff' },
                { label: 'Pendientes', value: pendientes.length, bg: '#fffbeb',                color: '#92400e' },
                { label: 'Entregados', value: entregados.length, bg: '#f0fdf4',                color: '#14532d' },
              ].map(s => (
                <div key={s.label} style={{
                  background: s.bg, borderRadius: 12,
                  padding: '10px 8px', textAlign: 'center',
                }}>
                  <div style={{ fontWeight: 900, fontSize: '1.4rem', color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: '0.64rem', fontWeight: 600, color: s.color, opacity: 0.75, marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Barra de progreso */}
            <div style={{ padding: '0 14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Progreso de ruta</span>
                <span style={{ fontSize: '0.78rem', color: progreso === 100 ? '#4ade80' : '#60a5fa', fontWeight: 800 }}>{progreso}%</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 999,
                  width: `${progreso}%`,
                  background: progreso === 100
                    ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                    : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── SIN RUTA ── */}
      {!ruta ? (
        <div style={{ textAlign: 'center', padding: '80px 28px 0' }}>
          <div style={{
            width: 72, height: 72, background: '#fff', borderRadius: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', margin: '0 auto 16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}>📅</div>
          <h3 style={{ fontWeight: 900, color: '#0f1d3e', fontSize: '1.1rem', margin: '0 0 8px' }}>Sin ruta para hoy</h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
            El administrador aún no ha planificado tu ruta de hoy. Vuelve más tarde.
          </p>
        </div>
      ) : (
        <div style={{ padding: '14px 12px 0' }}>

          {/* ── TABS ── */}
          <div style={{
            display: 'flex', gap: 6,
            background: '#fff', borderRadius: 14, padding: 4,
            marginBottom: 14,
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          }}>
            {[
              { key: 'pendientes', label: `Pendientes (${pendientes.length})` },
              { key: 'entregados', label: `Entregados (${entregados.length})` },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                flex: 1, padding: '10px 8px',
                border: 'none', borderRadius: 10,
                background: tab === t.key
                  ? (t.key === 'pendientes' ? '#0066CC' : '#22c55e')
                  : 'transparent',
                color: tab === t.key ? '#fff' : '#64748b',
                fontWeight: 700, fontSize: '0.78rem',
                cursor: 'pointer', transition: 'all 0.2s',
              }}>{t.label}</button>
            ))}
          </div>

          {/* ── LISTA DE PARADAS ── */}
          {listaActual.length === 0 ? (
            <div style={{
              background: '#fff', borderRadius: 20, padding: '36px 24px',
              textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>
                {tab === 'pendientes' ? '🎉' : '📋'}
              </div>
              <div style={{ fontWeight: 700, color: '#0f1d3e', fontSize: '0.95rem', marginBottom: 4 }}>
                {tab === 'pendientes' ? '¡Todo entregado!' : 'Aún sin entregas'}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                {tab === 'pendientes' ? 'Completaste todas las paradas de hoy.' : 'Las entregas confirmadas aparecerán aquí.'}
              </div>
            </div>
          ) : (
            listaActual.map((item, idx) => {
              const entregado = item.estado === 'entregado'
              const lat = item.cliente.latitud || item.cliente.lat
              const lng = item.cliente.longitud || item.cliente.lng

              return (
                <div key={item.pedidoId} style={{
                  background: '#fff', borderRadius: 20,
                  marginBottom: 12, overflow: 'hidden',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
                  border: entregado ? '1.5px solid #bbf7d0' : '1.5px solid transparent',
                }}>
                  {/* Cabecera de parada */}
                  <div style={{
                    background: entregado
                      ? 'linear-gradient(135deg, #14532d, #16a34a)'
                      : 'linear-gradient(135deg, #0055bb, #0088ee)',
                    padding: '12px 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{
                      width: 36, height: 36, flexShrink: 0,
                      background: 'rgba(255,255,255,0.2)',
                      borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 900, fontSize: '0.9rem', color: '#fff',
                    }}>
                      {entregado ? '✓' : item.orden}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff', lineHeight: 1.2 }}>
                        {item.cliente.nombre}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>
                        💰 ${parseFloat(item.total).toFixed(2)}
                      </div>
                    </div>
                    {entregado && (
                      <span style={{
                        background: 'rgba(255,255,255,0.2)',
                        color: '#fff', fontSize: '0.68rem', fontWeight: 700,
                        padding: '4px 10px', borderRadius: 999,
                      }}>✅ Entregado</span>
                    )}
                  </div>

                  {/* Cuerpo */}
                  <div style={{ padding: '14px 16px' }}>
                    {/* Dirección */}
                    <div style={{
                      background: '#f8fafc', borderRadius: 12,
                      padding: '10px 12px', marginBottom: 12,
                    }}>
                      <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.5 }}>
                        📍 {[item.cliente.callePrincipal, item.cliente.calleSecundaria && `y ${item.cliente.calleSecundaria}`].filter(Boolean).join(' ') || item.cliente.direccion || '—'}
                      </div>
                      {item.cliente.referencia && (
                        <div style={{ fontSize: '0.74rem', color: '#92400e', marginTop: 4 }}>
                          🏷️ {item.cliente.referencia}
                        </div>
                      )}
                    </div>

                    {/* Productos */}
                    <div style={{
                      display: 'flex', flexWrap: 'wrap', gap: 6,
                      marginBottom: 12,
                    }}>
                      {item.productos.map((p, i) => (
                        <span key={i} style={{
                          background: '#eff6ff', color: '#1d4ed8',
                          fontSize: '0.72rem', fontWeight: 600,
                          padding: '4px 10px', borderRadius: 999,
                          border: '1px solid #bfdbfe',
                        }}>
                          💧 {p.nombre} ×{p.cantidad}
                        </span>
                      ))}
                    </div>

                    {/* Botones de acción */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: entregado ? 0 : 10 }}>
                      {item.cliente.telefono && (
                        <a href={`tel:${item.cliente.telefono}`} style={{
                          flex: 1, background: '#eff6ff',
                          border: '1.5px solid #bfdbfe', color: '#1d4ed8',
                          borderRadius: 12, padding: '10px 8px',
                          fontWeight: 700, fontSize: '0.78rem', textDecoration: 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        }}>
                          📞 {item.cliente.telefono}
                        </a>
                      )}
                      {lat && lng && (
                        <button onClick={() => abrirMaps(lat, lng)} style={{
                          background: '#eff6ff',
                          border: '1.5px solid #bfdbfe', color: '#1d4ed8',
                          borderRadius: 12, padding: '10px 16px',
                          fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 5,
                          flexShrink: 0,
                        }}>🗺️ Maps</button>
                      )}
                    </div>

                    {/* Botón entregar */}
                    {!entregado && (
                      <button
                        onClick={() => marcarEntregado(item.pedidoId)}
                        disabled={entregando === item.pedidoId}
                        style={{
                          width: '100%',
                          background: entregando === item.pedidoId
                            ? 'rgba(34,197,94,0.5)'
                            : 'linear-gradient(135deg, #16a34a, #22c55e)',
                          color: '#fff', border: 'none',
                          borderRadius: 14, padding: '14px',
                          fontWeight: 900, fontSize: '0.95rem',
                          cursor: entregando === item.pedidoId ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          boxShadow: '0 6px 20px rgba(22,163,74,0.35)',
                          transition: 'opacity 0.2s',
                        }}
                      >
                        {entregando === item.pedidoId
                          ? <>
                              <span style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                              Confirmando…
                            </>
                          : <>✅ Confirmar entrega</>
                        }
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}

          {/* Completado total */}
          {progreso === 100 && (
            <div style={{
              background: 'linear-gradient(135deg, #14532d, #16a34a)',
              borderRadius: 20, padding: '24px',
              textAlign: 'center', marginTop: 8,
              boxShadow: '0 8px 24px rgba(22,163,74,0.3)',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎉</div>
              <div style={{ color: '#fff', fontWeight: 900, fontSize: '1.1rem', marginBottom: 4 }}>¡Ruta completada!</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem' }}>
                Entregaste {total} pedido{total !== 1 ? 's' : ''} hoy. ¡Excelente trabajo!
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  )
}
