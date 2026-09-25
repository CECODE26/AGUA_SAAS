// Landing de Agua Elite (el SaaS), diseño D · Elite. Se muestra en el dominio de la
// plataforma, donde no hay ninguna distribuidora (ver App.jsx y DistribuidoraContext).
// "Probar la demo" crea al instante una distribuidora de prueba solo para el visitante
// (server/lib/demo.js) y lo lleva a su panel, sin registrarse ni pedir permiso.
import { useEffect, useState } from 'react'
import { apiUrl } from '../lib/api'
import { Bidon, Causticas, Cinta, Flecha, IconoCamion, MarcaGota, Rayos, Sellos } from '../sitio/Piezas'
import '../sitio/elite.css'
import './landing.css'

const CONTACTO_WHATSAPP = import.meta.env.VITE_CONTACTO_WHATSAPP || ''
const CONTACTO_EMAIL = import.meta.env.VITE_CONTACTO_EMAIL || ''

// Dirección de una distribuidora a partir del dominio actual: aguaelite.com → norte.aguaelite.com
function urlDeDistribuidora(slug, ruta) {
  const { protocol, hostname, port } = window.location
  const raiz = hostname.replace(/^www\./, '')
  return `${protocol}//${slug}.${raiz}${port ? `:${port}` : ''}${ruta}`
}

function whatsappUrl(n) {
  const d = String(n).replace(/\D/g, '')
  return `https://wa.me/${d.startsWith('0') ? `593${d.slice(1)}` : d}`
}

function useDemo() {
  const [estado, setEstado] = useState({ cargando: false, error: '' })
  async function abrir() {
    setEstado({ cargando: true, error: '' })
    try {
      const res = await fetch(apiUrl('/api/plataforma/demo'), { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.message || 'No pudimos abrir la demo')
      // El token va en el fragmento (#): no viaja al servidor ni queda en registros
      window.location.assign(urlDeDistribuidora(d.slug, `/demo/entrar#t=${encodeURIComponent(d.token)}`))
    } catch (e) {
      setEstado({ cargando: false, error: e.message })
    }
  }
  return { ...estado, abrir }
}

function BotonDemo({ demo, texto = 'Probar la demo', chico = false }) {
  return (
    <button type="button" className={`e-cta${chico ? ' e-cta--chica' : ''}`} onClick={demo.abrir} disabled={demo.cargando}>
      {demo.cargando ? 'Preparando tu demo…' : texto}
      {!demo.cargando && <Flecha />}
    </button>
  )
}

const ENLACES = [
  { href: '#funciones', label: 'Funciones' },
  { href: '#planes', label: 'Planes' },
  { href: '#clientes', label: 'Clientes' },
  { href: '#contacto', label: 'Contacto' },
]

export default function LandingAguaElite() {
  const demo = useDemo()
  useEffect(() => {
    document.title = 'Agua Elite · Software para distribuidoras de agua'
    // Cualquier otra dirección del dominio raíz lleva a la landing
    if (window.location.pathname !== '/') window.history.replaceState(null, '', '/')
  }, [])

  return (
    <div className="elite">
      <a href="#contenido" className="e-saltar">Saltar al contenido</a>
      <Encabezado />
      <main id="contenido">
        <Hero demo={demo} />
        <TresApps />
        <Funciones />
        <BandaDemo demo={demo} />
        <Clientes />
        <Planes demo={demo} />
        <Contacto demo={demo} />
        <Ingresar />
      </main>
      <Pie />
      {demo.error && (
        <div className="l-toast" role="alert">
          {demo.error}
          <button type="button" className="e-link" onClick={demo.abrir}>Reintentar</button>
        </div>
      )}
    </div>
  )
}

function LogoAguaElite() {
  return (
    <>
      <span className="e-logo-marca"><MarcaGota /></span>
      <span className="e-logo-nombre">Agua Elite</span>
    </>
  )
}

function Encabezado() {
  const [solido, setSolido] = useState(false)
  const [abierto, setAbierto] = useState(false)
  useEffect(() => {
    const alScroll = () => setSolido(window.scrollY > 24)
    alScroll()
    window.addEventListener('scroll', alScroll, { passive: true })
    return () => window.removeEventListener('scroll', alScroll)
  }, [])
  const cerrar = () => setAbierto(false)
  return (
    <>
      <header className={`e-header${solido || abierto ? ' e-header--solido' : ''}`}>
        <div className="e-contenedor e-header-fila">
          <a href="#contenido" className="e-logo" aria-label="Agua Elite, inicio"><LogoAguaElite /></a>
          <nav className="e-nav" aria-label="Principal">
            <ul>{ENLACES.map(e => <li key={e.href}><a className="e-nav-link" href={e.href}>{e.label}</a></li>)}</ul>
            <span className="e-nav-sep" aria-hidden="true" />
            <a className="e-nav-link" href="#ingresar" style={{ color: '#BFD0E2' }}>Ingresar</a>
          </nav>
          <div className="e-acciones">
            <button type="button" className="e-menu-boton" aria-expanded={abierto} aria-controls="menu-landing"
              aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setAbierto(a => !a)}>
              <i className={`bi ${abierto ? 'bi-x-lg' : 'bi-list'}`} style={{ fontSize: 22 }} aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </header>
      {abierto && (
        <nav id="menu-landing" className="e-menu-movil" aria-label="Principal">
          <ul>
            {[...ENLACES, { href: '#ingresar', label: 'Ingresar' }].map(e => (
              <li key={e.href}><a href={e.href} onClick={cerrar}>{e.label}<i className="bi bi-arrow-right" style={{ fontSize: 18, color: 'var(--e-cian)' }} aria-hidden="true"></i></a></li>
            ))}
          </ul>
        </nav>
      )}
    </>
  )
}

