import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { urlLogo } from '../../context/DistribuidoraContext'

const NAVY  = '#0f1d3e'
const AZUL  = '#0066CC'
const BORDE = '#e3e8ef'

const CAMPOS = [
  { key: 'nombre',      label: 'Nombre comercial',   ayuda: 'Es el nombre que ven tus clientes en el sitio, la app, los correos y los avisos.' },
  { key: 'telefono',    label: 'Teléfono de pedidos', tipo: 'tel' },
  { key: 'whatsapp',    label: 'WhatsApp',            tipo: 'tel' },
  { key: 'emailAvisos', label: 'Correo de avisos',    tipo: 'email', ayuda: 'Aquí llegan los correos de pedidos nuevos y clientes fijos nuevos.' },
  { key: 'ciudad',      label: 'Ciudad' },
  { key: 'provincia',   label: 'Provincia' },
]

export default function SuperAdminDistribuidora() {
  const { authFetch } = useAuth()
  const [form,    setForm]    = useState(null)
  const [extra,   setExtra]   = useState({})
  const [guardando, setGuardando] = useState(false)
  const [error,   setError]   = useState('')
  const [ok,      setOk]      = useState('')

  useEffect(() => {
    authFetch('/api/distribuidora/ajustes').then(async r => {
      const d = await r.json().catch(() => ({}))
      if (!r.ok) return setError(d.message || 'No se pudieron cargar los datos')
      const { slug, dominio, plan, logo, ...editables } = d.distribuidora
      setForm({ ...editables, depositoLat: editables.depositoLat ?? '', depositoLng: editables.depositoLng ?? '' })
      setExtra({ slug, dominio, plan, logo })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const cambiar = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true); setError(''); setOk('')
    const res = await authFetch('/api/distribuidora/ajustes', { method: 'PUT', body: JSON.stringify(form) })
    const d = await res.json().catch(() => ({}))
    setGuardando(false)
    if (!res.ok) return setError(d.message || 'No se pudo guardar')
    setOk('Datos guardados. El sitio y las apps los muestran en menos de un minuto.')
  }

  async function subirLogo(e) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    const fd = new FormData()
    fd.append('logo', archivo)
    const res = await authFetch('/api/distribuidora/logo', { method: 'POST', body: fd })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) return setError(d.message || 'No se pudo subir el logo')
    setExtra(x => ({ ...x, logo: d.distribuidora.logo }))
    setOk('Logo actualizado')
  }

  if (!form && !error) return <div className="d-flex justify-content-center py-5"><div className="spinner-border" style={{ color: '#7c3aed' }} /></div>

  return (
    <div className="d-flex flex-column gap-3" style={{ maxWidth: 820 }}>
      <div>
        <div style={{ fontSize: 12, letterSpacing: '.14em', color: '#6b7a8c', textTransform: 'uppercase' }}>Administración</div>
        <h3 className="fw-bold mb-1" style={{ color: NAVY }}>Mi distribuidora</h3>
        <div className="text-muted small">Nombre, color, logo y datos de contacto que ven tus clientes.</div>
      </div>

      {error && <div className="alert alert-danger py-2 small mb-0 d-flex justify-content-between"><span>{error}</span><button className="btn-close btn-sm" onClick={() => setError('')}></button></div>}
      {ok    && <div className="alert alert-success py-2 small mb-0 d-flex justify-content-between"><span>{ok}</span><button className="btn-close btn-sm" onClick={() => setOk('')}></button></div>}

      {form && (
        <form onSubmit={guardar} className="bg-white rounded-3 p-4 d-flex flex-column gap-3" style={{ border: `1px solid ${BORDE}` }}>
          <div className="row g-3">
            {CAMPOS.map(c => (
              <div className="col-md-6" key={c.key}>
                <label className="form-label small fw-semibold mb-1" htmlFor={`f-${c.key}`}>{c.label}</label>
                <input id={`f-${c.key}`} name={c.key} type={c.tipo || 'text'} className="form-control"
                  value={form[c.key] ?? ''} onChange={cambiar} required={c.key === 'nombre'} />
                {c.ayuda && <div className="form-text">{c.ayuda}</div>}
              </div>
            ))}

            <div className="col-md-6">
              <label className="form-label small fw-semibold mb-1" htmlFor="f-color">Color principal</label>
              <div className="d-flex gap-2">
                <input id="f-color" name="colorPrimario" type="color" className="form-control form-control-color"
                  value={form.colorPrimario || '#0066CC'} onChange={cambiar} />
                <input name="colorPrimario" className="form-control" value={form.colorPrimario || ''} onChange={cambiar} pattern="#[0-9a-fA-F]{6}" aria-label="Color en formato #RRGGBB" />
              </div>
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold mb-1">Depósito (punto de partida de las rutas)</label>
              <div className="d-flex gap-2">
                <input name="depositoLat" className="form-control" placeholder="Latitud" value={form.depositoLat} onChange={cambiar} inputMode="decimal" aria-label="Latitud del depósito" />
                <input name="depositoLng" className="form-control" placeholder="Longitud" value={form.depositoLng} onChange={cambiar} inputMode="decimal" aria-label="Longitud del depósito" />
              </div>
              <div className="form-text">Si lo dejas vacío, las rutas automáticas salen del centro de los pedidos.</div>
            </div>
          </div>

          <div className="d-flex justify-content-end">
            <button type="submit" className="btn fw-semibold text-white" style={{ background: AZUL }} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-3 p-4 d-flex flex-wrap align-items-center gap-3" style={{ border: `1px solid ${BORDE}` }}>
        <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: 88, height: 88, background: '#f8fafc', border: `1px solid ${BORDE}` }}>
          {extra.logo
            ? <img src={urlLogo(extra.logo)} alt="Logo actual" style={{ maxWidth: 80, maxHeight: 80 }} />
            : <i className="bi bi-image text-muted" style={{ fontSize: 28 }}></i>}
        </div>
        <div className="flex-grow-1">
          <div className="fw-semibold">Logo</div>
          <div className="text-muted small">PNG, JPG o WEBP de hasta 2 MB.</div>
        </div>
        <label className="btn btn-sm fw-semibold mb-0" style={{ border: `1px solid ${AZUL}`, color: AZUL }}>
          <i className="bi bi-upload me-1"></i>Subir logo
          <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={subirLogo} />
        </label>
      </div>

      <div className="rounded-3 p-3 small text-muted" style={{ background: '#f8fafc', border: `1px solid ${BORDE}` }}>
        Identificador: <b>{extra.slug}</b>
        {extra.dominio && <> · Dominio: <b>{extra.dominio}</b></>}
        {' '}· Plan: <b>{extra.plan}</b>. Para cambiarlos, escribe al equipo de Agua Elite.
      </div>
    </div>
  )
}
