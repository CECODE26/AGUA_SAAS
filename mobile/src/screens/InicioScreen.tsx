import React, { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useCart } from '../context/CartContext'
import { useClienteAuth } from '../context/ClienteAuthContext'
import { apiUrl } from '../api'
import ProductCard, { type Producto } from '../components/ProductCard'
import Icono from '../components/Icono'

export default function InicioScreen() {
  const navigation = useNavigation<any>()
  const { count } = useCart()
  const { cliente } = useClienteAuth()

  const [productos, setProductos] = useState<Producto[]>([])
  const [hora, setHora] = useState('')

  useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) setHora('Buenos días')
    else if (h < 19) setHora('Buenas tardes')
    else setHora('Buenas noches')

    fetch(apiUrl('/api/productos'))
      .then(r => r.json())
      .then(d => setProductos(d.productos || []))
      .catch(() => {})
  }, [])

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: count > 0 ? 100 : 30 }}>

      {/* HERO */}
      <View style={s.hero}>
        <View style={s.heroTop}>
          <View>
            <Text style={s.heroGreeting}>{hora}</Text>
            {cliente && <Text style={s.heroNombre}>{cliente.nombre.split(' ')[0]}</Text>}
          </View>
        </View>
        <Text style={s.heroTitle}>Agua pura{'\n'}<Text style={s.heroAccent}>directo a ti</Text></Text>
        <Text style={s.heroSub}>Entrega a domicilio en Puyo y alrededores</Text>

        {count > 0 && (
          <TouchableOpacity style={s.cartPill} onPress={() => navigation.navigate('Productos')}>
            <Text style={s.cartPillText}>{count} producto{count > 1 ? 's' : ''} en tu carrito — Pedir →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* PRODUCTO ESTRELLA — solo el primero, no cambia si se agregan más */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Producto destacado</Text>
        <View style={s.grid}>
          {productos.slice(0, 1).map(p => (
            <ProductCard key={p.id} p={p} readOnly onPress={() => navigation.navigate('Productos')} />
          ))}
        </View>
        <TouchableOpacity style={s.ctaBtn} onPress={() => navigation.navigate('Productos')}>
          <Text style={s.ctaBtnText}>Ver todos los productos</Text>
        </TouchableOpacity>

        {/* Card visitas fijas */}
        <TouchableOpacity
          style={s.visitaCardRow}
          onPress={() => navigation.navigate('ConfigurarVisitas', { desdeApp: true })}
        >
          <View style={s.visitaIconBox}><Icono nombre="calendario" size={22} color="#0066CC" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.visitaTitulo}>Visitas fijas programadas</Text>
            {cliente?.visitasHorario && cliente.visitasHorario.length > 0 ? (
              <Text style={s.visitaDiasTxt}>
                {cliente.visitasHorario.map(v => v.dia.charAt(0).toUpperCase() + v.dia.slice(1, 3)).join(' · ')}
              </Text>
            ) : (
              <Text style={[s.visitaDiasTxt, { color: '#94a3b8' }]}>Sin programar — toca para agendar</Text>
            )}
          </View>
          {cliente?.visitasHorario && cliente.visitasHorario.length > 0 && (
            <View style={s.visitaActivoBadge}><Icono nombre="check" size={14} color="#fff" /></View>
          )}
        </TouchableOpacity>
      </View>

      {/* BANNER ENTREGA */}
      <View style={s.section}>
        <View style={s.deliveryBanner}>
          <View style={s.deliveryIcon}><Icono nombre="camion" size={28} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.deliveryTitle}>Entrega a domicilio</Text>
            <Text style={s.deliverySub}>Puyo y zonas cercanas · Sin costo mínimo. Te contactamos para coordinar.</Text>
          </View>
        </View>
      </View>

    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },

  hero: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  heroTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  heroNombre:  { color: '#fff', fontSize: 15, fontWeight: '900', marginTop: 0 },
  heroGreeting: { color: 'rgba(255,255,255,0.65)', fontSize: 9, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  heroTitle:    { color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 24, marginBottom: 2 },
  heroAccent:   { color: '#7dd3fc' },
  heroSub:      { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginBottom: 6, lineHeight: 14 },

  cartPill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8,
    alignSelf: 'flex-start', marginBottom: 12,
  },
  cartPillText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  ctaBtn: {
    backgroundColor: '#fff', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  ctaBtnText: { color: '#0066CC', fontSize: 15, fontWeight: '800' },

  section: { paddingHorizontal: 14, paddingTop: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f1d3e' },
  sectionLink:  { fontSize: 13, fontWeight: '700', color: '#0066CC' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },

  // Card visitas fijas (fila)
  visitaCardRow: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderColor: '#bbf7d0',
    shadowColor: '#009E53', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 2 },
  },
  visitaIconBox: {
    width: 42, height: 42, backgroundColor: '#e8f5ee',
    borderRadius: 11, justifyContent: 'center', alignItems: 'center',
  },
  visitaActivoBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#009E53', justifyContent: 'center', alignItems: 'center',
  },
  visitaActivoTxt: { color: '#fff', fontSize: 12, fontWeight: '900' },
  visitaTitulo:    { fontSize: 13, fontWeight: '700', color: '#0f1d3e', marginBottom: 3 },
  visitaDiasTxt:   { fontSize: 11, fontWeight: '600', color: '#009E53' },

  deliveryBanner: {
    backgroundColor: '#009E53',
    borderRadius: 20, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  deliveryIcon: {
    width: 52, height: 52, backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  deliveryTitle: { color: '#fff', fontWeight: '800', fontSize: 14, marginBottom: 2 },
  deliverySub:   { color: 'rgba(255,255,255,0.8)', fontSize: 12, lineHeight: 17 },

  featureCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  featureIcon: {
    width: 44, height: 44, backgroundColor: '#f0f9ff',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  featureTitle: { fontSize: 13, fontWeight: '700', color: '#0f1d3e', marginBottom: 2 },
  featureDesc:  { fontSize: 11, color: '#64748b', lineHeight: 15 },

  ctaFinal: {
    backgroundColor: '#0066CC', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#0066CC', shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
  },
  ctaFinalText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  ctaNote: { textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 10 },
})
