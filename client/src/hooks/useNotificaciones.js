import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

export function useNotificaciones() {
  const { authFetch, isAuthenticated } = useAuth()
  const [counts, setCounts] = useState({ pedidosPendientes: 0, contactosSinLeer: 0, solicitudesPendientes: 0, clientesFijosNuevos: 0, ultimoPedido: null })

  const fetchCounts = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const res = await authFetch('/api/notificaciones')
      if (res.ok) {
        const data = await res.json()
        setCounts(prev => ({ ...prev, ...data }))
      }
    } catch {
      // silencioso — no interrumpir la UI si falla
    }
  }, [authFetch, isAuthenticated])

  useEffect(() => {
    fetchCounts()
    // Cada 10 s: es una consulta muy liviana y así el aviso de pedido nuevo llega rápido
    const intervalo = setInterval(fetchCounts, 10_000)
    return () => clearInterval(intervalo)
  }, [fetchCounts])

  return counts
}
