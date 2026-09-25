// Cómo sabe el servidor de qué distribuidora es cada llamada.
//
// En la web alcanza con el dominio (aguamanu.com o <slug>.aguaelite.com): nginx pasa el
// Host y el servidor lo reconoce. La app de Capacitor y el desarrollo local no tienen ese
// dominio, así que mandan el encabezado X-Distribuidora con VITE_DISTRIBUIDORA.
import { API_BASE } from './api'

export const SLUG_DISTRIBUIDORA = import.meta.env.VITE_DISTRIBUIDORA || ''

function esLlamadaAlServidor(url) {
  if (typeof url !== 'string') return false
  if (url.startsWith('/api')) return true
  return !!API_BASE && url.startsWith(`${API_BASE}/api`)
}

// Agrega X-Distribuidora a todas las llamadas a /api sin tocar cada fetch del código
export function instalarEncabezadoDistribuidora() {
  const original = window.fetch
  if (!SLUG_DISTRIBUIDORA || original.__conDistribuidora) return
  const envuelto = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url
    if (!esLlamadaAlServidor(url)) return original(input, init)
    const headers = new Headers(init.headers || (typeof input === 'object' ? input.headers : undefined))
    if (!headers.has('X-Distribuidora')) headers.set('X-Distribuidora', SLUG_DISTRIBUIDORA)
    return original(input, { ...init, headers })
  }
  envuelto.__conDistribuidora = true
  window.fetch = envuelto
}

// Correos internos de clientes sin correo real (ver server/lib/marca.js). Los viejos
// terminaban en aguamanu.local; la migración los pasó a sin-correo.local.
export function esCorreoInterno(email) {
  return typeof email === 'string' && (email.endsWith('sin-correo.local') || email.endsWith('aguamanu.local'))
}
