import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useClienteAuth } from '../context/ClienteAuthContext'
import { NOMBRE_MARCA } from '../api'

/* ── Reglas de contraseña ─────────────────────────────────────────────────── */
const PWD_RULES = [
  { id: 'len',     label: 'Mínimo 8 caracteres',       test: (p: string) => p.length >= 8 },
  { id: 'upper',   label: 'Una letra mayúscula',        test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'Una letra minúscula',        test: (p: string) => /[a-z]/.test(p) },
  { id: 'number',  label: 'Un número',                  test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: 'Un carácter especial (@#$!)', test: (p: string) => /[@#$!%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
]

function validarPassword(p: string) {
  return PWD_RULES.every(r => r.test(p))
}

function validarTelefono(t: string) {
  return /^\d{10}$/.test(t.replace(/\s/g, ''))
}

type Campo = { key: string; label: string; placeholder: string; kb?: any; secure?: boolean; cap?: any }

const CAMPOS: Campo[] = [
  { key: 'nombre',    label: 'Nombre completo',     placeholder: 'Juan Pérez',                    cap: 'words' },
  { key: 'cedula',    label: 'Cédula / RUC',        placeholder: '1234567890',                    kb: 'numeric' },
  { key: 'direccion', label: 'Dirección',            placeholder: 'Av. Principal 123',             cap: 'sentences' },
  { key: 'telefono',  label: 'Teléfono (10 dígitos)', placeholder: '0987654321',                  kb: 'phone-pad' },
  { key: 'referencia',label: 'Referencia',           placeholder: 'Casa azul, frente al parque...', cap: 'sentences' },
  { key: 'email',     label: 'Correo electrónico',  placeholder: 'tu@correo.com',                 kb: 'email-address', cap: 'none' },
  { key: 'password',  label: 'Contraseña',           placeholder: 'Crea tu contraseña',            secure: true },
  { key: 'confirm',   label: 'Confirmar contraseña', placeholder: 'Repite tu contraseña',          secure: true },
]

export default function RegistroClienteScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
  const { registro } = useClienteAuth()
  const [form, setForm] = useState<Record<string, string>>({
    nombre: '', cedula: '', direccion: '', telefono: '',
    referencia: '', email: '', password: '', confirm: '',
  })
  const [loading,     setLoading]     = useState(false)
  const [pwdFocused,  setPwdFocused]  = useState(false)
  const [errors,      setErrors]      = useState<Record<string, string>>({})

  function validarCampo(key: string, value: string): string {
    if (!value.trim()) return 'Campo obligatorio'
    if (key === 'telefono' && !validarTelefono(value)) return 'Debe tener exactamente 10 dígitos'
    if (key === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Correo inválido'
    if (key === 'password' && !validarPassword(value)) return 'No cumple los requisitos'
    if (key === 'confirm' && value !== form.password) return 'Las contraseñas no coinciden'
    return ''
  }

  function handleChange(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) {
      const err = validarCampo(key, value)
      setErrors(prev => ({ ...prev, [key]: err }))
    }
  }

  function handleBlur(key: string) {
    const err = validarCampo(key, form[key])
    setErrors(prev => ({ ...prev, [key]: err }))
  }

  async function handleRegistro() {
    const nuevosErrores: Record<string, string> = {}
    for (const c of CAMPOS) {
      const err = validarCampo(c.key, form[c.key])
      if (err) nuevosErrores[c.key] = err
    }
    if (Object.keys(nuevosErrores).length > 0) {
      setErrors(nuevosErrores)
      Alert.alert('Revisa los campos', 'Corrige los errores marcados en rojo')
      return
    }
    setLoading(true)
    try {
      const err = await registro({
        nombre:     form.nombre,
        cedula:     form.cedula,
        direccion:  form.direccion,
        telefono:   form.telefono.replace(/\s/g, ''),
        referencia: form.referencia,
        email:      form.email,
        password:   form.password,
      })
      if (err) Alert.alert('Error', err)
    } catch {
      Alert.alert('Error de conexión', 'No se pudo conectar al servidor. Verifica tu conexión.')
    } finally {
      setLoading(false)
    }
  }

  const pwd = form.password

  return (
    <KeyboardAvoidingView style={{ flex: 1, paddingTop: insets.top }} behavior="padding">
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">

        <View style={s.header}>
          <Text style={s.logo}>💧</Text>
          <Text style={s.brand}>Crear cuenta</Text>
          <Text style={s.sub}>{NOMBRE_MARCA} · Todos los campos son obligatorios</Text>
        </View>

        <View style={s.card}>
          {CAMPOS.map(c => (
            <View key={c.key}>
              <Text style={s.label}>{c.label}</Text>
              <TextInput
                style={[s.input, !!errors[c.key] && s.inputError]}
                placeholder={c.placeholder}
                placeholderTextColor="#9ca3af"
                keyboardType={c.kb || 'default'}
                autoCapitalize={c.cap || 'none'}
                secureTextEntry={!!c.secure}
                value={form[c.key]}
                onChangeText={v => handleChange(c.key, v)}
                onBlur={() => handleBlur(c.key)}
                onFocus={() => c.key === 'password' && setPwdFocused(true)}
              />
              {!!errors[c.key] && (
                <Text style={s.errorTxt}>⚠ {errors[c.key]}</Text>
              )}

              {/* Indicador de requisitos de contraseña */}
              {c.key === 'password' && (pwdFocused || pwd.length > 0) && (
                <View style={s.pwdRules}>
                  {PWD_RULES.map(r => (
                    <View key={r.id} style={s.ruleRow}>
                      <Text style={[s.ruleDot, r.test(pwd) && s.ruleDotOk]}>
                        {r.test(pwd) ? '✓' : '○'}
                      </Text>
                      <Text style={[s.ruleTxt, r.test(pwd) && s.ruleTxtOk]}>{r.label}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity style={[s.btn, loading && { opacity: 0.7 }]} onPress={handleRegistro} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnTxt}>Crear mi cuenta</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={s.link} onPress={() => navigation.goBack()}>
            <Text style={s.linkTxt}>Ya tengo cuenta · Iniciar sesión</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f0f4ff', padding: 24, paddingBottom: 40 },

  header:  { alignItems: 'center', marginBottom: 24, marginTop: 16 },
  logo:    { fontSize: 48, marginBottom: 6 },
  brand:   { fontSize: 26, fontWeight: '900', color: '#0f1d3e' },
  sub:     { fontSize: 12, color: '#64748b', marginTop: 4, textAlign: 'center' },

  card:    { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 4 } },

  label:     { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 5, marginTop: 14 },
  input:     { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 13, fontSize: 14, color: '#1a1a1a', backgroundColor: '#f9fafb' },
  inputError:{ borderColor: '#ef4444', backgroundColor: '#fff5f5' },
  errorTxt:  { color: '#ef4444', fontSize: 11, fontWeight: '600', marginTop: 4 },

  pwdRules:  { backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, marginTop: 8, gap: 4 },
  ruleRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ruleDot:   { fontSize: 12, color: '#9ca3af', width: 16 },
  ruleDotOk: { color: '#16a34a' },
  ruleTxt:   { fontSize: 11, color: '#9ca3af' },
  ruleTxtOk: { color: '#16a34a', fontWeight: '600' },

  btn:     { backgroundColor: '#0066CC', borderRadius: 14, padding: 15, alignItems: 'center', marginTop: 24, shadowColor: '#0066CC', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  btnTxt:  { color: '#fff', fontWeight: '800', fontSize: 16 },

  link:    { alignItems: 'center', marginTop: 18 },
  linkTxt: { color: '#0066CC', fontSize: 13, fontWeight: '600' },
})
