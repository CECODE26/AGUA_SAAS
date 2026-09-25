import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContextMobile'
import { apiUrl } from '../../lib/api'

export default function AdminProductosMobile() {
  const { authFetch } = useAuth()
  const [productos, setProductos] = useState([])
  const [loading, setLoading]     = useState(true)

  const cargar = useCallback(async () => {
    try {
      const res  = await authFetch('/api/productos?all=true')
      const data = await res.json()
      setProductos(data.productos || [])
    } catch {}
    setLoading(false)
  }, [authFetch])

  useEffect(() => {
    cargar()
    const id = setInterval(cargar, 5000)
    return () => clearInterval(id)
  }, [cargar])

  async function toggleActivo(prod) {
    const res = await authFetch(`/api/productos/${prod.id}/toggle`, { method: 'PATCH' })
    if (res.ok) {
      setProductos(prev => prev.map(p => p.id === prod.id ? { ...p, activo: !p.activo } : p))
    }
  }

  return (
    <div style={{ padding: '12px', paddingBottom: '90px', minHeight: '100vh', background: '#f8f9fa' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f1d3e', margin: 0 }}>Productos</h2>
          <p style={{ fontSize: '0.72rem', color: '#888', margin: 0 }}>{productos.length} productos</p>
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

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '60px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#0066CC', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {productos.map(prod => (
            <div key={prod.id} style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: '14px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
              opacity: prod.activo ? 1 : 0.55,
            }}>
              {/* Imagen */}
              <div style={{
                width: '52px', height: '52px', flexShrink: 0,
                background: '#f0f5ff', borderRadius: '12px',
                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {prod.imagen
                  ? <img src={apiUrl(`/uploads/${prod.imagen}`)} alt={prod.nombre}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '1.5rem' }}>💧</span>
                }
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a1a1a', marginBottom: '2px' }}>
                  {prod.nombre}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#0066CC', fontWeight: 700 }}>
                  ${parseFloat(prod.precio).toFixed(2)}
                </div>
                <div style={{ fontSize: '0.7rem', color: prod.stock === 0 ? '#dc3545' : '#888', marginTop: '2px' }}>
                  Stock: {prod.stock} unidades
                </div>
              </div>

              {/* Toggle activo */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                <div
                  onClick={() => toggleActivo(prod)}
                  style={{
                    width: '48px', height: '26px',
                    background: prod.activo ? '#0066CC' : '#e0e0e0',
                    borderRadius: '13px',
                    position: 'relative', cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '3px',
                    left: prod.activo ? '25px' : '3px',
                    width: '20px', height: '20px',
                    background: '#fff',
                    borderRadius: '50%',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  }} />
                </div>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: prod.activo ? '#0066CC' : '#999' }}>
                  {prod.activo ? 'Visible' : 'Oculto'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
