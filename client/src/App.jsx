import { Routes, Route } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import { DistribuidoraProvider } from './context/DistribuidoraContext'
import ProtectedRoute from './components/ProtectedRoute'

// Layout público
import Navbar from './components/Navbar'
import Footer from './components/Footer'

// Páginas públicas
import Inicio from './pages/Inicio'
import Historia from './pages/Historia'
import Sostenibilidad from './pages/Sostenibilidad'
import Productos from './pages/Productos'
import Blog from './pages/Blog'
import Contacto from './pages/Contacto'
import LOPDP from './pages/LOPDP'
import MisPedidos from './pages/MisPedidos'

// Panel admin
import AdminLogin from './pages/admin/AdminLogin'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminPedidos from './pages/admin/AdminPedidos'
import AdminUsuarios from './pages/admin/AdminUsuarios'
import AdminProductos from './pages/admin/AdminProductos'
import AdminLogistica from './pages/admin/AdminLogistica'
import AdminContacto  from './pages/admin/AdminContacto'
import AdminReportes    from './pages/admin/AdminReportes'
import AdminClientesFijos  from './pages/admin/AdminClientesFijos'
import AdminConductores    from './pages/admin/AdminConductores'
import AdminCamiones       from './pages/admin/AdminCamiones'
import AdminRutas          from './pages/admin/AdminRutas'
import AdminSolicitudes    from './pages/admin/AdminSolicitudes'
import SuperAdminSolicitudes from './pages/admin/SuperAdminSolicitudes'
import SuperAdminAdmins    from './pages/admin/SuperAdminAdmins'
import SuperAdminPaginas   from './pages/admin/SuperAdminPaginas'
import SuperAdminDistribuidora from './pages/admin/SuperAdminDistribuidora'
import AdminCuenta         from './pages/admin/AdminCuenta'
import AdminFidelidad      from './pages/admin/AdminFidelidad'
import ConductorLogin      from './pages/conductor/ConductorLogin'
import ConductorRuta       from './pages/conductor/ConductorRuta'
import MaestroLogin        from './pages/maestro/MaestroLogin'
import MaestroPanel        from './pages/maestro/MaestroPanel'
import ErrorBoundary       from './components/ErrorBoundary'
import PlataformaPanel     from './pages/plataforma/PlataformaPanel'

export default function App() {
  return (
    <ErrorBoundary>
    <Routes>
      {/* ── Panel de la plataforma (dueños del SaaS): no pertenece a ninguna distribuidora ── */}
      <Route path="/plataforma/*" element={<PlataformaPanel />} />
      <Route path="*" element={<SitioDistribuidora />} />
    </Routes>
    </ErrorBoundary>
  )
}

// Sitio público y paneles de una distribuidora (la identifica el dominio)
function SitioDistribuidora() {
  return (
    <DistribuidoraProvider>
    <AuthProvider>
      <Routes>
        {/* ── Sitio público ──────────────────────────── */}
        <Route path="/*" element={
          <CartProvider>
            <Navbar />
            <Routes>
              <Route path="/"               element={<Inicio />} />
              <Route path="/historia"       element={<Historia />} />
              <Route path="/sostenibilidad" element={<Sostenibilidad />} />
              <Route path="/productos"      element={<Productos />} />
              <Route path="/blog"           element={<Blog />} />
              <Route path="/contacto"       element={<Contacto />} />
              <Route path="/lopdp"          element={<LOPDP />} />
              <Route path="/mis-pedidos"    element={<MisPedidos />} />
            </Routes>
            <Footer />
          </CartProvider>
        } />

        {/* ── Panel admin ────────────────────────────── */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index             element={<AdminDashboard />} />
          <Route path="pedidos"   element={<AdminPedidos />} />
          <Route path="usuarios"  element={<AdminUsuarios />} />
          <Route path="productos" element={<AdminProductos />} />
          <Route path="clientes-fijos" element={<AdminClientesFijos />} />
          <Route path="logistica" element={<AdminLogistica />} />
          <Route path="logistica/rutas" element={<AdminRutas />} />
          <Route path="contacto"  element={<AdminContacto />} />
          <Route path="reportes"    element={<AdminReportes />} />
          <Route path="conductores" element={<AdminConductores />} />
          <Route path="camiones"    element={<AdminCamiones />} />
          <Route path="solicitudes"       element={<AdminSolicitudes />} />
          <Route path="sa/solicitudes"    element={<SuperAdminSolicitudes />} />
          <Route path="sa/admins"         element={<SuperAdminAdmins />} />
          <Route path="sa/paginas"        element={<SuperAdminPaginas />} />
          <Route path="sa/distribuidora"  element={<SuperAdminDistribuidora />} />
          <Route path="cuenta"            element={<AdminCuenta />} />
          <Route path="fidelidad"         element={<AdminFidelidad />} />
        </Route>

        {/* ── Portal conductor ─────────────────────────── */}
        <Route path="/conductor/login" element={<ConductorLogin />} />
        <Route path="/conductor/ruta"  element={<ConductorRuta />} />

        {/* ── Portal maestro de clientes ───────────────── */}
        <Route path="/maestro/login" element={<MaestroLogin />} />
        <Route path="/maestro"       element={<MaestroPanel />} />
      </Routes>
    </AuthProvider>
    </DistribuidoraProvider>
  )
}
