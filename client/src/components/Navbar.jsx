import { NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="position-fixed w-100" style={{ zIndex: 100, top: 0 }}>
      {/* Barra acento de marca */}
      <div className="brand-accent-bar"></div>

      {/* Barra superior de contacto */}
      <div style={{ backgroundColor: '#0066CC', color: '#fff', fontSize: '0.82rem' }}>
        <div className="container-fluid px-4 py-1 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span>
            <i className="bi bi-geo-alt-fill me-1"></i>
            Puyo, Pastaza, Ecuador
          </span>
          <span className="d-flex gap-3">
            <span><i className="bi bi-telephone-fill me-1"></i>(03) 2936000</span>
            <a
              href="https://wa.me/593995827758"
              target="_blank"
              rel="noreferrer"
              className="text-white text-decoration-none"
            >
              <i className="bi bi-whatsapp me-1"></i>Pedir a domicilio
            </a>
          </span>
        </div>
      </div>

      {/* Navbar principal */}
      <nav
        className={`navbar navbar-expand-lg navbar-dark w-100 ${!isHome || scrolled ? 'navbar-scrolled' : 'bg-transparent'}`}
        style={{ transition: 'background-color 0.3s ease' }}
      >
        <div className="container-fluid px-4">
          <NavLink className="navbar-brand text-white fw-bold" to="/">
            {/* Ícono gota de agua */}
            <svg width="20" height="24" viewBox="0 0 20 24" fill="none" aria-hidden="true">
              <path d="M10 1C10 1 2 11 2 16a8 8 0 0016 0C18 11 10 1 10 1z" fill="rgba(255,255,255,0.92)" />
              <ellipse cx="7.5" cy="15" rx="2" ry="3.5" fill="rgba(255,255,255,0.3)" transform="rotate(-25 7.5 15)" />
            </svg>
            AGUA MANÚ
          </NavLink>
          <button
            className="navbar-toggler border-0"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse justify-content-center" id="navbarNav">
            <ul className="navbar-nav gap-1">
              {[
                { to: '/', label: 'Inicio' },
                { to: '/historia', label: 'Historia' },
                { to: '/sostenibilidad', label: 'Sostenibilidad' },
                { to: '/blog', label: 'Blog' },
                { to: '/contacto', label: 'Contáctanos' },
                { to: '/productos',   label: 'Productos' },
                { to: '/mis-pedidos', label: 'Mis pedidos' },
                { to: '/lopdp', label: 'LOPDP' },
              ].map(({ to, label }) => (
                <li className="nav-item" key={to}>
                  <NavLink
                    className={({ isActive }) =>
                      `nav-link text-white${isActive ? ' fw-bold' : ''}`
                    }
                    to={to}
                  >
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </nav>
    </header>
  )
}
