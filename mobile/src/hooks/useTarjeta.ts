import { useCallback, useEffect, useState } from 'react'
import { useClienteAuth } from '../context/ClienteAuthContext'
import { apiUrl, fetchT } from '../api'

export type Movimiento = {
  tipo: 'gana' | 'premio' | 'canje' | 'caduca' | 'ajuste'
  sellos: number
  pedidoId: number | null
  origen: string | null
  nota: string | null
  creadoEn: string
}

export type Tarjeta = {
  activo: boolean
  tipoPremio: 'producto' | 'descuento'
  descuentoPct: number | null
  textoPremio: string                 // "1 Bidón 20L gratis" | "15 % de descuento"
  meta: number
  sellos: number
  premiosDisponibles: number
  faltan: number
  premio: { id: number; nombre: string; precio: number } | null
  movimientos: Movimiento[]
}

// Tarjeta de fidelidad del cliente con sesión. null mientras carga o si no hay sesión.
export function useTarjeta(activa = true) {
  const { token } = useClienteAuth()
  const [tarjeta, setTarjeta] = useState<Tarjeta | null>(null)

  const recargar = useCallback(async () => {
    if (!token) { setTarjeta(null); return }
    try {
      const res = await fetchT(apiUrl('/api/fidelidad/mi-tarjeta'), { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const d = await res.json()
      setTarjeta(d.tarjeta ?? null)
    } catch {}
  }, [token])

  useEffect(() => { if (activa) recargar() }, [activa, recargar])

  return { tarjeta, recargar }
}
