// Marco del sitio público Elite: encabezado, menú del celular, carrito y pie.
// El carrito (CartProvider) vive en App.jsx para no perderse al cambiar de página.
import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import CartSidebar from '../components/CartSidebar'
import { useDistribuidora, numeroWhatsapp } from '../context/DistribuidoraContext'
import { useContenido } from '../hooks/useContenido'
import { Logo, useProgramaFidelidad } from './Piezas'
import './elite.css'

// El botón principal usa el color de la distribuidora, salvo que sea tan oscuro o tan
// claro que no se lea sobre el fondo del océano.
function coloresMarca(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return null
  const n = parseInt(m[1], 16)
  const rgb = [n >> 16, (n >> 8) & 255, n & 255]
  const lin = rgb.map(v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
  const luz = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
  if (luz < 0.06 || luz > 0.45) return null
  const oscuro = '#' + rgb.map(v => Math.round(v * 0.72).toString(16).padStart(2, '0')).join('')
  return { '--marca': `#${m[1]}`, '--marca-oscura': oscuro }
}

function useEnlaces() {
  const programa = useProgramaFidelidad()
  const nosotros = useContenido('nosotros')
  return [
    { to: '/', label: 'Inicio', end: true },
    { to: '/productos', label: 'Productos' },
    ...(programa?.activo ? [{ to: '/#fidelidad', label: 'Fidelidad', ancla: true }] : []),
    ...(nosotros?.principal?.texto ? [{ to: '/nosotros', label: 'Nosotros' }] : []),
    { to: '/mis-pedidos', label: 'Mis pedidos' },
    { to: '/contacto', label: 'Contacto' },
  ]
}

function BotonCarrito() {
  const { totalItems, setSidebarOpen } = useCart()
  return (
    <button type="button" className="e-boton-vidrio e-carrito" onClick={() => setSidebarOpen(true)}
      aria-label={`Ver mi pedido${totalItems ? `, ${totalItems} producto${totalItems === 1 ? '' : 's'}` : ''}`}>
      <i className="bi bi-bag" aria-hidden="true"></i>
      <span className="d-none d-sm-inline">Mi pedido</span>
      {totalItems > 0 && <span className="e-carrito-num" aria-hidden="true">{totalItems}</span>}
    </button>
  )
}

function Encabezado() {
  const { distribuidora, nombre } = useDistribuidora()
  const enlaces = useEnlaces()
  const { pathname, hash } = useLocation()
  const [solido, setSolido] = useState(false)
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    const alScroll = () => setSolido(window.scrollY > 24)
    alScroll()
    window.addEventListener('scroll', alScroll, { passive: true })
    return () => window.removeEventListener('scroll', alScroll)
  }, [])
  useEffect(() => { setAbierto(false) }, [pathname, hash])
  useEffect(() => {
    if (!abierto) return
    const esc = e => e.key === 'Escape' && setAbierto(false)
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [abierto])

  // El menú del celular va fuera del <header>: el desenfoque del encabezado (backdrop-filter)
  // haría que un hijo con position: fixed quede recortado dentro de él.
  return (
    <>
    <header className={`e-header${solido || abierto ? ' e-header--solido' : ''}`}>
      <div className="e-contenedor e-header-fila">
        <Link to="/" className="e-logo" aria-label={`${nombre}, inicio`}>
          <Logo distribuidora={distribuidora} nombre={nombre} />
        </Link>
        <nav className="e-nav" aria-label="Principal">
          <ul>
            {enlaces.map(e => (
              <li key={e.to}>
                {e.ancla
                  ? <Link to={e.to} className="e-nav-link">{e.label}</Link>
                  : <NavLink to={e.to} end={e.end} className={({ isActive }) => `e-nav-link${isActive ? ' activo' : ''}`}>{e.label}</NavLink>}
              </li>
            ))}
          </ul>
          <span className="e-nav-sep" aria-hidden="true" />
          <BotonCarrito />
        </nav>
        <div className="e-acciones">
          <BotonCarrito />
          <button type="button" className="e-menu-boton" aria-expanded={abierto} aria-controls="menu-movil"
            aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setAbierto(a => !a)}>
            <i className={`bi ${abierto ? 'bi-x-lg' : 'bi-list'}`} style={{ fontSize: 22 }} aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </header>
      {abierto && (
        <nav id="menu-movil" className="e-menu-movil" aria-label="Principal">
          <ul>
            {enlaces.map(e => (
              <li key={e.to}><Link to={e.to}>{e.label}<i className="bi bi-arrow-right" style={{ fontSize: 18, color: 'var(--e-cian)' }} aria-hidden="true"></i></Link></li>
            ))}
          </ul>
        </nav>
      )}
    </>
  )
}

