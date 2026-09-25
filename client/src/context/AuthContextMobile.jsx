import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiUrl } from '../lib/api'

const AuthContext = createContext(null)

function parseJwt(token) {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return {} }
}

export function AuthProvider({ children }) {
  const [token, setToken]               = useState(() => localStorage.getItem('admin_token'))
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [rol, setRol]                   = useState(() => {
    const t = localStorage.getItem('admin_token')
    return t ? (parseJwt(t).rol || null) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function verificar() {
      if (!token) { setIsAuthenticated(false); setLoading(false); return }
      try {
        const res = await fetch(apiUrl('/api/auth/verify'), {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setIsAuthenticated(true)
          setRol(data.rol || parseJwt(token).rol || null)
        } else {
          localStorage.removeItem('admin_token')
          setToken(null); setIsAuthenticated(false); setRol(null)
        }
      } catch {
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }
    verificar()
  }, [token])

  async function login(username, password) {
    const res = await fetch(apiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Error de autenticación')
    localStorage.setItem('admin_token', data.token)
    setToken(data.token)
    setIsAuthenticated(true)
    setRol(data.rol || parseJwt(data.token).rol || null)
  }

  function logout() {
    localStorage.removeItem('admin_token')
    setToken(null); setIsAuthenticated(false); setRol(null)
  }

  const authFetch = useCallback((url, options = {}) => {
    const isFormData = options.body instanceof FormData
    return fetch(apiUrl(url), {
      ...options,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    })
  }, [token])

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, logout, authFetch, token, rol }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
