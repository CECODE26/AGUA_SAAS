// URL base de la API.
// En web (nginx): rutas relativas /api/...
// En app móvil (Capacitor): URL absoluta de producción
export const API_BASE = import.meta.env.VITE_API_URL || ''

export function apiUrl(path) {
  return `${API_BASE}${path}`
}
