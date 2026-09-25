import React, { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Location from 'expo-location'
import { apiUrl, fetchT } from '../api'
import { useClienteAuth } from '../context/ClienteAuthContext'
import Icono from '../components/Icono'

const DIAS = [
  { key: 'lunes',     label: 'Lun', largo: 'Lunes' },
  { key: 'martes',    label: 'Mar', largo: 'Martes' },
  { key: 'miercoles', label: 'Mié', largo: 'Miércoles' },
  { key: 'jueves',    label: 'Jue', largo: 'Jueves' },
  { key: 'viernes',   label: 'Vie', largo: 'Viernes' },
  { key: 'sabado',    label: 'Sáb', largo: 'Sábado' },
  { key: 'domingo',   label: 'Dom', largo: 'Domingo' },
]

const HORARIO: Record<string, { desde: number; hasta: number }> = {
  lunes:     { desde: 7, hasta: 19 },
  martes:    { desde: 7, hasta: 19 },
  miercoles: { desde: 7, hasta: 19 },
  jueves:    { desde: 7, hasta: 19 },
  viernes:   { desde: 7, hasta: 19 },
  sabado:    { desde: 7, hasta: 18 },
  domingo:   { desde: 8, hasta: 17 },
}

function generarSlots(dia: string): string[] {
  const h = HORARIO[dia]
  const slots: string[] = []
  for (let hh = h.desde; hh < h.hasta; hh++) {
    slots.push(`${String(hh).padStart(2, '0')}:00`)
    slots.push(`${String(hh).padStart(2, '0')}:30`)
  }
  return slots
}

type Paso = 'pregunta' | 'ubicacion' | 'configurar'

export default function ClienteFijoScreen({ navigation, route }: any) {
  const { token, cliente, setRecienRegistrado, updateCliente } = useClienteAuth()
  const desdeApp = route?.params?.desdeApp === true

  const yaHayCoords = cliente?.latitud != null && cliente?.longitud != null

  const [paso, setPaso] = useState<Paso>(() => {
    if (!desdeApp) return 'pregunta'
    return yaHayCoords ? 'configurar' : 'ubicacion'
  })

  const [coords, setCoords]     = useState<{ lat: number; lng: number } | null>(
    yaHayCoords ? { lat: cliente!.latitud!, lng: cliente!.longitud! } : null
  )
  const [localizando, setLocalizando] = useState(false)
  const [seleccion, setSeleccion]     = useState<Record<string, string | null>>({})
  const [guardando, setGuardando]     = useState(false)

  // Siempre empieza sin días seleccionados — el cliente elige desde cero

  function toggleDia(dia: string) {
    setSeleccion(prev => {
      const next = { ...prev }
      if (dia in next) delete next[dia]
      else next[dia] = null
      return next
    })
  }

  function setHora(dia: string, hora: string) {
    setSeleccion(prev => ({ ...prev, [dia]: hora }))
  }

  async function pedirUbicacion() {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(
        'Ubicación requerida',
        'Sin tu ubicación no podemos incluirte en la ruta de entrega. Actívala en Configuración del dispositivo.',
        [{ text: 'Entendido' }]
      )
      return
    }
    setLocalizando(true)
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      setPaso('configurar')
    } catch {
      Alert.alert('Error', 'No se pudo obtener tu ubicación. Intenta de nuevo.')
    } finally {
      setLocalizando(false)
    }
  }

  async function confirmar() {
    const diasSel = Object.keys(seleccion)
    if (diasSel.length === 0) {
      Alert.alert('Selecciona al menos un día')
      return
    }
    const sinHora = diasSel.filter(d => !seleccion[d])
    if (sinHora.length > 0) {
      Alert.alert('Selecciona un horario para cada día elegido')
      return
    }
    if (!coords) {
      // No debería llegar aquí, pero por seguridad
      setPaso('ubicacion')
      return
    }
    const visitasHorario = diasSel.map(dia => ({ dia, hora: seleccion[dia]! }))
    setGuardando(true)
    try {
      const res = await fetchT(apiUrl('/api/clientes/auth/visitas'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ visitasHorario, latitud: coords.lat, longitud: coords.lng }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.cliente) {
        await updateCliente(data.cliente)
      } else {
        await updateCliente({ visitasHorario, esFijo: true, latitud: coords.lat, longitud: coords.lng })
      }
    } catch {
      Alert.alert('Error', 'No se pudieron guardar las visitas. Podrás configurarlas desde tu perfil.')
    }
    setGuardando(false)
    if (desdeApp) navigation.goBack()
    else setRecienRegistrado(false)
  }

  function omitir() {
    if (desdeApp) navigation.goBack()
    else setRecienRegistrado(false)
  }

  // ── Paso 1: pregunta inicial (solo post-registro) ─────────────────────────
  if (paso === 'pregunta') {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={s.centrado}>
          <View style={s.emojiBox}><Icono nombre="calendario" size={40} color="#0066CC" /></View>
          <Text style={s.tituloPregunta}>¿Quieres recibir agua cada semana?</Text>
          <Text style={s.subtituloPregunta}>
            Programa días y horarios fijos para que nuestro equipo te visite sin que tengas que pedir cada vez.
          </Text>
          <TouchableOpacity style={s.btnSi} onPress={() => setPaso('ubicacion')}>
            <Text style={s.btnSiTxt}>Sí, quiero programar mis visitas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnNo} onPress={omitir}>
            <Text style={s.btnNoTxt}>No por ahora, pediré cuando necesite</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // ── Paso 2: obtener ubicación GPS ─────────────────────────────────────────
  if (paso === 'ubicacion') {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={s.centrado}>
          <View style={s.emojiBox}><Icono nombre="pin" size={40} color="#0066CC" /></View>
          <Text style={s.tituloPregunta}>Necesitamos tu ubicación</Text>
          <Text style={s.subtituloPregunta}>
            Para incluirte en la ruta de entrega, el conductor necesita saber dónde vives.{'\n\n'}
            Tu ubicación solo se usa para coordinar la llegada del agua.
          </Text>

          <View style={s.infoBox}>
            <Text style={s.infoTxt}>Sin GPS tu dirección no aparece en la ruta del conductor</Text>
          </View>

          <TouchableOpacity style={s.btnSi} onPress={pedirUbicacion} disabled={localizando}>
            {localizando
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnSiTxt}>Permitir ubicación</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={s.btnNo} onPress={omitir}>
            <Text style={s.btnNoTxt}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // ── Paso 3: selección de días y horarios ──────────────────────────────────
  const diasSeleccionados = DIAS.filter(d => d.key in seleccion)
  const listo = diasSeleccionados.length > 0 && diasSeleccionados.every(d => seleccion[d.key])

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {coords && (
          <View style={s.coordsBadge}>
            <Text style={s.coordsTxt}>Ubicación guardada</Text>
          </View>
        )}

        <Text style={s.tituloConfig}>Elige tus días de entrega</Text>
        <Text style={s.subtituloConfig}>Toca un día para seleccionarlo, luego elige el horario</Text>

        {/* Chips de días */}
        <View style={s.diasRow}>
          {DIAS.map(({ key, label }) => {
            const activo = key in seleccion
            return (
              <TouchableOpacity
                key={key}
                style={[s.diaChip, activo && s.diaChipActivo]}
                onPress={() => toggleDia(key)}
              >
                <Text style={[s.diaChipTxt, activo && s.diaChipTxtActivo]}>{label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Picker vertical de hora por día seleccionado */}
        {diasSeleccionados.map(({ key, label }) => (
          <View key={key} style={s.horaSection}>
            <View style={s.horaRow}>
              <View style={s.horaDiaTag}>
                <Text style={s.horaDiaTxt}>{label}</Text>
              </View>
              <View style={s.horaPicker}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  {generarSlots(key).map(h => {
                    const activo = seleccion[key] === h
                    return (
                      <TouchableOpacity
                        key={h}
                        style={[s.horaPickerItem, activo && s.horaPickerItemActivo]}
                        onPress={() => setHora(key, h)}
                      >
                        <Text style={[s.horaPickerTxt, activo && s.horaPickerTxtActivo]}>{h}</Text>
                        {activo && <Text style={s.horaPickerCheck}>✓</Text>}
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[s.btnConfirmar, (!listo || guardando) && s.btnDeshabilitado]}
          onPress={confirmar}
          disabled={!listo || guardando}
        >
          {guardando
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnConfirmarTxt}>Confirmar mis visitas</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity style={s.btnOmitir} onPress={omitir}>
          <Text style={s.btnOmitirTxt}>Omitir por ahora</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f0f4ff' },

  // Pasos 1 y 2
  centrado:          { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emoji:             { fontSize: 64, marginBottom: 20 },
  emojiBox:          { width: 84, height: 84, borderRadius: 26, backgroundColor: '#e8f1fd', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  tituloPregunta:    { fontSize: 22, fontWeight: '800', color: '#1e293b', textAlign: 'center', marginBottom: 12 },
  subtituloPregunta: { fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  infoBox: {
    backgroundColor: '#fff3cd', borderRadius: 12, padding: 14,
    marginBottom: 28, width: '100%',
  },
  infoTxt: { fontSize: 13, color: '#92400e', lineHeight: 18 },
  btnSi:    { backgroundColor: '#0066CC', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 24, width: '100%', alignItems: 'center', marginBottom: 14 },
  btnSiTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnNo:    { paddingVertical: 12, width: '100%', alignItems: 'center' },
  btnNoTxt: { color: '#64748b', fontSize: 14 },

  // Paso 3
  scroll:       { padding: 20 },
  coordsBadge:  { backgroundColor: '#dcfce7', borderRadius: 10, padding: 10, marginBottom: 16, alignItems: 'center' },
  coordsTxt:    { fontSize: 13, fontWeight: '700', color: '#166534' },
  tituloConfig:    { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  subtituloConfig: { fontSize: 13, color: '#64748b', marginBottom: 20, lineHeight: 18 },

  diasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  diaChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: '#e2e8f0', borderWidth: 1.5, borderColor: 'transparent',
  },
  diaChipActivo:    { backgroundColor: '#dbeafe', borderColor: '#0066CC' },
  diaChipTxt:       { fontSize: 13, fontWeight: '600', color: '#64748b' },
  diaChipTxtActivo: { color: '#0066CC', fontWeight: '800' },

  horaSection: { marginBottom: 16 },
  horaRow:     { flexDirection: 'row', gap: 12 },
  horaDiaTag:  {
    width: 44, backgroundColor: '#0066CC', borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  horaDiaTxt:  { color: '#fff', fontSize: 12, fontWeight: '800' },
  horaPicker:  {
    flex: 1, backgroundColor: '#fff', borderRadius: 12,
    maxHeight: 160, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  horaPickerItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  horaPickerItemActivo: { backgroundColor: '#eff6ff' },
  horaPickerTxt:        { fontSize: 14, color: '#475569' },
  horaPickerTxtActivo:  { color: '#0066CC', fontWeight: '700' },
  horaPickerCheck:      { color: '#0066CC', fontWeight: '900', fontSize: 14 },

  btnConfirmar: {
    backgroundColor: '#0066CC', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 10,
    shadowColor: '#0066CC', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  btnDeshabilitado: { opacity: 0.4 },
  btnConfirmarTxt:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnOmitir:        { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnOmitirTxt:     { color: '#94a3b8', fontSize: 14 },
})
