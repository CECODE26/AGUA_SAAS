// Cada build de la app es de una distribuidora (marca blanca). Se configura en mobile/.env
// (y en los secretos de EAS para los builds), ver mobile/.env.example:
//   EXPO_PUBLIC_API_URL        servidor de la plataforma
//   EXPO_PUBLIC_DISTRIBUIDORA  slug de la distribuidora (va en el encabezado X-Distribuidora)
//   EXPO_PUBLIC_NOMBRE_MARCA   nombre que ve el usuario en la app
// En Android Emulator, 10.0.2.2 apunta al localhost de tu computadora.
const BASE = process.env.EXPO_PUBLIC_API_URL
  ?? (__DEV__ ? 'http://10.0.2.2:8081' : '')

export const DISTRIBUIDORA = process.env.EXPO_PUBLIC_DISTRIBUIDORA ?? ''
export const NOMBRE_MARCA  = process.env.EXPO_PUBLIC_NOMBRE_MARCA ?? 'Agua Elite'

if (!BASE) console.error('Falta EXPO_PUBLIC_API_URL: la app no sabe a qué servidor llamar')
if (!DISTRIBUIDORA) console.error('Falta EXPO_PUBLIC_DISTRIBUIDORA: el servidor no sabrá de qué distribuidora es la app')

export const apiUrl = (path: string) => `${BASE}${path}`

// Agrega X-Distribuidora a toda llamada al servidor, sin tocar cada fetch de las pantallas
export function instalarEncabezadoDistribuidora() {
  const original = globalThis.fetch
  if (!DISTRIBUIDORA || (original as any).__conDistribuidora) return
  const envuelto = (input: any, init: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : input?.url
    if (BASE && typeof url === 'string' && url.startsWith(BASE)) {
      const headers = new Headers(init.headers || (typeof input === 'object' ? input.headers : undefined))
      if (!headers.has('X-Distribuidora')) headers.set('X-Distribuidora', DISTRIBUIDORA)
      return original(input, { ...init, headers })
    }
    return original(input, init)
  }
  ;(envuelto as any).__conDistribuidora = true
  globalThis.fetch = envuelto as typeof fetch
}

/** fetch con timeout de 10 s — evita que el botón quede cargando indefinidamente */
export async function fetchT(url: string, options: RequestInit = {}, ms = 15000): Promise<Response> {
  const ctrl = new AbortController()
  const id   = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...options, signal: ctrl.signal })
  } finally {
    clearTimeout(id)
  }
}

// Token público de Mapbox: va en mobile/.env como EXPO_PUBLIC_MAPBOX_TOKEN
// (y en los secretos de EAS para los builds). No se escribe en el código.
export const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? ''
