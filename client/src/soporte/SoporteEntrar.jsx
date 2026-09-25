// /soporte/entrar#t=<token>&v=<vuelta>: el panel de plataforma manda aquí al superadmin de
// Agua Elite cuando pulsa "Ingresar" en una empresa. Guarda la sesión de soporte y abre el
// panel de la empresa. Todo viaja en el fragmento (#) para que no quede en registros.
import { useEffect } from 'react'
import { guardarVuelta } from './sesionSoporte'

export default function SoporteEntrar() {
  useEffect(() => {
    const p = new URLSearchParams(window.location.hash.slice(1))
    const token = p.get('t')
    if (token) {
      localStorage.setItem('admin_token', token)
      guardarVuelta(p.get('v'))
    }
    window.location.replace(token ? '/admin' : '/')
  }, [])
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: '#06122B', color: '#EAF4FF' }}>
      <p role="status">Entrando al panel de la empresa…</p>
    </div>
  )
}
