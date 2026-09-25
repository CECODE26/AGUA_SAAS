// Contacto de la distribuidora · diseño D · Elite
import { useState } from 'react'
import { useDistribuidora, numeroWhatsapp } from '../context/DistribuidoraContext'
import { apiUrl } from '../lib/api'
import SitioLayout, { CabeceraPagina } from '../sitio/SitioLayout'

export default function Contacto() {
  const { distribuidora, nombre } = useDistribuidora()
  const telefono = distribuidora?.telefono
  const whatsapp = numeroWhatsapp(distribuidora?.whatsapp)
  const lugar = [distribuidora?.ciudad, distribuidora?.provincia].filter(Boolean).join(', ')
  const mapa = distribuidora?.depositoLat != null && distribuidora?.depositoLng != null
    ? `${distribuidora.depositoLat},${distribuidora.depositoLng}`
    : lugar

  return (
    <SitioLayout>
      <CabeceraPagina ceja="Contacto" titulo="Estamos para" destacado="servirte.">
        Pedidos grandes, sugerencias o dudas: escríbenos por el canal que prefieras.
      </CabeceraPagina>

      {(telefono || whatsapp || lugar) && (
        <section className="e-seccion e-seccion--honda" aria-label="Canales de contacto" style={{ paddingTop: 56, paddingBottom: 56 }}>
          <div className="e-contenedor e-pasos-grandes">
            {whatsapp && (
              <div className="e-vidrio e-paso-grande">
                <span className="e-icono-redondo"><i className="bi bi-whatsapp" aria-hidden="true"></i></span>
                <h2 style={{ fontSize: 28 }}>WhatsApp</h2>
                <p>Escríbenos y te respondemos.</p>
                <a className="e-cta e-cta--chica" style={{ alignSelf: 'flex-start' }} href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
                  {distribuidora.whatsapp}
                </a>
              </div>
            )}
            {telefono && (
              <div className="e-vidrio e-paso-grande">
                <span className="e-icono-redondo"><i className="bi bi-telephone" aria-hidden="true"></i></span>
                <h2 style={{ fontSize: 28 }}>Teléfono</h2>
                <p>Para pedidos y consultas.</p>
                <a className="e-boton-vidrio" style={{ alignSelf: 'flex-start' }} href={`tel:${telefono.replace(/\s/g, '')}`}>{telefono}</a>
              </div>
            )}
            {lugar && (
              <div className="e-vidrio e-paso-grande">
                <span className="e-icono-redondo"><i className="bi bi-geo-alt" aria-hidden="true"></i></span>
                <h2 style={{ fontSize: 28 }}>Dónde estamos</h2>
                <p>{nombre} · {lugar}</p>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="e-papel">
        <div className="e-contenedor" style={{ display: 'grid', gap: 40, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', alignItems: 'start' }}>
          <Formulario />
          {mapa && (
            <div className="rounded-4 overflow-hidden" style={{ height: 420, boxShadow: '0 6px 24px rgba(15,29,62,.12)' }}>
              <iframe
                title={`Ubicación de ${nombre}`}
                width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen
                src={`https://maps.google.com/maps?q=${encodeURIComponent(mapa)}&hl=es&z=14&output=embed`}
              />
            </div>
          )}
        </div>
      </section>
    </SitioLayout>
  )
}

function Formulario() {
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
    <div className="bg-white rounded-4 p-4 p-md-5" style={{ boxShadow: '0 10px 40px rgba(15,29,62,.08)' }}>
      <h2 style={{ fontSize: 32, marginBottom: 24 }}>Envíanos un mensaje</h2>
      <div aria-live="polite">
        {estado.ok && <div className="alert alert-success py-2">¡Gracias! Recibimos tu mensaje.</div>}
        {estado.error && <div className="alert alert-danger py-2">{estado.error}</div>}
      </div>
      <form onSubmit={enviar}>
        <div className="row g-3">
          <div className="col-12">
            <label htmlFor="c-nombre" className="form-label small fw-semibold">Nombre y apellido</label>
            <input id="c-nombre" name="nombre" value={form.nombre} onChange={cambiar} required type="text" className="form-control" autoComplete="name" />
          </div>
          <div className="col-sm-6">
            <label htmlFor="c-email" className="form-label small fw-semibold">Correo electrónico</label>
            <input id="c-email" name="email" value={form.email} onChange={cambiar} required type="email" className="form-control" autoComplete="email" />
          </div>
          <div className="col-sm-6">
            <label htmlFor="c-tel" className="form-label small fw-semibold">Teléfono (opcional)</label>
            <input id="c-tel" name="telefono" value={form.telefono} onChange={cambiar} type="tel" className="form-control" autoComplete="tel" />
          </div>
          <div className="col-12">
            <label htmlFor="c-msg" className="form-label small fw-semibold">Mensaje</label>
            <textarea id="c-msg" name="mensaje" value={form.mensaje} onChange={cambiar} required className="form-control" rows="5"></textarea>
          </div>
          <div className="col-12">
            <div className="form-check">
              <input name="acepta" checked={form.acepta} onChange={cambiar} type="checkbox" className="form-check-input" id="privacyCheck" />
              <label className="form-check-label small" htmlFor="privacyCheck">
                Acepto la <a href="/privacidad">política de privacidad</a>
              </label>
            </div>
          </div>
          <div className="col-12">
            <button type="submit" disabled={estado.enviando} className="btn w-100 py-2 fw-semibold text-white" style={{ background: '#1741A8', borderRadius: 999, minHeight: 48 }}>
              {estado.enviando ? 'Enviando…' : 'Enviar mensaje'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
