// "Nosotros": historia de la distribuidora, escrita por su superadmin en "Sitio Web".
// Si no hay texto, la página no aparece en el menú y aquí se invita a volver al inicio.
import { Link } from 'react-router-dom'
import { useDistribuidora } from '../context/DistribuidoraContext'
import { useContenido } from '../hooks/useContenido'
import SitioLayout, { CabeceraPagina } from '../sitio/SitioLayout'

export default function Nosotros() {
  const { nombre } = useDistribuidora()
  const c = useContenido('nosotros')?.principal
  const parrafos = (c?.texto || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)

  return (
    <SitioLayout>
      <CabeceraPagina ceja="Nosotros" titulo={c?.titulo || nombre} destacado={c?.destacado}>
        {c?.subtitulo}
      </CabeceraPagina>
      <section className="e-papel">
        <div className="e-contenedor e-texto-largo">
          {parrafos.length > 0
            ? parrafos.map((p, i) => <p key={i} style={{ whiteSpace: 'pre-line' }}>{p}</p>)
            : <p>Muy pronto te contaremos nuestra historia. <Link to="/">Volver al inicio</Link>.</p>}
        </div>
      </section>
    </SitioLayout>
  )
}
