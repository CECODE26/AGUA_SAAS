import React, { createContext, useContext, useState } from 'react'

type CartItem = {
  nombre: string
  precio: number
  cantidad: number
}

type CartContextType = {
  items: CartItem[]
  addItem: (nombre: string, precio: number) => void
  removeItem: (nombre: string) => void
  clearCart: () => void
  total: number
  count: number
}

const CartContext = createContext<CartContextType>({} as CartContextType)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  function addItem(nombre: string, precio: number) {
    setItems(prev => {
      const existing = prev.find(i => i.nombre === nombre)
      if (existing) {
        return prev.map(i => i.nombre === nombre ? { ...i, cantidad: i.cantidad + 1 } : i)
      }
      return [...prev, { nombre, precio, cantidad: 1 }]
    })
  }

  function removeItem(nombre: string) {
    setItems(prev => {
      const existing = prev.find(i => i.nombre === nombre)
      if (!existing) return prev
      if (existing.cantidad === 1) return prev.filter(i => i.nombre !== nombre)
      return prev.map(i => i.nombre === nombre ? { ...i, cantidad: i.cantidad - 1 } : i)
    })
  }

  function clearCart() { setItems([]) }

  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const count = items.reduce((s, i) => s + i.cantidad, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
