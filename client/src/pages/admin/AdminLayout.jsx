import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNotificaciones } from '../../hooks/useNotificaciones'
import { useAvisoPedidos } from '../../hooks/useAvisoPedidos'
import { useDistribuidora } from '../../context/DistribuidoraContext'
import { datosSoporte, salirDeSoporte } from '../../soporte/sesionSoporte'

// `section` agrupa el menú de escritorio (Operación · Distribución · Administración)
const navBase = [
  { to: '/admin',                  label: 'Dashboard',      icon: 'bi-speedometer2',    end: true },
  { to: '/admin/pedidos',          label: 'Pedidos',        icon: 'bi-box-seam',        badge: 'pedidos' },
  { to: '/admin/productos',        label: 'Productos',      icon: 'bi-droplet-fill' },
  { to: '/admin/usuarios',         label: 'Clientes',       icon: 'bi-people' },
  { to: '/admin/clientes-fijos',   label: 'Clientes Fijos', icon: 'bi-person-vcard-fill', highlight: true, badge: 'fijos' },
  { to: '/admin/logistica',        label: 'Logística',      icon: 'bi-truck', end: true, section: 'Distribución',
    // Orden del flujo de trabajo: primero el conductor, luego el camión, luego sus rutas
    children: [
      { to: '/admin/conductores',     label: 'Conductores', icon: 'bi-person-badge-fill' },
      { to: '/admin/camiones',        label: 'Camiones',    icon: 'bi-truck-front-fill' },
      { to: '/admin/logistica/rutas', label: 'Rutas',       icon: 'bi-signpost-split-fill' },
    ] },
  { to: '/admin/fidelidad',        label: 'Fidelidad',      icon: 'bi-gift-fill',      section: 'Administración' },
  { to: '/admin/reportes',         label: 'Reportes',       icon: 'bi-bar-chart-fill', section: 'Administración' },
  { to: '/admin/contacto',         label: 'Contacto',       icon: 'bi-envelope',        badge: 'contacto', section: 'Administración' },
]

const navAdmin = [
  { to: '/admin/solicitudes', label: 'Solicitudes', icon: 'bi-send-check', badge: 'solicitudes', section: 'Administración' },
]

const navSuperAdmin = [
  { to: '/admin/sa/solicitudes', label: 'Solicitudes', icon: 'bi-bell-fill',      badge: 'solicitudes', section: 'Administración' },
  { to: '/admin/sa/admins',      label: 'Admins',      icon: 'bi-shield-lock',    section: 'Administración' },
  { to: '/admin/sa/paginas',     label: 'Sitio Web',   icon: 'bi-layout-text-sidebar-reverse', section: 'Administración' },
  { to: '/admin/sa/distribuidora', label: 'Mi distribuidora', icon: 'bi-buildings', section: 'Administración' },
]

// Colores del menú de escritorio
const SB = {
  texto:    '#b7c5dc',
  icono:    '#8fa3c4',
  activoBg: '#1f3766',
  verde:    '#4ade80',
  morado:   '#a78bfa',
  linea:    '#23375f',
}

