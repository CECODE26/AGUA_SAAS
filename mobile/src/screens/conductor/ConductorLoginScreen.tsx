import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiUrl, NOMBRE_MARCA } from '../../api'

export default function ConductorLoginScreen() {
  const navigation = useNavigation<any>()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)

  async function login() {
    if (!username || !password) {
      Alert.alert('Campos requeridos', 'Ingresa tu usuario y contraseña')
      return
    }
    setLoading(true)
    try {
      const res  = await fetch(apiUrl('/api/conductores/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Credenciales incorrectas')
      await AsyncStorage.multiSet([
        ['conductor_token',  data.token],
        ['conductor_nombre', data.conductor.nombre],
      ])
      navigation.replace('ConductorRuta')
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally { setLoading(false) }
  }

  return (
    <KeyboardAvoidingView style={s.wrapper} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.container}>
        {/* Fondo decorativo */}
        <View style={s.bg} />

        {/* Logo */}
        <View style={s.logoWrap}>
          <View style={s.logoCircle}>
            <Text style={{ fontSize: 32 }}>🚚</Text>
          </View>
          <Text style={s.logoTitle}>{NOMBRE_MARCA}</Text>
          <Text style={s.logoSub}>Acceso para repartidores</Text>
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Iniciar sesión</Text>

          <Text style={s.fieldLabel}>Usuario</Text>
          <TextInput
            style={s.input}
            placeholder="tu_usuario"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />

          <Text style={s.fieldLabel}>Contraseña</Text>
          <TextInput
            style={s.input}
            placeholder="••••••••"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={login}
            returnKeyType="done"
          />

          <TouchableOpacity style={[s.btn, loading && { opacity: 0.7 }]} onPress={login} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Ingresar →</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  wrapper: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#0f1d3e',
    justifyContent: 'center', padding: 24,
  },
  bg: {
    position: 'absolute', top: -100, right: -80,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(0,102,204,0.15)',
  },

  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  logoTitle: { color: '#fff', fontWeight: '900', fontSize: 24, marginBottom: 4 },
  logoSub:   { color: 'rgba(255,255,255,0.5)', fontSize: 13 },

  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 30, shadowOffset: { width: 0, height: 16 },
  },
  cardTitle: { fontWeight: '900', fontSize: 18, color: '#0f1d3e', marginBottom: 20 },

  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 13, fontSize: 15, color: '#1a1a1a',
    backgroundColor: '#f9fafb', marginBottom: 14,
  },

  btn: {
    backgroundColor: '#0066CC', borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 4,
    shadowColor: '#0066CC', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
})
