// Inicio del sitio de la distribuidora · diseño D · Elite
import { Link } from 'react-router-dom'
import { useDistribuidora, numeroWhatsapp } from '../context/DistribuidoraContext'
import { useContenido } from '../hooks/useContenido'
import SitioLayout from '../sitio/SitioLayout'
import { Bidon, Causticas, Cinta, Flecha, IconoCamion, Rayos, Sellos, useProgramaFidelidad } from '../sitio/Piezas'
import { TarjetaProducto, useProductos } from '../sitio/Producto'

const TITULO_POR_DEFECTO = 'Agua pura,\nen tu puerta.\nCada pedido,'
const DESTACADO_POR_DEFECTO = 'siempre a tiempo.'

export default function Inicio() {
  return (
    <SitioLayout>
      <Hero />
      <ProductosDestacados />
      <ComoFunciona />
      <Fidelidad />
      <BandaContacto />
    </SitioLayout>
  )
}

function Hero() {
  const { distribuidora } = useDistribuidora()
  const hero = useContenido('inicio')?.hero
  const programa = useProgramaFidelidad()
  const lineas = (hero?.titulo || TITULO_POR_DEFECTO).split('\n').map(l => l.trim()).filter(Boolean)
  const destacado = hero?.destacado ?? DESTACADO_POR_DEFECTO
  const ciudad = distribuidora?.ciudad
  const subtitulo = hero?.subtitulo || (programa?.activo
    ? 'Pide tus bidones en línea, síguelos hasta tu casa y suma un sello en cada entrega.'
    : 'Pide tus bidones en línea y síguelos hasta la puerta de tu casa.')
  const cinta = ['Pide en línea', 'Entrega a domicilio', 'Sigue tu pedido', ...(programa?.activo ? ['Tarjeta de fidelidad'] : [])]

  return (
    <section className="e-hero" aria-labelledby="hero-titulo">
      <Causticas />
      <Rayos />
      <div className="e-contenedor e-hero-grid">
        <div className="e-hero-copia">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            <p className="e-ceja">{hero?.ceja || `Agua a domicilio${ciudad ? ` en ${ciudad}` : ''}`}</p>
            <h1 id="hero-titulo">
              {lineas.map((l, i) => <span key={i}>{l}</span>)}
              {destacado && <em>{destacado}</em>}
            </h1>
          </div>
          <p className="e-lead">{subtitulo}</p>
          <div className="e-hero-ctas">
            <Link to="/productos" className="e-cta">Pedir agua <Flecha /></Link>
            <Link to="/mis-pedidos" className="e-link">Seguir mi pedido</Link>
          </div>
        </div>

        <div className="e-hero-arte">
          <Bidon />
          {programa?.activo && (
            <div className="e-vidrio e-tarjeta-fidelidad" role="group" aria-label="Ejemplo de tarjeta de fidelidad">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span className="e-mini-ceja">Tu tarjeta</span>
                <span className="e-mini-titulo" style={{ fontSize: 20 }}>Tarjeta de fidelidad</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#DCE8F5' }}>Cada entrega suma</span>
                <span style={{ fontFamily: 'var(--f-titulo)', fontStyle: 'italic', fontSize: 20, color: 'var(--e-cian)' }}>
                  {Math.max(programa.meta - 3, 1)} <span style={{ fontSize: 13, fontStyle: 'normal', fontFamily: 'var(--f-texto)', color: '#B9CDE2' }}>de {programa.meta}</span>
                </span>
              </div>
              <Sellos meta={programa.meta} llenos={Math.max(programa.meta - 3, 1)} />
              <p style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--e-suave)' }}>
                Al completarla ganas <span style={{ color: 'var(--e-oro-claro)' }}>{programa.textoPremio}</span>.
              </p>
            </div>
          )}
          <div className="e-vidrio e-tarjeta-pedido" role="group" aria-label="Ejemplo de seguimiento de un pedido">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="e-icono-redondo"><IconoCamion /></span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span className="e-mini-ceja">Sigue tu pedido</span>
                <span className="e-mini-titulo">Tu agua va en camino</span>
              </div>
            </div>
            <ol className="e-pasos">
              <li>
                <span className="e-paso-num e-paso-num--hecho">1</span>
                <span className="e-paso-texto"><b>Pedido recibido</b><small>Queda registrado al instante</small></span>
                <span className="e-chip e-chip--hecho">Listo</span>
              </li>
              <li>
                <span className="e-paso-num e-paso-num--ahora">2</span>
                <span className="e-paso-texto"><b>En la ruta del camión</b><small>Planificado en la ruta del día</small></span>
                <span className="e-chip e-chip--ahora">En camino</span>
              </li>
              <li>
                <span className="e-paso-num e-paso-num--luego">3</span>
                <span className="e-paso-texto"><b>Entregado en tu casa</b><small>{ciudad || 'A domicilio'}</small></span>
                <span className="e-chip e-chip--luego">Pronto</span>
              </li>
            </ol>
          </div>
        </div>
      </div>
      <Cinta items={cinta} />
    </section>
  )
}

