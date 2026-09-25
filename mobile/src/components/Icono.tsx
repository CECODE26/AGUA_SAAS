import React from 'react'
import { View, ViewStyle } from 'react-native'

// Íconos sobrios dibujados con formas simples (la app no trae librería de íconos).
// Todos en trazo del mismo grosor y de un solo color, para una imagen más empresarial.
export type NombreIcono =
  | 'gota' | 'casa' | 'lista' | 'regalo' | 'reloj' | 'check' | 'cruz' | 'camion'
  | 'pin' | 'carrito' | 'calendario' | 'usuario' | 'correo' | 'telefono' | 'mira'

type Props = { nombre: NombreIcono; size?: number; color?: string; style?: ViewStyle }

export default function Icono({ nombre, size = 20, color = '#0f1d3e', style }: Props) {
  const s = size
  const w = Math.max(1.5, Math.round(s * 0.09 * 2) / 2)          // grosor del trazo
  const caja: ViewStyle = { width: s, height: s, alignItems: 'center', justifyContent: 'center', ...style }
  const abs = (st: ViewStyle): ViewStyle => ({ position: 'absolute', ...st })

  switch (nombre) {
    case 'gota':
      return (
        <View style={caja}>
          <View style={{
            width: s * 0.62, height: s * 0.62, backgroundColor: color, marginTop: s * 0.16,
            borderTopLeftRadius: s, borderBottomLeftRadius: s, borderBottomRightRadius: s, borderTopRightRadius: 0,
            transform: [{ rotate: '-45deg' }],
          }} />
        </View>
      )

    case 'casa':
      return (
        <View style={caja}>
          <View style={abs({ top: s * 0.1, width: s * 0.6, height: s * 0.6, borderLeftWidth: w, borderTopWidth: w, borderColor: color,
            transform: [{ rotate: '45deg' }], borderTopLeftRadius: 2 })} />
          <View style={abs({ bottom: s * 0.1, width: s * 0.62, height: s * 0.46, borderWidth: w, borderTopWidth: 0, borderColor: color,
            borderBottomLeftRadius: 2, borderBottomRightRadius: 2 })} />
          <View style={abs({ bottom: s * 0.1, width: s * 0.2, height: s * 0.26, borderWidth: w, borderBottomWidth: 0, borderColor: color })} />
        </View>
      )

    case 'lista':
      return (
        <View style={caja}>
          <View style={{ width: s * 0.66, height: s * 0.82, borderWidth: w, borderColor: color, borderRadius: s * 0.1,
            paddingHorizontal: s * 0.1, justifyContent: 'center', gap: s * 0.1 }}>
            {[1, 1, 0.6].map((f, i) => <View key={i} style={{ height: w, width: `${f * 100}%`, backgroundColor: color, borderRadius: w }} />)}
          </View>
        </View>
      )

    case 'regalo':
      return (
        <View style={caja}>
          <View style={abs({ top: s * 0.26, width: s * 0.84, height: s * 0.2, borderWidth: w, borderColor: color, borderRadius: 2 })} />
          <View style={abs({ top: s * 0.46 - w, width: s * 0.7, height: s * 0.44, borderWidth: w, borderColor: color, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 })} />
          <View style={abs({ top: s * 0.26, width: w, height: s * 0.64, backgroundColor: color })} />
          <View style={abs({ top: s * 0.06, left: s * 0.26, width: s * 0.24, height: s * 0.22, borderWidth: w, borderColor: color, borderRadius: s, transform: [{ rotate: '-25deg' }] })} />
          <View style={abs({ top: s * 0.06, right: s * 0.26, width: s * 0.24, height: s * 0.22, borderWidth: w, borderColor: color, borderRadius: s, transform: [{ rotate: '25deg' }] })} />
        </View>
      )

    case 'reloj':
      return (
        <View style={caja}>
          <View style={{ width: s * 0.82, height: s * 0.82, borderRadius: s, borderWidth: w, borderColor: color }} />
          <View style={abs({ top: s * 0.26, width: w, height: s * 0.26, backgroundColor: color, borderRadius: w })} />
          <View style={abs({ top: s * 0.5 - w / 2, left: s * 0.5 - w / 2, width: s * 0.2, height: w, backgroundColor: color, borderRadius: w })} />
        </View>
      )

    case 'check':
      return (
        <View style={caja}>
          <View style={{ width: s * 0.3, height: s * 0.58, borderRightWidth: w * 1.2, borderBottomWidth: w * 1.2, borderColor: color,
            transform: [{ rotate: '45deg' }], marginTop: -s * 0.12 }} />
        </View>
      )

    case 'cruz':
      return (
        <View style={caja}>
          <View style={abs({ width: s * 0.7, height: w * 1.2, backgroundColor: color, borderRadius: w, transform: [{ rotate: '45deg' }] })} />
          <View style={abs({ width: s * 0.7, height: w * 1.2, backgroundColor: color, borderRadius: w, transform: [{ rotate: '-45deg' }] })} />
        </View>
      )

    case 'camion':
      return (
        <View style={caja}>
          <View style={abs({ left: s * 0.04, top: s * 0.24, width: s * 0.56, height: s * 0.42, borderWidth: w, borderColor: color, borderRadius: 2 })} />
          <View style={abs({ left: s * 0.6 - w, top: s * 0.38, width: s * 0.34, height: s * 0.28, borderWidth: w, borderColor: color, borderTopRightRadius: s * 0.12, borderBottomRightRadius: 2 })} />
          <View style={abs({ left: s * 0.14, top: s * 0.62, width: s * 0.2, height: s * 0.2, borderRadius: s, backgroundColor: color })} />
          <View style={abs({ left: s * 0.66, top: s * 0.62, width: s * 0.2, height: s * 0.2, borderRadius: s, backgroundColor: color })} />
        </View>
      )

    case 'pin':
      return (
        <View style={caja}>
          <View style={{ width: s * 0.62, height: s * 0.62, borderWidth: w, borderColor: color, marginTop: -s * 0.12,
            borderTopLeftRadius: s, borderTopRightRadius: s, borderBottomLeftRadius: s, borderBottomRightRadius: 0,
            transform: [{ rotate: '45deg' }], alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: s * 0.18, height: s * 0.18, borderRadius: s, backgroundColor: color }} />
          </View>
        </View>
      )

    case 'carrito':
      return (
        <View style={caja}>
          <View style={abs({ top: s * 0.14, left: s * 0.02, width: s * 0.2, height: w, backgroundColor: color, borderRadius: w })} />
          <View style={abs({ top: s * 0.24, left: s * 0.18, width: s * 0.72, height: s * 0.38, borderWidth: w, borderColor: color,
            borderBottomLeftRadius: s * 0.08, borderBottomRightRadius: s * 0.08 })} />
          <View style={abs({ top: s * 0.7, left: s * 0.28, width: s * 0.16, height: s * 0.16, borderRadius: s, backgroundColor: color })} />
          <View style={abs({ top: s * 0.7, left: s * 0.66, width: s * 0.16, height: s * 0.16, borderRadius: s, backgroundColor: color })} />
        </View>
      )

    case 'calendario':
      return (
        <View style={caja}>
          <View style={{ width: s * 0.8, height: s * 0.72, borderWidth: w, borderColor: color, borderRadius: s * 0.1, marginTop: s * 0.08, overflow: 'hidden' }}>
            <View style={{ height: s * 0.18, backgroundColor: color }} />
          </View>
          <View style={abs({ top: s * 0.04, left: s * 0.3, width: w, height: s * 0.18, backgroundColor: color, borderRadius: w })} />
          <View style={abs({ top: s * 0.04, right: s * 0.3, width: w, height: s * 0.18, backgroundColor: color, borderRadius: w })} />
        </View>
      )

    case 'usuario':
      return (
        <View style={caja}>
          <View style={abs({ top: s * 0.08, width: s * 0.36, height: s * 0.36, borderRadius: s, borderWidth: w, borderColor: color })} />
          <View style={abs({ bottom: s * 0.06, width: s * 0.7, height: s * 0.34, borderWidth: w, borderBottomWidth: 0, borderColor: color,
            borderTopLeftRadius: s * 0.35, borderTopRightRadius: s * 0.35 })} />
        </View>
      )

    case 'correo':
      return (
        <View style={caja}>
          <View style={{ width: s * 0.84, height: s * 0.6, borderWidth: w, borderColor: color, borderRadius: s * 0.08, overflow: 'hidden', alignItems: 'center' }}>
            <View style={{ width: s * 0.5, height: s * 0.5, borderRightWidth: w, borderBottomWidth: w, borderColor: color, transform: [{ rotate: '45deg' }], marginTop: -s * 0.34 }} />
          </View>
        </View>
      )

    case 'telefono':
      return (
        <View style={caja}>
          <View style={{ width: s * 0.5, height: s * 0.84, borderWidth: w, borderColor: color, borderRadius: s * 0.12, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: s * 0.08 }}>
            <View style={{ width: s * 0.14, height: w, backgroundColor: color, borderRadius: w }} />
          </View>
        </View>
      )

    case 'mira':   // ubicación actual (GPS)
      return (
        <View style={caja}>
          <View style={{ width: s * 0.6, height: s * 0.6, borderRadius: s, borderWidth: w, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: s * 0.2, height: s * 0.2, borderRadius: s, backgroundColor: color }} />
          </View>
          <View style={abs({ top: 0, width: w, height: s * 0.2, backgroundColor: color })} />
          <View style={abs({ bottom: 0, width: w, height: s * 0.2, backgroundColor: color })} />
          <View style={abs({ left: 0, width: s * 0.2, height: w, backgroundColor: color })} />
          <View style={abs({ right: 0, width: s * 0.2, height: w, backgroundColor: color })} />
        </View>
      )
  }
  return null
}
