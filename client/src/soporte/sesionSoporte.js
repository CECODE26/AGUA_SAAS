// Sesión de soporte: el superadmin de Agua Elite dentro del panel de una empresa.
// El token de admin lleva `soporte` (lo firma el servidor en "Ingresar").
const CLAVE_VUELTA = 'soporte_vuelta'

export function datosSoporte() {
  try {
    const t = localStorage.getItem('admin_token')
    if (!t) return null
    const p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (!p.soporte || (p.exp && p.exp * 1000 < Date.now())) return null
    return p.soporte
  } catch { return null }
}

// Solo se acepta volver a un /plataforma por http(s): nada de redirigir a cualquier sitio
export function guardarVuelta(v) {
  try {
    const u = new URL(v)
    if (/^https?:$/.test(u.protocol) && u.pathname === '/plataforma') sessionStorage.setItem(CLAVE_VUELTA, u.href)
  } catch { /* sin vuelta */ }
}

export function salirDeSoporte() {
  let vuelta = null
  try { vuelta = sessionStorage.getItem(CLAVE_VUELTA); sessionStorage.removeItem(CLAVE_VUELTA) } catch { /* nada */ }
  localStorage.removeItem('admin_token')
  window.location.assign(vuelta || '/admin/login')
}
