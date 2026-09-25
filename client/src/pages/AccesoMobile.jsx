import { useNavigate } from 'react-router-dom'

export default function AccesoMobile() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #003380 0%, #0066CC 55%, #0099ee 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{
          width: '72px', height: '72px', background: 'rgba(255,255,255,0.15)',
          borderRadius: '50%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 14px',
        }}>
          <svg viewBox="0 0 24 30" fill="none" style={{ width: '36px', height: '44px' }}>
            <path d="M12 2C12 2 3 12 3 18C3 23 7.03 27 12 27C16.97 27 21 23 21 18C21 12 12 2 12 2Z" fill="rgba(255,255,255,0.9)" />
          </svg>
        </div>
        <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.5rem', margin: '0 0 6px' }}>
          Agua Manú
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', margin: 0 }}>
          ¿Cómo deseas ingresar?
        </p>
      </div>

      {/* Opciones */}
      <div style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Conductor */}
        <button
          onClick={() => navigate('/conductor/login')}
          style={{
            background: '#fff', border: 'none', borderRadius: '20px',
            padding: '20px 24px', cursor: 'pointer', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: '16px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
          }}
        >
          <div style={{
            width: '52px', height: '52px', flexShrink: 0,
            background: '#fff8e1', borderRadius: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem',
          }}>🚚</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f1d3e', marginBottom: '3px' }}>
              Repartidor
            </div>
            <div style={{ fontSize: '0.75rem', color: '#888', lineHeight: 1.4 }}>
              Ver mi ruta de entregas del día
            </div>
          </div>
          <div style={{ marginLeft: 'auto', color: '#ccc', fontSize: '1.2rem' }}>›</div>
        </button>
      </div>

      {/* Volver */}
      <button
        onClick={() => navigate('/')}
        style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
          fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', marginTop: '32px',
        }}
      >
        ← Volver al inicio
      </button>
    </div>
  )
}
