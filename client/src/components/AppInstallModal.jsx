import { useDistribuidora } from '../context/DistribuidoraContext'
// Enlace de la app de la distribuidora en Google Play (VITE_PLAY_STORE_URL)
const PLAY_STORE_URL = import.meta.env.VITE_PLAY_STORE_URL || '#'
const PASOS = [
  { num: '1', icon: '📲', titulo: 'Descarga la app', desc: 'Búscala en App Store o Google Play con el nombre de tu distribuidora' },
  { num: '2', icon: '📍', titulo: 'Ingresa tu dirección', desc: 'Registra dónde quieres recibir tu pedido' },
  { num: '3', icon: '💧', titulo: 'Elige tu producto', desc: 'Selecciona presentación y cantidad con un toque' },
  { num: '4', icon: '🚚', titulo: '¡Listo! Te lo llevamos', desc: 'El repartidor llega a tu puerta el mismo día' },
]

export default function AppInstallModal({ onClose }) {
  const { nombre: nombreMarca, distribuidora } = useDistribuidora()
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(10,24,70,0.6)',
        backdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 24, padding: '32px 24px 24px',
          maxWidth: 400, width: '100%', position: 'relative',
          boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        }}
      >
        {/* Cerrar */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 16,
            background: '#f1f5f9', border: 'none', borderRadius: '50%',
            width: 32, height: 32, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', color: '#64748b',
          }}
        >✕</button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 68, height: 68, borderRadius: 20,
            background: 'linear-gradient(135deg, #003d99, #0088ee)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', margin: '0 auto 14px',
            boxShadow: '0 8px 24px rgba(0,102,204,0.28)',
          }}>💧</div>
          <h2 style={{ fontWeight: 900, fontSize: '1.2rem', color: '#0f1d3e', margin: '0 0 6px' }}>
            Descarga {nombreMarca}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
            Pide en segundos desde tu celular — entrega el mismo día{distribuidora?.ciudad ? ` en ${distribuidora.ciudad}` : ''}
          </p>
        </div>

        {/* Botones de descarga */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <a href="#" style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 10,
            background: '#1e293b', color: '#fff', borderRadius: 14,
            padding: '10px 14px', textDecoration: 'none', fontWeight: 700,
            opacity: 0.55, cursor: 'not-allowed',
          }}>
            <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>🍎</span>
            <div>
              <div style={{ fontSize: '0.58rem', opacity: 0.65, lineHeight: 1.3 }}>Próximamente en</div>
              <div style={{ fontSize: '0.82rem' }}>App Store</div>
            </div>
          </a>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 10,
              background: 'linear-gradient(135deg, #003d99, #0066CC)', color: '#fff', borderRadius: 14,
              padding: '10px 14px', textDecoration: 'none', fontWeight: 700,
              boxShadow: '0 4px 14px rgba(0,102,204,0.35)',
            }}
          >
            <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>▶</span>
            <div>
              <div style={{ fontSize: '0.58rem', opacity: 0.75, lineHeight: 1.3 }}>Disponible en</div>
              <div style={{ fontSize: '0.82rem' }}>Google Play</div>
            </div>
          </a>
        </div>

        {/* Divisor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
          <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, letterSpacing: 0.5 }}>¿CÓMO FUNCIONA?</span>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
        </div>

        {/* Pasos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PASOS.map((p) => (
            <div key={p.num} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: '#f8faff', borderRadius: 14, padding: '10px 14px',
            }}>
              <div style={{
                width: 36, height: 36, flexShrink: 0, borderRadius: 10,
                background: 'linear-gradient(135deg, #003d99, #0088ee)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem',
              }}>{p.icon}</div>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f1d3e', lineHeight: 1.2 }}>{p.titulo}</div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.4, marginTop: 1 }}>{p.desc}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
