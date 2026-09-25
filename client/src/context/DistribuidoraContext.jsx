// Marca de la distribuidora (nombre, color, logo, contacto) para todo el sitio y los paneles.
// Se pide una vez a /api/distribuidora. Si el dominio no corresponde a ninguna
// distribuidora (o está suspendida) se muestra un aviso en lugar del sitio.
import { createContext, useContext, useEffect, useState } from 'react'
import { apiUrl } from '../lib/api'

const MARCA_PLATAFORMA = 'Agua Elite'

const DistribuidoraContext = createContext({
  distribuidora: null,
  nombre: MARCA_PLATAFORMA,
  cargando: true,
  error: null,
})

const MENSAJES = {
  SIN_DISTRIBUIDORA: 'Esta dirección no corresponde a ninguna distribuidora.',
  DISTRIBUIDORA_NO_EXISTE: 'No encontramos esta distribuidora.',
  DISTRIBUIDORA_SUSPENDIDA: 'Esta distribuidora no está disponible por ahora.',
}

// "0987 665 550" → "593987665550" para wa.me (Ecuador por defecto)
export function numeroWhatsapp(n) {
  const d = String(n || '').replace(/\D/g, '')
  if (!d) return null
  return d.startsWith('0') ? `593${d.slice(1)}` : d
}

// Logo: archivo subido en /uploads o URL completa
export function urlLogo(logo) {
  if (!logo) return null
  return /^https?:\/\//.test(logo) ? logo : apiUrl(`/uploads/${logo}`)
}

export function DistribuidoraProvider({ children, exigir = true }) {
  const [estado, setEstado] = useState({ distribuidora: null, cargando: true, error: null })

  useEffect(() => {
    let vivo = true
    fetch(apiUrl('/api/distribuidora'))
      .then(async r => {
        const data = await r.json().catch(() => ({}))
        if (!vivo) return
        if (r.ok) setEstado({ distribuidora: data.distribuidora, cargando: false, error: null })
        else setEstado({ distribuidora: null, cargando: false, error: data.codigo || 'ERROR' })
      })
      .catch(() => vivo && setEstado({ distribuidora: null, cargando: false, error: 'SIN_CONEXION' }))
    return () => { vivo = false }
  }, [])

  const { distribuidora, error } = estado

  useEffect(() => {
    if (!distribuidora) return
    document.title = distribuidora.nombre
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta && distribuidora.colorPrimario) meta.setAttribute('content', distribuidora.colorPrimario)
  }, [distribuidora])

  if (exigir && MENSAJES[error]) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center p-4" style={{ background: '#f2f6fa' }}>
        <div className="text-center" style={{ maxWidth: 420 }}>
          <i className="bi bi-droplet-half" style={{ fontSize: '2.5rem', color: '#0066CC' }}></i>
          <h1 className="h4 fw-bold mt-3">{MENSAJES[error]}</h1>
          <p className="text-muted mb-0">Revisa la dirección o comunícate con tu distribuidora.</p>
        </div>
      </div>
    )
  }

  const valor = { ...estado, nombre: distribuidora?.nombre || MARCA_PLATAFORMA }
  return <DistribuidoraContext.Provider value={valor}>{children}</DistribuidoraContext.Provider>
}

export function useDistribuidora() {
  return useContext(DistribuidoraContext)
}
