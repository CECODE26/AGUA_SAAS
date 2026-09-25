import { useState, useEffect } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContextMobile'
import { DistribuidoraProvider, useDistribuidora } from './context/DistribuidoraContext'
import WelcomeMobile from './components/WelcomeMobile'
import SplashMobile from './components/SplashMobile'
import TabBarMobile from './components/TabBarMobile'
import ProductosMobile from './pages/ProductosMobile'
import InicioMobile from './pages/InicioMobile'
import MisPedidosMobile from './pages/MisPedidosMobile'
import AdminLoginMobile from './pages/admin/AdminLoginMobile'
import AdminPedidosMobile from './pages/admin/AdminPedidosMobile'
import AdminProductosMobile from './pages/admin/AdminProductosMobile'
import ConductorLoginMobile from './pages/conductor/ConductorLoginMobile'
import ConductorRutaMobile from './pages/conductor/ConductorRutaMobile'
import AccesoMobile from './pages/AccesoMobile'

// TabBar para el área admin
function AdminTabBar() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const tabs = [
    { id: '/admin/pedidos',   label: 'Pedidos',   icon: '📋' },
    { id: '/admin/productos', label: 'Productos', icon: '💧' },
  ]

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: '#0f1d3e',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.2)',
    }}>
      {tabs.map(tab => {
        const isActive = pathname === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '3px', padding: '10px 0 8px',
              border: 'none', background: 'transparent',
              color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.45)',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>{tab.icon}</span>
            <span style={{ fontSize: '0.65rem', fontWeight: isActive ? 700 : 500 }}>{tab.label}</span>
          </button>
        )
      })}
      {/* Cerrar sesión */}
      <button
        onClick={() => { logout(); navigate('/') }}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '3px', padding: '10px 0 8px',
          border: 'none', background: 'transparent',
          color: 'rgba(255,255,255,0.45)', cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: '1.2rem' }}>🚪</span>
        <span style={{ fontSize: '0.65rem', fontWeight: 500 }}>Salir</span>
      </button>
    </nav>
  )
}

// NavBar de admin
function AdminNavBar() {
  const { nombre: nombreMarca } = useDistribuidora()
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: '#0f1d3e',
      display: 'flex', alignItems: 'center',
      padding: 'env(safe-area-inset-top, 0px) 1rem 0',
      height: 'calc(56px + env(safe-area-inset-top, 0px))',
      boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '1.2rem' }}>🔒</span>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.3px' }}>
          Admin · {nombreMarca}
        </span>
      </div>
    </nav>
  )
}

function NavbarMobile() {
  const { nombre: nombreMarca } = useDistribuidora()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: '#0066CC',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: 'env(safe-area-inset-top, 0px) 1rem 0',
      height: 'calc(56px + env(safe-area-inset-top, 0px))',
      boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <svg viewBox="0 0 24 30" fill="none" style={{ width: '22px', height: '28px' }}>
          <path d="M12 2C12 2 3 12 3 18C3 23 7.03 27 12 27C16.97 27 21 23 21 18C21 12 12 2 12 2Z"
            fill="rgba(255,255,255,0.9)" />
          <path d="M8 17C7.5 14.5 9 11.5 11 9" stroke="rgba(0,102,204,0.5)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.3px' }}>
          {nombreMarca}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Candado admin — acceso discreto */}
        <button
          onClick={() => navigate('/acceso')}
          style={{
            background: 'rgba(255,255,255,0.1)', border: 'none',
            borderRadius: '10px', padding: '7px 10px',
            color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          🔒
        </button>
      </div>
    </nav>
  )
}

function AppMobileInner() {
  const [splashDone, setSplashDone]     = useState(false)
  const [welcomeDone, setWelcomeDone]   = useState(false)
  const { pathname } = useLocation()

  const isAdmin     = pathname.startsWith('/admin') && pathname !== '/admin/login'
  const isConductor = pathname.startsWith('/conductor') && pathname !== '/conductor/login'

  // Pedir permiso de ubicación al arrancar la app
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 5000 })
    }
  }, [])

  if (isAdmin) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
        <AdminNavBar />
        <Routes>
          <Route path="/admin/pedidos"   element={<AdminPedidosMobile />} />
          <Route path="/admin/productos" element={<AdminProductosMobile />} />
        </Routes>
        <AdminTabBar />
      </div>
    )
  }

  if (isConductor) {
    return (
      <Routes>
        <Route path="/conductor/ruta" element={<ConductorRutaMobile />} />
      </Routes>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      {!splashDone && <SplashMobile onDone={() => setSplashDone(true)} />}

      <NavbarMobile />

      {splashDone && !welcomeDone && (
        <WelcomeMobile onClose={() => setWelcomeDone(true)} />
      )}

      <Routes>
        <Route path="/"          element={<InicioMobile />} />
        <Route path="/productos" element={<ProductosMobile />} />
        <Route path="/pedidos"   element={<MisPedidosMobile />} />
        <Route path="/acceso"           element={<AccesoMobile />} />
        <Route path="/admin/login"      element={<AdminLoginMobile />} />
        <Route path="/conductor/login"  element={<ConductorLoginMobile />} />
      </Routes>

      <TabBarMobile />
    </div>
  )
}

export default function AppMobile() {
  return (
    <DistribuidoraProvider>
    <AuthProvider>
      <AppMobileInner />
    </AuthProvider>
    </DistribuidoraProvider>
  )
}
