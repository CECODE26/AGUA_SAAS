import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAVY  = '#0f1d3e'
const AZUL  = '#0066CC'
const BORDE = '#e3e8ef'

export default function SuperAdminAdmins() {
  const { authFetch } = useAuth()
  const [admins,     setAdmins]     = useState([])
  const [yo,         setYo]         = useState(null)      // mi cuenta (para saber si tengo 2 pasos)
  const [loading,    setLoading]    = useState(true)
  const [procesando, setProcesando] = useState(null)
  const [error,      setError]      = useState('')
  const [ok,         setOk]         = useState('')

  // Paneles por fila
  const [reset,      setReset]      = useState(null)      // { id, nueva, codigo }
  const [borrando,   setBorrando]   = useState(null)      // id pendiente de confirmar
  const [editTel,    setEditTel]    = useState(null)      // { id, telefono }

  async function cargar() {
    const [ra, rm] = await Promise.all([authFetch('/api/superadmin/admins'), authFetch('/api/auth/me')])
    if (ra.ok) setAdmins((await ra.json()).admins || [])
    if (rm.ok) setYo((await rm.json()).admin)
    setLoading(false)
  }

  useEffect(() => {
    cargar()
    const id = setInterval(cargar, 10000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function llamar(url, opts) {
    const res = await authFetch(url, opts)
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setError(d.message || 'No se pudo completar'); setOk(''); return null }
    setError('')
    return d
  }

  async function toggleActivo(admin) {
    setProcesando(admin.id)
    const d = await llamar(`/api/superadmin/admins/${admin.id}/activo`, { method: 'PATCH', body: JSON.stringify({ activo: !admin.activo }) })
    if (d) setAdmins(prev => prev.map(a => a.id === admin.id ? d.admin : a))
    setProcesando(null)
  }

  async function eliminar(admin) {
    setProcesando(admin.id)
    const d = await llamar(`/api/superadmin/admins/${admin.id}`, { method: 'DELETE' })
    if (d) setAdmins(prev => prev.filter(a => a.id !== admin.id))
    setBorrando(null); setProcesando(null)
  }

  async function guardarTelefono() {
    const d = await llamar(`/api/superadmin/admins/${editTel.id}`, { method: 'PATCH', body: JSON.stringify({ telefono: editTel.telefono }) })
    if (d) { setAdmins(prev => prev.map(a => a.id === editTel.id ? d.admin : a)); setEditTel(null); setOk('Celular guardado') }
  }

  async function restablecer() {
    if (!reset.nueva || reset.nueva.length < 6) { setError('La contraseña nueva debe tener al menos 6 caracteres'); return }
    setProcesando(reset.id)
    const d = await llamar(`/api/superadmin/admins/${reset.id}/password`, { method: 'PATCH', body: JSON.stringify({ nueva: reset.nueva, codigo: reset.codigo }) })
    if (d) { setOk(`Contraseña de ${d.admin.username} restablecida`); setReset(null) }
    setProcesando(null)
  }

  const fecha = iso => new Date(iso).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })

  if (loading) return <div className="d-flex justify-content-center py-5"><div className="spinner-border" style={{ color: '#7c3aed' }} /></div>

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-2">
        <div>
          <div style={{ fontSize: 12, letterSpacing: '.14em', color: '#6b7a8c', textTransform: 'uppercase' }}>Administración</div>
          <h3 className="fw-bold mb-1" style={{ color: NAVY }}>Administradores</h3>
          <div className="text-muted small">Activa, desactiva, restablece contraseñas o elimina cuentas. Los nuevos admins se crean al aprobar una solicitud.</div>
        </div>
        <Link to="/admin/cuenta" className="btn btn-sm fw-semibold text-decoration-none" style={{ border: `1px solid ${AZUL}`, color: AZUL }}>
          <i className="bi bi-person-gear me-1"></i>Mi cuenta
        </Link>
      </div>

      {yo && !yo.totpActivo && (
        <div className="rounded-3 px-3 py-2 small d-flex align-items-center gap-2" style={{ background: '#fff4e5', border: '1px solid #f2c063', color: '#7a4a0b' }}>
          <i className="bi bi-shield-exclamation"></i>
          Tu cuenta de superadmin aún no tiene verificación en dos pasos. Actívala en <Link to="/admin/cuenta">Mi cuenta</Link> para que restablecer contraseñas exija tu código.
        </div>
      )}
      {error && <div className="alert alert-danger py-2 small mb-0 d-flex justify-content-between"><span>{error}</span><button className="btn-close btn-sm" onClick={() => setError('')}></button></div>}
      {ok    && <div className="alert alert-success py-2 small mb-0 d-flex justify-content-between"><span>{ok}</span><button className="btn-close btn-sm" onClick={() => setOk('')}></button></div>}

      <div className="bg-white rounded-3 overflow-hidden" style={{ border: `1px solid ${BORDE}` }}>
        {admins.length === 0 ? (
          <div className="text-center text-muted py-5">No hay administradores</div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0" style={{ fontSize: 14 }}>
              <thead style={{ background: '#f8fafc', fontSize: 11, letterSpacing: '.1em', color: '#6b7a8c', textTransform: 'uppercase' }}>
                <tr>
                  <th className="ps-3 fw-medium">Usuario</th>
                  <th className="fw-medium">Celular</th>
                  <th className="fw-medium">Rol</th>
                  <th className="fw-medium">2 pasos</th>
                  <th className="fw-medium">Estado</th>
                  <th className="fw-medium">Creado</th>
                  <th className="pe-3 fw-medium text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {admins.map(a => (
                  <tr key={a.id}>
                    <td className="ps-3 fw-semibold"><i className="bi bi-person-circle me-2 text-muted"></i>{a.username}</td>
                    <td>
                      {editTel?.id === a.id ? (
                        <span className="d-inline-flex gap-1">
                          <input type="tel" className="form-control form-control-sm" style={{ width: 140 }} value={editTel.telefono} autoFocus
                            onChange={e => setEditTel(t => ({ ...t, telefono: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') guardarTelefono(); if (e.key === 'Escape') setEditTel(null) }} />
                          <button className="btn btn-sm btn-success py-0 px-2" onClick={guardarTelefono}><i className="bi bi-check-lg"></i></button>
                          <button className="btn btn-sm btn-outline-secondary py-0 px-2" onClick={() => setEditTel(null)}><i className="bi bi-x-lg"></i></button>
                        </span>
                      ) : (
                        <span role="button" title="Clic para editar" onClick={() => setEditTel({ id: a.id, telefono: a.telefono || '' })}>
                          {a.telefono || <span className="text-muted">— agregar</span>}
                        </span>
                      )}
                    </td>
                    <td>
                      {a.rol === 'superadmin'
                        ? <span className="badge" style={{ background: '#7c3aed' }}><i className="bi bi-shield-lock-fill me-1"></i>Superadmin</span>
                        : <span className="badge bg-secondary">Admin</span>}
                    </td>
                    <td>
                      {a.totpActivo
                        ? <span className="badge bg-success"><i className="bi bi-phone me-1"></i>Activa{a.totpLogin ? ' + login' : ''}</span>
                        : <span className="badge bg-light text-muted border">No</span>}
                    </td>
                    <td><span className={`badge ${a.activo ? 'bg-success' : 'bg-secondary'}`}>{a.activo ? 'Activo' : 'Inactivo'}</span></td>
                    <td className="text-muted" style={{ fontSize: 13 }}>{fecha(a.creadoEn)}</td>
                    <td className="pe-3 text-end">
                      {reset?.id === a.id ? (
                        <div className="d-inline-flex flex-wrap gap-1 justify-content-end align-items-center">
                          <input type="password" className="form-control form-control-sm" style={{ width: 170 }} placeholder="Contraseña nueva" autoFocus
                            value={reset.nueva} onChange={e => setReset(r => ({ ...r, nueva: e.target.value }))} />
                          {yo?.totpActivo && (
                            <input type="text" inputMode="numeric" className="form-control form-control-sm" style={{ width: 110 }} placeholder="Tu código" maxLength={7}
                              value={reset.codigo} onChange={e => setReset(r => ({ ...r, codigo: e.target.value }))} />
                          )}
                          <button className="btn btn-sm text-white fw-semibold" style={{ background: AZUL }} disabled={procesando === a.id} onClick={restablecer}>Restablecer</button>
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => setReset(null)}>Cancelar</button>
                        </div>
                      ) : borrando === a.id ? (
                        <span className="d-inline-flex align-items-center gap-1 small">
                          <span className="text-danger fw-semibold">¿Eliminar a {a.username}?</span>
                          <button className="btn btn-sm btn-danger py-0 px-2" disabled={procesando === a.id} onClick={() => eliminar(a)}>Sí</button>
                          <button className="btn btn-sm btn-outline-secondary py-0 px-2" onClick={() => setBorrando(null)}>No</button>
                        </span>
                      ) : (
                        <div className="d-flex gap-2 justify-content-end">
                          <button className="btn btn-sm btn-outline-primary" title="Restablecer contraseña"
                            onClick={() => { setBorrando(null); setReset({ id: a.id, nueva: '', codigo: '' }) }}>
                            <i className="bi bi-key"></i>
                          </button>
                          {a.rol !== 'superadmin' && (
                            <>
                              <button className={`btn btn-sm ${a.activo ? 'btn-outline-warning' : 'btn-outline-success'}`}
                                onClick={() => toggleActivo(a)} disabled={procesando === a.id} title={a.activo ? 'Desactivar' : 'Activar'}>
                                {procesando === a.id ? <span className="spinner-border spinner-border-sm"></span> : <i className={`bi ${a.activo ? 'bi-pause-circle' : 'bi-play-circle'}`}></i>}
                              </button>
                              <button className="btn btn-sm btn-outline-danger" onClick={() => { setReset(null); setBorrando(a.id) }} disabled={procesando === a.id} title="Eliminar admin">
                                <i className="bi bi-trash3"></i>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
