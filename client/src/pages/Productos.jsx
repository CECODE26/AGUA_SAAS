import { useState, useEffect } from 'react'
import { apiUrl } from '../lib/api'
import bottleImg   from '../assets/a-bottle-of-water-is-splashing-into-the-water-free-photo.webp'
import imgMediolitro from '../assets/AGUAMEDIOLITROMANU.webp'
import imgLitro      from '../assets/AGUALITROMANU.webp'
import imgGarrafon   from '../assets/AGUAGARRAFAMANU.webp'

const PRODUCT_IMAGES = {
  'Agua Manú 500ml': imgMediolitro,
  'Agua Manú 1L':    imgLitro,
  'Agua Manú 20L':   imgGarrafon,
}

// Ficha de la app en Google Play
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.aguamanu.conductores'

/* ── Minerales — valores reales análisis SAE ──────────── */
const minerales = [
  { mineral: 'pH',                         valor: '6,85',       icono: '⚗️' },
  { mineral: 'Calcio (Ca)',                 valor: '9,40 mg/L',  icono: '🦷' },
  { mineral: 'Magnesio (Mg)',               valor: '0,71 mg/L',  icono: '💪' },
  { mineral: 'Sodio (Na)',                  valor: '2,85 mg/L',  icono: '🧂' },
  { mineral: 'Potasio (K)',                 valor: '0,52 mg/L',  icono: '⚡' },
  { mineral: 'Sólidos Totales Disueltos',   valor: '17,5 mg/L',  icono: '💧' },
]

/* ── Features por producto (estilo AQUA Premium) ────────── */
const FEATURES = {
  'Agua Manú 500ml':  ['Perfecta para llevar',          'Hidratación individual',          'Envase 100% reciclable'],
  'Agua Manú 1L':     ['Ideal para el hogar',           'Mineralización equilibrada',      'Sin conservantes ni aditivos'],
  'Agua Manú 2L':     ['Formato familiar',               'Para tu mesa diaria',             'Retornable / reciclable'],
  'Agua Manú 5L':     ['Para la oficina o negocio',     'Más litros, más ahorro',          'Entrega a domicilio'],
  'Agua Manú 20L':    ['Compatible con dispensador',    'Mejor costo por litro',           'Recarga programada disponible'],
  'Pack x12 · 500ml':  ['12 botellas al precio de 10',   'Ideal para eventos y empresas',   'Descuento automático incluido'],
}
const FEATURES_DEFAULT = ['Agua purificada de manantial', 'Origen: Manantial · Zona ECO 1, Puyo', 'Sin aditivos ni tratamientos']

