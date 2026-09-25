import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import { useClienteAuth } from '../context/ClienteAuthContext'

export default function LoginClienteScreen({ navigation }: any) {
  const { login } = useClienteAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Campos requeridos', 'Ingresa tu correo y contraseña')
      return
    }
    setLoading(true)
    try {
      const result = await login(email.trim(), password)
      if (!result.ok) Alert.alert('Error', result.error)
    } catch {
      Alert.alert('Error de conexión', 'No se pudo conectar al servidor. Verifica tu conexión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">

        {/* Logo / header */}
        <View style={s.header}>
          <Text style={s.logo}>💧</Text>
          <Text style={s.brand}>Agua Manú</Text>
          <Text style={s.sub}>Inicia sesión en tu cuenta</Text>
        </View>

        {/* Formulario */}
        <View style={s.card}>
          <Text style={s.label}>Correo electrónico</Text>
          <TextInput
            style={s.input}
            placeholder="tu@correo.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={s.label}>Contraseña</Text>
          <TextInput
            style={s.input}
            placeholder="••••••••"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={[s.btn, loading && { opacity: 0.7 }]} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnTxt}>Ingresar</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={{ alignItems: 'flex-end', marginTop: 8 }} onPress={() => navigation.navigate('RecuperarPassword')}>
            <Text style={{ color: '#0066CC', fontSize: 12, fontWeight: '600' }}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <View style={s.divider}>
            <View style={s.divLine} />
            <Text style={s.divTxt}>¿Cliente nuevo?</Text>
            <View style={s.divLine} />
          </View>

          <TouchableOpacity style={s.btnOutline} onPress={() => navigation.navigate('RegistroCliente')}>
            <Text style={s.btnOutlineTxt}>Crear cuenta</Text>
          </TouchableOpacity>
        </View>

        {/* Acceso repartidores */}
        <TouchableOpacity style={s.conductorLink} onPress={() => navigation.navigate('ConductorLogin' as never)}>
          <Text style={s.conductorLinkTxt}>🚚 Acceso para repartidores →</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f0f4ff', justifyContent: 'center', padding: 24 },

  header:  { alignItems: 'center', marginBottom: 32 },
  logo:    { fontSize: 56, marginBottom: 8 },
  brand:   { fontSize: 28, fontWeight: '900', color: '#0f1d3e' },
  sub:     { fontSize: 14, color: '#64748b', marginTop: 4 },

  card:    { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 4 } },

  label:   { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 14 },
  input:   { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 13, fontSize: 15, color: '#1a1a1a', backgroundColor: '#f9fafb' },

  btn:        { backgroundColor: '#0066CC', borderRadius: 14, padding: 15, alignItems: 'center', marginTop: 22, shadowColor: '#0066CC', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  btnTxt:     { color: '#fff', fontWeight: '800', fontSize: 16 },

  divider:  { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  divLine:  { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  divTxt:   { fontSize: 12, color: '#9ca3af', fontWeight: '600' },

  btnOutline:    { borderWidth: 1.5, borderColor: '#0066CC', borderRadius: 14, padding: 14, alignItems: 'center' },
  btnOutlineTxt: { color: '#0066CC', fontWeight: '800', fontSize: 15 },

  conductorLink:    { alignItems: 'center', marginTop: 24, paddingVertical: 8 },
  conductorLinkTxt: { color: '#64748b', fontSize: 13, fontWeight: '600' },
})
