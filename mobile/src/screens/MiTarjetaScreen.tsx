import React, { useCallback, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, useWindowDimensions } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useClienteAuth } from '../context/ClienteAuthContext'
import { useTarjeta, Movimiento } from '../hooks/useTarjeta'

const VERDE  = '#1f8a6c'
const OSCURO = '#163a34'
const ORO    = '#e2a93b'

// Gota dibujada con un cuadrado de tres esquinas redondas girado 45°
function Gota({ size = 14, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <View style={{
      width: size, height: size, backgroundColor: color,
      borderTopLeftRadius: size / 2, borderBottomLeftRadius: size / 2, borderBottomRightRadius: size / 2, borderTopRightRadius: 0,
      transform: [{ rotate: '-45deg' }], marginTop: size * 0.2,
    }} />
  )
}

const TEXTO_MOV: Record<Movimiento['tipo'], string> = {
  gana:   'Sumaste sellos',
  premio: 'Completaste tu tarjeta',
  canje:  'Usaste tu premio',
  caduca: 'Sellos vencidos',
  ajuste: 'Ajuste de la distribuidora',
}
const ORIGEN: Record<string, string> = { app: 'Pedido', express: 'Compra al camión', visita: 'Entrega programada', admin: '' }

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })
}

export default function MiTarjetaScreen({ navigation }: any) {
  const { cliente } = useClienteAuth()
  const { tarjeta, recargar } = useTarjeta(false)
  const [refreshing, setRefreshing] = useState(false)
  // Sellos redondos: 5 por fila, del ancho que deja la pantalla (márgenes 16 + relleno 16, espacios 10)
  const { width } = useWindowDimensions()
  const lado = Math.floor((width - 64 - 4 * 10) / 5)

  // Se actualiza cada vez que el cliente entra a la pestaña
  useFocusEffect(useCallback(() => { recargar() }, [recargar]))

  if (!tarjeta) {
    return <View style={s.centro}><ActivityIndicator size="large" color={VERDE} /></View>
  }

  if (!tarjeta.activo) {
    return (
      <View style={s.centro}>
        <Text style={s.vacioTit}>Tarjeta de fidelidad</Text>
        <Text style={s.vacioTxt}>Muy pronto podrás ganar premios por cada compra.</Text>
      </View>
    )
  }

  const completa = tarjeta.premiosDisponibles > 0
  const unidad   = tarjeta.faltan === 1 ? 'compra' : 'compras'

  return (
    <ScrollView
      style={s.fondo}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={VERDE}
        onRefresh={async () => { setRefreshing(true); await recargar(); setRefreshing(false) }} />}
    >
      <Text style={s.saludo}>Hola, {cliente?.nombre?.split(' ')[0]}</Text>
      <Text style={s.titulo}>Mi tarjeta</Text>

      {/* Tarjeta de sellos */}
      <View style={s.sellos}>
        <View style={s.fila}>
          <View>
            <Text style={s.kicker}>TARJETA DE SELLOS</Text>
            <Text style={s.sellosTit}>Premio: {tarjeta.textoPremio}</Text>
          </View>
          <View style={s.chip}><Text style={s.chipTxt}>{tarjeta.sellos} / {tarjeta.meta}</Text></View>
        </View>
        <View style={s.grid}>
          {Array.from({ length: tarjeta.meta }, (_, i) => {
            const lleno  = i < tarjeta.sellos
            const ultimo = i === tarjeta.meta - 1     // el que completa la tarjeta
            return (
              <View key={i} style={[
                s.sello, { width: lado, height: lado, borderRadius: lado / 2 },
                lleno ? s.selloLleno : ultimo ? s.selloPremio : s.selloVacio,
              ]}>
                {lleno
                  ? <Text style={[s.estrella, { fontSize: lado * 0.46, lineHeight: lado * 0.56 }]}>★</Text>
                  : ultimo
                    ? <Text style={[s.estrella, { fontSize: lado * 0.42, lineHeight: lado * 0.52, color: '#f3c965' }]}>★</Text>
                    : <Text style={s.numVacio}>{i + 1}</Text>}
              </View>
            )
          })}
        </View>
        <Text style={s.falta}>
          {tarjeta.sellos === 0 && completa
            ? 'Empieza una tarjeta nueva con tu próxima compra'
            : `Te faltan ${tarjeta.faltan} ${unidad} para ganar ${tarjeta.textoPremio}`}
        </Text>
      </View>

      {/* Premio disponible */}
      {completa && (
        <View style={s.premio}>
          <View style={s.premioBrillo} />
          <Text style={s.premioKicker}>PREMIO DISPONIBLE{tarjeta.premiosDisponibles > 1 ? ` · ${tarjeta.premiosDisponibles}` : ''}</Text>
          <Text style={s.premioTit}>{tarjeta.textoPremio}</Text>
          <Text style={s.premioSub}>Se aplica en tu próximo pedido desde la app</Text>
          <TouchableOpacity style={s.premioBtn} onPress={() => navigation.navigate('Productos')}>
            <Text style={s.premioBtnTxt}>Hacer un pedido</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Cómo funciona */}
      <View style={s.caja}>
        <Text style={s.cajaTit}>Cómo funciona</Text>
        {[
          'Cada bidón que recibes suma un sello.',
          `Al juntar ${tarjeta.meta} sellos ganas ${tarjeta.textoPremio}.`,
          'Al hacer tu pedido eliges si usar tu premio.',
        ].map((t, i) => (
          <View key={i} style={s.paso}>
            <View style={s.pasoNum}><Text style={s.pasoNumTxt}>{i + 1}</Text></View>
            <Text style={s.pasoTxt}>{t}</Text>
          </View>
        ))}
      </View>

      {/* Historial */}
      {tarjeta.movimientos.length > 0 && (
        <View style={s.caja}>
          <Text style={s.cajaTit}>Últimos movimientos</Text>
          {tarjeta.movimientos.map((m, i) => (
            <View key={i} style={[s.mov, i > 0 && s.movBorde]}>
              <View style={[s.movIco, m.tipo === 'premio' || m.tipo === 'canje' ? { backgroundColor: '#fdf1d6' } : null]}>
                <Gota size={10} color={m.tipo === 'premio' || m.tipo === 'canje' ? ORO : VERDE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.movTit}>{TEXTO_MOV[m.tipo] ?? m.tipo}</Text>
                <Text style={s.movSub}>
                  {[m.origen ? ORIGEN[m.origen] : null, m.pedidoId ? `#${m.pedidoId}` : null, fecha(m.creadoEn)].filter(Boolean).join(' · ')}
                </Text>
              </View>
              {m.tipo === 'gana' || (m.tipo === 'ajuste' && m.sellos > 0)
                ? <Text style={s.movMas}>+{m.sellos}</Text>
                : m.tipo === 'canje' ? <Text style={[s.movMas, { color: '#b27a14' }]}>Premio</Text> : null}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  fondo:  { flex: 1, backgroundColor: '#f5f6f1' },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#f5f6f1' },
  vacioTit: { fontSize: 18, fontWeight: '800', color: '#12302b', marginBottom: 6 },
  vacioTxt: { fontSize: 14, color: '#61756b', textAlign: 'center' },

  saludo: { fontSize: 13, color: '#7b8c84', fontWeight: '600' },
  titulo: { fontSize: 26, fontWeight: '900', color: '#12302b', letterSpacing: -1, marginBottom: 14 },

  sellos:    { backgroundColor: OSCURO, borderRadius: 22, padding: 16, shadowColor: OSCURO, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  fila:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker:    { fontSize: 10, letterSpacing: 1.3, color: '#8fb8aa', fontWeight: '800' },
  sellosTit: { fontSize: 15, color: '#fff', fontWeight: '800', marginTop: 3 },
  chip:      { backgroundColor: '#f3c965', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  chipTxt:   { fontSize: 12, fontWeight: '900', color: '#4a3208' },
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  sello:     { alignItems: 'center', justifyContent: 'center' },
  selloLleno:{ backgroundColor: '#2a9d7c', borderWidth: 2, borderColor: '#3cc39b' },
  selloVacio:{ borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.28)', borderStyle: 'dashed' },
  selloPremio:{ borderWidth: 2, borderColor: '#f3c965', borderStyle: 'dashed', backgroundColor: 'rgba(243,201,101,0.12)' },
  estrella:  { color: '#fff', textAlign: 'center', includeFontPadding: false, textAlignVertical: 'center' },
  numVacio:  { color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: '700' },
  falta:     { fontSize: 12.5, color: '#f1dca3', fontWeight: '600', textAlign: 'center', marginTop: 14 },

  premio:       { marginTop: 14, borderRadius: 22, padding: 16, backgroundColor: '#f0bf55', overflow: 'hidden', shadowColor: '#c88c28', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  premioBrillo: { position: 'absolute', right: -40, top: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.22)' },
  premioKicker: { fontSize: 10, letterSpacing: 1.3, color: '#7a520f', fontWeight: '900' },
  premioTit:    { fontSize: 20, fontWeight: '900', color: '#3d2a05', marginTop: 4, letterSpacing: -0.5 },
  premioSub:    { fontSize: 12, color: '#7a520f', fontWeight: '600', marginTop: 2 },
  premioBtn:    { marginTop: 12, backgroundColor: '#fff', borderRadius: 13, paddingVertical: 12, alignItems: 'center' },
  premioBtnTxt: { fontSize: 14, fontWeight: '800', color: '#176f5c' },

  caja:    { marginTop: 14, backgroundColor: '#fff', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#e6ebe4' },
  cajaTit: { fontSize: 14, fontWeight: '800', color: '#12302b', marginBottom: 8 },
  paso:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  pasoNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#e6f3ec', alignItems: 'center', justifyContent: 'center' },
  pasoNumTxt: { fontSize: 12, fontWeight: '800', color: VERDE },
  pasoTxt: { flex: 1, fontSize: 13, color: '#35544b' },

  mov:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  movBorde: { borderTopWidth: 1, borderTopColor: '#eef2ec' },
  movIco:   { width: 30, height: 30, borderRadius: 10, backgroundColor: '#e6f3ec', alignItems: 'center', justifyContent: 'center' },
  movTit:   { fontSize: 13, fontWeight: '700', color: '#1f3b36' },
  movSub:   { fontSize: 11, color: '#83948c', marginTop: 1 },
  movMas:   { fontSize: 14, fontWeight: '900', color: VERDE },
})