/* ── ProductCard ─────────────────────────────────────────── */
function ProductCard({ producto, onPedir }) {
  const agotado   = producto.stock === 0
  const stockBajo = producto.stock > 0 && producto.stock <= 20
  const features  = FEATURES[producto.nombre] || FEATURES_DEFAULT

  const btnColor = agotado ? '#9ca3af' : '#0066CC'

  return (
    <div className={`producto-card${producto.tag && !agotado ? ' producto-destacado' : ''}`}
         style={{ opacity: agotado ? 0.68 : 1 }}>

      {/* Stripe superior + badge */}
      {producto.tag && !agotado && (
        <span className="producto-badge">{producto.tag}</span>
      )}
      {agotado && (
        <span className="producto-badge" style={{ background: '#9ca3af', boxShadow: 'none' }}>Agotado</span>
      )}

      {/* Imagen con hover scale */}
      <div className="producto-img-wrap">
        <img
          src={producto.imagen ? `/uploads/${producto.imagen}` : (PRODUCT_IMAGES[producto.nombre] || bottleImg)}
          alt={producto.nombre}
          className="producto-img"
          style={{ filter: agotado ? 'grayscale(60%)' : 'none' }}
        />
      </div>

      {/* Body */}
      <div className="producto-body">
        <div className="producto-nombre">{producto.nombre}</div>
        {producto.descripcion && (
          <div className="producto-descripcion">{producto.descripcion}</div>
        )}

        {/* Precio prominente — estilo AQUA Premium */}
        <div className="producto-precio">${parseFloat(producto.precio).toFixed(2)}</div>
        <div className="producto-precio-label">precio por unidad · IVA incluido</div>

        {/* Feature bullets */}
        <ul className="producto-features">
          {features.map(f => <li key={f}>{f}</li>)}
        </ul>

        {/* Stock */}
        {!agotado && (
          <div className="mb-3">
            {stockBajo ? (
              <span className="producto-stock" style={{ background: '#fff3cd', color: '#664d03' }}>
                <i className="bi bi-exclamation-triangle me-1"></i>
                Solo {producto.stock} unidades
              </span>
            ) : (
              <span className="producto-stock" style={{ background: '#cddcf8', color: '#0a1845' }}>
                <i className="bi bi-check-circle me-1"></i>
                En stock · {producto.stock} unidades
              </span>
            )}
          </div>
        )}

        {/* CTA */}
        <button
          className="producto-btn"
          style={{ background: btnColor, color: '#fff' }}
          onClick={() => !agotado && onPedir()}
          disabled={agotado}
        >
          {agotado ? (
            <><i className="bi bi-x-circle me-2"></i>No disponible</>
          ) : (
            <><i className="bi bi-phone me-2"></i>Pedir por la app</>
          )}
        </button>
      </div>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────── */
export default function Productos() {
  const [productos,   setProductos]   = useState([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    setTimeout(() => {
      document.getElementById('nuestros-productos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }, [])

  useEffect(() => {
    fetch(apiUrl('/api/productos'))
      .then(r => r.json())
      .then(d => {
        const todos = d.productos || []
        setProductos(todos)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <>
    <div style={{ paddingTop: '90px' }}>

      {/* ── Banner estilo AQUA Premium ──────────────────────── */}
      <div className="productos-banner py-5">
        <div className="productos-banner-drop">💧</div>
        <div className="container text-white text-center py-4 position-relative">
          <p style={{ letterSpacing: '5px', fontSize: '0.72rem', fontWeight: 700, opacity: 0.55, marginBottom: '0.5rem' }}>
            TIENDA ONLINE · ENTREGA A DOMICILIO
          </p>
          <h1 className="section-heading text-white mb-3" style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)' }}>
            NUESTROS PRODUCTOS
          </h1>
          <p style={{ opacity: 0.65, maxWidth: '480px', margin: '0 auto', fontSize: '0.95rem' }}>
            Agua mineral natural · Zona ECO 1 · Puyo, Pastaza · Ecuador
          </p>

          {/* Stats rápidas bajo el título */}
          <div className="d-flex justify-content-center gap-4 mt-4 flex-wrap">
            {[
              { val: '100%', label: 'Natural' },
              { val: '0',    label: 'Aditivos' },
              { val: '6.85', label: 'pH neutro' },
              { val: '24h',  label: 'Entrega' },
            ].map(({ val, label }) => (
              <div key={label} className="text-center">
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 800, color: 'var(--agua)' }}>{val}</div>
                <div style={{ fontSize: '0.68rem', opacity: 0.55, letterSpacing: '1px', textTransform: 'uppercase' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-5">

        {/* ── Origen del agua ────────────────────────────────── */}
        <div className="row align-items-center g-4 mb-5 p-4 rounded-4" style={{ background: 'linear-gradient(135deg, #e8f0fd, #d4eee0)' }}>
          <div className="col-md-8">
            <p style={{ color: '#0066CC', letterSpacing: '3px', fontSize: '0.75rem', fontWeight: 700 }}>EL AGUA QUE BEBEMOS</p>
            <h3 className="fw-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Pura desde su origen</h3>
            <p className="text-muted mb-0" style={{ fontSize: '0.92rem' }}>
              Cada botella nace en los manantiales de la <b>zona ECO 1 de Puyo</b>. El agua se filtra
              durante miles de años por cientos de metros de roca volcánica y sedimento, adquiriendo
              minerales esenciales de forma completamente natural. Sin aditivos. Solo naturaleza.
            </p>
          </div>
          <div className="col-md-4 text-center">
            <div style={{ fontSize: '2.2rem', lineHeight: 1.8 }}>🏔️</div>
            <div style={{ fontSize: '0.8rem', color: '#0066CC', fontWeight: 700, letterSpacing: '1px' }}>
              MANANTIAL → PLANTA → TU MESA
            </div>
          </div>
        </div>

        {/* ── Composición mineral ────────────────────────────── */}
        <div className="mb-5">
          <p style={{ color: 'var(--agua)', letterSpacing: '3px', fontSize: '0.75rem', fontWeight: 700 }}>COMPOSICIÓN MINERAL</p>
          <h4 className="fw-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Mineralización natural</h4>
          <div className="row g-3">
            {minerales.map(({ mineral, valor, icono }) => (
              <div key={mineral} className="col-6 col-md-4 col-lg-2">
                <div className="card border-0 text-center p-3 h-100 card-hover"
                  style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderRadius: '16px' }}>
                  <div style={{ fontSize: '1.8rem' }}>{icono}</div>
                  <div className="fw-bold text-verde small mt-1">{valor}</div>
                  <small className="text-muted" style={{ fontSize: '0.68rem' }}>{mineral}</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Análisis físico-químico completo ───────────────── */}
        <div className="mb-5">
          <div className="row g-4 align-items-start">
            <div className="col-md-7">
              <p style={{ color: 'var(--agua)', letterSpacing: '3px', fontSize: '0.75rem', fontWeight: 700 }}>NUESTRA CALIDAD</p>
              <h4 className="fw-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Análisis Físico-Químico</h4>
              <p className="text-muted small mb-4">
                La honestidad es nuestro principal valor. Resultados de laboratorios acreditados por el
                <b> SAE — Servicio de Acreditación Ecuatoriano</b>.
              </p>
              <div className="table-responsive">
                <table className="table table-sm table-bordered align-middle" style={{ borderRadius: 12, overflow: 'hidden', fontSize: '0.85rem' }}>
                  <thead style={{ background: '#0066CC', color: '#fff' }}>
                    <tr><th>Parámetro</th><th className="text-end">Resultado</th></tr>
                  </thead>
                  <tbody>
                    {[
                      ['pH',                          '6,85'],
                      ['Color',                       '< 5'],
                      ['Sólidos Totales Disueltos',   '17,5 mg/L'],
                      ['Dureza Total',                '19 mg/L'],
                      ['Alcalinidad',                 '14 mg/L'],
                      ['Amoniaco',                    '< 0,1 mg/L'],
                      ['Nitratos',                    '0,4 mg/L'],
                      ['Sulfatos',                    '0,5 mg/L'],
                      ['Calcio',                      '9,40 mg/L'],
                      ['Magnesio',                    '0,71 mg/L'],
                      ['Hierro',                      '0,23 mg/L'],
                      ['Potasio',                     '0,52 mg/L'],
                      ['Sodio',                       '2,85 mg/L'],
                      ['Manganeso',                   '0,022 mg/L'],
                      ['Fluor',                       '0,09 mg/L'],
                      ['Cloruros',                    '< 10 mg/L'],
                    ].map(([param, val]) => (
                      <tr key={param}>
                        <td className="text-muted">{param}</td>
                        <td className="text-end fw-bold" style={{ color: '#0066CC' }}>{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="col-md-5">
              <div className="p-4 rounded-4 mb-4 text-center" style={{ background: 'linear-gradient(135deg, #004fa3, #0066CC)', color: '#fff' }}>
                <div style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1 }}>6.85</div>
                <div className="fw-bold mt-1">pH Agua Manú</div>
                <small style={{ opacity: 0.8 }}>Neutro y equilibrado — ideal para la salud</small>
              </div>
              <div className="p-4 rounded-4" style={{ background: '#e8f0fd' }}>
                <h6 className="fw-bold text-verde mb-3">
                  <i className="bi bi-patch-check-fill me-2"></i>Certificaciones
                </h6>
                <div className="d-flex align-items-start mb-3">
                  <span className="me-2">🔬</span>
                  <div>
                    <b className="small">SAE — Acreditación Ecuatoriana</b>
                    <p className="text-muted mb-0" style={{ fontSize: '0.78rem' }}>Análisis realizados en laboratorios acreditados por el Servicio de Acreditación Ecuatoriano.</p>
                  </div>
                </div>
                <div className="d-flex align-items-start mb-3">
                  <span className="me-2">📋</span>
                  <div>
                    <b className="small">NTE INEN 2200:2008</b>
                    <p className="text-muted mb-0" style={{ fontSize: '0.78rem' }}>Cumple con todos los requisitos físico-químicos y microbiológicos de la norma ecuatoriana.</p>
                  </div>
                </div>
                <div className="d-flex align-items-start">
                  <span className="me-2">🌿</span>
                  <div>
                    <b className="small">Zona ECO 1 — Área protegida</b>
                    <p className="text-muted mb-0" style={{ fontSize: '0.78rem' }}>Manantiales en zona ecológica protegida de Puyo, costado norte del paso lateral vía Tena.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Productos ──────────────────────────────────────── */}
        <div id="nuestros-productos" className="mb-5">
          <p style={{ color: 'var(--agua)', letterSpacing: '3px', fontSize: '0.75rem', fontWeight: 700 }}>NUESTRO PRODUCTO</p>
          <h4 className="fw-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Agua Manú 20L — Garrafón</h4>

          {loading ? (
            <div className="d-flex justify-content-center py-5">
              <div className="spinner-border" style={{ color: '#0066CC' }} />
            </div>
          ) : (
            <div className="row g-4">
              {productos.map(p => (
                <div key={p.id} className="col-md-4 col-sm-6">
                  <ProductCard producto={p} onPedir={() => window.open(PLAY_STORE_URL, '_blank', 'noopener,noreferrer')} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Entrega ────────────────────────────────────────── */}
        <div className="rounded-4 overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--oscuro) 0%, #0f2050 100%)' }}>
          <div className="row g-0">
            <div className="col-md-8 p-4 p-md-5 text-white">
              <p style={{ color: 'var(--agua)', letterSpacing: '3px', fontSize: '0.72rem', fontWeight: 700, opacity: 0.85 }}>SERVICIO A DOMICILIO</p>
              <h4 className="fw-bold mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Entrega gratuita en Puyo</h4>
              <div className="d-flex flex-wrap gap-4">
                {[
                  { icon: 'bi-clock', text: 'Lun–Vie: 8 AM – 4 PM' },
                  { icon: 'bi-calendar-check', text: 'Sáb: 8 AM – 11:30 AM' },
                  { icon: 'bi-truck', text: 'Sin costo adicional' },
                ].map(({ icon, text }) => (
                  <div key={text} className="d-flex align-items-center gap-2">
                    <i className={`bi ${icon}`} style={{ color: 'var(--agua)', fontSize: '1.1rem' }}></i>
                    <span style={{ fontSize: '0.88rem', opacity: 0.8 }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-md-4 d-none d-md-flex align-items-center justify-content-center"
              style={{ fontSize: '6rem', opacity: 0.12 }}>
              🚚
            </div>
          </div>
        </div>

      </div>
    </div>
    </>
  )
}
