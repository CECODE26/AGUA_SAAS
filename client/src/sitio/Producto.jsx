import { useEffect, useState } from 'react'
import { useCart } from '../context/CartContext'
import { apiUrl } from '../lib/api'
import { BidonChico } from './Piezas'

// Catálogo activo de la distribuidora
export function useProductos() {
  const [estado, setEstado] = useState({ productos: null, error: false })
  useEffect(() => {
    let vivo = true
    fetch(apiUrl('/api/productos'))
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => vivo && setEstado({ productos: d.productos || [], error: false }))
      .catch(() => vivo && setEstado({ productos: [], error: true }))
    return () => { vivo = false }
  }, [])
  return estado
}

export function TarjetaProducto({ producto }) {
  const { addItem } = useCart()
  const agotado = producto.stock === 0
  const precio = Number(producto.precio)

  return (
    <article className="e-vidrio e-producto">
      <div className="e-producto-img">
        {producto.imagen
          ? <img src={apiUrl(`/uploads/${producto.imagen}`)} alt="" loading="lazy" />
          : <BidonChico />}
      </div>
      {agotado
        ? <span className="e-etiqueta e-etiqueta--agotado">Agotado</span>
        : producto.tag && <span className="e-etiqueta">{producto.tag}</span>}
      <h3>{producto.nombre}</h3>
      {producto.descripcion && <p className="e-producto-desc">{producto.descripcion}</p>}
      <div className="e-producto-pie">
        <p className="e-precio">${precio.toFixed(2)}<small>por unidad</small></p>
        <button type="button" className="e-cta e-cta--chica" disabled={agotado}
          onClick={() => addItem({ nombre: producto.nombre, precio: `$${precio.toFixed(2)}` })}
          aria-label={`Agregar ${producto.nombre} a mi pedido`}>
          <i className="bi bi-plus-lg" aria-hidden="true"></i>Agregar
        </button>
      </div>
    </article>
  )
}
