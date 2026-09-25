import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'

function formatFecha(iso) {
  return new Date(iso).toLocaleDateString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function ModalConfirmar({ usuario, onCancelar, onConfirmar, eliminando }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050,
      }}
      onClick={() => !eliminando && onCancelar()}
    >
      <div
        style={{
          background: '#fff', borderRadius: 16, padding: 28, maxWidth: 380, width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-3">
          <div style={{ fontSize: '2.5rem' }}>🗑️</div>
          <h6 className="fw-bold mt-2 mb-1">Eliminar cliente</h6>
          <p className="text-muted small mb-0">
            ¿Seguro que deseas eliminar a <strong>{usuario.nombre}</strong>?
            Esta acción no se puede deshacer.
          </p>
        </div>
        <div className="d-flex gap-2 justify-content-center mt-3">
          <button className="btn btn-light" onClick={onCancelar} disabled={eliminando}>
            Cancelar
          </button>
          <button className="btn btn-danger fw-semibold" onClick={onConfirmar} disabled={eliminando}>
            {eliminando && <span className="spinner-border spinner-border-sm me-1" />}
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminUsuarios() {
  const { authFetch } = useAuth()
  const [usuarios,    setUsuarios]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [busqueda,    setBusqueda]    = useState('')
  const [menuAbierto, setMenuAbierto] = useState(null)
  const [confirmando, setConfirmando] = useState(null)
  const [eliminando,  setEliminando]  = useState(false)

  const cargar = useCallback(() => {
    authFetch('/api/usuarios')
      .then(r => r.json())
      .then(d => { setUsuarios(d.usuarios || []); setLoading(false) })
  }, [authFetch])

  useEffect(() => {
    cargar()
    const id = setInterval(cargar, 5000)
    return () => clearInterval(id)
  }, [cargar])

  useEffect(() => {
    function cerrar() { setMenuAbierto(null) }
    document.addEventListener('click', cerrar)
    return () => document.removeEventListener('click', cerrar)
  }, [])

  async function eliminarUsuario() {
    setEliminando(true)
    try {
      const res  = await authFetch(`/api/usuarios/${confirmando.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) {
        alert(data.message || 'No se pudo eliminar el cliente')
      } else {
        setConfirmando(null)
        cargar()
      }
    } catch {
      alert('Error de conexión')
    }
    setEliminando(false)
  }

  const filtrados = usuarios.filter(u =>
    u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.telefono.includes(busqueda)
  )

  return (
    <>
      {confirmando && (
        <ModalConfirmar
          usuario={confirmando}
          onCancelar={() => setConfirmando(null)}
          onConfirmar={eliminarUsuario}
          eliminando={eliminando}
        />
      )}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="fw-bold mb-0">Clientes</h5>
          <p className="text-muted small mb-0">
            {usuarios.length} cliente(s) registrado(s) · Se registran automáticamente al hacer un pedido
          </p>
        </div>
      </div>

      {/* Buscador */}
      <div className="mb-4" style={{ maxWidth: '360px' }}>
        <div className="input-group">
          <span className="input-group-text bg-white">
            <i className="bi bi-search text-muted"></i>
          </span>
          <input
            type="text"
            className="form-control border-start-0"
            placeholder="Buscar por nombre, email o teléfono..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border" style={{ color: '#0066CC' }} />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-4 p-5 text-center shadow-sm">
          <div style={{ fontSize: '3rem', opacity: 0.3 }}>👥</div>
          <p className="text-muted mt-3">
            {busqueda ? 'No se encontraron clientes con esa búsqueda.' : 'Aún no hay clientes registrados.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-4 shadow-sm overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead style={{ background: '#f8f9fa', fontSize: '0.78rem' }}>
                <tr className="text-muted">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="py-3">Teléfono</th>
                  <th className="py-3">Última dirección</th>
                  <th className="py-3">Pedidos</th>
                  <th className="py-3">Primer pedido</th>
                  <th className="py-3">Último pedido</th>
                  <th className="py-3"></th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.85rem' }}>
                {filtrados.map(u => (
                  <tr key={u.email}>
                    <td className="px-4">
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                          style={{ width: '34px', height: '34px', background: '#0066CC', fontSize: '0.85rem', flexShrink: 0 }}
                        >
                          {u.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="fw-semibold">{u.nombre}</div>
                          <div className="text-muted small">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted">{u.telefono}</td>
                    <td className="text-muted small" style={{ maxWidth: '200px' }}>{u.direccion}</td>
                    <td>
                      <span
                        className="badge rounded-pill px-2"
                        style={{ background: '#e8f0fd', color: '#0066CC', fontWeight: 700 }}
                      >
                        {u.totalPedidos}
                      </span>
                    </td>
                    <td className="text-muted small">{formatFecha(u.primerPedido)}</td>
                    <td className="text-muted small">{formatFecha(u.ultimoPedido)}</td>
                    <td className="text-end pe-3" style={{ position: 'relative' }}>
                      <button
                        className="btn btn-sm btn-light"
                        style={{ fontSize: '1rem', lineHeight: 1, padding: '2px 8px' }}
                        onClick={e => { e.stopPropagation(); setMenuAbierto(menuAbierto === u.id ? null : u.id) }}
                        title="Opciones"
                      >
                        ⋮
                      </button>
                      {menuAbierto === u.id && (
                        <div
                          style={{
                            position: 'absolute', right: 12, top: '100%', zIndex: 200,
                            background: '#fff', borderRadius: 10, minWidth: 140,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)', border: '1px solid #f0f0f0',
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            className="btn btn-sm w-100 text-start text-danger"
                            style={{ borderRadius: 10, padding: '8px 14px', fontWeight: 600 }}
                            onClick={() => { setMenuAbierto(null); setConfirmando(u) }}
                          >
                            <i className="bi bi-trash3 me-2"></i>Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
