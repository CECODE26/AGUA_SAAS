const articulos = [
  {
    fecha: '15 Feb 2026',
    titulo: 'Los beneficios del agua purificada de manantial para tu salud',
    resumen: 'El agua purificada de manantial conserva los minerales esenciales que el cuerpo necesita. Descubre por qué Agua Manú es la mejor opción para tu bienestar.',
    categoria: 'Salud',
    autor: 'Equipo Manú',
    emoji: '💧'
  },
  {
    fecha: '28 Ene 2026',
    titulo: 'Cómo los manantiales crean el agua más pura del mundo',
    resumen: 'El proceso geológico de los manantiales de la zona ECO 1 de Puyo filtra el agua durante miles de años a través de capas de roca y sedimento, creando un agua de calidad excepcional.',
    categoria: 'Naturaleza',
    autor: 'Equipo Manú',
    emoji: '🌋'
  },
  {
    fecha: '10 Ene 2026',
    titulo: 'Nuestro compromiso con el reciclaje en 2026',
    resumen: 'Este año lanzamos nuestra nueva iniciativa de reciclaje de envases. Conoce cómo puedes participar y contribuir a un Ecuador más limpio.',
    categoria: 'Sostenibilidad',
    autor: 'Equipo Manú',
    emoji: '♻️'
  },
  {
    fecha: '05 Dic 2025',
    titulo: 'Hidratación en el deporte: cuánta agua necesitas realmente',
    resumen: 'Los expertos en nutrición deportiva nos hablan sobre la cantidad adecuada de agua según el tipo de ejercicio y las condiciones climáticas.',
    categoria: 'Deporte',
    autor: 'Equipo Manú',
    emoji: '🏃'
  },
  {
    fecha: '20 Nov 2025',
    titulo: 'Expandimos nuestro servicio a domicilio a Ambato',
    resumen: 'Agua Manú ya llega a domicilios de Ambato. Regístrate ahora para ser de los primeros en recibir nuestro servicio en la ciudad.',
    categoria: 'Noticias',
    autor: 'Equipo Manú',
    emoji: '🚚'
  },
  {
    fecha: '08 Nov 2025',
    titulo: 'Agua Manú y la digestión: lo que debes saber',
    resumen: 'Los minerales naturales presentes en Agua Manú ayudan a neutralizar la acidez estomacal y mejoran la digestión. Descubre por qué su pH de 6.85 es ideal.',
    categoria: 'Salud',
    autor: 'Equipo Manú',
    emoji: '🫙'
  }
]

const categoriaColores = {
  Salud: '#0066CC',
  Naturaleza: '#2dc653',
  Sostenibilidad: '#20c997',
  Deporte: '#fd7e14',
  Noticias: '#6c757d'
}

export default function Blog() {
  return (
    <div style={{ paddingTop: '90px' }}>
      {/* Hero Banner */}
      <div className="py-5" style={{ background: 'linear-gradient(135deg, #0066CC 0%, #004fa3 100%)' }}>
        <div className="container text-white text-center py-3">
          <p style={{ letterSpacing: '4px', fontSize: '0.8rem', fontWeight: 700, opacity: 0.8 }}>NOTICIAS Y ARTÍCULOS</p>
          <h1 className="section-heading text-white mb-2">BLOG AGUA MANÚ</h1>
          <p className="mb-0 opacity-75">Salud, sostenibilidad y todo sobre el agua de manantial de Puyo</p>
        </div>
      </div>

      <div className="container py-5">
        <div className="row g-4">
          {articulos.map((a) => (
            <div key={a.titulo} className="col-md-6 col-lg-4">
              <div className="card border-0 h-100 card-hover" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
                {/* Thumbnail simulado */}
                <div
                  className="d-flex align-items-center justify-content-center"
                  style={{ height: '160px', background: 'linear-gradient(135deg, #e8f0fd 0%, #c8ebd8 100%)', fontSize: '4rem' }}
                >
                  {a.emoji}
                </div>
                <div className="card-body d-flex flex-column p-4">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span
                      className="badge rounded-pill px-3"
                      style={{ backgroundColor: categoriaColores[a.categoria] || '#0066CC', fontSize: '0.72rem' }}
                    >
                      {a.categoria}
                    </span>
                    <small className="text-muted">{a.fecha}</small>
                  </div>
                  <h5 className="card-title fw-bold mb-2" style={{ fontSize: '1rem', lineHeight: 1.4 }}>{a.titulo}</h5>
                  <p className="card-text text-muted small flex-grow-1">{a.resumen}</p>
                  <div className="d-flex justify-content-between align-items-center mt-3 pt-3" style={{ borderTop: '1px solid #f0f0f0' }}>
                    <small className="text-muted">
                      <i className="bi bi-person-circle me-1"></i>{a.autor}
                    </small>
                    <button className="btn btn-sm btn-outline-verde">
                      Leer más
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
