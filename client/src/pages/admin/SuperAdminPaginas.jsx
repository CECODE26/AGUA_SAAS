import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { invalidarContenido } from '../../hooks/useContenido'

// ── Configuración declarativa de todas las páginas y secciones editables ──────
const PAGINAS = {
  inicio: {
    label: 'Inicio',
    path: '/',
    secciones: {
      hero: {
        label: 'Hero Principal',
        icon: 'bi-image-fill',
        campos: [
          { key: 'badge',    label: 'Badge superior',   tipo: 'text' },
          { key: 'titulo',   label: 'Título principal',  tipo: 'textarea' },
          { key: 'subtitulo',label: 'Slogan / Subtítulo',tipo: 'text' },
          { key: 'imagen',   label: 'Imagen de fondo',   tipo: 'imagen' },
        ],
      },
      origen: {
        label: 'El Origen del Agua',
        icon: 'bi-droplet-fill',
        campos: [
          { key: 'badge',          label: 'Badge',                  tipo: 'text' },
          { key: 'titulo',         label: 'Título',                  tipo: 'text' },
          { key: 'descripcion',    label: 'Descripción',             tipo: 'textarea' },
          { key: 'card1_titulo',   label: 'Tarjeta 1 — Título',      tipo: 'text' },
          { key: 'card1_desc',     label: 'Tarjeta 1 — Descripción', tipo: 'textarea' },
          { key: 'card2_titulo',   label: 'Tarjeta 2 — Título',      tipo: 'text' },
          { key: 'card2_desc',     label: 'Tarjeta 2 — Descripción', tipo: 'textarea' },
          { key: 'card3_titulo',   label: 'Tarjeta 3 — Título',      tipo: 'text' },
          { key: 'card3_desc',     label: 'Tarjeta 3 — Descripción', tipo: 'textarea' },
          { key: 'card4_titulo',   label: 'Tarjeta 4 — Título',      tipo: 'text' },
          { key: 'card4_desc',     label: 'Tarjeta 4 — Descripción', tipo: 'textarea' },
        ],
      },
      stats: {
        label: 'Estadísticas',
        icon: 'bi-bar-chart-fill',
        campos: [
          { key: 'stat1_num',   label: 'Stat 1 — Número (ej: 500000)', tipo: 'text' },
          { key: 'stat1_label', label: 'Stat 1 — Etiqueta',            tipo: 'text' },
          { key: 'stat2_num',   label: 'Stat 2 — Número',              tipo: 'text' },
          { key: 'stat2_label', label: 'Stat 2 — Etiqueta',            tipo: 'text' },
          { key: 'stat3_num',   label: 'Stat 3 — Texto (ej: 100%)',    tipo: 'text' },
          { key: 'stat3_label', label: 'Stat 3 — Etiqueta',            tipo: 'text' },
          { key: 'stat4_num',   label: 'Stat 4 — Número',              tipo: 'text' },
          { key: 'stat4_label', label: 'Stat 4 — Etiqueta',            tipo: 'text' },
        ],
      },
      servicio: {
        label: 'Servicio a Domicilio',
        icon: 'bi-truck',
        campos: [
          { key: 'badge',       label: 'Badge',                   tipo: 'text' },
          { key: 'titulo',      label: 'Título',                   tipo: 'text' },
          { key: 'subtitulo',   label: 'Pregunta principal',       tipo: 'text' },
          { key: 'descripcion', label: 'Descripción',              tipo: 'textarea' },
          { key: 'info1_titulo',label: 'Info 1 — Título',          tipo: 'text' },
          { key: 'info1_desc',  label: 'Info 1 — Descripción',     tipo: 'text' },
          { key: 'info2_titulo',label: 'Info 2 — Título',          tipo: 'text' },
          { key: 'info2_desc',  label: 'Info 2 — Descripción',     tipo: 'text' },
          { key: 'info3_titulo',label: 'Info 3 — Título',          tipo: 'text' },
          { key: 'info3_desc',  label: 'Info 3 — Descripción',     tipo: 'text' },
          { key: 'imagen',      label: 'Imagen lateral',           tipo: 'imagen' },
        ],
      },
    },
  },
  historia: {
    label: 'Historia',
    path: '/historia',
    secciones: {
      banner: {
        label: 'Banner principal',
        icon: 'bi-image-fill',
        campos: [
          { key: 'badge',    label: 'Badge',     tipo: 'text' },
          { key: 'titulo',   label: 'Título',    tipo: 'text' },
          { key: 'subtitulo',label: 'Subtítulo', tipo: 'text' },
        ],
      },
      intro: {
        label: 'Introducción',
        icon: 'bi-text-paragraph',
        campos: [
          { key: 'texto1', label: 'Párrafo 1', tipo: 'textarea' },
          { key: 'texto2', label: 'Párrafo 2', tipo: 'textarea' },
        ],
      },
      origen: {
        label: 'Nuestro Origen',
        icon: 'bi-geo-alt-fill',
        campos: [
          { key: 'titulo',   label: 'Título',          tipo: 'text' },
          { key: 'subtitulo',label: 'Subtítulo',        tipo: 'text' },
          { key: 'parrafo1', label: 'Párrafo 1',        tipo: 'textarea' },
          { key: 'parrafo2', label: 'Párrafo 2',        tipo: 'textarea' },
          { key: 'parrafo3', label: 'Párrafo 3',        tipo: 'textarea' },
          { key: 'cita',     label: 'Cita destacada',   tipo: 'text' },
        ],
      },
      compromiso: {
        label: 'Nuestro Compromiso',
        icon: 'bi-heart-fill',
        campos: [
          { key: 'badge',    label: 'Badge',               tipo: 'text' },
          { key: 'titulo',   label: 'Título',               tipo: 'text' },
          { key: 'parrafo1', label: 'Párrafo 1',            tipo: 'textarea' },
          { key: 'cita',     label: 'Cita normativa',       tipo: 'textarea' },
          { key: 'parrafo2', label: 'Párrafo 2',            tipo: 'textarea' },
        ],
      },
    },
  },
  productos: {
    label: 'Productos',
    path: '/productos',
    secciones: {
      banner: {
        label: 'Banner principal',
        icon: 'bi-image-fill',
        campos: [
          { key: 'badge',    label: 'Badge',     tipo: 'text' },
          { key: 'titulo',   label: 'Título',    tipo: 'text' },
          { key: 'subtitulo',label: 'Subtítulo', tipo: 'text' },
        ],
      },
      calidad: {
        label: 'El Agua Que Bebemos',
        icon: 'bi-droplet-half',
        campos: [
          { key: 'badge',       label: 'Badge',        tipo: 'text' },
          { key: 'titulo',      label: 'Título',        tipo: 'text' },
          { key: 'descripcion', label: 'Descripción',   tipo: 'textarea' },
        ],
      },
      entrega: {
        label: 'Servicio a Domicilio',
        icon: 'bi-truck',
        campos: [
          { key: 'titulo',    label: 'Título',                   tipo: 'text' },
          { key: 'subtitulo', label: 'Subtítulo',                tipo: 'text' },
          { key: 'horario1',  label: 'Horario Lun–Vie',          tipo: 'text' },
          { key: 'horario2',  label: 'Horario Sábado',           tipo: 'text' },
          { key: 'condicion', label: 'Condición de entrega',     tipo: 'text' },
        ],
      },
    },
  },
}

