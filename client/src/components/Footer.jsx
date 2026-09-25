import { Link } from 'react-router-dom'

export default function Footer() {

  return (
    <footer style={{ background: '#0066CC', color: '#fff', position: 'relative' }}>
      <div className="container py-5">
        <div className="row text-center text-md-start justify-content-center g-4">
          {/* Marca */}
          <div className="col-md-3 mb-4 mb-md-0">
            <h4 className="fw-bold mb-3 d-flex align-items-center gap-2" style={{ letterSpacing: '3px' }}>
              <svg width="18" height="22" viewBox="0 0 20 24" fill="none" aria-hidden="true">
                <path d="M10 1C10 1 2 11 2 16a8 8 0 0016 0C18 11 10 1 10 1z" fill="rgba(255,255,255,0.85)" />
                <ellipse cx="7.5" cy="15" rx="2" ry="3.2" fill="rgba(255,255,255,0.28)" transform="rotate(-25 7.5 15)" />
              </svg>
              AGUA MANÚ
            </h4>
            <p className="small opacity-75">
              Agua de manantial purificada Manú, embotellada en Puyo, Pastaza, Ecuador.
            </p>
            <div className="d-flex gap-3 justify-content-center justify-content-md-start mt-3">
              <a href="#" style={{ color: '#fff', fontSize: '1.4rem' }}><i className="bi bi-facebook"></i></a>
              <a href="#" style={{ color: '#fff', fontSize: '1.4rem' }}><i className="bi bi-instagram"></i></a>
              <a href="#" style={{ color: '#fff', fontSize: '1.4rem' }}><i className="bi bi-linkedin"></i></a>
            </div>
          </div>

          {/* Menú */}
          <div className="col-md-2 mb-4 mb-md-0">
            <h5 className="fw-bold mb-3">Menú</h5>
            <ul className="list-unstyled">
              <li><Link to="/" className="text-white text-decoration-none small">Inicio</Link></li>
              <li><Link to="/historia" className="text-white text-decoration-none small">Historia</Link></li>
              <li><Link to="/sostenibilidad" className="text-white text-decoration-none small">Sostenibilidad</Link></li>
              <li><Link to="/blog" className="text-white text-decoration-none small">Blog</Link></li>
              <li><Link to="/contacto" className="text-white text-decoration-none small">Contáctanos</Link></li>
              <li><Link to="/productos" className="text-white text-decoration-none small">Productos</Link></li>
              <li><Link to="/lopdp" className="text-white text-decoration-none small">LOPDP</Link></li>
            </ul>
          </div>

          {/* Contacto */}
          <div className="col-md-4 mb-4 mb-md-0">
            <h5 className="fw-bold mb-3">Contáctanos</h5>
            <p className="mb-2 small opacity-90">
              <i className="bi bi-geo-alt-fill me-2"></i>
              Puyo, Pastaza, Ecuador
            </p>
            <p className="mb-2 small opacity-90">
              <i className="bi bi-telephone-fill me-2"></i>Llámanos: (03) 2936000
            </p>
            <p className="small opacity-90">
              <i className="bi bi-clock-fill me-2"></i>Lun–Vie: 8 AM – 4 PM · Sáb: 8 AM – 11:30 AM
            </p>
          </div>
        </div>

        <div
          className="text-center mt-4 pt-3 small opacity-75 d-flex justify-content-center align-items-center gap-3 flex-wrap"
          style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}
        >
          <span>© 2026 Agua Manú. Todos los derechos reservados.</span>
          <span>·</span>
          <Link to="/lopdp" className="text-white text-decoration-none">Política de Privacidad</Link>
        </div>
      </div>

    </footer>
  )
}
