import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Image, Animated,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NOMBRE_MARCA } from '../api'

const logo = require('../assets/logoooo.png')
const { width, height } = Dimensions.get('window')
const CARD_H = height * 0.38

const BUBBLES = [
  { x: 0.12, size: 14, delay: 100,  dur: 2600 },
  { x: 0.32, size: 22, delay: 350,  dur: 3000 },
  { x: 0.52, size: 10, delay: 700,  dur: 2400 },
  { x: 0.70, size: 18, delay: 150,  dur: 2900 },
  { x: 0.22, size: 12, delay: 550,  dur: 2700 },
  { x: 0.60, size: 26, delay: 50,   dur: 3300 },
  { x: 0.84, size: 10, delay: 850,  dur: 2500 },
  { x: 0.44, size: 16, delay: 250,  dur: 3100 },
  { x: 0.78, size: 20, delay: 450,  dur: 2800 },
]

function Burbuja({ x, size, delay, dur }: { x: number; size: number; delay: number; dur: number }) {
  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(anim, { toValue: 1, duration: dur, useNativeDriver: true }),
    ]).start()
  }, [])

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -(height * 0.65)] })
  const opacity    = anim.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 0.75, 0.5, 0] })
  const scale      = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1, 0.7] })

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: CARD_H + 10,
        left: x * width - size / 2,
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)',
        transform: [{ translateY }, { scale }],
        opacity,
      }}
    />
  )
}

export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [splashDone, setSplashDone] = useState(false)

  const logoScale   = useRef(new Animated.Value(0.6)).current
  const logoOpacity = useRef(new Animated.Value(0)).current
  const cardY       = useRef(new Animated.Value(CARD_H + 80)).current
  const logoY       = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(logoScale,   { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(cardY,     { toValue: 0, friction: 8, tension: 55, useNativeDriver: true }),
          Animated.timing(logoY,     { toValue: -height * 0.08, duration: 500, useNativeDriver: true }),
          Animated.timing(logoScale, { toValue: 0.75, duration: 500, useNativeDriver: true }),
        ]).start(() => setSplashDone(true))
      }, 1800)
    })
  }, [])

  async function handleEmpezar() {
    await AsyncStorage.setItem('onboarding_done', '1')
    onDone()
  }

  return (
    <View style={s.root}>
      {/* Círculos decorativos */}
      <View style={s.circle1} />
      <View style={s.circle2} />

      {/* Burbujas */}
      {BUBBLES.map((b, i) => <Burbuja key={i} {...b} />)}

      {/* Logo animado (siempre visible) */}
      <Animated.View style={[s.logoWrap, {
        opacity: logoOpacity,
        transform: [{ scale: logoScale }, { translateY: logoY }],
      }]}>
        <View style={s.iconOuter}>
          <View style={s.iconInner}>
            <View style={s.logoImgWrap}>
              <Image source={logo} style={s.logoImg} resizeMode="cover" />
            </View>
          </View>
        </View>
        <Text style={s.brand}>{NOMBRE_MARCA}</Text>
      </Animated.View>

      {/* Card blanca — sube tras el splash */}
      <Animated.View style={[s.card, { transform: [{ translateY: cardY }] }]}>
        <Text style={s.titulo}>Bienvenido a{'\n'}<Text style={s.tituloAccent}>{NOMBRE_MARCA}</Text></Text>
        <Text style={s.desc}>Agua pura entregada directo a tu puerta en Puyo y alrededores.</Text>

        {splashDone && (
          <TouchableOpacity style={s.btn} onPress={handleEmpezar}>
            <Text style={s.btnTxt}>¡Empezar! 💧</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0066CC', alignItems: 'center', justifyContent: 'center' },

  circle1: {
    position: 'absolute', width: 320, height: 320, borderRadius: 160,
    top: -80, right: -80, backgroundColor: '#3b8fff', opacity: 0.35,
  },
  circle2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    top: height * 0.18, left: -60, backgroundColor: '#3b8fff', opacity: 0.2,
  },

  logoWrap:   { alignItems: 'center', marginBottom: 20 },
  iconOuter:  {
    width: 230, height: 230, borderRadius: 46,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  iconInner:  {
    width: 185, height: 185, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  logoImgWrap:{ width: 150, height: 150, borderRadius: 26, overflow: 'hidden' },
  logoImg:    { width: 150, height: 150 },
  brand:      { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1.5, marginTop: 20 },

  card: {
    position: 'absolute', bottom: 0, width,
    height: CARD_H,
    backgroundColor: '#fff',
    borderTopLeftRadius: 36, borderTopRightRadius: 36,
    paddingHorizontal: 32, paddingTop: 36,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: -4 },
  },
  titulo:       { fontSize: 28, fontWeight: '900', color: '#0f1d3e', lineHeight: 34, marginBottom: 12 },
  tituloAccent: { color: '#0066CC' },
  desc:         { fontSize: 15, color: '#64748b', lineHeight: 23, marginBottom: 28 },

  btn: {
    backgroundColor: '#0066CC', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#0066CC', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
})