// ── Campo de formulario ────────────────────────────────────────────────────────
function Campo({ campo, value, onChange, onImageUpload, uploading }) {
  const base = {
    width: '100%',
    padding: '7px 10px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '6px',
    color: 'white',
    fontSize: '0.8rem',
    outline: 'none',
    fontFamily: 'inherit',
  }

  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={{
        display: 'block', marginBottom: '4px',
        color: 'rgba(255,255,255,0.45)', fontSize: '0.65rem',
        fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase',
      }}>
        {campo.label}
      </label>

      {campo.tipo === 'text' && (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={base}
        />
      )}

      {campo.tipo === 'textarea' && (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={3}
          style={{ ...base, resize: 'vertical', minHeight: '70px' }}
        />
      )}

      {campo.tipo === 'imagen' && (
        <div>
          {value && (
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <img
                src={value}
                alt=""
                style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '6px', display: 'block' }}
              />
              <button
                onClick={() => onChange(null)}
                style={{
                  position: 'absolute', top: '6px', right: '6px',
                  background: 'rgba(0,0,0,0.65)', border: 'none',
                  color: 'white', borderRadius: '4px', cursor: 'pointer',
                  padding: '2px 7px', fontSize: '0.7rem', lineHeight: 1.4,
                }}
              >
                ✕
              </button>
            </div>
          )}
          <label style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 12px', borderRadius: '6px',
            background: uploading ? 'rgba(255,255,255,0.04)' : 'rgba(0,102,204,0.15)',
            border: '1px dashed rgba(0,102,204,0.4)',
            color: uploading ? 'rgba(255,255,255,0.3)' : '#60a5fa',
            fontSize: '0.75rem', fontWeight: 600, cursor: uploading ? 'default' : 'pointer',
          }}>
            {uploading
              ? <><span className="spinner-border spinner-border-sm" style={{ width: '12px', height: '12px' }}></span> Subiendo...</>
              : <><i className="bi bi-upload"></i> {value ? 'Cambiar imagen' : 'Subir imagen'}</>
            }
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={e => e.target.files[0] && onImageUpload(e.target.files[0])}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      )}
    </div>
  )
}

