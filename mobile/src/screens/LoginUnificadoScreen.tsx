import React, { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, ScrollView, ActivityIndicator, Alert, Image, DeviceEventEmitter,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const logoImg = require('../assets/logoooo.png')
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useClienteAuth } from '../context/ClienteAuthContext'
import { apiUrl, fetchT } from '../api'
import { registrarPush } from '../lib/push'

export default function LoginUnificadoScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
  const { login } = useClienteAuth()
  const [credencial, setCredencial] = useState('')
  const [password,   setPassword]   = useState('')

  useEffect(() => {
    AsyncStorage.getItem('cliente_ultimo_email').then(email => {
      if (email) setCredencial(email)
    })
  }, [])
  const [loading,    setLoading]    = useState(false)
  const [verPass,    setVerPass]    = useState(false)
  const [sinCuenta,     setSinCuenta]     = useState(false)
  const [sinPassword,   setSinPassword]   = useState(false)

  async function handleLogin() {
    if (!credencial.trim() || !password) {
      Alert.alert('Campos requeridos', 'Ingresa tus credenciales y contraseña')
      return
    }
    setSinCuenta(false)
    setSinPassword(false)
    setLoading(true)
    try {
      const esCliente = credencial.includes('@')

      if (esCliente) {
        const result = await login(credencial.trim().toLowerCase(), password)
        if (!result.ok) {
          if (result.noAccount)    setSinCuenta(true)
          else if (result.noPassword) setSinPassword(true)
          else Alert.alert('Error', result.error)
        }
      } else {
        const res  = await fetchT(apiUrl('/api/conductores/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: credencial.trim(), password }),
        })
        const data = await res.json()
        if (!res.ok) {
          Alert.alert('Error', data.message || 'Credenciales incorrectas')
        } else {
          await AsyncStorage.multiSet([
            ['conductor_token',  data.token],
            ['conductor_nombre', data.conductor.nombre],
          ])
          registrarPush('conductor', data.token, data.conductor?.id)
          // El navegador raíz escucha este evento y muestra la ruta del chofer por estado de sesión
          DeviceEventEmitter.emit('conductorSesion', true)
          try { navigation.replace('ConductorRuta') } catch {}
        }
      }
    } catch (e: any) {
      const msg = e?.name === 'AbortError'
        ? 'El servidor no respondió (10 s). Verifica tu conexión a internet.'
        : 'No se pudo conectar al servidor.'
      Alert.alert('Error de conexión', msg)
    } finally {
      setLoading(false)
    }
  }

  function handleCambioCredencial(t: string) {
    setCredencial(t)
    if (sinCuenta)   setSinCuenta(false)
    if (sinPassword) setSinPassword(false)
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, paddingTop: insets.top }} behavior="padding">
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">

        <View style={s.header}>
          <View style={s.logoWrap}>
            <Image source={logoImg} style={s.logoImg} resizeMode="cover" />
          </View>
          <Text style={s.sub}>Ingresa a tu cuenta</Text>
        </View>

        <View style={s.card}>
          <Text style={s.label}>Correo o usuario</Text>
          <TextInput
            style={s.input}
            placeholder="Digite su usuario o correo"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
            value={credencial}
            onChangeText={handleCambioCredencial}
          />

          <Text style={s.label}>Contraseña</Text>
          <View style={s.inputRow}>
            <TextInput
              style={[s.input, { flex: 1, borderRightWidth: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!verPass}
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handleLogin}
              returnKeyType="done"
            />
            <TouchableOpacity style={s.ojito} onPress={() => setVerPass(v => !v)}>
              <Ionicons name={verPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[s.btn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnTxt}>Ingresar →</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={{ alignItems: 'flex-end', marginTop: 10 }}
            onPress={() => navigation.navigate('RecuperarPassword')}
          >
            <Text style={{ color: '#0066CC', fontSize: 12, fontWeight: '600' }}>
              ¿Olvidaste tu contraseña?
            </Text>
          </TouchableOpacity>

          {sinPassword ? (
            <View style={s.noCuentaBanner}>
              <Text style={s.noCuentaTxt}>
                Tu cuenta existe pero aún no tiene contraseña.{'\n'}Completa tu registro para activarla.
              </Text>
              <TouchableOpacity
                style={s.crearBtn}
                onPress={() => navigation.navigate('RegistroCliente', { email: credencial.trim().toLowerCase() })}
              >
                <Text style={s.crearBtnTxt}>Activar mi cuenta →</Text>
              </TouchableOpacity>
            </View>
          ) : sinCuenta ? (
            <View style={s.noCuentaBanner}>
              <Text style={s.noCuentaTxt}>
                No encontramos una cuenta con ese correo.
              </Text>
              <TouchableOpacity
                style={s.crearBtn}
                onPress={() => navigation.navigate('RegistroCliente')}
              >
                <Text style={s.crearBtnTxt}>Crear cuenta gratis →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={s.divider}>
                <View style={s.divLine} />
                <Text style={s.divTxt}>¿Cliente nuevo?</Text>
                <View style={s.divLine} />
              </View>
              <TouchableOpacity
                style={s.btnOutline}
                onPress={() => navigation.navigate('RegistroCliente')}
              >
                <Text style={s.btnOutlineTxt}>Crear cuenta</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f0f4ff', justifyContent: 'center', padding: 24 },

  header:   { alignItems: 'center', marginBottom: 32 },
  logoWrap: { width: 110, height: 110, borderRadius: 24, overflow: 'hidden', marginBottom: 14,
              shadowColor: '#0066CC', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  logoImg:  { width: 110, height: 110 },
  sub:      { fontSize: 14, color: '#64748b', marginTop: 4 },

  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 4 },
  },

  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 14 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  ojito: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderLeftWidth: 0,
    borderTopRightRadius: 12, borderBottomRightRadius: 12,
    backgroundColor: '#f9fafb', paddingHorizontal: 12, height: 50,
    justifyContent: 'center', alignItems: 'center',
  },
  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 13, fontSize: 15, color: '#1a1a1a', backgroundColor: '#f9fafb',
  },

  btn: {
    backgroundColor: '#0066CC', borderRadius: 14, padding: 15,
    alignItems: 'center', marginTop: 22,
    shadowColor: '#0066CC', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },

  divider:  { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  divLine:  { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  divTxt:   { fontSize: 12, color: '#9ca3af', fontWeight: '600' },

  btnOutline:    { borderWidth: 1.5, borderColor: '#0066CC', borderRadius: 14, padding: 14, alignItems: 'center' },
  btnOutlineTxt: { color: '#0066CC', fontWeight: '800', fontSize: 15 },

  noCuentaBanner: {
    marginTop: 20, backgroundColor: '#fef3c7', borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: '#fcd34d',
  },
  noCuentaTxt: { fontSize: 14, color: '#92400e', fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  crearBtn:    { backgroundColor: '#00763E', borderRadius: 12, padding: 13, alignItems: 'center' },
  crearBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
})
