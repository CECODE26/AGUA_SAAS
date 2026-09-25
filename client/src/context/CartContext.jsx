import { createContext, useContext, useState } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function addItem(producto) {
    setItems(prev => {
      const exists = prev.find(i => i.nombre === producto.nombre)
      if (exists) {
        return prev.map(i =>
          i.nombre === producto.nombre ? { ...i, cantidad: i.cantidad + 1 } : i
        )
      }
      return [...prev, { ...producto, cantidad: 1 }]
    })
    setSidebarOpen(true)
  }

  function removeItem(nombre) {
    setItems(prev => prev.filter(i => i.nombre !== nombre))
  }

  function updateCantidad(nombre, cantidad) {
    if (cantidad < 1) {
      removeItem(nombre)
      return
    }
    setItems(prev =>
      prev.map(i => i.nombre === nombre ? { ...i, cantidad } : i)
    )
  }

  function clearCart() {
    setItems([])
  }

  const total = items.reduce((sum, i) => {
    const precio = parseFloat(i.precio.replace('$', ''))
    return sum + precio * i.cantidad
  }, 0)

  const totalItems = items.reduce((sum, i) => sum + i.cantidad, 0)

  return (
    <CartContext.Provider value={{
      items,
      total,
      totalItems,
      sidebarOpen,
      setSidebarOpen,
      addItem,
      removeItem,
      updateCantidad,
      clearCart,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
