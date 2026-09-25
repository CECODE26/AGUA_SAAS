import { useEffect, useState } from 'react'
import { useDistribuidora } from '../context/DistribuidoraContext'

export default function SplashMobile({ onDone }) {
  const { nombre: nombreMarca } = useDistribuidora()
  const [phase, setPhase] = useState('in') // 'in' | 'show' | 'out'

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 300)
    const t2 = setTimeout(() => setPhase('out'), 2200)
    const t3 = setTimeout(() => onDone(), 2700)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'linear-gradient(160deg, #003380 0%, #0066CC 50%, #0099ee 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      opacity: phase === 'out' ? 0 : 1,
      transition: phase === 'out' ? 'opacity 0.5s ease' : 'none',
    }}>
      {/* Círculos de fondo */}
      <div style={{
        position: 'absolute', top: '-80px', right: '-80px',
        width: '300px', height: '300px', borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-100px', left: '-60px',
        width: '280px', height: '280px', borderRadius: '50%',
        background: 'rgba(255,255,255,0.03)',
      }} />

      {/* Contenido central */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        opacity: phase === 'in' ? 0 : 1,
        transform: phase === 'in' ? 'translateY(20px) scale(0.95)' : 'translateY(0) scale(1)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
      }}>
        {/* Gota SVG */}
        <svg viewBox="0 0 60 78" fill="none" style={{ width: '72px', height: '94px', marginBottom: '20px', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.2))' }}>
          <path d="M30 4C30 4 6 34 6 50C6 63.8 16.7 74 30 74C43.3 74 54 63.8 54 50C54 34 30 4 30 4Z"
            fill="rgba(255,255,255,0.92)" />
          <path d="M18 47C16.5 41 20 33 26 26"
            stroke="rgba(0,102,204,0.35)" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="21" cy="56" r="4" fill="rgba(0,102,204,0.15)" />
        </svg>

        {/* Nombre */}
        <h1 style={{
          color: '#fff',
          fontWeight: 800,
          fontSize: '2.2rem',
          letterSpacing: '-0.5px',
          margin: '0 0 6px',
          fontFamily: 'Montserrat, sans-serif',
        }}>
          {nombreMarca}
        </h1>

        {/* Subtítulo */}
        <p style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: '0.78rem',
          fontWeight: 600,
          letterSpacing: '4px',
          margin: 0,
          textTransform: 'uppercase',
        }}>
          Amazonía Ecuatoriana
        </p>
      </div>

      {/* Punto de carga animado */}
      <div style={{
        position: 'absolute', bottom: '60px',
        display: 'flex', gap: '6px',
        opacity: phase === 'in' ? 0 : 1,
        transition: 'opacity 0.4s ease 0.4s',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.5)',
            animation: `sp-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes sp-dot {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4 }
          40%            { transform: scale(1.2); opacity: 1 }
        }
      `}</style>
    </div>
  )
}
