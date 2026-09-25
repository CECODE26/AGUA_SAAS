import { useEffect, useRef } from 'react'

/**
 * Llama a `callback` cada `ms` milisegundos mientras el componente está montado.
 * Usa una ref para siempre invocar la versión más reciente del callback sin
 * necesidad de incluirlo en las dependencias del efecto.
 */
export function useAutoRefresh(callback: () => void, ms = 5000) {
  const cbRef = useRef(callback)
  cbRef.current = callback

  useEffect(() => {
    const id = setInterval(() => cbRef.current(), ms)
    return () => clearInterval(id)
  }, [ms])
}
