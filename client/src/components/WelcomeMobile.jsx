import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function WelcomeMobile({ onClose }) {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    setTimeout(() => setVisible(true), 400)
  }, [])

  function handleClose() {
    setClosing(true)
    setTimeout(() => onClose(), 400)
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,10,40,0.65)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      padding: '0',
      animation: closing ? 'wm-fadeout 0.4s ease forwards' : 'wm-fadein 0.35s ease',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '28px 28px 0 0',
        width: '100%',
        maxWidth: '480px',
        overflow: 'hidden',
        boxShadow: '0 -20px 60px rgba(0,0,0,0.3)',
        animation: closing ? 'wm-slideout 0.4s ease forwards' : 'wm-slidein 0.45s cubic-bezier(0.34,1.3,0.64,1)',
      }}>

        {/* Tirador */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#ddd' }} />
        </div>

        {/* Header verde */}
        <div style={{
          background: 'linear-gradient(135deg, #0066CC 0%, #0088dd 100%)',
          margin: '16px 16px 0',
          borderRadius: '20px',
          padding: '28px 24px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Burbujas decorativas */}
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'absolute', bottom: '-30px', left: '20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

          {/* Icono gota SVG */}
          <div style={{ marginBottom: '14px' }}>
            <svg viewBox="0 0 40 52" fill="none" style={{ width: '40px', height: '52px', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }}>
              <path d="M20 3C20 3 4 22 4 33C4 42.4 11.2 50 20 50C28.8 50 36 42.4 36 33C36 22 20 3 20 3Z"
                fill="rgba(255,255,255,0.9)" />
              <path d="M12 31C11 27 13.5 22 17 17"
                stroke="rgba(0,102,204,0.4)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>

          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '4px', margin: '0 0 6px', textTransform: 'uppercase' }}>
            Puyo · Pastaza
          </p>
          <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.6rem', margin: '0 0 8px', lineHeight: 1.2 }}>
            Agua purificada de manantial,<br />directo a tu puerta
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.88rem', margin: 0, lineHeight: 1.6 }}>
            ¡El equilibrio de la naturaleza! Embotellada en la zona ECO 1 de Puyo. Pura, fresca y sostenible.
          </p>
        </div>

        {/* Features */}
        <div style={{ display: 'flex', gap: '10px', padding: '16px 16px 0', justifyContent: 'center' }}>
          {[
            { icon: '💧', label: '100% Natural' },
            { icon: '🚚', label: 'A domicilio' },
            { icon: '🌿', label: 'Sostenible' },
          ].map(f => (
            <div key={f.label} style={{
              flex: 1, background: '#f0f5ff', borderRadius: '14px',
              padding: '12px 8px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{f.icon}</div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0066CC' }}>{f.label}</div>
            </div>
          ))}
        </div>

        {/* Botones */}
        <div style={{ padding: '16px 16px 32px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => { handleClose(); navigate('/productos') }}
            style={{
              background: 'linear-gradient(135deg, #0066CC, #0088dd)',
              color: '#fff', border: 'none',
              borderRadius: '16px', padding: '16px',
              fontWeight: 800, fontSize: '1rem',
              cursor: 'pointer', width: '100%',
              boxShadow: '0 6px 20px rgba(0,102,204,0.35)',
              letterSpacing: '0.2px',
            }}
          >
            Ver productos
          </button>
        </div>
      </div>

      <style>{`
        @keyframes wm-fadein   { from { opacity: 0 } to { opacity: 1 } }
        @keyframes wm-fadeout  { from { opacity: 1 } to { opacity: 0 } }
        @keyframes wm-slidein  { from { opacity: 0; transform: translateY(100%) } to { opacity: 1; transform: translateY(0) } }
        @keyframes wm-slideout { from { opacity: 1; transform: translateY(0) } to { opacity: 0; transform: translateY(100%) } }
      `}</style>
    </div>
  )
}
