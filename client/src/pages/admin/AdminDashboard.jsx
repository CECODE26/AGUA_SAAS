import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function StatCard({ titulo, valor, icon, bgColor, textColor }) {
  return (
    <div className="col-sm-6 col-xl-3">
      <div className="bg-white rounded-4 p-4 shadow-sm d-flex align-items-center gap-3">
        <div className="rounded-3 p-3" style={{ background: bgColor }}>
          <i className={`bi ${icon} fs-4`} style={{ color: textColor }}></i>
        </div>
        <div>
          <p className="text-muted small mb-0">{titulo}</p>
          <h4 className="fw-bold mb-0">{valor}</h4>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { authFetch } = useAuth()
  const STOCK_MINIMO = 20

  const [stats, setStats] = useState(null)
  const [pedidosRecientes, setPedidosRecientes] = useState([])
  const [stockBajo, setStockBajo] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargar() {
      const [resPedidos, resContacto, resProductos] = await Promise.all([
        authFetch('/api/pedidos'),
        authFetch('/api/contacto'),
        authFetch('/api/productos?all=true'),
      ])
      const dataPedidos  = await resPedidos.json()
      const dataContacto = await resContacto.json()
      const dataProductos = await resProductos.json()
      const pedidos = dataPedidos.pedidos || []

      const pendientes  = pedidos.filter(p => p.estado === 'pendiente').length
      const entregados  = pedidos.filter(p => p.estado === 'entregado').length
      const suspendidos = pedidos.filter(p => p.estado === 'suspendido').length
      const ingresos    = pedidos
        .filter(p => p.estado === 'entregado')
        .reduce((s, p) => s + parseFloat(p.total || 0), 0)
      const mensajesNuevos = dataContacto.noLeidos ?? 0

      setStats({ total: pedidos.length, pendientes, entregados, suspendidos, ingresos, mensajesNuevos })
      setPedidosRecientes(pedidos.slice(0, 5).map(p => ({ ...p, productos: p.items || [] })))
      setStockBajo((dataProductos.productos || []).filter(p => p.activo && p.stock <= STOCK_MINIMO))
      setLoading(false)
    }
    cargar()
    const id = setInterval(cargar, 5000)
    return () => clearInterval(id)
  }, [authFetch])

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border" style={{ color: '#0066CC' }} />
      </div>
    )
  }

  const BADGE = {
    pendiente:   { bg: '#fff3cd', color: '#856404', label: 'Pendiente' },
    planificado: { bg: '#e0f2fe', color: '#0369a1', label: 'Planificado' },
    entregado:   { bg: '#cddcf8', color: '#0a1845', label: 'Entregado' },
    suspendido:  { bg: '#f8d7da', color: '#58151c', label: 'Suspendido' },
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="fw-bold mb-0">Dashboard</h5>
          <p className="text-muted small mb-0">Resumen general de Agua Manú</p>
        </div>
        <span className="text-muted small">
          {new Date().toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* Stat cards */}
      <div className="row g-3 mb-4">
        <StatCard titulo="Total pedidos"   valor={stats.total}      icon="bi-receipt"         bgColor="#e8f0fd" textColor="#0066CC" />
        <StatCard titulo="Pendientes"      valor={stats.pendientes}  icon="bi-clock"           bgColor="#fff3cd" textColor="#856404" />
        <StatCard titulo="Entregados"      valor={stats.entregados}  icon="bi-check-circle"    bgColor="#cddcf8" textColor="#0a1845" />
        <StatCard titulo="Ingresos"        valor={`$${stats.ingresos.toFixed(2)}`} icon="bi-currency-dollar" bgColor="#e8f0fd" textColor="#0066CC" />
        <StatCard titulo="Mensajes nuevos" valor={stats.mensajesNuevos} icon="bi-envelope"     bgColor="#e8f0fe" textColor="#1a56db" />
      </div>

      {/* Alerta suspendidos */}
      {stats.suspendidos > 0 && (
        <div className="alert d-flex align-items-center gap-2 mb-3" style={{ background: '#f8d7da', border: 'none', borderRadius: '12px' }}>
          <i className="bi bi-exclamation-triangle-fill" style={{ color: '#58151c' }}></i>
          <span style={{ color: '#58151c' }}>
            Hay <strong>{stats.suspendidos}</strong> pedido(s) suspendido(s).{' '}
            <Link to="/admin/pedidos" className="fw-bold" style={{ color: '#58151c' }}>Revisar →</Link>
          </span>
        </div>
      )}

      {/* Alerta mensajes nuevos */}
      {stats.mensajesNuevos > 0 && (
        <div className="alert d-flex align-items-center gap-2 mb-3" style={{ background: '#e8f0fe', border: 'none', borderRadius: '12px' }}>
          <i className="bi bi-envelope-fill" style={{ color: '#1a56db' }}></i>
          <span style={{ color: '#1a56db' }}>
            Tienes <strong>{stats.mensajesNuevos}</strong> mensaje(s) de contacto sin leer.{' '}
            <Link to="/admin/contacto" className="fw-bold" style={{ color: '#1a56db' }}>Ver mensajes →</Link>
          </span>
        </div>
      )}

      {/* Alerta stock bajo */}
      {stockBajo.length > 0 && (
        <div className="alert mb-4" style={{ background: '#fff7ed', border: 'none', borderRadius: '12px' }}>
          <div className="d-flex align-items-center gap-2 mb-1">
            <i className="bi bi-box-seam-fill" style={{ color: '#c2410c' }}></i>
            <span className="fw-bold" style={{ color: '#c2410c' }}>
              {stockBajo.length} producto(s) con stock bajo (≤{STOCK_MINIMO} unidades)
            </span>
            <Link to="/admin/productos" className="ms-auto fw-bold small" style={{ color: '#c2410c' }}>Ver productos →</Link>
          </div>
          <div className="d-flex flex-wrap gap-2 mt-2">
            {stockBajo.map(p => (
              <span key={p.id} className="badge rounded-pill px-3 py-2" style={{ background: '#ffedd5', color: '#c2410c', fontSize: '0.78rem' }}>
                {p.nombre}: <strong>{p.stock}</strong> uds.
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pedidos recientes */}
      <div className="bg-white rounded-4 shadow-sm p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="fw-bold mb-0">Pedidos recientes</h6>
          <Link to="/admin/pedidos" className="small text-decoration-none" style={{ color: '#0066CC' }}>
            Ver todos →
          </Link>
        </div>

        {pedidosRecientes.length === 0 ? (
          <p className="text-muted small mb-0">Aún no hay pedidos.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm mb-0">
              <thead>
                <tr className="text-muted" style={{ fontSize: '0.75rem' }}>
                  <th>#</th>
                  <th>Cliente</th>
                  <th>Productos</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {pedidosRecientes.map(p => {
                  const b = BADGE[p.estado] ?? { bg: '#e9ecef', color: '#555', label: p.estado }
                  return (
                    <tr key={p.id} style={{ fontSize: '0.85rem' }}>
                      <td className="fw-bold text-muted">#{p.id}</td>
                      <td>{p.cliente.nombre}</td>
                      <td className="text-muted">{p.items?.length ?? 0} producto(s)</td>
                      <td className="fw-bold">${parseFloat(p.total).toFixed(2)}</td>
                      <td>
                        <span className="badge rounded-pill px-2" style={{ background: b.bg, color: b.color, fontSize: '0.72rem' }}>
                          {b.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