function Hero({ demo }) {
  return (
    <section className="e-hero" aria-labelledby="hero-titulo">
      <Causticas />
      <Rayos />
      <div className="e-contenedor e-hero-grid">
        <div className="e-hero-copia">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            <p className="e-ceja">Software para distribuidoras de agua</p>
            <h1 id="hero-titulo">
              <span>Cada bidón</span>
              <span>en su ruta.</span>
              <span>Cada cliente,</span>
              <em>siempre fiel.</em>
            </h1>
          </div>
          <p className="e-lead">
            Pedidos, rutas, venta exprés y tarjeta de fidelidad en tres apps conectadas:
            la de tu cliente, la de tu chofer y tu panel de dueño.
          </p>
          <div className="e-hero-ctas">
            <BotonDemo demo={demo} />
            <a href="#funciones" className="e-link">Ver cómo funciona</a>
          </div>
          <p className="l-nota">Sin registrarte: entras a una distribuidora de prueba con datos de ejemplo.</p>
        </div>

        <div className="e-hero-arte">
          <Bidon />
          <div className="e-vidrio e-tarjeta-fidelidad" role="group" aria-label="Vista de la app del cliente">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="e-mini-ceja">App del cliente</span>
              <span className="e-mini-titulo" style={{ fontSize: 20 }}>Tarjeta de fidelidad</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#DCE8F5' }}>María Fernanda L.</span>
              <span style={{ fontFamily: 'var(--f-titulo)', fontStyle: 'italic', fontSize: 20, color: 'var(--e-cian)' }}>
                7 <span style={{ fontSize: 13, fontStyle: 'normal', fontFamily: 'var(--f-texto)', color: '#B9CDE2' }}>de 10</span>
              </span>
            </div>
            <Sellos meta={10} llenos={7} />
            <p style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--e-suave)' }}>
              Te faltan 3 sellos para tu <span style={{ color: 'var(--e-oro-claro)' }}>bidón gratis</span>.
            </p>
          </div>
          <div className="e-vidrio e-tarjeta-pedido" role="group" aria-label="Vista de la app del chofer">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="e-icono-redondo"><IconoCamion /></span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className="e-mini-ceja">App del chofer</span>
                  <span className="e-mini-titulo">Ruta de hoy</span>
                </div>
              </div>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#DCE8F5' }}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#DCE8F5', color: '#0A2766', fontSize: 12, fontWeight: 600 }} aria-hidden="true">K</span>
                Kevin
              </span>
            </div>
            <ol className="e-pasos">
              <li>
                <span className="e-paso-num e-paso-num--hecho">1</span>
                <span className="e-paso-texto"><b>María Fernanda L.</b><small>Barrio Obrero · 2 Bidón 20 L</small></span>
                <span className="e-chip e-chip--hecho">Entregado</span>
              </li>
              <li>
                <span className="e-paso-num e-paso-num--ahora">2</span>
                <span className="e-paso-texto"><b>Carlos V.</b><small>El Dorado · 1 Envase con llave</small></span>
                <span className="e-chip e-chip--ahora">En camino</span>
              </li>
              <li>
                <span className="e-paso-num e-paso-num--luego">3</span>
                <span className="e-paso-texto"><b>Pedido #124</b><small>Puyo centro · 3 Bidón 20 L</small></span>
                <span className="e-chip e-chip--luego">Pendiente</span>
              </li>
            </ol>
          </div>
        </div>
      </div>
      <Cinta items={['Pedidos', 'Rutas', 'Venta exprés', 'Fidelidad', 'Panel del dueño']} />
    </section>
  )
}

