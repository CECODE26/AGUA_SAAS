// Piezas visuales del sitio Elite, reutilizadas por el inicio y las páginas interiores.
import { useEffect, useId, useState } from 'react'
import { SVG_BIDON, SVG_CAUSTICAS } from './svgs'
import { urlLogo } from '../context/DistribuidoraContext'
import { apiUrl } from '../lib/api'

// ── Marca: logo subido por la distribuidora o la gota de la plantilla ────────
export function MarcaGota() {
  const id = useId().replace(/:/g, '')
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={`${id}b`}><rect x="0" y="22" width="40" height="18" /></clipPath>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F2F7FC" /><stop offset=".5" stopColor="#8E9DB2" /><stop offset="1" stopColor="#E4ECF5" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="19" fill="none" stroke={`url(#${id}a)`} strokeWidth="1.2" />
      <path d="M20 8 C16.4 13 12.6 17.2 12.6 22.6 A7.4 7.4 0 0 0 27.4 22.6 C27.4 17.2 23.6 13 20 8 Z" fill="none" stroke="#EAF4FF" strokeWidth="1.3" />
      <path d="M20 8 C16.4 13 12.6 17.2 12.6 22.6 A7.4 7.4 0 0 0 27.4 22.6 C27.4 17.2 23.6 13 20 8 Z" fill="#A8E4F0" clipPath={`url(#${id}b)`} />
      <path d="M11.5 22 H28.5" stroke="#EAF4FF" strokeWidth="1.1" />
    </svg>
  )
}

export function Logo({ distribuidora, nombre }) {
  const src = urlLogo(distribuidora?.logo)
  return (
    <>
      <span className="e-logo-marca">{src ? <img src={src} alt="" /> : <MarcaGota />}</span>
      <span className="e-logo-nombre">{nombre}</span>
    </>
  )
}

// ── Agua: luz que se mueve, rayos desde la superficie y el bidón ─────────────
export function Causticas() {
  return <div className="e-causticas" aria-hidden="true" dangerouslySetInnerHTML={{ __html: SVG_CAUSTICAS }} />
}

export function Rayos() {
  return (
    <div className="e-rayos" aria-hidden="true">
      <span style={{ left: '70%', width: 110, background: 'linear-gradient(180deg, rgba(150,210,255,.20) 0%, rgba(150,210,255,0) 72%)', filter: 'blur(16px)' }} />
      <span style={{ left: '82%', width: 190, background: 'linear-gradient(180deg, rgba(150,210,255,.16) 0%, rgba(150,210,255,0) 66%)', filter: 'blur(22px)' }} />
      <span style={{ left: '97%', width: 70, background: 'linear-gradient(180deg, rgba(150,210,255,.18) 0%, rgba(150,210,255,0) 60%)', filter: 'blur(12px)' }} />
    </div>
  )
}

export function Bidon() {
  return <div className="e-bidon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: SVG_BIDON }} />
}

// Bidón pequeño de línea para productos sin foto
export function BidonChico() {
  return (
    <svg viewBox="0 0 120 180" aria-hidden="true" focusable="false">
      <rect x="44" y="6" width="32" height="20" rx="5" fill="#DCE7F3" />
      <rect x="40" y="24" width="40" height="7" rx="3" fill="#A9B6C7" />
      <path d="M48 31 V40 C48 50 10 52 10 76 V166 Q10 174 18 174 H102 Q110 174 110 166 V76 C110 52 72 50 72 40 V31 Z"
        fill="rgba(74,162,243,.28)" stroke="#CFEFFF" strokeOpacity=".8" strokeWidth="2" />
      <path d="M12 92 Q60 100 108 92 V166 Q108 172 102 172 H18 Q12 172 12 166 Z" fill="rgba(37,103,214,.55)" />
      <path d="M12 92 Q60 100 108 92" fill="none" stroke="#F4FCFF" strokeWidth="2" />
      <rect x="20" y="80" width="7" height="84" rx="3.5" fill="#FFFFFF" opacity=".45" />
    </svg>
  )
}

export function Flecha() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" /><path d="M13 6l6 6-6 6" />
    </svg>
  )
}

export function IconoCamion() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 6.5h11v9h-11z" /><path d="M13.5 9.5h4.2l3 3.2v2.8h-7.2" /><circle cx="6.5" cy="17.2" r="1.8" /><circle cx="17" cy="17.2" r="1.8" />
    </svg>
  )
}

const Gota = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c-3 4-5.5 7-5.5 10a5.5 5.5 0 0 0 11 0c0-3-2.5-6-5.5-10z" fill="#0A2766" /></svg>
)
const Premio = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F6C891" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9.5 2.8h5v2.6h-5z" /><path d="M10.4 5.4v1.8M13.6 5.4v1.8" /><path d="M7 10c0-1.6 1.3-2.8 3-2.8h4c1.7 0 3 1.2 3 2.8v9.2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" /><path d="M7 13.2h10M7 16.6h10" />
  </svg>
)

// Fila de sellos: hasta 10 casilleros, el último es el premio
export function Sellos({ meta, llenos }) {
  const casillas = Math.min(Math.max(meta, 2), 10)
  const hechos = Math.min(llenos, casillas - 1)
  return (
    <div className="e-sellos" role="img" aria-label={`${llenos} de ${meta} sellos`}>
      {Array.from({ length: casillas }, (_, i) => {
        if (i === casillas - 1) return <span key={i} className="e-sello e-sello--premio"><Premio /></span>
        return i < hechos
          ? <span key={i} className="e-sello e-sello--lleno"><Gota /></span>
          : <span key={i} className="e-sello e-sello--vacio" />
      })}
    </div>
  )
}

// ── Cinta que corre bajo el hero ─────────────────────────────────────────────
export function Cinta({ items }) {
  const lista = items.map((t, i) => ({ n: String(i + 1).padStart(2, '0'), t }))
  // Se repite para llenar pantallas anchas; la segunda mitad es solo decorativa
  const fila = [...lista, ...lista]
  const Rombo = () => <svg width="7" height="7" viewBox="0 0 7 7" aria-hidden="true"><path d="M3.5 0 7 3.5 3.5 7 0 3.5z" fill="#C9D4E1" /></svg>
  return (
    <div className="e-cinta">
      <div className="e-cinta-pista">
        {[0, 1].map(copia => (
          <ul key={copia} aria-hidden={copia === 1 || undefined} aria-label={copia === 0 ? 'Servicios' : undefined}>
            {fila.map((x, i) => (
              <li key={i}><span><i>{x.n}</i><b>{x.t.toUpperCase()}</b></span><Rombo /></li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  )
}

// ── Programa de fidelidad público de la distribuidora ────────────────────────
let programaCache = null
export function useProgramaFidelidad() {
  const [programa, setPrograma] = useState(programaCache)
  useEffect(() => {
    if (programaCache) return
    fetch(apiUrl('/api/fidelidad/programa'))
      .then(r => (r.ok ? r.json() : { activo: false }))
      .catch(() => ({ activo: false }))
      .then(p => { programaCache = p; setPrograma(p) })
  }, [])
  return programa
}
