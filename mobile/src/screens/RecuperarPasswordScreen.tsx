import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { apiUrl, fetchT } from '../api'

const PWD_RULES = [
  { id: 'len',     label: 'Mínimo 8 caracteres',        test: (p: string) => p.length >= 8 },
  { id: 'upper',   label: 'Una letra mayúscula',         test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'Una letra minúscula',         test: (p: string) => /[a-z]/.test(p) },
  { id: 'number',  label: 'Un número',                   test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: 'Un carácter especial (@#$!)', test: (p: string) => /[@#$!%^&*()\-_=+\[\]{};':"\\|,.<>/?]/.test(p) },
]

export default function RecuperarPasswordScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
  const [paso,     setPaso]     = useState<'email' | 'codigo'>('email')
  const [email,    setEmail]    = useState('')
  const [codigo,   setCodigo]   = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [pwdFocus, setPwdFocus] = useState(false)

  /* ── Paso 1: solicitar código ── */
  async function solicitarCodigo() {
    if (!email.trim()) { Alert.alert('Requerido', 'Ingresa tu correo'); return }
    setLoading(true)
    try {
      const res  = await fetchT(apiUrl('/api/clientes/auth/recuperar'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (!data.success) {
        if (data.noAccount) {
          Alert.alert(
            'Sin cuenta registrada',
            'No encontramos una cuenta con ese correo. Primero debes registrarte.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Registrarme', onPress: () => navigation.navigate('RegistroCliente') },
            ]
          )
        } else {
          Alert.alert('Error', data.message || 'No se pudo enviar el código. Intenta nuevamente.')
        }
        return
      }
      setPaso('codigo')
    } catch (e: any) {
      const msg = e?.name === 'AbortError'
        ? 'El servidor no respondió. Verifica tu conexión.'
        : 'No se pudo conectar al servidor.'
      Alert.alert('Error de conexión', msg)
    }
    setLoading(false)
  }

  /* ── Paso 2: resetear contraseña ── */
  async function resetearPassword() {
    if (!codigo.trim()) { Alert.alert('Requerido', 'Ingresa el código'); return }
    if (!password)      { Alert.alert('Requerido', 'Ingresa la nueva contraseña'); return }
    if (password !== confirm) { Alert.alert('Error', 'Las contraseñas no coinciden'); return }
    if (!PWD_RULES.every(r => r.test(password))) {
      Alert.alert('Contraseña débil', 'Revisa los requisitos de seguridad')
      return
    }
    setLoading(true)
    try {
      const res  = await fetchT(apiUrl('/api/clientes/auth/resetear'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), codigo: codigo.trim(), password }),
      })
      const data = await res.json()
      if (!data.success) { Alert.alert('Error', data.message); return }
      Alert.alert('¡Listo!', 'Tu contraseña fue actualizada. Inicia sesión.', [
        { text: 'Ir al login', onPress: () => navigation.navigate('LoginUnificado') },
      ])
    } catch {
      Alert.alert('Error', 'No se pudo conectar al servidor')
    }
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, paddingTop: insets.top }} behavior="padding">
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={s.header}>
          <Text style={s.logo}>🔐</Text>
          <Text style={s.brand}>Recuperar contraseña</Text>
          <Text style={s.sub}>
            {paso === 'email'
              ? 'Ingresa tu correo y te enviaremos un código'
              : `Código enviado a ${email}`}
          </Text>
        </View>

        {/* Indicador de pasos */}
        <View style={s.steps}>
          <View style={[s.step, s.stepDone]}>
            <Text style={s.stepTxt}>1</Text>
          </View>
          <View style={[s.stepLine, paso === 'codigo' && s.stepLineDone]} />
          <View style={[s.step, paso === 'codigo' && s.stepDone]}>
            <Text style={[s.stepTxt, paso !== 'codigo' && { color: '#9ca3af' }]}>2</Text>
          </View>
        </View>

        <View style={s.card}>

          {paso === 'email' ? (
            <>
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
              <TouchableOpacity style={[s.btn, loading && { opacity: 0.7 }]} onPress={solicitarCodigo} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Enviar código</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={s.label}>Código de 6 dígitos</Text>
              <TextInput
                style={[s.input, s.inputCodigo]}
                placeholder="000000"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                maxLength={6}
                value={codigo}
                onChangeText={setCodigo}
              />

              <Text style={s.label}>Nueva contraseña</Text>
              <TextInput
                style={s.input}
                placeholder="Crea tu nueva contraseña"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPwdFocus(true)}
              />
              {(pwdFocus || password.length > 0) && (
                <View style={s.pwdRules}>
                  {PWD_RULES.map(r => (
                    <View key={r.id} style={s.ruleRow}>
                      <Text style={[s.ruleDot, r.test(password) && s.ruleDotOk]}>
                        {r.test(password) ? '✓' : '○'}
                      </Text>
                      <Text style={[s.ruleTxt, r.test(password) && s.ruleTxtOk]}>{r.label}</Text>
                    </View>
                  ))}
                </View>
              )}

              <Text style={s.label}>Confirmar contraseña</Text>
              <TextInput
                style={s.input}
                placeholder="Repite tu contraseña"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                value={confirm}
                onChangeText={setConfirm}
              />

              <TouchableOpacity style={[s.btn, loading && { opacity: 0.7 }]} onPress={resetearPassword} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Cambiar contraseña</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={s.link} onPress={() => setPaso('email')}>
                <Text style={s.linkTxt}>← Volver / reenviar código</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={[s.link, { marginTop: 8 }]} onPress={() => navigation.navigate('LoginUnificado')}>
            <Text style={s.linkTxt}>Cancelar</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f0f4ff', padding: 24, paddingBottom: 40 },

  header: { alignItems: 'center', marginBottom: 24, marginTop: 16 },
  logo:   { fontSize: 48, marginBottom: 6 },
  brand:  { fontSize: 22, fontWeight: '900', color: '#0f1d3e' },
  sub:    { fontSize: 12, color: '#64748b', marginTop: 4, textAlign: 'center', paddingHorizontal: 20 },

  steps:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24, gap: 0 },
  step:        { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' },
  stepDone:    { backgroundColor: '#0066CC' },
  stepTxt:     { color: '#fff', fontWeight: '800', fontSize: 14 },
  stepLine:    { width: 48, height: 3, backgroundColor: '#e5e7eb', marginHorizontal: 6 },
  stepLineDone:{ backgroundColor: '#0066CC' },

  card:  { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 4 } },

  label:      { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 14 },
  input:      { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 13, fontSize: 14, color: '#1a1a1a', backgroundColor: '#f9fafb' },
  inputCodigo:{ fontSize: 28, fontWeight: '900', textAlign: 'center', letterSpacing: 8, color: '#0066CC' },

  pwdRules: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, marginTop: 8, gap: 4 },
  ruleRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ruleDot:  { fontSize: 12, color: '#9ca3af', width: 16 },
  ruleDotOk:{ color: '#16a34a' },
  ruleTxt:  { fontSize: 11, color: '#9ca3af' },
  ruleTxtOk:{ color: '#16a34a', fontWeight: '600' },

  btn:    { backgroundColor: '#0066CC', borderRadius: 14, padding: 15, alignItems: 'center', marginTop: 22, shadowColor: '#0066CC', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },

  link:    { alignItems: 'center', marginTop: 16 },
  linkTxt: { color: '#0066CC', fontSize: 13, fontWeight: '600' },
})
