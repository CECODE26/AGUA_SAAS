import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function AdminContacto() {
  const { token } = useAuth()
  const [mensajes, setMensajes]     = useState([])
  const [noLeidos, setNoLeidos]     = useState(0)
  const [filtro, setFiltro]         = useState('todos')
  const [cargando, setCargando]     = useState(true)

  const headers = { Authorization: `Bearer ${token}` }

  async function cargar(f = filtro) {
    const params = f === 'noLeidos' ? '?leido=false' : f === 'leidos' ? '?leido=true' : ''
    const res  = await fetch(`/api/contacto${params}`, { headers })
    const data = await res.json()
    setMensajes(data.mensajes || [])
    setNoLeidos(data.noLeidos ?? 0)
    setCargando(false)
  }

  useEffect(() => {
    cargar()
    const id = setInterval(() => cargar(), 5000)
    return () => clearInterval(id)
  }, [filtro])

  async function marcarLeido(id) {
    await fetch(`/api/contacto/${id}/leido`, { method: 'PATCH', headers })
    setMensajes(prev => prev.map(m => m.id === id ? { ...m, leido: true } : m))
    setNoLeidos(prev => Math.max(0, prev - 1))
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este mensaje?')) return
    await fetch(`/api/contacto/${id}`, { method: 'DELETE', headers })
    setMensajes(prev => prev.filter(m => m.id !== id))
  }

  return (
    <div>
      {/* Cabecera */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold mb-0" style={{ color: '#0f1d3e' }}>
            Mensajes de contacto
            {noLeidos > 0 && (
              <span className="badge ms-2 rounded-pill"
                style={{ background: '#0066CC', fontSize: '0.75rem' }}>
                {noLeidos} nuevo{noLeidos > 1 ? 's' : ''}
              </span>
            )}
          </h4>
          <p className="text-muted small mb-0">Formulario web — /contacto</p>
        </div>

        {/* Filtro */}
        <div className="btn-group btn-group-sm">
          {[
            { key: 'todos',    label: 'Todos'     },
            { key: 'noLeidos', label: 'No leídos' },
            { key: 'leidos',   label: 'Leídos'    },
          ].map(({ key, label }) => (
            <button key={key}
              className={`btn ${filtro === key ? 'btn-dark' : 'btn-outline-secondary'}`}
              onClick={() => setFiltro(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {cargando ? (
        <div className="text-center py-5 text-muted">Cargando...</div>
      ) : mensajes.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-envelope-x fs-1 d-block mb-2"></i>
          No hay mensajes
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {mensajes.map(m => (
            <div key={m.id}
              className="card border-0 shadow-sm"
              style={{ borderLeft: m.leido ? '' : '4px solid #0066CC', borderRadius: '12px' }}>
              <div className="card-body p-3 p-md-4">

                {/* Fila superior */}
                <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                  <div>
                    <span className="fw-bold" style={{ color: '#0f1d3e' }}>{m.nombre}</span>
                    {!m.leido && (
                      <span className="badge ms-2 rounded-pill"
                        style={{ background: '#0066CC', fontSize: '0.65rem' }}>
                        Nuevo
                      </span>
                    )}
                    <div className="text-muted small mt-1">
                      <i className="bi bi-envelope me-1"></i>{m.email}
                      {m.telefono && <span className="ms-3"><i className="bi bi-telephone me-1"></i>{m.telefono}</span>}
                    </div>
                  </div>
                  <div className="text-muted small text-end text-nowrap">
                    {new Date(m.creadoEn).toLocaleDateString('es-EC', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                    <br />
                    {new Date(m.creadoEn).toLocaleTimeString('es-EC', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>

                {/* Mensaje */}
                <p className="mb-3" style={{ color: '#444', whiteSpace: 'pre-wrap' }}>{m.mensaje}</p>

                {/* Acciones */}
                <div className="d-flex gap-2">
                  {!m.leido && (
                    <button className="btn btn-sm btn-outline-success"
                      onClick={() => marcarLeido(m.id)}>
                      <i className="bi bi-check2 me-1"></i>Marcar leído
                    </button>
                  )}
                  <a href={`mailto:${m.email}`}
                    className="btn btn-sm btn-outline-secondary">
                    <i className="bi bi-reply me-1"></i>Responder
                  </a>
                  <button className="btn btn-sm btn-outline-danger ms-auto"
                    onClick={() => eliminar(m.id)}>
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
