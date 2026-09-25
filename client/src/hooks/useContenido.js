import { useState, useEffect } from 'react'

// Cache compartida entre todas las páginas — una sola petición al servidor
let _cache = null
let _fetching = false
const _listeners = new Set()

function fetchAll() {
  if (_fetching || _cache !== null) return
  _fetching = true
  fetch('/api/contenido')
    .then(r => r.ok ? r.json() : {})
    .then(data => {
      _cache = data
      _listeners.forEach(fn => fn(data))
    })
    .catch(() => {
      _cache = {}
      _listeners.forEach(fn => fn({}))
    })
    .finally(() => { _fetching = false })
}

export function invalidarContenido() {
  _cache = null
}

export function useContenido(pagina) {
  const [data, setData] = useState(_cache ? (_cache[pagina] || null) : null)

  useEffect(() => {
    if (_cache !== null) {
      setData(_cache[pagina] || null)
      return
    }
    const listener = (all) => setData(all[pagina] || null)
    _listeners.add(listener)
    fetchAll()
    return () => { _listeners.delete(listener) }
  }, [pagina])

  return data
}
