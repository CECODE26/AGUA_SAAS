// /demo/entrar#t=<token>: la landing manda aquí al visitante recién creada su demo.
// Guarda la sesión del dueño de la demo y abre el panel. El token viene en el fragmento
// (#) para que no viaje al servidor ni quede en registros.
import { useEffect } from 'react'

export default function DemoEntrar() {
  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('t')
    if (token) localStorage.setItem('admin_token', token)
    window.location.replace(token ? '/admin' : '/')
  }, [])
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: '#06122B', color: '#EAF4FF' }}>
      <p role="status">Abriendo tu demo…</p>
    </div>
  )
}