function TresApps() {
  const apps = [
    { icono: 'bi-phone', ceja: 'Para tus clientes', titulo: 'App del cliente', puntos: [
      'Pide sus bidones en segundos, desde la app o tu sitio web.',
      'Sigue su pedido hasta la puerta y recibe avisos en el celular.',
      'Suma sellos en cada entrega y canjea su premio.',
      'Elige sus días de visita fija y el camión pasa solo.',
    ] },
    { icono: 'bi-truck', ceja: 'Para tus choferes', titulo: 'App del chofer', puntos: [
      'La ruta del día ordenada en el mapa, parada por parada.',
      'Marca entregado o no entregado con el motivo.',
      'Registra ventas exprés en la calle, con o sin cliente.',
      'Ve si el cliente trae un premio de fidelidad.',
    ] },
    { icono: 'bi-speedometer2', ceja: 'Para ti', titulo: 'Panel del dueño', puntos: [
      'Todos los pedidos en vivo, con aviso sonoro cuando entra uno.',
      'Zonas por camión y reparto automático al chofer que corresponde.',
      'Flota, choferes, clientes fijos y reportes en Excel o PDF.',
      'Tu propio sitio web con tu marca, tu color y tu dominio.',
    ] },
  ]
  return (
    <section className="e-seccion e-seccion--honda" id="funciones" aria-labelledby="apps-titulo">
      <div className="e-contenedor">
        <div className="e-cabecera">
          <p className="e-ceja">Tres apps conectadas</p>
          <h2 id="apps-titulo" className="e-titulo-seccion">Un solo sistema, <em>de la planta a la puerta.</em></h2>
          <p className="e-lead">Lo que pide tu cliente le llega al chofer y lo ves tú, al instante y en el mismo lugar.</p>
        </div>
        <div className="e-pasos-grandes">
          {apps.map(a => (
            <article key={a.titulo} className="e-vidrio e-paso-grande">
              <span className="e-icono-redondo" style={{ width: 44, height: 44 }}><i className={`bi ${a.icono}`} style={{ fontSize: 18 }} aria-hidden="true"></i></span>
              <span className="e-mini-ceja">{a.ceja}</span>
              <h3>{a.titulo}</h3>
              <ul className="l-lista">{a.puntos.map(p => <li key={p}>{p}</li>)}</ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Funciones() {
  const items = [
    { i: 'bi-geo-alt', t: 'Reparto automático por zonas', d: 'Dibujas las zonas de cada camión y cada pedido nuevo cae solo en la ruta del chofer que le toca.' },
    { i: 'bi-moon-stars', t: 'Traspaso nocturno', d: 'Lo que no se entregó hoy pasa solo al inicio de la ruta de mañana.' },
    { i: 'bi-calendar-week', t: 'Clientes fijos', d: 'Visitas programadas por día y hora, con lo que compra siempre cada cliente.' },
    { i: 'bi-gift', t: 'Fidelidad a tu medida', d: 'Tú decides cuántos sellos, qué se regala o qué descuento, y qué productos suman.' },
    { i: 'bi-bell', t: 'Avisos al celular', d: 'El cliente sabe cuándo sale el camión y cuándo se entregó su pedido.' },
    { i: 'bi-bar-chart', t: 'Reportes claros', d: 'Ventas, productos más vendidos, costo del programa de fidelidad y exportación a Excel.' },
    { i: 'bi-shield-lock', t: 'Accesos seguros', d: 'Roles de dueño y admin, solicitudes de alta y verificación en dos pasos.' },
    { i: 'bi-globe2', t: 'Tu sitio con tu marca', d: 'Tu nombre, tu color y tu dominio. Los pedidos del sitio entran directo al sistema.' },
  ]
  return (
    <section className="e-seccion e-seccion--luz" aria-labelledby="funciones-titulo">
      <div className="e-contenedor">
        <div className="e-cabecera">
          <p className="e-ceja">Funciones</p>
          <h2 id="funciones-titulo" className="e-titulo-seccion">Pensado para <em>repartir agua.</em></h2>
        </div>
        <ul className="l-funciones">
          {items.map(x => (
            <li key={x.t}>
              <i className={`bi ${x.i}`} aria-hidden="true"></i>
              <h3>{x.t}</h3>
              <p>{x.d}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function BandaDemo({ demo }) {
  return (
    <section className="e-seccion e-seccion--honda" aria-labelledby="demo-titulo" style={{ paddingTop: 0 }}>
      <div className="e-contenedor">
        <div className="e-vidrio e-contacto-banda">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p className="e-ceja">Demo instantánea</p>
            <h2 id="demo-titulo" className="e-titulo-seccion" style={{ fontSize: 'clamp(30px, 4vw, 48px)' }}>Entra y úsalo, <em>ahora mismo.</em></h2>
            <p className="e-lead">
              Te abrimos una distribuidora de prueba solo para ti, con pedidos, rutas, choferes y clientes de ejemplo.
              Cambia lo que quieras: nadie más ve lo que haces y se borra sola en dos horas.
            </p>
          </div>
          <div className="e-contacto-botones"><BotonDemo demo={demo} texto="Abrir mi demo" /></div>
        </div>
      </div>
    </section>
  )
}

function Clientes() {
  return (
    <section className="e-seccion e-seccion--luz" id="clientes" aria-labelledby="clientes-titulo">
      <div className="e-contenedor l-clientes">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <p className="e-ceja">Clientes</p>
          <h2 id="clientes-titulo" className="e-titulo-seccion">Ya reparte <em>con Agua Elite.</em></h2>
          <p className="e-lead">Agua Elite nació en la operación diaria de una distribuidora real de la Amazonía ecuatoriana.</p>
        </div>
        <div className="e-vidrio l-cliente">
          <span className="e-mini-ceja">Puyo · Pastaza</span>
          <p className="l-cliente-nombre">Agua Manú</p>
          <p style={{ color: 'var(--e-suave)' }}>Pedidos por app y web, reparto por zonas con varios camiones y tarjeta de fidelidad.</p>
        </div>
      </div>
    </section>
  )
}

function Planes({ demo }) {
  const incluye = [
    'App del cliente, app del chofer y panel del dueño',
    'Tu sitio web con tu marca y tu dominio',
    'Choferes, camiones y zonas según tu operación',
    'Programa de fidelidad y clientes fijos',
    'Reportes, flota y accesos para tu equipo',
  ]
  return (
    <section className="e-seccion e-seccion--honda" id="planes" aria-labelledby="planes-titulo">
      <div className="e-contenedor e-fidelidad">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <p className="e-ceja">Planes</p>
          <h2 id="planes-titulo" className="e-titulo-seccion">Un plan <em>a la medida de tu distribuidora.</em></h2>
          <p className="e-lead">Cotizamos según el tamaño de tu operación: cuántos camiones, choferes y clientes manejas.</p>
          <div className="e-hero-ctas">
            <a href="#contacto" className="e-cta">Pedir una cotización <Flecha /></a>
            <button type="button" className="e-link" onClick={demo.abrir} disabled={demo.cargando}>Probar la demo primero</button>
          </div>
        </div>
        <div className="e-vidrio" style={{ maxWidth: 460 }}>
          <span className="e-mini-ceja">Todos los planes incluyen</span>
          <ul className="l-lista l-lista--check">{incluye.map(x => <li key={x}>{x}</li>)}</ul>
        </div>
      </div>
    </section>
  )
}

function Contacto({ demo }) {
  return (
    <section className="e-seccion e-seccion--luz" id="contacto" aria-labelledby="contacto-titulo">
      <div className="e-contenedor">
        <div className="e-cabecera">
          <p className="e-ceja">Contacto</p>
          <h2 id="contacto-titulo" className="e-titulo-seccion">Hablemos de <em>tu distribuidora.</em></h2>
          <p className="e-lead">Cuéntanos cuántos camiones tienes y cómo reciben pedidos hoy. Te ayudamos a empezar.</p>
        </div>
        <div className="e-contacto-botones">
          {CONTACTO_WHATSAPP && <a className="e-cta" href={whatsappUrl(CONTACTO_WHATSAPP)} target="_blank" rel="noopener noreferrer"><i className="bi bi-whatsapp" aria-hidden="true"></i>Escríbenos por WhatsApp</a>}
          {CONTACTO_EMAIL && <a className="e-boton-vidrio" href={`mailto:${CONTACTO_EMAIL}`}><i className="bi bi-envelope" aria-hidden="true"></i>{CONTACTO_EMAIL}</a>}
          {!CONTACTO_WHATSAPP && !CONTACTO_EMAIL && <BotonDemo demo={demo} />}
        </div>
      </div>
    </section>
  )
}

function Ingresar() {
  const [slug, setSlug] = useState('')
  const limpio = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
  function entrar(e) {
    e.preventDefault()
    if (limpio) window.location.assign(urlDeDistribuidora(limpio, '/admin/login'))
  }
  return (
    <section className="e-seccion e-seccion--honda" id="ingresar" aria-labelledby="ingresar-titulo" style={{ paddingTop: 0 }}>
      <div className="e-contenedor">
        <form className="e-vidrio e-contacto-banda" onSubmit={entrar}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p className="e-ceja">¿Ya eres cliente?</p>
            <h2 id="ingresar-titulo" className="e-titulo-seccion" style={{ fontSize: 'clamp(28px, 3.4vw, 40px)' }}>Ingresa a <em>tu panel.</em></h2>
            <p style={{ color: 'var(--e-suave)' }}>Escribe el identificador de tu distribuidora. Si tienes dominio propio, entra por tu dominio.</p>
          </div>
          <div className="l-ingresar">
            <label htmlFor="l-slug" className="visually-hidden">Identificador de tu distribuidora</label>
            <input id="l-slug" className="l-input" placeholder="tu-distribuidora" value={slug} onChange={e => setSlug(e.target.value)}
              autoCapitalize="none" autoCorrect="off" spellCheck="false" />
            <button type="submit" className="e-cta e-cta--chica" disabled={!limpio}>Ingresar</button>
          </div>
        </form>
      </div>
    </section>
  )
}

function Pie() {
  return (
    <footer className="e-pie">
      <div className="e-contenedor">
        <div className="e-pie-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <a href="#contenido" className="e-logo" aria-label="Agua Elite, inicio"><LogoAguaElite /></a>
            <p>Software para distribuidoras de agua en bidón.</p>
          </div>
          <div>
            <h2>Producto</h2>
            <ul>{ENLACES.map(e => <li key={e.href}><a href={e.href}>{e.label}</a></li>)}</ul>
          </div>
          <div>
            <h2>Accesos</h2>
            <ul>
              <li><a href="#ingresar">Panel de mi distribuidora</a></li>
              <li><a href="/plataforma">Equipo de Agua Elite</a></li>
            </ul>
          </div>
        </div>
        <div className="e-pie-base">
          <span>© {new Date().getFullYear()} Agua Elite</span>
        </div>
      </div>
    </footer>
  )
}
