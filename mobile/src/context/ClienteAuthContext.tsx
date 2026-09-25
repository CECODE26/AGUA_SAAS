import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiUrl, fetchT } from '../api'
import { registrarPush, eliminarPush } from '../lib/push'

type Cliente = {
  id: number
  nombre: string
  email: string
  cedula: string
  telefono: string
  callePrincipal: string
  referencia: string
  latitud?: number | null
  longitud?: number | null
  esFijo?: boolean
  visitasHorario?: Array<{ dia: string; hora: string }> | null
}

export type LoginResult =
  | { ok: true; nombre: string }
  | { ok: false; error: string; noAccount?: boolean; noPassword?: boolean }

type AuthCtx = {
  cliente: Cliente | null
  token: string | null
  loading: boolean
  recienRegistrado: boolean
  setRecienRegistrado: (v: boolean) => void
  login: (email: string, password: string) => Promise<LoginResult>
  registro: (datos: RegistroDatos) => Promise<string | null>
  logout: () => void
  updateCliente: (partial: Partial<Cliente>) => Promise<void>
}

type RegistroDatos = {
  nombre: string; cedula: string; direccion: string
  telefono: string; referencia: string; email: string; password: string
}

const Ctx = createContext<AuthCtx>(null as any)

export function ClienteAuthProvider({ children }: { children: React.ReactNode }) {
  const [cliente,          setCliente]          = useState<Cliente | null>(null)
  const [token,            setToken]            = useState<string | null>(null)
  const [loading,          setLoading]          = useState(true)
  const [recienRegistrado, setRecienRegistrado] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const [t, perfilStr] = await AsyncStorage.multiGet(['cliente_token', 'cliente_perfil'])
        const token  = t[1]
        const perfil = perfilStr[1] ? JSON.parse(perfilStr[1]) : null

        if (!token || !perfil) { setLoading(false); return }

        // Entrar directo a la app — sin esperar al servidor
        setToken(token)
        setCliente(perfil)
        setLoading(false)

        // Validar token en verdadero background — no bloquea la navegación
        fetchT(apiUrl('/api/clientes/auth/perfil'), {
          headers: { Authorization: `Bearer ${token}` },
        }).then(async res => {
          if (res.ok) {
            const data = await res.json()
            setCliente(data.cliente)
            await AsyncStorage.setItem('cliente_perfil', JSON.stringify(data.cliente))
            registrarPush('cliente', token, data.cliente?.id)
          } else {
            // Token inválido (expirado o revocado) — cerrar sesión
            await AsyncStorage.multiRemove(['cliente_token', 'cliente_perfil'])
            setToken(null)
            setCliente(null)
          }
        }).catch(() => {
          // Sin red — mantener sesión local
        })
      } catch {
        setLoading(false)
      }
    })()
  }, [])

  async function login(email: string, password: string): Promise<LoginResult> {
    try {
      const res  = await fetchT(apiUrl('/api/clientes/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!data.success) return { ok: false, error: data.message || 'Error al iniciar sesión', noAccount: data.noAccount, noPassword: data.noPassword }
      await AsyncStorage.multiSet([
        ['cliente_token',        data.token],
        ['cliente_perfil',       JSON.stringify(data.cliente)],
        ['cliente_ultimo_email', email],
      ])
      setToken(data.token)
      setCliente(data.cliente)
      registrarPush('cliente', data.token, data.cliente?.id)
      return { ok: true, nombre: data.cliente.nombre }
    } catch (e: any) {
      const sinConexion = e?.name === 'AbortError'
      return { ok: false, error: sinConexion ? 'El servidor no respondió. Verifica tu conexión.' : 'Error de conexión' }
    }
  }

  async function registro(datos: RegistroDatos): Promise<string | null> {
    try {
      const res  = await fetchT(apiUrl('/api/clientes/auth/registro'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      })
      const data = await res.json()
      if (!data.success) return data.message || 'Error al registrarse'
      await AsyncStorage.multiSet([
        ['cliente_token',  data.token],
        ['cliente_perfil', JSON.stringify(data.cliente)],
      ])
      setToken(data.token)
      setCliente(data.cliente)
      setRecienRegistrado(true)
      registrarPush('cliente', data.token, data.cliente?.id)
      return null
    } catch (e: any) {
      return e?.name === 'AbortError'
        ? 'El servidor no respondió. Verifica tu conexión.'
        : 'Error de conexión'
    }
  }

  function logout() {
    // cliente_ultimo_email se conserva para pre-llenar el campo en el próximo login
    eliminarPush('cliente', token)
    AsyncStorage.multiRemove(['cliente_token', 'cliente_perfil'])
    setToken(null)
    setCliente(null)
  }

  async function updateCliente(partial: Partial<Cliente>) {
    const next = { ...cliente!, ...partial }
    setCliente(next)
    await AsyncStorage.setItem('cliente_perfil', JSON.stringify(next))
  }

  return (
    <Ctx.Provider value={{ cliente, token, loading, recienRegistrado, setRecienRegistrado, login, registro, logout, updateCliente }}>
      {children}
    </Ctx.Provider>
  )
}

export const useClienteAuth = () => useContext(Ctx)
