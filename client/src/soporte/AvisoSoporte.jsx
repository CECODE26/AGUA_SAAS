// Franja fija arriba cuando el superadmin de Agua Elite está dentro del panel de una
// empresa: deja claro dónde está y lo devuelve a Empresas.
import { useLocation } from 'react-router-dom'
import { useDistribuidora } from '../context/DistribuidoraContext'
import { datosSoporte, salirDeSoporte } from './sesionSoporte'

export const ALTO_AVISO_SOPORTE = 40

export default function AvisoSoporte() {
  const { pathname } = useLocation()
  const { distribuidora } = useDistribuidora()
  const soporte = datosSoporte()
  if (!soporte || !pathname.startsWith('/admin')) return null
  return (
    <div role="region" aria-label="Sesión de soporte" style={{
      position: 'relative', zIndex: 3000, minHeight: ALTO_AVISO_SOPORTE,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '4px 14px',
      padding: '6px 16px', background: '#06122B', color: '#EAF4FF', fontSize: 14,
    }}>
      <span><i className="bi bi-shield-lock me-2" aria-hidden="true"></i>
        Estás dentro de <b>{distribuidora?.nombre || 'la empresa'}</b> como superadmin de Agua Elite · los cambios quedan registrados
      </span>
      <button type="button" onClick={salirDeSoporte} className="btn btn-sm btn-light fw-semibold" style={{ minHeight: 32 }}>
        <i className="bi bi-arrow-left me-1" aria-hidden="true"></i>Volver a Empresas
      </button>
    </div>
  )
}