function Badge({ count }) {
  if (!count || count === 0) return null
  return (
    <span style={{
      background: '#2563eb',
      color: 'white',
      borderRadius: '999px',
      fontSize: '0.65rem',
      fontWeight: 700,
      minWidth: '18px',
      height: '18px',
      padding: '0 5px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 'auto',
      lineHeight: 1,
    }}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

export default function AdminLayout() {
  const { nombre: nombreMarca } = useDistribuidora()
  const { logout, rol }  = useAuth()
  const navigate         = useNavigate()
  const location         = useLocation()
  const mainRef          = useRef(null)
  const esSuperAdmin     = rol === 'superadmin'
  const enSoporte        = !!datosSoporte()   // superadmin de Agua Elite dentro de esta empresa

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0
  }, [location.key])
  const navItems         = [...navBase, ...(esSuperAdmin ? navSuperAdmin : navAdmin)]

  // Submenús plegables (p. ej. Logística): se abren solos al entrar a uno de sus hijos
  const [abiertos, setAbiertos] = useState({})
  useEffect(() => {
    for (const item of navItems) {
      if (item.children?.some(sub => location.pathname.startsWith(sub.to))) {
        setAbiertos(prev => prev[item.to] ? prev : { ...prev, [item.to]: true })
      }
    }
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps
  const alternar = to => setAbiertos(prev => ({ ...prev, [to]: !prev[to] }))

  // Secciones plegables (Distribución, Administración): se abren solas si la pantalla actual está dentro
  const [seccionesCerradas, setSeccionesCerradas] = useState({})
  useEffect(() => {
    for (const item of navItems) {
      const dentro = location.pathname === item.to || location.pathname.startsWith(item.to + '/') ||
        item.children?.some(sub => location.pathname.startsWith(sub.to))
      if (item.section && dentro) setSeccionesCerradas(prev => prev[item.section] ? { ...prev, [item.section]: false } : prev)
    }
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps
  const alternarSeccion = s => setSeccionesCerradas(prev => ({ ...prev, [s]: !prev[s] }))
  const { pedidosPendientes, contactosSinLeer, solicitudesPendientes, clientesFijosNuevos = 0, ultimoPedido } = useNotificaciones()
  const avisos = useAvisoPedidos(ultimoPedido, navigate)

  function getBadgeCount(badge) {
    if (badge === 'pedidos')     return pedidosPendientes
    if (badge === 'contacto')    return contactosSinLeer
    if (badge === 'solicitudes') return solicitudesPendientes
    if (badge === 'fijos')       return clientesFijosNuevos   // clientes fijos nuevos (últimos 7 días)
    return 0
  }

  function handleLogout() {
    if (enSoporte) return salirDeSoporte()
    logout()
    navigate('/admin/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafb' }}>

      {/* ── Cartel de PEDIDO NUEVO (sonido + aviso) ───────────────────── */}
      {avisos.aviso && (
        <div role="alert"
          style={{
            position: 'fixed', top: 16, right: 16, zIndex: 3000, maxWidth: 360, width: 'calc(100% - 32px)',
            background: '#0f1d3e', color: '#fff', borderRadius: 14, padding: '14px 16px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.35)', borderLeft: '5px solid #4ade80',
            animation: 'am-pop .25s ease-out',
          }}>
          <style>{`@keyframes am-pop { from { transform: translateY(-12px); opacity: 0 } to { transform: none; opacity: 1 } }`}</style>
          <div className="d-flex align-items-start gap-2">
            <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>🧾</span>
            <div className="flex-grow-1">
              <div className="fw-bold" style={{ fontSize: '0.95rem' }}>Nuevo pedido #{avisos.aviso.id}</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                {avisos.aviso.cliente || 'Cliente'} · <b>${Number(avisos.aviso.total || 0).toFixed(2)}</b>
              </div>
              <div className="d-flex gap-2 mt-2">
                <button className="btn btn-sm fw-semibold" style={{ background: '#4ade80', color: '#0f1d3e' }}
                  onClick={() => { avisos.cerrar(); navigate('/admin/pedidos') }}>
                  Ver pedidos
                </button>
                <button className="btn btn-sm btn-outline-light" onClick={avisos.cerrar}>Cerrar</button>
              </div>
            </div>
            <button onClick={avisos.cerrar} className="btn btn-sm text-white-50 p-0 border-0 bg-transparent" style={{ fontSize: '1.1rem', lineHeight: 1 }}>×</button>
          </div>
        </div>
      )}

      {/* ── Top bar móvil ──────────────────────────────────────────────── */}
      <header className="d-flex d-md-none align-items-center justify-content-between px-3 py-2"
        style={{ background: '#0f1d3e', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="d-flex align-items-center gap-2">
          <div className="rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: '32px', height: '32px', background: '#0066CC', flexShrink: 0 }}>
            <i className="bi bi-droplet-fill text-white" style={{ fontSize: '0.8rem' }}></i>
          </div>
          <span className="text-white fw-bold" style={{ fontSize: '0.9rem' }}>{nombreMarca}</span>
        </div>
        <div className="d-flex gap-2 align-items-center">
          {/* Total badge en mobile top bar */}
          {(pedidosPendientes + contactosSinLeer + solicitudesPendientes + clientesFijosNuevos) > 0 && (
            <span style={{
              background: '#2563eb', color: 'white', borderRadius: '999px',
              fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px',
            }}>
              {pedidosPendientes + contactosSinLeer + solicitudesPendientes + clientesFijosNuevos}
            </span>
          )}
          <NavLink to="/admin/cuenta" className="btn btn-sm text-white-50 p-1" style={{ fontSize: '1.1rem' }} title="Mi cuenta">
            <i className="bi bi-person-gear"></i>
          </NavLink>
          <a href="/" className="btn btn-sm text-white-50 p-1" style={{ fontSize: '1.1rem' }}>
            <i className="bi bi-globe2"></i>
          </a>
          <button onClick={handleLogout}
            className="btn btn-sm text-white-50 p-1 border-0 bg-transparent"
            style={{ fontSize: '1.1rem' }}>
            <i className="bi bi-box-arrow-right"></i>
          </button>
        </div>
      </header>

      <div className="d-flex" style={{ minHeight: 'calc(100vh - 48px)' }}>

        {/* ── Sidebar escritorio ─────────────────────────────────────────── */}
        <aside className="d-none d-md-flex flex-column"
          style={{ width: '240px', background: '#0f1d3e', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', padding: '22px 16px 18px' }}>

          {/* Marca */}
          <div className="d-flex align-items-center gap-3 px-1 mb-4">
            <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: '40px', height: '40px', background: '#0066CC' }}>
              <i className="bi bi-droplet-fill text-white" style={{ fontSize: '1.1rem' }}></i>
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <div className="text-white fw-bold" style={{ fontSize: '1.05rem' }}>{nombreMarca}</div>
              <div style={{ fontSize: '0.65rem', letterSpacing: '.12em', textTransform: 'uppercase', color: esSuperAdmin ? SB.morado : SB.icono }}>
                {enSoporte ? <><i className="bi bi-shield-lock-fill me-1"></i>Soporte Agua Elite</> : esSuperAdmin ? <><i className="bi bi-shield-lock-fill me-1"></i>Superadmin</> : 'Operaciones'}
              </div>
            </div>
          </div>

          {/* Nav agrupado por secciones */}
          <nav className="flex-grow-1 d-flex flex-column gap-1" style={{ overflowY: 'auto' }}>
            {navItems.map(({ to, label, icon, end, badge, highlight, children, section }, i) => {
              const nuevaSeccion = section && section !== navItems[i - 1]?.section
              const seccionCerrada = section && seccionesCerradas[section]
              return (
                <div key={to}>
                  {nuevaSeccion && (
                    <button type="button" onClick={() => alternarSeccion(section)} title={seccionCerrada ? 'Desplegar' : 'Plegar'}
                      className="w-100 d-flex align-items-center justify-content-between border-0 bg-transparent px-2 mt-3 mb-2"
                      style={{ fontSize: '0.62rem', letterSpacing: '.12em', textTransform: 'uppercase', color: SB.icono, cursor: 'pointer' }}>
                      <span>{section}</span>
                      <i className="bi bi-chevron-down" style={{ fontSize: '0.7rem', transition: 'transform .18s', transform: seccionCerrada ? 'rotate(-90deg)' : 'none' }}></i>
                    </button>
                  )}
                  {!seccionCerrada && <NavLink to={to} end={end}
                    onClick={() => { if (children) setAbiertos(prev => ({ ...prev, [to]: true })) }}
                    className="d-flex align-items-center gap-2 rounded-2 text-decoration-none"
                    style={({ isActive }) => ({
                      padding: '9px 12px', fontSize: '0.86rem', fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#fff' : SB.texto,
                      background: isActive ? SB.activoBg : 'transparent',
                      borderLeft: `3px solid ${isActive ? (highlight ? SB.morado : SB.verde) : 'transparent'}`,
                    })}>
                    <i className={`bi ${icon}`} style={{ color: highlight ? SB.morado : SB.icono, fontSize: '0.95rem', width: 18, textAlign: 'center' }}></i>
                    <span>{label}</span>
                    {badge && <Badge count={getBadgeCount(badge)} />}
                    {children && (
                      <button type="button" title={abiertos[to] ? 'Plegar' : 'Desplegar'}
                        onClick={e => { e.preventDefault(); e.stopPropagation(); alternar(to) }}
                        className="ms-auto border-0 bg-transparent p-0 d-flex align-items-center"
                        style={{ color: SB.icono, cursor: 'pointer', transition: 'transform .18s', transform: abiertos[to] ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                        <i className="bi bi-chevron-down" style={{ fontSize: '0.75rem' }}></i>
                      </button>
                    )}
                  </NavLink>}
                  {/* Submenú plegable (p. ej. Logística → Rutas · Camiones · Conductores) */}
                  {!seccionCerrada && children && abiertos[to] && children.map(sub => (
                    <NavLink key={sub.to} to={sub.to}
                      className="d-flex align-items-center gap-2 text-decoration-none"
                      style={({ isActive }) => ({
                        padding: '6px 12px 6px 43px', fontSize: '0.8rem', fontWeight: isActive ? 600 : 400,
                        color: isActive ? '#fff' : SB.texto,
                      })}>
                      <span className="rounded-circle" style={{ width: 5, height: 5, background: 'currentColor', opacity: 0.6 }}></span>
                      <span>{sub.label}</span>
                    </NavLink>
                  ))}
                </div>
              )
            })}
          </nav>

          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${SB.linea}` }}></div>

          {/* Avisos de pedido nuevo: sonido + cartel + notificación del navegador */}
          <button
            onClick={avisos.activo ? avisos.desactivar : avisos.activar}
            title={avisos.activo
              ? (avisos.permiso === 'granted' ? 'Sonido, cartel y notificación del navegador activos. Clic para silenciar.' : 'Sonido y cartel activos. Clic para silenciar.')
              : 'Activar aviso de pedidos nuevos'}
            className="d-flex align-items-center gap-2 px-3 py-2 rounded-3 mb-1 small fw-semibold border-0 w-100 text-start"
            style={{
              background: avisos.activo ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)',
              color:      avisos.activo ? '#4ade80' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
            }}>
            <i className={`bi ${avisos.activo ? 'bi-bell-fill' : 'bi-bell-slash'}`}></i>
            <span>{avisos.activo ? 'Avisos de pedidos: ON' : 'Activar avisos de pedidos'}</span>
          </button>
          {avisos.activo && avisos.permiso === 'default' && (
            <button onClick={avisos.activar}
              className="d-flex align-items-center gap-2 px-3 py-1 rounded-3 mb-2 border-0 w-100 text-start bg-transparent"
              style={{ color: '#fbbf24', fontSize: '0.7rem', cursor: 'pointer' }}>
              <i className="bi bi-exclamation-circle"></i>Permitir notificaciones del navegador
            </button>
          )}

          <NavLink to="/admin/cuenta"
            className="d-flex align-items-center gap-2 px-3 py-2 rounded-2 mb-1 text-decoration-none small fw-semibold"
            style={({ isActive }) => ({ color: isActive ? '#fff' : SB.texto, background: isActive ? SB.activoBg : 'transparent' })}>
            <i className="bi bi-person-gear" style={{ color: SB.icono }}></i>Mi cuenta
          </NavLink>
          <a href="/"
            className="d-flex align-items-center gap-2 px-3 py-2 rounded-2 mb-1 text-decoration-none small"
            style={{ color: SB.texto }}>
            <i className="bi bi-globe2" style={{ color: SB.icono }}></i>Ver sitio web
          </a>
          <button onClick={handleLogout}
            className="d-flex align-items-center gap-2 px-3 py-2 rounded-2 small fw-semibold border-0 bg-transparent w-100"
            style={{ cursor: 'pointer', color: SB.texto }}>
            <i className="bi bi-box-arrow-left" style={{ color: SB.icono }}></i>Cerrar sesión
          </button>
          <div className="px-3 pt-2" style={{ fontSize: '0.68rem', color: SB.icono }}>Panel administrativo</div>
        </aside>

        {/* ── Contenido ─────────────────────────────────────────────────── */}
        <main ref={mainRef} className="flex-grow-1 p-3 p-md-4" style={{ overflowY: 'auto', paddingBottom: '80px' }}>
          <Outlet />
        </main>
      </div>

      {/* ── Bottom nav móvil ───────────────────────────────────────────── */}
      <nav className="d-flex d-md-none justify-content-around align-items-center"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
          background: '#0f1d3e', borderTop: '1px solid rgba(255,255,255,0.08)',
          height: '60px', paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
        {navItems.flatMap(i => [i, ...(i.children ?? [])]).map(({ to, label, icon, end, badge, highlight }) => (
          <NavLink key={to} to={to} end={end}
            className="d-flex flex-column align-items-center justify-content-center text-decoration-none flex-grow-1 h-100 position-relative"
            style={({ isActive }) => ({
              color: isActive ? (highlight ? '#c084fc' : '#4ade80') : 'rgba(255,255,255,0.45)',
              fontSize: '0.6rem', fontWeight: 600, gap: '2px',
            })}>
            <span className="position-relative">
              <i className={`bi ${icon}`} style={{ fontSize: '1.2rem' }}></i>
              {badge && getBadgeCount(badge) > 0 && (
                <span style={{
                  position: 'absolute', top: '-4px', right: '-8px',
                  background: '#2563eb', color: 'white', borderRadius: '999px',
                  fontSize: '0.55rem', fontWeight: 700,
                  minWidth: '14px', height: '14px', padding: '0 3px',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {getBadgeCount(badge) > 99 ? '99+' : getBadgeCount(badge)}
                </span>
              )}
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
