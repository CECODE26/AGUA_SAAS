// Aviso flotante dentro de una demo de la landing: cuándo se borra, con qué usuarios
// probar el panel y la app del chofer, y accesos rápidos a cada parte.
import { useState } from 'react'
import { useDistribuidora } from '../context/DistribuidoraContext'

export default function AvisoDemo() {
  const { distribuidora } = useDistribuidora()
  const [abierto, setAbierto] = useState(false)
  if (!distribuidora?.esDemo) return null

  const hora = distribuidora.demoVenceEn
    ? new Date(distribuidora.demoVenceEn).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })
    : null
  const { panel, chofer } = distribuidora.demoAccesos || {}

  return (
    <div style={{ position: 'fixed', left: '50%', bottom: 16, transform: 'translateX(-50%)', zIndex: 2000, width: 'min(560px, calc(100% - 24px))' }}>
      <div role="region" aria-label="Estás en una demo" style={{
        background: 'rgba(6,18,43,.94)', color: '#EAF4FF', border: '1px solid rgba(168,228,240,.4)', borderRadius: 18,
        boxShadow: '0 20px 50px -20px rgba(0,6,24,.9)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        fontFamily: "'Jost', system-ui, sans-serif", fontSize: 14.5,
      }}>
        <button type="button" onClick={() => setAbierto(a => !a)} aria-expanded={abierto}
          style={{ all: 'unset', boxSizing: 'border-box', width: '100%', minHeight: 48, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <span style={{ padding: '2px 10px', borderRadius: 999, background: '#A8E4F0', color: '#06224F', fontSize: 12, fontWeight: 600, letterSpacing: '.08em' }}>DEMO</span>
          <span style={{ flex: 1 }}>Es tu distribuidora de prueba{hora ? ` · se borra a las ${hora}` : ''}</span>
          <i className={`bi ${abierto ? 'bi-chevron-down' : 'bi-chevron-up'}`} aria-hidden="true"></i>
          <span className="visually-hidden">{abierto ? 'Ocultar detalles' : 'Ver accesos de la demo'}</span>
        </button>
        {abierto && (
          <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, color: '#C9DBEC' }}>Todo es de ejemplo y nadie más lo ve: cambia lo que quieras.</p>
            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px' }}>
              {panel && <><dt style={{ color: '#A8E4F0', fontWeight: 500 }}>Panel</dt><dd style={{ margin: 0 }}>usuario <b>{panel.usuario}</b> · clave <b>{panel.clave}</b></dd></>}
              {chofer && <><dt style={{ color: '#A8E4F0', fontWeight: 500 }}>Chofer</dt><dd style={{ margin: 0 }}>usuario <b>{chofer.usuario}</b> · clave <b>{chofer.clave}</b></dd></>}
            </dl>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[['/admin', 'Panel del negocio'], ['/', 'Sitio del cliente'], ['/conductor/login', 'App del chofer']].map(([href, texto]) => (
                <a key={href} href={href} style={{ minHeight: 40, display: 'inline-flex', alignItems: 'center', padding: '0 14px', borderRadius: 999, border: '1px solid rgba(214,232,255,.3)', color: '#EAF4FF', textDecoration: 'none' }}>{texto}</a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
