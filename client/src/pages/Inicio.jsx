import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import heroImg from '../assets/PORTADAMANU.webp'
import bottleImg from '../assets/portada3.webp'
import santaImg from '../assets/postada2.webp'
import WelcomeModal from '../components/WelcomeModal'
import { useContenido } from '../hooks/useContenido'

function Counter({ target, suffix = '' }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const duration = 1800
        const steps = 60
        const increment = target / steps
        let current = 0
        const timer = setInterval(() => {
          current += increment
          if (current >= target) {
            setCount(target)
            clearInterval(timer)
          } else {
            setCount(Math.floor(current))
          }
        }, duration / steps)
      }
    }, { threshold: 0.3 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target])

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

export default function Inicio() {
  const c = useContenido('inicio')
  const t = (sec, key, fallback) => c?.[sec]?.[key] || fallback

  const heroSrc    = c?.hero?.imagen    || heroImg
  const servicioSrc = c?.servicio?.imagen || santaImg

  return (
    <>
      <WelcomeModal />
      {/* Hero */}
      <header
        className="main-header d-flex align-items-center justify-content-center position-relative"
        style={{
          height: '100vh',
          backgroundImage: `url(${heroSrc})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="hero-overlay"></div>
        <div className="w-100 position-relative" style={{ zIndex: 2, padding: '0 1.5rem' }}>
          <div className="hero-glass text-center">
            <p className="text-white mb-2" style={{ letterSpacing: '5px', fontSize: '0.75rem', fontWeight: 700, opacity: 0.7 }}>
              {t('hero', 'badge', 'AMAZONÍA ECUATORIANA · PUYO · PASTAZA · ECUADOR')}
            </p>
            <h1
              className="display-4 fw-bold text-white section-heading"
              style={{ textShadow: '0 2px 20px rgba(0,0,0,0.4)', maxWidth: '700px', margin: '0 auto 0.5rem', fontSize: 'clamp(1.8rem,5vw,3rem)' }}
            >
              {t('hero', 'titulo', 'EMBOTELLAMOS AGUA MINERAL NATURAL DE MANERA SOSTENIBLE')}
            </h1>
            <p className="text-white mb-4" style={{ opacity: 0.9, fontSize: '1.25rem', maxWidth: '520px', margin: '1rem auto 1.8rem', fontStyle: 'italic', fontWeight: 600, letterSpacing: '1px' }}>
              {t('hero', 'subtitulo', '¡El equilibrio de la naturaleza!')}
            </p>
            <div className="d-flex gap-3 justify-content-center flex-wrap">
              <Link to="/historia" className="btn btn-verde btn-lg px-5 py-2">
                Nuestra Historia
              </Link>
              <Link to="/productos" className="btn btn-lg px-5 py-2" style={{ border: '2px solid rgba(255,255,255,0.7)', color: '#fff', fontWeight: 700, backdropFilter: 'blur(4px)', background: 'rgba(255,255,255,0.08)' }}>
                Ver Productos
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Nube divisora */}
      <div className="cloud-divider">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,80 Q60,20 120,60 Q180,10 240,55 Q300,5 360,50 Q420,15 480,55 Q540,10 600,50 Q660,20 720,55 Q780,10 840,50 Q900,15 960,55 Q1020,5 1080,50 Q1140,15 1200,55 Q1260,10 1320,50 Q1380,20 1440,40 L1440,80 Z" fill="white" />
        </svg>
      </div>

      {/* El origen del agua */}
      <section className="container my-5 py-4">
        <div className="text-center mb-5">
          <p style={{ color: '#0066CC', letterSpacing: '3px', fontSize: '0.8rem', fontWeight: 700 }}>
            {t('origen', 'badge', 'EL SECRETO DE SU PUREZA')}
          </p>
          <h2 className="section-heading">
            {t('origen', 'titulo', 'EL ORIGEN DEL AGUA MANÚ')}
          </h2>
          <p className="text-muted mt-3" style={{ maxWidth: '620px', margin: '1rem auto 0' }}>
            {t('origen', 'descripcion', 'Nuestros manantiales están en la zona ECO 1 de Puyo — área ecológica protegida — donde el agua se filtra durante miles de años por roca volcánica antes de surgir cristalina a la superficie.')}
          </p>
        </div>
        <div className="row g-4">
          {[
            {
              icono: '🏔️',
              titulo: t('origen', 'card1_titulo', 'Zona ECO 1 de Puyo'),
              texto: t('origen', 'card1_desc', 'Nuestros manantiales están en la zona ecológica protegida de Puyo, costado norte del paso lateral vía a Tena, garantizando la más alta pureza natural sin intervención humana.'),
            },
            {
              icono: '💎',
              titulo: t('origen', 'card2_titulo', 'Pureza cristalina'),
              texto: t('origen', 'card2_desc', 'Agua Manú es reconocida por su excepcional claridad. Su temperatura fría inhibe el crecimiento bacteriano de forma natural, sin necesidad de tratamientos adicionales.'),
            },
            {
              icono: '🌿',
              titulo: t('origen', 'card3_titulo', 'Amazonía protegida'),
              texto: t('origen', 'card3_desc', 'Nuestros manantiales forman parte de la Amazonía ecuatoriana más conservada: 80–90% de territorio sin intervención humana, garantizando una pureza inalterada desde hace miles de años.'),
            },
            {
              icono: '🫶',
              titulo: t('origen', 'card4_titulo', 'Compromiso con Puyo'),
              texto: t('origen', 'card4_desc', 'Operamos desde Puyo con profundo respeto por el entorno amazónico. Trabajamos junto a la comunidad local para conservar las fuentes de agua y el medioambiente que las rodea.'),
            },
          ].map((item) => (
            <div key={item.titulo} className="col-md-6 col-lg-3">
              <div className="card border-0 card-hover h-100 text-center p-4" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.07)', borderRadius: '16px' }}>
                <div style={{ fontSize: '2.8rem' }} className="mb-3">{item.icono}</div>
                <h6 className="fw-bold text-verde mb-2">{item.titulo}</h6>
                <p className="text-muted small mb-0">{item.texto}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Datos geográficos */}
        <div className="row g-3 mt-4">
          {[
            { valor: '763 m.s.n.m.', label: 'Altitud del río' },
            { valor: '+3.000 mm', label: 'Lluvia anual' },
            { valor: '80%', label: 'Cobertura forestal' },
            { valor: '18–24 °C', label: 'Temperatura constante' },
          ].map(({ valor, label }) => (
            <div key={label} className="col-6 col-md-3">
              <div className="text-center p-3 rounded-3" style={{ backgroundColor: '#e8f0fd' }}>
                <div className="fw-bold text-verde" style={{ fontSize: '1.4rem' }}>{valor}</div>
                <small className="text-muted">{label}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Nuestros Valores */}
      <section className="py-5" style={{ background: '#f8f9fa' }}>
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-4 text-center text-md-end mb-4 mb-md-0">
              <h2 className="section-heading">
                NUESTROS<br /><span className="text-verde">VALORES</span>
              </h2>
            </div>
            <div className="col-md-4 text-center mb-4 mb-md-0">
              <img
                src={bottleImg}
                alt="Botellas Agua Manú"
                className="img-fluid rounded-3"
                style={{ maxHeight: '300px', boxShadow: '0 10px 40px rgba(0,102,204,0.15)' }}
              />
            </div>
            <div className="col-md-4">
              <ul className="list-unstyled fs-5">
                {['BIENESTAR', 'EQUIDAD', 'SOSTENIBILIDAD', 'TRANSPARENCIA', 'PROSPERIDAD', 'EXCELENCIA'].map(valor => (
                  <li key={valor} className="mb-3 d-flex align-items-center">
                    <i className="bi bi-check-circle-fill me-2 text-verde fs-5"></i>
                    <b>{valor}</b>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Del Río a Tu Mesa — proceso (inspirado AQUA Premium) ── */}
      <section className="proceso-section py-5">
        <div className="container py-3">
          <div className="text-center mb-5">
            <p style={{ color: 'var(--agua)', letterSpacing: '5px', fontSize: '0.72rem', fontWeight: 700, opacity: 0.8 }}>
              CALIDAD GARANTIZADA
            </p>
            <h2 className="section-heading text-white">
              DEL MANANTIAL <span style={{ color: 'var(--agua)' }}>A TU MESA</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '480px', margin: '1rem auto 0', fontSize: '0.88rem' }}>
              Cinco pasos que garantizan que cada botella conserve la pureza original de nuestros manantiales.
            </p>
          </div>

          <div className="proceso-grid">
            {[
              { icon: '🏔️', num: '01', titulo: 'Manantial Zona ECO 1', texto: 'El agua nace en la zona ecológica protegida de Puyo, filtrada por cientos de metros de roca volcánica y sedimento.' },
              { icon: '🌊', num: '02', titulo: 'Captación natural', texto: 'Captada directamente del manantial, preservando sus minerales esenciales: calcio, magnesio, potasio y bicarbonatos.' },
              { icon: '🧪', num: '03', titulo: 'Control de calidad', texto: 'Análisis fisicoquímico y microbiológico en cada lote para garantizar los más altos estándares.' },
              { icon: '🏭', num: '04', titulo: 'Embotellado', texto: 'En nuestra planta de Puyo, sin alteración de su composición mineral natural.' },
              { icon: '🚚', num: '05', titulo: 'Tu puerta', texto: 'Entrega directa a domicilio en Puyo, Pastaza. Fresca y sellada en origen.' },
            ].map(({ icon, num, titulo, texto }) => (
              <div key={num} className="proceso-step">
                <div className="proceso-icon-wrap">{icon}</div>
                <div className="proceso-num">{num}</div>
                <div className="proceso-titulo">{titulo}</div>
                <div className="proceso-texto">{texto}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Certificaciones */}
      <section className="py-5" style={{ background: '#fff', borderTop: '1px solid #eee', borderBottom: '1px solid #eee' }}>
        <div className="container text-center">
          <p className="text-muted mb-4" style={{ letterSpacing: '3px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
            Reconocimientos y Certificaciones
          </p>
          <div className="row justify-content-center align-items-center g-4">
            {[
              { emoji: '🏅', titulo: 'BPM', subtitulo: 'Buenas Prácticas de Manufactura' },
              { emoji: '💧', titulo: 'Fine Water Society', subtitulo: 'Miembro certificado' },
              { emoji: '🌟', titulo: 'Monde Selection', subtitulo: 'Calidad Internacional 2023' },
            ].map((cert) => (
              <div key={cert.titulo} className="col-6 col-md-3">
                <div className="card border-0 card-hover p-4 h-100" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: '16px' }}>
                  <div style={{ fontSize: '3rem' }}>{cert.emoji}</div>
                  <h6 className="fw-bold mt-2 mb-1 text-verde">{cert.titulo}</h6>
                  <small className="text-muted">{cert.subtitulo}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Estadísticas */}
      <section className="stats-section py-5">
        <div className="container">
          <div className="row text-center g-4">
            <div className="col-6 col-md-3">
              <div className="stat-number">
                <Counter target={parseInt(t('stats', 'stat1_num', '500000')) || 500000} />+
              </div>
              <div className="stat-label mt-1">{t('stats', 'stat1_label', 'Botellas Entregadas')}</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="stat-number">
                <Counter target={parseInt(t('stats', 'stat2_num', '15')) || 15} />
              </div>
              <div className="stat-label mt-1">{t('stats', 'stat2_label', 'Años de Trayectoria')}</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="stat-number">{t('stats', 'stat3_num', '100%')}</div>
              <div className="stat-label mt-1">{t('stats', 'stat3_label', 'Natural')}</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="stat-number">
                <Counter target={parseInt(t('stats', 'stat4_num', '651')) || 651} />+
              </div>
              <div className="stat-label mt-1">{t('stats', 'stat4_label', 'Especies de Aves en su Cuenca')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Servicio a Domicilio */}
      <section className="container-fluid py-5" style={{ backgroundColor: '#e8f0fd' }}>
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-md-6">
              <p style={{ color: '#0066CC', letterSpacing: '3px', fontSize: '0.8rem', fontWeight: 700 }}>
                {t('servicio', 'badge', 'SERVICIO PREMIUM')}
              </p>
              <h2 className="section-heading mb-3">
                {t('servicio', 'titulo', 'SERVICIO A DOMICILIO')}
              </h2>
              <p className="mb-4 fs-5">
                {t('servicio', 'subtitulo', '¿Te habías imaginado tomar agua nacida en el volcán?')}<br />
                {t('servicio', 'descripcion', 'Prueba el sabor más puro de la Amazonía ecuatoriana, directo desde el cantón Puyo, Pastaza.')}
              </p>
              <div className="mb-3 d-flex align-items-start">
                <span className="me-3" style={{ fontSize: '2rem' }}>🚚</span>
                <div>
                  <b>{t('servicio', 'info1_titulo', 'ENTREGA SIN COSTO ADICIONAL')}</b>
                  <p className="mb-0 text-muted small">{t('servicio', 'info1_desc', 'En todos tus pedidos dentro de Puyo')}</p>
                </div>
              </div>
              <div className="mb-3 d-flex align-items-start">
                <span className="me-3" style={{ fontSize: '2rem' }}>📅</span>
                <div>
                  <b>{t('servicio', 'info2_titulo', 'DE LUNES A SÁBADO')}</b>
                  <p className="mb-0 text-muted small">{t('servicio', 'info2_desc', 'Cobertura en toda la ciudad')}</p>
                </div>
              </div>
              <div className="mb-3 d-flex align-items-start">
                <span className="me-3" style={{ fontSize: '2rem' }}>⏰</span>
                <div>
                  <b>{t('servicio', 'info3_titulo', 'RECEPCIÓN DE PEDIDOS')}</b>
                  <p className="mb-0 text-muted small">{t('servicio', 'info3_desc', 'Lunes a Viernes 8 AM – 4 PM · Sábado 8 AM – 11:30 AM')}</p>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="rounded-4 overflow-hidden" style={{ height: '480px', boxShadow: '0 10px 40px rgba(0,102,204,0.18)' }}>
                <img
                  src={servicioSrc}
                  alt="Agua Manú"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Onda del footer */}
      <div className="wave-container">
        <svg viewBox="0 0 1440 150" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ height: '100px' }}>
          <path d="M0,5 C180,150 360,-20 540,75 C720,150 900,-20 1080,75 C1260,150 1380,0 1440,50 L1440,150 L0,150 Z" fill="#0066CC" />
        </svg>
      </div>
    </>
  )
}