function Pie() {
  const { distribuidora, nombre } = useDistribuidora()
  const pie = useContenido('pie')?.general
  const enlaces = useEnlaces()
  const lugar = [distribuidora?.ciudad, distribuidora?.provincia].filter(Boolean).join(', ')
  const whatsapp = numeroWhatsapp(distribuidora?.whatsapp)

  return (
    <footer className="e-pie">
      <div className="e-contenedor">
        <div className="e-pie-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Link to="/" className="e-logo" aria-label={`${nombre}, inicio`}><Logo distribuidora={distribuidora} nombre={nombre} /></Link>
            <p>{pie?.descripcion || `Agua purificada con entrega a domicilio${lugar ? ` en ${lugar}` : ''}.`}</p>
          </div>
          <div>
            <h2>Sitio</h2>
            <ul>{enlaces.map(e => <li key={e.to}><Link to={e.to}>{e.label}</Link></li>)}
              <li><Link to="/privacidad">Política de privacidad</Link></li>
            </ul>
          </div>
          <div>
            <h2>Contacto</h2>
            <ul>
              {distribuidora?.telefono && <li><a href={`tel:${distribuidora.telefono.replace(/\s/g, '')}`}><i className="bi bi-telephone me-2" aria-hidden="true"></i>{distribuidora.telefono}</a></li>}
              {whatsapp && <li><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer"><i className="bi bi-whatsapp me-2" aria-hidden="true"></i>WhatsApp</a></li>}
              {lugar && <li><span style={{ minHeight: 36, display: 'inline-flex', alignItems: 'center' }}><i className="bi bi-geo-alt me-2" aria-hidden="true"></i>{lugar}</span></li>}
            </ul>
            {pie?.horario && <p style={{ marginTop: 12, whiteSpace: 'pre-line' }}>{pie.horario}</p>}
          </div>
          <div>
            <h2>Personal</h2>
            <ul>
              <li><Link to="/admin/login">Panel de la distribuidora</Link></li>
              <li><Link to="/conductor/login">Choferes</Link></li>
            </ul>
          </div>
        </div>
        <div className="e-pie-base">
          <span>© {new Date().getFullYear()} {nombre}</span>
          <span>Con tecnología de Agua Elite</span>
        </div>
      </div>
    </footer>
  )
}

// Al cambiar de página: arriba del todo, o a la sección si el enlace trae #ancla
function Desplazamiento() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1))
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return }
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

export default function SitioLayout({ children }) {
  const { distribuidora } = useDistribuidora()
  return (
    <>
      <div className="elite" style={coloresMarca(distribuidora?.colorPrimario) || undefined}>
        <a href="#contenido" className="e-saltar">Saltar al contenido</a>
        <Desplazamiento />
        <Encabezado />
        <main id="contenido">{children}</main>
        <Pie />
      </div>
      <CartSidebar />
    </>
  )
}

// Cabecera de las páginas interiores (título grande sobre el océano)
export function CabeceraPagina({ ceja, titulo, destacado, children }) {
  return (
    <section className="e-pagina-cabecera">
      <div className="e-contenedor">
        {ceja && <p className="e-ceja">{ceja}</p>}
        <h1>{titulo}{destacado && <> <em>{destacado}</em></>}</h1>
        {children && <p className="e-lead">{children}</p>}
      </div>
    </section>
  )
}