// ── Panel de sección (acordeón) ────────────────────────────────────────────────
function SeccionPanel({ secKey, config, isOpen, onToggle, pagina, contenido, onChange, onImageUpload, uploading }) {
  return (
    <div style={{ marginBottom: '3px' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', padding: '10px 14px',
          background: isOpen ? 'rgba(0,102,204,0.18)' : 'rgba(255,255,255,0.04)',
          border: isOpen ? '1px solid rgba(0,102,204,0.35)' : '1px solid transparent',
          borderRadius: isOpen ? '8px 8px 0 0' : '8px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '8px',
          color: 'white', fontSize: '0.82rem', fontWeight: 600,
          transition: 'all 0.15s', textAlign: 'left',
        }}
      >
        <i className={`bi ${config.icon}`} style={{ color: '#4ade80', fontSize: '0.85rem', flexShrink: 0 }}></i>
        <span style={{ flex: 1 }}>{config.label}</span>
        <i
          className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`}
          style={{ fontSize: '0.7rem', opacity: 0.4, flexShrink: 0 }}
        ></i>
      </button>

      {isOpen && (
        <div style={{
          background: 'rgba(0,0,0,0.2)',
          border: '1px solid rgba(0,102,204,0.35)',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          padding: '14px 14px 4px',
        }}>
          {config.campos.map(campo => (
            <Campo
              key={campo.key}
              campo={campo}
              value={contenido[pagina]?.[secKey]?.[campo.key] ?? ''}
              onChange={val => onChange(pagina, secKey, campo.key, val)}
              onImageUpload={file => onImageUpload(pagina, secKey, campo.key, file)}
              uploading={uploading === `${pagina}.${secKey}.${campo.key}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function SuperAdminPaginas() {
  const { token } = useAuth()
  const iframeRef = useRef(null)

  const [pagina, setPagina]           = useState('inicio')
  const [seccion, setSeccion]         = useState('hero')
  const [contenido, setContenido]     = useState({})
  const [guardando, setGuardando]     = useState(false)
  const [guardadoOk, setGuardadoOk]   = useState(false)
  const [iframeKey, setIframeKey]     = useState(0)
  const [uploading, setUploading]     = useState(null)
  const [errorMsg, setErrorMsg]       = useState(null)

  // Carga inicial del contenido
  useEffect(() => {
    fetch('/api/contenido')
      .then(r => r.ok ? r.json() : {})
      .then(data => setContenido(data))
      .catch(() => {})
  }, [])

  function cambiarValor(pag, sec, key, val) {
    setContenido(prev => ({
      ...prev,
      [pag]: {
        ...prev[pag],
        [sec]: { ...(prev[pag]?.[sec] || {}), [key]: val },
      },
    }))
  }

  async function subirImagen(pag, sec, key, file) {
    setUploading(`${pag}.${sec}.${key}`)
    setErrorMsg(null)
    try {
      const fd = new FormData()
      fd.append('imagen', file)
      const r = await fetch('/api/contenido/imagen', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      if (!r.ok) throw new Error('Error al subir imagen')
      const { url } = await r.json()
      cambiarValor(pag, sec, key, url)
    } catch (e) {
      setErrorMsg(e.message)
    } finally {
      setUploading(null)
    }
  }

  async function publicar() {
    setGuardando(true)
    setErrorMsg(null)
    try {
      const r = await fetch('/api/contenido', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(contenido),
      })
      if (!r.ok) throw new Error('Error al guardar')
      invalidarContenido()
      setGuardadoOk(true)
      setIframeKey(k => k + 1)
      setTimeout(() => setGuardadoOk(false), 2500)
    } catch (e) {
      setErrorMsg(e.message)
    } finally {
      setGuardando(false)
    }
  }

  const paginaConf = PAGINAS[pagina]

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: '220px',
      right: 0,
      bottom: 0,
      zIndex: 5,
      display: 'flex',
      fontFamily: 'Montserrat, sans-serif',
    }}>
      {/* ── Panel izquierdo — editor ─────────────────────────────────────── */}
      <div style={{
        width: '390px',
        flexShrink: 0,
        background: '#0f1d3e',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Cabecera */}
        <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '6px',
              background: '#0066CC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <i className="bi bi-pencil-square" style={{ color: 'white', fontSize: '0.75rem' }}></i>
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '0.88rem', lineHeight: 1.2 }}>
                Personalizar sitio
              </div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem' }}>
                Editar textos e imágenes
              </div>
            </div>
          </div>

          {/* Pestañas de páginas */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px' }}>
            {Object.entries(PAGINAS).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => { setPagina(key); setSeccion(null) }}
                style={{
                  flex: 1, padding: '6px 4px', fontSize: '0.72rem', fontWeight: 700,
                  border: 'none', borderRadius: '5px', cursor: 'pointer',
                  background: pagina === key ? '#0066CC' : 'transparent',
                  color: pagina === key ? 'white' : 'rgba(255,255,255,0.4)',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de secciones */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '4px' }}>
            Secciones de la página
          </div>
          {Object.entries(paginaConf.secciones).map(([secKey, conf]) => (
            <SeccionPanel
              key={secKey}
              secKey={secKey}
              config={conf}
              isOpen={seccion === secKey}
              onToggle={() => setSeccion(seccion === secKey ? null : secKey)}
              pagina={pagina}
              contenido={contenido}
              onChange={cambiarValor}
              onImageUpload={subirImagen}
              uploading={uploading}
            />
          ))}
        </div>

        {/* Footer — botón Publicar */}
        <div style={{ padding: '14px 14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {errorMsg && (
            <div style={{
              marginBottom: '8px', padding: '7px 10px', borderRadius: '6px',
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171', fontSize: '0.72rem',
            }}>
              <i className="bi bi-exclamation-triangle-fill me-1"></i>{errorMsg}
            </div>
          )}
          <button
            onClick={publicar}
            disabled={guardando}
            style={{
              width: '100%', padding: '11px', borderRadius: '8px', border: 'none',
              background: guardadoOk ? '#16a34a' : '#0066CC',
              color: 'white', fontWeight: 700, cursor: guardando ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              fontSize: '0.88rem', transition: 'background 0.25s', letterSpacing: '0.2px',
            }}
          >
            {guardando ? (
              <><span className="spinner-border spinner-border-sm" style={{ width: '14px', height: '14px' }}></span> Guardando...</>
            ) : guardadoOk ? (
              <><i className="bi bi-check2-circle"></i> ¡Cambios publicados!</>
            ) : (
              <><i className="bi bi-cloud-upload-fill"></i> Publicar cambios</>
            )}
          </button>
          <div style={{ textAlign: 'center', marginTop: '8px', color: 'rgba(255,255,255,0.2)', fontSize: '0.62rem' }}>
            Los cambios se reflejan en el sitio en tiempo real
          </div>
        </div>
      </div>

      {/* ── Panel derecho — preview iframe ───────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#1e293b' }}>
        {/* Barra de herramientas del preview */}
        <div style={{
          height: '42px', flexShrink: 0,
          display: 'flex', alignItems: 'center', padding: '0 16px', gap: '10px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', gap: '5px', marginRight: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></div>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }}></div>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }}></div>
          </div>

          <div style={{
            flex: 1, maxWidth: '420px',
            background: 'rgba(255,255,255,0.06)', borderRadius: '6px',
            padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <i className="bi bi-lock-fill" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem' }}></i>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', fontFamily: 'monospace' }}>
              {window.location.origin}{paginaConf.path}
            </span>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setIframeKey(k => k + 1)}
              title="Recargar preview"
              style={{
                background: 'rgba(255,255,255,0.06)', border: 'none',
                color: 'rgba(255,255,255,0.5)', borderRadius: '5px',
                padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem',
              }}
            >
              <i className="bi bi-arrow-clockwise"></i>
            </button>
            <a
              href={`${window.location.origin}${paginaConf.path}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir en pestaña nueva"
              style={{
                background: 'rgba(255,255,255,0.06)', border: 'none',
                color: 'rgba(255,255,255,0.5)', borderRadius: '5px',
                padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem',
                textDecoration: 'none', display: 'flex', alignItems: 'center',
              }}
            >
              <i className="bi bi-box-arrow-up-right"></i>
            </a>
          </div>
        </div>

        {/* iframe — usa la misma origin que el admin, funciona con Docker o Vite */}
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={`${window.location.origin}${paginaConf.path}`}
          style={{ flex: 1, width: '100%', border: 'none' }}
          title={`Preview — ${paginaConf.label}`}
        />
      </div>
    </div>
  )
}