function ProductosDestacados() {
  const { productos } = useProductos()
  const c = useContenido('inicio')?.productos
  if (productos && productos.length === 0) return null
  // Primero los marcados con etiqueta (más popular, mejor valor…)
  const lista = (productos || []).slice().sort((a, b) => (b.tag ? 1 : 0) - (a.tag ? 1 : 0)).slice(0, 4)

  return (
    <section className="e-seccion e-seccion--honda" aria-labelledby="productos-titulo">
      <div className="e-contenedor">
        <div className="e-cabecera e-cabecera--fila">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p className="e-ceja">{c?.ceja || 'Nuestros productos'}</p>
            <h2 id="productos-titulo" className="e-titulo-seccion">{c?.titulo || 'Elige tu agua,'} <em>{c?.destacado || 'nosotros la llevamos.'}</em></h2>
          </div>
          <Link to="/productos" className="e-link">Ver todo el catálogo</Link>
        </div>
        {!productos
          ? <p className="e-lead" role="status">Cargando productos…</p>
          : <div className="e-productos">{lista.map(p => <TarjetaProducto key={p.id} producto={p} />)}</div>}
      </div>
    </section>
  )
}

function ComoFunciona() {
  const c = useContenido('inicio')?.pasos
  const pasos = [
    { t: c?.paso1_titulo || 'Elige tus productos', d: c?.paso1_texto || 'Agrega los bidones y botellas que necesitas a tu pedido.' },
    { t: c?.paso2_titulo || 'Dinos dónde entregar', d: c?.paso2_texto || 'Escribe tu dirección o comparte tu ubicación y confirma el pedido.' },
    { t: c?.paso3_titulo || 'Recíbelo en casa', d: c?.paso3_texto || 'El pedido entra a la ruta del camión y lo sigues desde "Mis pedidos".' },
  ]
  return (
    <section className="e-seccion e-seccion--luz" id="como-funciona" aria-labelledby="pasos-titulo">
      <div className="e-contenedor">
        <div className="e-cabecera">
          <p className="e-ceja">Cómo funciona</p>
          <h2 id="pasos-titulo" className="e-titulo-seccion">Tres pasos <em>y listo.</em></h2>
        </div>
        <ol className="e-pasos-grandes">
          {pasos.map((p, i) => (
            <li key={i} className="e-vidrio e-paso-grande">
              <i aria-hidden="true">{String(i + 1).padStart(2, '0')}</i>
              <h3>{p.t}</h3>
              <p>{p.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Fidelidad() {
  const programa = useProgramaFidelidad()
  if (!programa?.activo) return null
  return (
    <section className="e-seccion e-seccion--honda" id="fidelidad" aria-labelledby="fidelidad-titulo">
      <div className="e-contenedor e-fidelidad">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <p className="e-ceja">Tarjeta de fidelidad</p>
          <h2 id="fidelidad-titulo" className="e-titulo-seccion">Cada {programa.meta} bidones, <em>{programa.textoPremio}.</em></h2>
          <p className="e-lead">
            Cada entrega suma sellos a tu tarjeta. Cuando la completas, el premio te espera en tu próximo pedido.
            Revisa tus sellos en la app o pregúntale a tu chofer.
          </p>
        </div>
        <div className="e-vidrio" role="img" aria-label={`Tarjeta de ${programa.meta} sellos con premio al final`}>
          <span className="e-mini-ceja">Tu tarjeta</span>
          <span className="e-mini-titulo">{programa.meta} sellos, 1 premio</span>
          <Sellos meta={programa.meta} llenos={Math.max(programa.meta - 3, 1)} />
          <p style={{ fontSize: 14, color: 'var(--e-suave)' }}>
            El último casillero es tu <span style={{ color: 'var(--e-oro-claro)' }}>premio</span>.
          </p>
        </div>
      </div>
    </section>
  )
}

function BandaContacto() {
  const { distribuidora } = useDistribuidora()
  const whatsapp = numeroWhatsapp(distribuidora?.whatsapp)
  const telefono = distribuidora?.telefono
  return (
    <section className="e-seccion" aria-labelledby="contacto-titulo" style={{ paddingTop: 0 }}>
      <div className="e-contenedor">
        <div className="e-vidrio e-contacto-banda">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p className="e-ceja">¿Pedido grande o una duda?</p>
            <h2 id="contacto-titulo" className="e-titulo-seccion" style={{ fontSize: 'clamp(30px, 4vw, 44px)' }}>Escríbenos, <em>te respondemos.</em></h2>
          </div>
          <div className="e-contacto-botones">
            {whatsapp && <a className="e-cta e-cta--chica" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer"><i className="bi bi-whatsapp" aria-hidden="true"></i>WhatsApp</a>}
            {telefono && <a className="e-boton-vidrio" href={`tel:${telefono.replace(/\s/g, '')}`}><i className="bi bi-telephone" aria-hidden="true"></i>{telefono}</a>}
            <Link className="e-boton-vidrio" to="/contacto">Enviar un mensaje</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
