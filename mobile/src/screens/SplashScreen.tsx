import React, { useEffect, useRef } from 'react'
import { View, Image, StyleSheet, Dimensions, Animated } from 'react-native'

const logo = require('../assets/logoooo.png')
const { width, height } = Dimensions.get('window')

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const scale   = useRef(new Animated.Value(0.7)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(onDone)
      }, 2600)
    })
  }, [])

  return (
    <View style={s.root}>
      <View style={s.circle1} />
      <View style={s.circle2} />
      <Animated.View style={[s.logoWrap, { opacity, transform: [{ scale }] }]}>
        <View style={s.outer}>
          <View style={s.inner}>
            <View style={s.imgWrap}>
              <Image source={logo} style={s.img} resizeMode="cover" />
            </View>
          </View>
        </View>
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
  logoWrap: { alignItems: 'center' },
  outer: {
    width: 220, height: 220, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  inner: {
    width: 175, height: 175, borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  imgWrap: { width: 140, height: 140, borderRadius: 24, overflow: 'hidden' },
  img:     { width: 140, height: 140 },
})
