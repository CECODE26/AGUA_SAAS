import { useState, useEffect } from 'react'
import { apiUrl } from '../lib/api'
import AppInstallModal from '../components/AppInstallModal'
import bottleImg     from '../assets/a-bottle-of-water-is-splashing-into-the-water-free-photo.webp'
import imgMediolitro from '../assets/mediolitro.png'
import imgLitro      from '../assets/litro.png'
import imgGarrafon   from '../assets/garrafon.png'
import imgGalon      from '../assets/galon.png'
import imgSixpack    from '../assets/sixpack.png'
import imgX12        from '../assets/x12.png'

const PRODUCT_IMAGES = {
  'Agua Manú 500ml':   imgMediolitro,
  'Agua Manú 1L':      imgLitro,
  'Agua Manú 2L':      imgGarrafon,
  'Agua Manú 5L':      imgGarrafon,
  'Agua Manú 20L':     imgGalon,
  'Pack x12 · 500ml':  imgX12,
  'Sixpack · 500ml':   imgSixpack,
}

function ProductCard({ producto, onPedir }) {
  const agotado = producto.stock === 0
  const img = producto.imagen
    ? apiUrl('/uploads/' + producto.imagen)
    : (PRODUCT_IMAGES[producto.nombre] || bottleImg)

  return (
    <div style={{
      background: '#fff',
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      opacity: agotado ? 0.55 : 1,
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      border: '2px solid transparent',
      transition: 'border 0.2s',
    }}>
      {/* Badge */}
      {producto.tag && !agotado && (
        <span style={{
          position: 'absolute', top: 10, left: 10, zIndex: 2,
          background: 'linear-gradient(135deg,#0055bb,#0088ee)',
          color: '#fff', fontSize: '0.6rem', fontWeight: 700,
          padding: '3px 9px', borderRadius: 999, letterSpacing: 0.4,
          boxShadow: '0 2px 6px rgba(0,102,204,0.3)',
        }}>
          {producto.tag}
        </span>
      )}
      {agotado && (
        <span style={{
          position: 'absolute', top: 10, left: 10, zIndex: 2,
          background: '#9ca3af', color: '#fff',
          fontSize: '0.6rem', fontWeight: 700,
          padding: '3px 9px', borderRadius: 999,
        }}>
          Agotado
        </span>
      )}

      {/* Imagen */}
      <div style={{
        width: '100%', aspectRatio: '1',
        background: 'linear-gradient(135deg,#e8f0fd,#f0f7ff)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <img
          src={img}
          alt={producto.nombre}
          style={{
            width: '100%', height: '100%',
            objectFit: 'contain', padding: 14,
            filter: agotado ? 'grayscale(60%)' : 'none',
            transition: 'transform 0.2s',
          }}
        />
      </div>

      {/* Info */}
      <div style={{ padding: '12px 12px 14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.83rem', fontWeight: 800, color: '#0f1d3e', lineHeight: 1.3, marginBottom: 3 }}>
            {producto.nombre}
          </div>
          {producto.descripcion && (
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1.35, marginBottom: 4 }}>
              {producto.descripcion}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0066CC', lineHeight: 1 }}>
              ${parseFloat(producto.precio).toFixed(2)}
            </div>
            </div>

          <button
            onClick={() => !agotado && onPedir()}
            disabled={agotado}
            style={{
              width: 38, height: 38, borderRadius: '50%', border: 'none',
              background: agotado ? '#e5e7eb' : 'linear-gradient(135deg,#0055bb,#0088ee)',
              color: agotado ? '#9ca3af' : '#fff',
              fontSize: '1rem', fontWeight: 700,
              cursor: agotado ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: agotado ? 'none' : '0 4px 12px rgba(0,102,204,0.35)',
              lineHeight: 1,
            }}
          >
            📱
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════ */
export default function ProductosMobile() {
  const [productos,    setProductos]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showAppModal, setShowAppModal] = useState(false)

  useEffect(() => {
    fetch(apiUrl('/api/productos'))
      .then(r => r.json())
      .then(d => { setProductos(d.productos || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <>
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
            width: 52, height: 52, background: 'rgba(255,255,255,0.15)',
            borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', marginBottom: 12,
          }}>💧</div>
          <h1 style={{ color: '#fff', fontWeight: 900, fontSize: '1.4rem', margin: '0 0 4px', letterSpacing: -0.5 }}>
            Nuestros productos
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem', margin: 0 }}>
            Agua mineral natural · Entrega en Puyo
          </p>
        </div>
      </div>

      {/* ── BADGES ── */}
      <div style={{ display: 'flex', gap: 8, padding: '14px 14px 0', overflowX: 'auto', paddingBottom: 0 }}>
        {[
          { icon: '💧', text: '100% Natural' },
          { icon: '🚚', text: 'Gratis en Puyo' },
          { icon: '🌿', text: 'Sin aditivos' },
          { icon: '🏔️', text: 'Origen Zona ECO 1' },
        ].map(b => (
          <span key={b.text} style={{
            whiteSpace: 'nowrap',
            background: '#fff', color: '#0055bb',
            fontSize: '0.7rem', fontWeight: 700,
            padding: '6px 12px', borderRadius: 999,
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            border: '1px solid #e8f0fd',
          }}>
            {b.icon} {b.text}
          </span>
        ))}
      </div>

      {/* ── GRID ── */}
      <div style={{ padding: '14px 14px 0' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: '3px solid #e5e7eb', borderTopColor: '#0066CC',
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
            {productos.map(p => (
              <ProductCard key={p.id} producto={p} onPedir={() => setShowAppModal(true)} />
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>

    {showAppModal && <AppInstallModal onClose={() => setShowAppModal(false)} />}
    </>
  )
}
