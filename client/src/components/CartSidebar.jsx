import { useState } from 'react'
import { useCart } from '../context/CartContext'
import CheckoutModal from './CheckoutModal'

export default function CartSidebar() {
  const { items, total, totalItems, sidebarOpen, setSidebarOpen, removeItem, updateCantidad } = useCart()
  const [showCheckout, setShowCheckout] = useState(false)

  return (
    <>
      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ zIndex: 1040, background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className="position-fixed top-0 end-0 h-100 bg-white shadow-lg d-flex flex-column"
        style={{
          zIndex: 1050,
          width: '380px',
          maxWidth: '95vw',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease',
        }}
      >
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center p-4 border-bottom">
          <div>
            <h5 className="mb-0 fw-bold">
              <i className="bi bi-cart3 me-2 text-verde"></i>
              Tu carrito
            </h5>
            {totalItems > 0 && (
              <small className="text-muted">{totalItems} producto{totalItems !== 1 ? 's' : ''}</small>
            )}
          </div>
          <button className="btn-close" onClick={() => setSidebarOpen(false)}></button>
        </div>

        {/* Items */}
        <div className="flex-grow-1 overflow-auto p-4">
          {items.length === 0 ? (
            <div className="text-center py-5">
              <div style={{ fontSize: '4rem', opacity: 0.3 }}>🛒</div>
              <p className="text-muted mt-3">Tu carrito está vacío</p>
              <button
                className="btn btn-outline-verde btn-sm"
                onClick={() => setSidebarOpen(false)}
              >
                Ver productos
              </button>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {items.map(item => {
                const precio = parseFloat(item.precio.replace('$', ''))
                return (
                  <div key={item.nombre} className="card border-0 p-3" style={{ background: '#f8f9fa', borderRadius: '12px' }}>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <p className="fw-bold mb-0 small">{item.nombre}</p>
                        <small className="text-muted">{item.precio} c/u</small>
                      </div>
                      <button
                        className="btn btn-sm p-0 text-muted"
                        onClick={() => removeItem(item.nombre)}
                        style={{ lineHeight: 1 }}
                      >
                        <i className="bi bi-x-lg" style={{ fontSize: '0.85rem' }}></i>
                      </button>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      {/* Selector de cantidad */}
                      <div className="d-flex align-items-center gap-2">
                        <button
                          className="btn btn-sm d-flex align-items-center justify-content-center"
                          style={{ width: '28px', height: '28px', background: '#e8f0fd', borderRadius: '8px', padding: 0 }}
                          onClick={() => updateCantidad(item.nombre, item.cantidad - 1)}
                        >
                          <i className="bi bi-dash" style={{ fontSize: '0.85rem', color: '#0066CC' }}></i>
                        </button>
                        <span className="fw-bold" style={{ minWidth: '20px', textAlign: 'center' }}>
                          {item.cantidad}
                        </span>
                        <button
                          className="btn btn-sm d-flex align-items-center justify-content-center"
                          style={{ width: '28px', height: '28px', background: '#e8f0fd', borderRadius: '8px', padding: 0 }}
                          onClick={() => updateCantidad(item.nombre, item.cantidad + 1)}
                        >
                          <i className="bi bi-plus" style={{ fontSize: '0.85rem', color: '#0066CC' }}></i>
                        </button>
                      </div>
                      <span className="fw-bold text-verde">
                        ${(precio * item.cantidad).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer con total y botón */}
        {items.length > 0 && (
          <div className="p-4 border-top" style={{ background: '#fff' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="text-muted">Subtotal</span>
              <span className="fw-bold fs-5">${total.toFixed(2)}</span>
            </div>
            <div className="d-flex align-items-center gap-2 mb-3">
              <i className="bi bi-truck text-verde"></i>
              <small className="text-muted">Entrega sin costo adicional en Puyo</small>
            </div>
            <button
              className="btn btn-verde w-100 py-2 fw-bold"
              onClick={() => {
                setSidebarOpen(false)
                setShowCheckout(true)
              }}
            >
              <i className="bi bi-bag-check me-2"></i>
              Finalizar pedido — ${total.toFixed(2)}
            </button>
          </div>
        )}
      </div>

      {/* Modal de checkout */}
      {showCheckout && (
        <CheckoutModal onClose={() => setShowCheckout(false)} />
      )}
    </>
  )
}
