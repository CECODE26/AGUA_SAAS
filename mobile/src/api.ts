// En Android Emulator, 10.0.2.2 apunta al localhost de tu Mac.
// En producción usa el servidor Contabo vía nginx (puerto 80).
const BASE = __DEV__
  ? 'http://10.0.2.2:8081'   // stack local de Docker (8080 lo usa otro proyecto)
  : 'https://aguamanu.com'        // producción (antes cecode.online)

export const apiUrl = (path: string) => `${BASE}${path}`

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
