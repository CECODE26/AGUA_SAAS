import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

function parseJwt(token) {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return {} }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('admin_token'))
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [rol, setRol] = useState(() => {
    const t = localStorage.getItem('admin_token')
    return t ? (parseJwt(t).rol || null) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function verificar() {
      if (!token) {
        setIsAuthenticated(false)
        setLoading(false)
        return
      }
      try {
        const res = await fetch('/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setIsAuthenticated(true)
          setRol(data.rol || parseJwt(token).rol || null)
        } else {
          localStorage.removeItem('admin_token')
          setToken(null)
          setIsAuthenticated(false)
          setRol(null)
        }
      } catch {
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }
    verificar()
  }, [token])

  async function login(username, password, codigo) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, ...(codigo ? { codigo } : {}) }),
    })
    const data = await res.json()
    if (!res.ok) { const e = new Error(data.message || 'Error de autenticación'); e.requiereCodigo = !!data.requiereCodigo; throw e }
    // Verificación en dos pasos: el servidor pide el código de la app autenticadora
    if (data.requiereCodigo) return { requiereCodigo: true, message: data.message }
    localStorage.setItem('admin_token', data.token)
    setToken(data.token)
    setIsAuthenticated(true)
    setRol(data.rol || parseJwt(data.token).rol || null)
  }

  function logout() {
    localStorage.removeItem('admin_token')
    setToken(null)
    setIsAuthenticated(false)
    setRol(null)
  }

  const authFetch = useCallback(async (url, options = {}) => {
    const isFormData = options.body instanceof FormData
    const res = await fetch(url, {
      ...options,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    })
    if (res.status === 401) {
      localStorage.removeItem('admin_token')
      setToken(null)
      setIsAuthenticated(false)
      setRol(null)
    }
    return res
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
