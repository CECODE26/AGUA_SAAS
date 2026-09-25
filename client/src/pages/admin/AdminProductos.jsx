import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'

const FORM_INIT = { nombre: '', descripcion: '', precio: '', stock: '', tag: '' }

function ImagenProducto({ imagen, nombre }) {
  if (!imagen) return (
    <div className="rounded-3 d-flex align-items-center justify-content-center"
      style={{ width: '42px', height: '42px', background: '#e8f0fd', flexShrink: 0 }}>
      <i className="bi bi-droplet-fill" style={{ color: '#0066CC' }}></i>
    </div>
  )
  return (
    <img src={`/uploads/${imagen}`} alt={nombre}
      style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />
  )
}

function stockColor(stock) {
  if (stock === 0)  return { bg: '#f8d7da', color: '#842029' }
  if (stock <= 20)  return { bg: '#fff3cd', color: '#664d03' }
  return { bg: '#cddcf8', color: '#0a1845' }
}

function stockLabel(stock) {
  if (stock === 0)  return 'Agotado'
  if (stock <= 20)  return 'Stock bajo'
  return 'Disponible'
}

export default function AdminProductos() {
  const { authFetch } = useAuth()
  const [productos, setProductos] = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null)   // null | 'nuevo' | producto
  const [form, setForm]           = useState(FORM_INIT)
  const [imagenFile, setImagenFile] = useState(null)
  const [imagenPreview, setImagenPreview] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null) // id a eliminar
  const [reordenando, setReordenando] = useState(false)
  const [errorOrden, setErrorOrden] = useState('')
  const reordenandoRef = useRef(false)
  const ordenVersionRef = useRef(0)

  const cargar = useCallback(async () => {
    const ordenVersion = ordenVersionRef.current
    const res  = await authFetch('/api/productos?all=true')
    const data = await res.json()
    if (ordenVersion === ordenVersionRef.current && !reordenandoRef.current) {
      setProductos(data.productos || [])
    }
    setLoading(false)
  }, [authFetch])

  async function toggleActivo(prod) {
    const res = await authFetch(`/api/productos/${prod.id}/toggle`, { method: 'PATCH' })
    if (res.ok) {
      setProductos(prev => prev.map(p => p.id === prod.id ? { ...p, activo: !p.activo } : p))
    }
  }

  useEffect(() => {
    cargar()
    const id = setInterval(cargar, 5000)
    return () => clearInterval(id)
  }, [cargar])

  // Abrir modal nuevo
  function abrirNuevo() {
    setForm(FORM_INIT)
    setImagenFile(null)
    setImagenPreview(null)
    setError('')
    setModal('nuevo')
  }

  // Abrir modal edición
  function abrirEditar(prod) {
    setForm({
      nombre:      prod.nombre,
      descripcion: prod.descripcion,
      precio:      prod.precio,
      stock:       prod.stock,
      tag:         prod.tag || '',
    })
    setImagenFile(null)
    setImagenPreview(prod.imagen ? `/uploads/${prod.imagen}` : null)
    setError('')
    setModal(prod)
  }

  function handleImagenChange(e) {
    const file = e.target.files[0]
    if (!file) return

    const ext   = (file.name.split('.').pop() || '').toLowerCase()
    const extOk = ['jpg', 'jpeg', 'png', 'webp'].includes(ext)
    const tipoOk = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    if (!tipoOk && !extOk) {
      setError('Formato no válido. Usa JPG, PNG o WEBP. Las fotos HEIC del iPhone no funcionan: expórtala como JPG o tómale una captura de pantalla.')
      e.target.value = ''
      return
    }

    const MAX_MB = 5
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)} MB y el máximo es ${MAX_MB} MB. Reduce su tamaño e inténtalo de nuevo.`)
      e.target.value = ''
      return
    }

    setError('')
    setImagenFile(file)
    setImagenPreview(URL.createObjectURL(file))
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleGuardar(e) {
    e.preventDefault()
    setGuardando(true)
    setError('')
    try {
      const body = {
        nombre:      form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        precio:      parseFloat(form.precio),
        stock:       parseInt(form.stock),
        tag:         form.tag.trim() || null,
      }
      const esNuevo = modal === 'nuevo'
      const res = await authFetch(
        esNuevo ? '/api/productos' : `/api/productos/${modal.id}`,
        { method: esNuevo ? 'POST' : 'PUT', body: JSON.stringify(body) }
      )
      if (!res.ok) throw new Error()
      const data = await res.json()

      // Subir imagen si se seleccionó una
      if (imagenFile && data.producto?.id) {
        const fd = new FormData()
        fd.append('imagen', imagenFile)
        const resImg = await authFetch(`/api/uploads/producto/${data.producto.id}`, {
          method: 'POST',
          body: fd,
        })
        if (!resImg.ok) {
          const errImg = await resImg.json().catch(() => ({}))
          await cargar()
          setImagenFile(null)
          setImagenPreview(null)
          setError(errImg.message || 'El producto se guardó, pero la imagen no se pudo subir. Debe ser JPG, PNG o WEBP y pesar menos de 5 MB.')
          return   // deja el modal abierto para que puedas reintentar la imagen
        }
      }

      await cargar()
      setModal(null)
    } catch {
      setError('Error al guardar. Intenta nuevamente.')
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar(id) {
    await authFetch(`/api/productos/${id}`, { method: 'DELETE' })
    setConfirmDelete(null)
    await cargar()
  }

  // Ajuste rápido de stock (+/-)
  async function ajustarStock(prod, delta) {
    const nuevoStock = Math.max(0, prod.stock + delta)
    await authFetch(`/api/productos/${prod.id}`, {
      method: 'PUT',
      body: JSON.stringify({ stock: nuevoStock }),
    })
    setProductos(prev => prev.map(p => p.id === prod.id ? { ...p, stock: nuevoStock } : p))
  }

  async function moverProducto(indice, desplazamiento) {
    if (reordenandoRef.current) return

    const nuevoIndice = indice + desplazamiento
    if (nuevoIndice < 0 || nuevoIndice >= productos.length) return

    const listaAnterior = productos
    const nuevaLista = [...productos]
    const [productoMovido] = nuevaLista.splice(indice, 1)
    nuevaLista.splice(nuevoIndice, 0, productoMovido)

    reordenandoRef.current = true
    ordenVersionRef.current += 1
    setReordenando(true)
    setErrorOrden('')
    setProductos(nuevaLista)

    try {
      const res = await authFetch('/api/productos/reordenar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: nuevaLista.map(p => p.id) }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || data.error || 'No se pudo guardar el nuevo orden de los productos.')
      }
    } catch (err) {
      setProductos(listaAnterior)
      setErrorOrden(err.message || 'No se pudo guardar el nuevo orden de los productos.')
    } finally {
      ordenVersionRef.current += 1
      reordenandoRef.current = false
      setReordenando(false)
    }
  }

  const totalUnidades = productos.reduce((s, p) => s + p.stock, 0)
  const agotados      = productos.filter(p => p.stock === 0).length
  const stockBajo     = productos.filter(p => p.stock > 0 && p.stock <= 20).length

  return (
    <>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-2">
        <div>
          <h5 className="fw-bold mb-0">Inventario de Productos</h5>
          <p className="text-muted small mb-0">
            {productos.length} producto(s) · {totalUnidades} unidades en total
            {agotados > 0 && <span className="ms-2 text-danger fw-semibold">· {agotados} agotado(s)</span>}
            {stockBajo > 0 && <span className="ms-2 fw-semibold" style={{ color: '#664d03' }}>· {stockBajo} con stock bajo</span>}
          </p>
        </div>
        <button className="btn btn-sm fw-semibold text-white" style={{ background: '#0066CC' }} onClick={abrirNuevo}>
          <i className="bi bi-plus-lg me-1"></i>Nuevo producto
        </button>
      </div>

      {/* Stat cards rápidas */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total unidades', value: totalUnidades, icon: 'bi-boxes',         color: '#0066CC' },
          { label: 'Agotados',       value: agotados,      icon: 'bi-x-circle',      color: '#dc3545' },
          { label: 'Stock bajo',     value: stockBajo,     icon: 'bi-exclamation-triangle', color: '#fd7e14' },
          { label: 'Productos',      value: productos.length, icon: 'bi-droplet-fill', color: '#0d6efd' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="col-6 col-md-3">
            <div className="bg-white rounded-4 p-3 shadow-sm d-flex align-items-center gap-3">
              <div className="rounded-3 d-flex align-items-center justify-content-center"
                style={{ width: '42px', height: '42px', background: `${color}18` }}>
                <i className={`bi ${icon}`} style={{ color, fontSize: '1.2rem' }}></i>
              </div>
              <div>
                <div className="fw-bold fs-5 lh-1">{value}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>{label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {errorOrden && (
        <div className="alert alert-danger py-2 small" role="alert">
          {errorOrden}
        </div>
      )}

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border" style={{ color: '#0066CC' }} />
        </div>
      ) : (
        <>
        {/* ── Tabla escritorio ── */}
        <div className="bg-white rounded-4 shadow-sm overflow-hidden d-none d-md-block">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead style={{ background: '#f8f9fa', fontSize: '0.78rem' }}>
                <tr className="text-muted">
                  <th className="px-4 py-3">Producto</th>
                  <th className="py-3">Precio</th>
                  <th className="py-3">Stock</th>
                  <th className="py-3">Ajuste rápido</th>
                  <th className="py-3">Visible</th>
                  <th className="py-3">Estado</th>
                  <th className="py-3">Etiqueta</th>
                  <th className="py-3">Orden</th>
                  <th className="py-3 text-end pe-4">Acciones</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.85rem' }}>
                {productos.map((prod, index) => {
                  const sc = stockColor(prod.stock)
                  return (
                    <tr key={prod.id} style={{ opacity: prod.activo ? 1 : 0.5 }}>
                      <td className="px-4">
                        <div className="d-flex align-items-center gap-2">
                          <ImagenProducto imagen={prod.imagen} nombre={prod.nombre} />
                          <div>
                            <div className="fw-semibold">{prod.nombre}</div>
                            <div className="text-muted small" style={{ maxWidth: '200px' }}>{prod.descripcion}</div>
                          </div>
                        </div>
                      </td>
                      <td className="fw-bold" style={{ color: '#0066CC' }}>
                        ${parseFloat(prod.precio).toFixed(2)}
                      </td>
                      <td>
                        <span className="fw-bold" style={{ fontSize: '1rem' }}>{prod.stock}</span>
                        <span className="text-muted small ms-1">und.</span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-1">
                          <button className="btn btn-sm border"
                            style={{ width: '28px', height: '28px', padding: 0, lineHeight: 1 }}
                            onClick={() => ajustarStock(prod, -1)} disabled={prod.stock === 0}>
                            <i className="bi bi-dash" style={{ fontSize: '0.85rem' }}></i>
                          </button>
                          <button className="btn btn-sm border"
                            style={{ width: '28px', height: '28px', padding: 0, lineHeight: 1 }}
                            onClick={() => ajustarStock(prod, +1)}>
                            <i className="bi bi-plus" style={{ fontSize: '0.85rem' }}></i>
                          </button>
                          <button className="btn btn-sm border ms-1"
                            style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                            onClick={() => ajustarStock(prod, +50)}>
                            +50
                          </button>
                          <button className="btn btn-sm border"
                            style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                            onClick={() => ajustarStock(prod, +100)}>
                            +100
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="form-check form-switch mb-0">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            checked={prod.activo}
                            onChange={() => toggleActivo(prod)}
                            style={{ cursor: 'pointer', width: '2.2em', height: '1.2em' }}
                          />
                        </div>
                      </td>
                      <td>
                        <span className="badge rounded-pill px-2"
                          style={{ background: sc.bg, color: sc.color, fontWeight: 600 }}>
                          {stockLabel(prod.stock)}
                        </span>
                      </td>
                      <td>
                        {prod.tag
                          ? <span className="badge rounded-pill px-2" style={{ background: '#e8f0fd', color: '#0066CC' }}>{prod.tag}</span>
                          : <span className="text-muted">—</span>
                        }
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-1">
                          <button type="button" className="btn btn-sm btn-outline-secondary"
                            title="Subir producto" aria-label="Subir producto"
                            onClick={() => moverProducto(index, -1)}
                            disabled={index === 0 || reordenando}>
                            <i className="bi bi-arrow-up"></i>
                          </button>
                          <button type="button" className="btn btn-sm btn-outline-secondary"
                            title="Bajar producto" aria-label="Bajar producto"
                            onClick={() => moverProducto(index, 1)}
                            disabled={index === productos.length - 1 || reordenando}>
                            <i className="bi bi-arrow-down"></i>
                          </button>
                        </div>
                      </td>
                      <td className="text-end pe-4">
                        <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => abrirEditar(prod)}>
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => setConfirmDelete(prod.id)}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Tarjetas móvil ── */}
        <div className="d-md-none">
          {productos.map((prod, index) => {
            const sc = stockColor(prod.stock)
            return (
              <div key={prod.id} className="bg-white rounded-4 shadow-sm p-3 mb-3" style={{ opacity: prod.activo ? 1 : 0.5 }}>
                <div className="d-flex justify-content-between align-items-start mb-1">
                  <div>
                    <div className="fw-bold">{prod.nombre}</div>
                    <div className="text-muted small">{prod.descripcion}</div>
                  </div>
                  <div className="d-flex align-items-center gap-2 ms-2">
                    <div className="btn-group" role="group" aria-label="Orden del producto">
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        title="Subir producto" aria-label="Subir producto"
                        onClick={() => moverProducto(index, -1)}
                        disabled={index === 0 || reordenando}>
                        <i className="bi bi-arrow-up"></i>
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary"
                        title="Bajar producto" aria-label="Bajar producto"
                        onClick={() => moverProducto(index, 1)}
                        disabled={index === productos.length - 1 || reordenando}>
                        <i className="bi bi-arrow-down"></i>
                      </button>
                    </div>
                    <div className="form-check form-switch mb-0">
                      <input className="form-check-input" type="checkbox" role="switch"
                        checked={prod.activo} onChange={() => toggleActivo(prod)}
                        style={{ cursor: 'pointer', width: '2.2em', height: '1.2em' }} />
                    </div>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => abrirEditar(prod)}>
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => setConfirmDelete(prod.id)}>
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2 my-2 flex-wrap">
                  <span className="fw-bold" style={{ color: '#0066CC', fontSize: '1.1rem' }}>${parseFloat(prod.precio).toFixed(2)}</span>
                  <span className="badge rounded-pill px-2" style={{ background: sc.bg, color: sc.color }}>{stockLabel(prod.stock)}</span>
                  {prod.tag && <span className="badge rounded-pill px-2" style={{ background: '#e8f0fd', color: '#0066CC' }}>{prod.tag}</span>}
                </div>

                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span className="fw-bold" style={{ fontSize: '1rem' }}>{prod.stock}</span>
                  <span className="text-muted small me-2">unidades</span>
                  <button className="btn btn-sm border" style={{ width: '30px', height: '30px', padding: 0 }}
                    onClick={() => ajustarStock(prod, -1)} disabled={prod.stock === 0}>
                    <i className="bi bi-dash"></i>
                  </button>
                  <button className="btn btn-sm border" style={{ width: '30px', height: '30px', padding: 0 }}
                    onClick={() => ajustarStock(prod, +1)}>
                    <i className="bi bi-plus"></i>
                  </button>
                  <button className="btn btn-sm border" style={{ fontSize: '0.72rem', padding: '2px 10px' }}
                    onClick={() => ajustarStock(prod, +50)}>+50</button>
                  <button className="btn btn-sm border" style={{ fontSize: '0.72rem', padding: '2px 10px' }}
                    onClick={() => ajustarStock(prod, +100)}>+100</button>
                </div>
              </div>
            )
          })}
        </div>
        </>
      )}

      {/* ── Modal crear / editar ─────────────────────────────────── */}
      {modal !== null && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ zIndex: 1060, background: 'rgba(0,0,0,0.45)' }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="bg-white rounded-4 p-4 shadow-lg" style={{ width: '100%', maxWidth: '460px' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h6 className="fw-bold mb-0">{modal === 'nuevo' ? 'Nuevo producto' : `Editar — ${modal.nombre}`}</h6>
              <button className="btn-close" onClick={() => setModal(null)}></button>
            </div>

            <form onSubmit={handleGuardar}>
              <div className="mb-3">
                <label className="form-label small fw-bold">Nombre *</label>
                <input name="nombre" className="form-control" value={form.nombre}
                  onChange={handleChange} required placeholder="Bidón 20L" />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-bold">Descripción</label>
                <textarea name="descripcion" className="form-control" rows="2"
                  value={form.descripcion} onChange={handleChange}
                  placeholder="Descripción breve del producto..." />
              </div>
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-bold">Precio (USD) *</label>
                  <div className="input-group">
                    <span className="input-group-text">$</span>
                    <input name="precio" type="number" step="0.01" min="0" className="form-control"
                      value={form.precio} onChange={handleChange} required placeholder="0.00" />
                  </div>
                </div>
                <div className="col-6">
                  <label className="form-label small fw-bold">Stock (unidades) *</label>
                  <input name="stock" type="number" min="0" className="form-control"
                    value={form.stock} onChange={handleChange} required placeholder="0" />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-bold">Etiqueta destacada</label>
                <input name="tag" className="form-control" value={form.tag}
                  onChange={handleChange} placeholder="Más popular, Mejor valor... (opcional)" />
              </div>

              {/* Imagen */}
              <div className="mb-4">
                <label className="form-label small fw-bold">Imagen del producto</label>
                <div className="d-flex align-items-center gap-3">
                  {imagenPreview ? (
                    <img src={imagenPreview} alt="preview"
                      style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '10px', border: '2px solid #e8f0fd' }} />
                  ) : (
                    <div className="rounded-3 d-flex align-items-center justify-content-center"
                      style={{ width: '72px', height: '72px', background: '#e8f0fd', flexShrink: 0 }}>
                      <i className="bi bi-image" style={{ color: '#0066CC', fontSize: '1.8rem' }}></i>
                    </div>
                  )}
                  <div className="flex-grow-1">
                    <input type="file" accept="image/jpeg,image/png,image/webp"
                      className="form-control form-control-sm"
                      onChange={handleImagenChange} />
                    <div className="text-muted mt-1" style={{ fontSize: '0.72rem' }}>JPG, PNG o WEBP · máx. 5 MB</div>
                  </div>
                </div>
              </div>

              {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

              <div className="d-flex gap-2 justify-content-end">
                <button type="button" className="btn btn-outline-secondary btn-sm px-4"
                  onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-sm px-4 fw-bold text-white"
                  style={{ background: '#0066CC' }} disabled={guardando}>
                  {guardando
                    ? <span className="spinner-border spinner-border-sm me-1"></span>
                    : <i className="bi bi-check-lg me-1"></i>
                  }
                  {modal === 'nuevo' ? 'Crear producto' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal confirmar eliminación ──────────────────────────── */}
      {confirmDelete !== null && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ zIndex: 1070, background: 'rgba(0,0,0,0.45)' }}>
          <div className="bg-white rounded-4 p-4 shadow-lg text-center" style={{ maxWidth: '360px', width: '90%' }}>
            <div style={{ fontSize: '2.5rem' }}>🗑️</div>
            <h6 className="fw-bold mt-2 mb-1">¿Eliminar este producto?</h6>
            <p className="text-muted small mb-4">Esta acción no se puede deshacer.</p>
            <div className="d-flex gap-2 justify-content-center">
              <button className="btn btn-outline-secondary btn-sm px-4"
                onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn btn-danger btn-sm px-4"
                onClick={() => handleEliminar(confirmDelete)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
