// Catálogo de la distribuidora · diseño D · Elite
import { useCart } from '../context/CartContext'
import { useContenido } from '../hooks/useContenido'
import SitioLayout, { CabeceraPagina } from '../sitio/SitioLayout'
import { TarjetaProducto, useProductos } from '../sitio/Producto'

export default function Productos() {
  const c = useContenido('productos')?.banner
  return (
    <SitioLayout>
      <CabeceraPagina ceja={c?.ceja || 'Catálogo'} titulo={c?.titulo || 'Elige tu agua,'} destacado={c?.destacado || 'te la llevamos.'}>
        {c?.subtitulo || 'Agrega lo que necesitas a tu pedido y confírmalo con tu dirección de entrega.'}
      </CabeceraPagina>
      <Catalogo />
    </SitioLayout>
  )
}

function Catalogo() {
  const { productos, error } = useProductos()
  const { totalItems, setSidebarOpen } = useCart()

  return (
    <section className="e-seccion e-seccion--honda" aria-label="Productos" style={{ paddingTop: 56 }}>
      <div className="e-contenedor">
        {!productos && <p className="e-lead" role="status">Cargando productos…</p>}
        {error && <p className="e-lead" role="alert">No pudimos cargar el catálogo. Intenta de nuevo en un momento.</p>}
        {productos && !error && productos.length === 0 && <p className="e-lead">Pronto publicaremos nuestros productos.</p>}
        {productos?.length > 0 && (
          <div className="e-productos">{productos.map(p => <TarjetaProducto key={p.id} producto={p} />)}</div>
        )}
        {totalItems > 0 && (
          <div style={{ marginTop: 48, display: 'flex', justifyContent: 'center' }}>
            <button type="button" className="e-cta" onClick={() => setSidebarOpen(true)}>
              Revisar mi pedido ({totalItems})
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
