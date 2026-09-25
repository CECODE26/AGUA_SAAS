import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { apiUrl } from '../lib/api'

const QUICK_PRODUCTS = [
  { nombre: 'Agua Manú 500ml', precio: '$0.30', emoji: '🥤' },
  { nombre: 'Agua Manú 20L',   precio: '$2.50', emoji: '🍶' },
  { nombre: 'Pack x12',        precio: '$3.20', emoji: '📦' },
]

export default function InicioMobile() {
  const navigate = useNavigate()
  const [productos, setProductos] = useState([])
  const [hora, setHora] = useState('')

  useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) setHora('Buenos días')
    else if (h < 19) setHora('Buenas tardes')
    else setHora('Buenas noches')

    fetch(apiUrl('/api/productos'))
      .then(r => r.json())
      .then(d => setProductos((d.productos || []).slice(0, 3)))
      .catch(() => {})
  }, [])

  return (
    <div style={{ paddingBottom: '88px', minHeight: '100vh', background: '#f0f4ff' }}>

      {/* ── HERO ── */}
      <div style={{
        background: 'linear-gradient(145deg, #003d99 0%, #0066CC 50%, #0099ee 100%)',
        padding: '20px 20px 32px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Burbujas decorativas */}
        {[
          { w: 180, h: 180, top: -60, right: -50, op: 0.06 },
          { w: 120, h: 120, top: 20,  right: 60,  op: 0.04 },
          { w: 90,  h: 90,  bottom: -30, left: -20, op: 0.05 },
        ].map((b, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: b.w, height: b.h,
            top: b.top, right: b.right, bottom: b.bottom, left: b.left,
            borderRadius: '50%',
            background: 'rgba(255,255,255,' + b.op + ')',
            pointerEvents: 'none',
          }} />
        ))}

        {/* Saludo */}
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 4px' }}>
          {hora} ☀️
        </p>
        <h1 style={{ color: '#fff', fontWeight: 900, fontSize: '1.75rem', lineHeight: 1.2, margin: '0 0 6px', letterSpacing: -0.5 }}>
          Agua pura<br />
          <span style={{ color: '#7dd3fc' }}>directo a ti</span>
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', margin: '0 0 22px', lineHeight: 1.5 }}>
          Zona ECO 1, Puyo · Entrega en Puyo y alrededores
        </p>

        {/* CTA */}
        <button
          onClick={() => navigate('/productos')}
          style={{
            display: 'block', width: '100%',
            background: '#fff',
            color: '#0066CC',
            border: 'none', borderRadius: 14,
            padding: '14px',
            fontWeight: 800, fontSize: '0.95rem',
            cursor: 'pointer',
            boxShadow: '0 6px 24px rgba(0,0,40,0.25)',
            letterSpacing: '-0.3px',
          }}
        >
          🛒 Ver productos y pedir
        </button>
      </div>

      {/* ── STATS ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
        gap: 10, padding: '16px 14px 0',
      }}>
        {[
          { icon: '🚚', label: 'Entrega rápida', sub: 'mismo día' },
          { icon: '💧', label: '100% Natural',   sub: 'sin aditivos' },
          { icon: '🌿', label: 'Sostenible',     sub: 'eco-friendly' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#fff', borderRadius: 16, padding: '14px 10px',
            textAlign: 'center',
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f1d3e', lineHeight: 1.2 }}>{s.label}</div>
            <div style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── PRODUCTOS DESTACADOS ── */}
      <div style={{ padding: '20px 14px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f1d3e', margin: 0 }}>Más pedidos</h2>
          <button onClick={() => navigate('/productos')}
            style={{ background: 'none', border: 'none', color: '#0066CC', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
            Ver todos →
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {(productos.length > 0 ? productos : QUICK_PRODUCTS).map((p, i) => (
            <div key={i} onClick={() => navigate('/productos')}
              style={{
                background: '#fff', borderRadius: 16, minWidth: 130,
                padding: '14px 12px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                cursor: 'pointer', flexShrink: 0,
              }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: '#e8f0fd',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem', marginBottom: 8,
              }}>
                {p.emoji || '💧'}
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f1d3e', lineHeight: 1.3, marginBottom: 4 }}>
                {p.nombre}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0066CC' }}>
                {p.precio ? p.precio : `$${parseFloat(p.precio_num || 0).toFixed(2)}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── BANNER ENTREGAS ── */}
      <div style={{ padding: '20px 14px 0' }}>
        <div style={{
          background: 'linear-gradient(135deg, #00763E, #009E53)',
          borderRadius: 20, padding: '18px 20px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 52, height: 52, flexShrink: 0,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem',
          }}>🚚</div>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem', marginBottom: 2 }}>
              Entrega a domicilio
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', lineHeight: 1.5 }}>
              Puyo y zonas cercanas · Sin costo mínimo. Te contactamos para coordinar.
            </div>
          </div>
        </div>
      </div>

      {/* ── CARACTERÍSTICAS ── */}
      <div style={{ padding: '20px 14px 0' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f1d3e', margin: '0 0 12px' }}>¿Por qué Agua Manú?</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { icon: '🏔️', title: 'Origen natural', desc: 'Manantiales en la zona ECO 1 protegida de Puyo, Pastaza' },
            { icon: '🧪', title: 'Sin conservantes', desc: 'Embotellada con los más altos estándares de pureza' },
            { icon: '📍', title: 'Cobertura local', desc: 'Servimos Puyo, Shell, Mera y comunidades cercanas' },
          ].map(f => (
            <div key={f.title} style={{
              background: '#fff', borderRadius: 16, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 14,
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            }}>
              <div style={{
                width: 44, height: 44, flexShrink: 0,
                background: '#f0f9ff', borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.3rem',
              }}>{f.icon}</div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f1d3e', marginBottom: 2 }}>{f.title}</div>
                <div style={{ fontSize: '0.73rem', color: '#64748b', lineHeight: 1.4 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA FINAL ── */}
      <div style={{ padding: '24px 14px 0' }}>
        <button onClick={() => navigate('/productos')}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #0055bb, #0088ee)',
            color: '#fff', border: 'none',
            borderRadius: 16, padding: '16px',
            fontWeight: 800, fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0,102,204,0.35)',
          }}>
          💧 Hacer un pedido ahora
        </button>
        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: '#94a3b8', marginTop: 10, marginBottom: 0 }}>
          Sin pago online · Coordinamos la entrega contigo
        </p>
      </div>

    </div>
  )
}
