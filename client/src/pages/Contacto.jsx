import { useState } from 'react'
import { useDistribuidora, numeroWhatsapp } from '../context/DistribuidoraContext'
import { apiUrl } from '../lib/api'

const TARJETA = { borderRadius: 18, boxShadow: '0 6px 24px rgba(0,102,204,0.10)' }

export default function Contacto() {
  const { distribuidora, nombre } = useDistribuidora()
  const telefono = distribuidora?.telefono
  const whatsapp = numeroWhatsapp(distribuidora?.whatsapp)
  const lugar = [distribuidora?.ciudad, distribuidora?.provincia].filter(Boolean).join(', ')
  const mapa = distribuidora?.depositoLat != null && distribuidora?.depositoLng != null
    ? `${distribuidora.depositoLat},${distribuidora.depositoLng}`
    : lugar

  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', mensaje: '', acepta: false })
  const [estado, setEstado] = useState({ enviando: false, ok: false, error: '' })
  const cambiar = e => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  async function enviar(e) {
    e.preventDefault()
    if (!form.acepta) return setEstado({ enviando: false, ok: false, error: 'Acepta la política de privacidad para enviar el mensaje.' })
    setEstado({ enviando: true, ok: false, error: '' })
    try {
      const res = await fetch(apiUrl('/api/contacto'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: form.nombre, email: form.email, telefono: form.telefono, mensaje: form.mensaje }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'No se pudo enviar el mensaje')
      setForm({ nombre: '', email: '', telefono: '', mensaje: '', acepta: false })
      setEstado({ enviando: false, ok: true, error: '' })
    } catch (err) {
      setEstado({ enviando: false, ok: false, error: err.message })
    }
  }

  return (
    <div style={{ paddingTop: '90px' }}>
      {/* Banner */}
      <div className="py-5" style={{ background: 'linear-gradient(135deg, #0066CC 0%, #004fa3 100%)' }}>
        <div className="container text-white text-center py-3">
          <p style={{ letterSpacing: '4px', fontSize: '0.8rem', fontWeight: 700, opacity: 0.8 }}>ESTAMOS PARA SERVIRTE</p>
          <h1 className="section-heading text-white mb-2">CONTÁCTANOS</h1>
          <p className="mb-0 opacity-75">Pedidos, sugerencias o simplemente salúdanos</p>
        </div>
      </div>

      <div className="container py-5">

        {/* Tarjetas de contacto rápido */}
        {(telefono || whatsapp) && (
          <div className="row g-4 mb-5 justify-content-center">
            {telefono && (
              <div className="col-md-4">
                <div className="card border-0 h-100 text-center p-4" style={TARJETA}>
                  <div className="mb-3" style={{ fontSize: '2.4rem' }}>📞</div>
                  <h5 className="fw-bold mb-1" style={{ color: '#0066CC' }}>Pedidos por teléfono</h5>
                  <p className="text-muted small mb-3">{lugar || 'Llámanos'}</p>
                  <a href={`tel:${telefono.replace(/\s/g, '')}`} className="btn btn-verde fw-bold w-100">
                    <i className="bi bi-telephone-fill me-2"></i>{telefono}
                  </a>
                </div>
              </div>
            )}
            {whatsapp && (
              <div className="col-md-4">
                <div className="card border-0 h-100 text-center p-4" style={TARJETA}>
                  <div className="mb-3" style={{ fontSize: '2.4rem' }}>💬</div>
                  <h5 className="fw-bold mb-1" style={{ color: '#0066CC' }}>WhatsApp</h5>
                  <p className="text-muted small mb-3">Escríbenos y te respondemos</p>
                  <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="btn btn-verde fw-bold w-100">
                    <i className="bi bi-whatsapp me-2"></i>{distribuidora.whatsapp}
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dirección + Formulario */}
        <div className="row g-5 mb-5">
          <div className="col-md-5">
            <p style={{ color: '#0066CC', letterSpacing: '3px', fontSize: '0.8rem', fontWeight: 700 }}>DÓNDE ENCONTRARNOS</p>
            <h4 className="fw-bold mb-4">{nombre}</h4>
            {lugar && (
              <div className="d-flex align-items-start mb-4">
                <i className="bi bi-geo-alt-fill me-3 fs-4 text-verde"></i>
                <div>
                  <b>Ciudad</b>
                  <p className="mb-0 text-muted small">{lugar}</p>
                </div>
              </div>
            )}
            <div className="d-flex align-items-start mb-4">
              <i className="bi bi-truck me-3 fs-4 text-verde"></i>
              <div>
                <b>Entregas a domicilio</b>
                <p className="mb-0 text-muted small">Haz tu pedido en línea y síguelo desde "Mis pedidos".</p>
              </div>
            </div>
          </div>

          <div className="col-md-7">
            <div className="card border-0 p-4" style={{ boxShadow: '0 10px 40px rgba(0,102,204,0.1)', borderRadius: '16px' }}>
              <h5 className="fw-bold mb-4">Envíanos un mensaje</h5>
              {estado.ok && <div className="alert alert-success py-2">¡Gracias! Recibimos tu mensaje.</div>}
              {estado.error && <div className="alert alert-danger py-2">{estado.error}</div>}
              <form onSubmit={enviar}>
                <div className="row g-3">
                  <div className="col-12">
                    <input name="nombre" value={form.nombre} onChange={cambiar} required type="text" className="form-control" placeholder="Nombre y apellido" />
                  </div>
                  <div className="col-sm-6">
                    <input name="email" value={form.email} onChange={cambiar} required type="email" className="form-control" placeholder="Correo electrónico" />
                  </div>
                  <div className="col-sm-6">
                    <input name="telefono" value={form.telefono} onChange={cambiar} type="tel" className="form-control" placeholder="Número de teléfono" />
                  </div>
                  <div className="col-12">
                    <textarea name="mensaje" value={form.mensaje} onChange={cambiar} required className="form-control" rows="4" placeholder="Tu mensaje..."></textarea>
                  </div>
                  <div className="col-12">
                    <div className="form-check">
                      <input name="acepta" checked={form.acepta} onChange={cambiar} type="checkbox" className="form-check-input" id="privacyCheck" />
                      <label className="form-check-label small" htmlFor="privacyCheck">
                        Acepto la <a href="/lopdp" className="text-verde">política de privacidad</a>
                      </label>
                    </div>
                  </div>
                  <div className="col-12">
                    <button type="submit" disabled={estado.enviando} className="btn btn-verde w-100 py-2 fw-bold">
                      <i className="bi bi-send-fill me-2"></i>{estado.enviando ? 'Enviando…' : 'Enviar mensaje'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Mapa */}
        {mapa && (
          <div className="rounded-4 overflow-hidden mb-5" style={{ height: 380, boxShadow: '0 6px 24px rgba(0,0,0,0.1)' }}>
            <iframe
              title={`Ubicación de ${nombre}`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              src={`https://maps.google.com/maps?q=${encodeURIComponent(mapa)}&hl=es&z=14&output=embed`}
            />
          </div>
        )}

      </div>
    </div>
  )
}
