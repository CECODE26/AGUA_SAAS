import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function DropIcon() {
  return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '72px', height: '90px', animation: 'wm-float 3s ease-in-out infinite', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.2))' }}>
      {/* Gota principal */}
      <path d="M40 5 C40 5 8 48 8 65 C8 83 22.5 95 40 95 C57.5 95 72 83 72 65 C72 48 40 5 40 5Z"
        fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
      {/* Brillo interno */}
      <path d="M26 55 C24 48 28 38 35 30"
        stroke="rgba(255,255,255,0.7)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="28" cy="72" r="4" fill="rgba(255,255,255,0.2)" />
    </svg>
  )
}

export default function WelcomeModal() {
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const seen = sessionStorage.getItem('ap_welcome_seen')
    if (!seen) setTimeout(() => setVisible(true), 600)
  }, [])

  function close() {
    setClosing(true)
    setTimeout(() => {
      setVisible(false)
      setClosing(false)
      sessionStorage.setItem('ap_welcome_seen', '1')
    }, 400)
  }

  function handleProductos() {
    close()
    setTimeout(() => navigate('/productos'), 420)
  }

  if (!visible) return null

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,10,40,0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        animation: closing ? 'wm-fadeout 0.4s ease forwards' : 'wm-fadein 0.4s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(160deg, #002966 0%, #004fa3 40%, #0099ee 100%)',
          borderRadius: '28px',
          maxWidth: '440px',
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
          animation: closing ? 'wm-scaleout 0.4s ease forwards' : 'wm-scalein 0.45s cubic-bezier(0.34,1.56,0.64,1)',
          position: 'relative',
        }}
      >
        {/* Botón cerrar */}
        <button
          onClick={close}
          style={{
            position: 'absolute', top: '14px', right: '16px', zIndex: 2,
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '50%', width: '30px', height: '30px',
            color: 'rgba(255,255,255,0.7)', fontSize: '1rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ×
        </button>

        {/* Círculos decorativos de fondo */}
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-30px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

        {/* Contenido principal */}
        <div style={{ padding: '2.5rem 2rem 0', textAlign: 'center', position: 'relative' }}>
          {/* Icono gota */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.2rem' }}>
            <DropIcon />
          </div>

          {/* Texto */}
          <p style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '5px', fontSize: '0.65rem', fontWeight: 700, margin: '0 0 0.5rem', textTransform: 'uppercase' }}>
            Amazonía Ecuatoriana
          </p>
          <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '2.1rem', margin: '0', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
            Agua Manú
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: '0.6rem 0 0', letterSpacing: '0.5px' }}>
            ¡El equilibrio de la naturaleza!
          </p>

          {/* Línea divisora con brillo */}
          <div style={{ margin: '1.6rem auto', width: '60px', height: '2px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', borderRadius: '2px' }} />

          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem', lineHeight: 1.7, margin: '0' }}>
            Bienvenido a nuestra tienda en línea.<br />
            Agua purificada de manantial, directo a tu puerta<br />en Puyo, Pastaza.
          </p>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', margin: '1.6rem 2rem', flexWrap: 'wrap' }}>
          {['💧 100% Natural', '🚚 A domicilio', '🌿 Sostenible'].map(b => (
            <span key={b} style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.85)',
              fontSize: '0.72rem', fontWeight: 600,
              padding: '5px 12px', borderRadius: '20px',
              letterSpacing: '0.3px',
            }}>
              {b}
            </span>
          ))}
        </div>

        {/* Descarga la app */}
        <div style={{ margin: '0 1.5rem 1.4rem', padding: '14px 16px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.78rem', fontWeight: 600, margin: '0 0 10px' }}>
            📱 Disponible en tu celular
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '5px 10px', opacity: 0.45 }}>
              <svg viewBox="0 0 24 24" fill="white" style={{ width: '14px', height: '14px' }}>
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.39.07 2.35.74 3.17.78 1.21-.24 2.37-.93 3.67-.84 1.57.12 2.75.72 3.53 1.9-3.24 1.94-2.72 5.86.48 7.13-.57 1.55-1.31 3.08-2.85 3.89zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem', fontWeight: 600 }}>App Store</span>
            </span>
            <a
              href="https://play.google.com/store/apps/details?id=com.aguamanu.conductores"
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,102,204,0.5)', border: '1px solid rgba(100,180,255,0.35)', borderRadius: '8px', padding: '5px 12px', textDecoration: 'none' }}
            >
              <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px' }}>
                <path fill="#00D9FF" d="M3.6 1.6c-.3.3-.5.7-.5 1.3v18.2c0 .6.2 1 .5 1.3l.1.1L13.9 12 3.7 1.5l-.1.1z"/>
                <path fill="#FFCE00" d="M17.3 15.4L13.9 12l3.4-3.4 4.1 2.3c1.2.7 1.2 1.8 0 2.5l-4.1 2z"/>
                <path fill="#FF3D3D" d="M17.4 15.5L13.9 12 3.6 22.4c.4.4 1 .5 1.8.1l12-6.9z"/>
                <path fill="#00E676" d="M17.4 8.5L5.4 1.6C4.6 1.2 4 1.3 3.6 1.6L13.9 12l3.5-3.5z"/>
              </svg>
              <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>Google Play</span>
            </a>
          </div>
        </div>

        {/* Botones */}
        <div style={{ padding: '0 1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          <button
            onClick={handleProductos}
            style={{
              background: '#fff',
              color: '#0066CC', border: 'none',
              borderRadius: '14px', padding: '14px 0',
              fontWeight: 800, fontSize: '0.95rem',
              cursor: 'pointer', width: '100%',
              boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
              transition: 'transform 0.15s, box-shadow 0.15s',
              letterSpacing: '0.2px',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.2)' }}
          >
            🛒 Comprar nuestros productos
          </button>
          <button
            onClick={close}
            style={{
              background: 'transparent',
              color: 'rgba(255,255,255,0.65)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '14px', padding: '12px 0',
              fontWeight: 600, fontSize: '0.9rem',
              cursor: 'pointer', width: '100%',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}
          >
            Explorar la página
          </button>
        </div>

        {/* Ola inferior */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }} />
      </div>

      <style>{`
        @keyframes wm-fadein   { from { opacity: 0 } to { opacity: 1 } }
        @keyframes wm-fadeout  { from { opacity: 1 } to { opacity: 0 } }
        @keyframes wm-scalein  { from { opacity: 0; transform: scale(0.85) } to { opacity: 1; transform: scale(1) } }
        @keyframes wm-scaleout { from { opacity: 1; transform: scale(1) } to { opacity: 0; transform: scale(0.88) } }
        @keyframes wm-float {
          0%, 100% { transform: translateY(0px) }
          50%       { transform: translateY(-10px) }
        }
      `}</style>
    </div>
  )
}
