import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native'
import { useCart } from '../context/CartContext'
import { apiUrl } from '../api'
import Icono from './Icono'

export type Producto = {
  id: number; nombre: string; precio: string
  descripcion: string; stock: number; tag?: string; imagen?: string | null
}

export default function ProductCard({ p, onPress, readOnly }: { p: Producto; onPress?: () => void; readOnly?: boolean }) {
  const { addItem, items } = useCart()
  const [flash, setFlash] = useState(false)
  const agotado = p.stock === 0
  const enCarrito = items.find(i => i.nombre === p.nombre)

  function handleAdd() {
    if (agotado || readOnly) return
    addItem(p.nombre, parseFloat(p.precio))
    setFlash(true)
    setTimeout(() => setFlash(false), 700)
  }

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      style={[s.card, agotado && !readOnly && { opacity: 0.55 }, flash && s.cardFlash]}
    >
      {p.tag && !agotado && (
        <View style={s.tagBadge}><Text style={s.tagText}>{p.tag}</Text></View>
      )}
      {agotado && (
        <View style={[s.tagBadge, { backgroundColor: '#9ca3af' }]}>
          <Text style={s.tagText}>Agotado</Text>
        </View>
      )}
      <View style={s.imgBox}>
        {p.imagen
          ? <Image source={{ uri: apiUrl(`/uploads/${p.imagen}`) }} style={s.imgFoto} resizeMode="contain" />
          : <Icono nombre="gota" size={64} color="#5aa9e6" />
        }
      </View>
      <View style={s.cardBody}>
        <Text style={s.cardName}>{p.nombre}</Text>
        <Text style={s.starsRow} numberOfLines={1}>
          <Text style={s.starsFull}>★★★★★</Text>
          <Text style={s.starsVal}> 5.0</Text>
        </Text>
        {!!p.descripcion && <Text style={s.cardDesc} numberOfLines={2}>{p.descripcion}</Text>}
        <View style={s.cardFoot}>
          <View>
            <Text style={s.cardPrice}>${parseFloat(p.precio).toFixed(2)}</Text>
            {enCarrito && !readOnly && <Text style={s.enCarrito}>×{enCarrito.cantidad} en carrito</Text>}
          </View>
          {!readOnly && (
            <TouchableOpacity
              style={[s.addBtn, flash && s.addBtnFlash, agotado && s.addBtnDisabled]}
              onPress={handleAdd} disabled={agotado}
            >
              <Text style={[s.addBtnText, agotado && { color: '#9ca3af' }]}>
                {flash ? '✓' : '+'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  card:      { backgroundColor: '#fff', borderRadius: 20, width: '47.5%', overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } },
  cardFlash: { borderColor: '#0066CC' },
  tagBadge:  { position: 'absolute', top: 10, left: 10, zIndex: 2, backgroundColor: '#0066CC', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  tagText:   { color: '#fff', fontSize: 9, fontWeight: '700' },
  imgBox:    { width: '100%', aspectRatio: 1, backgroundColor: '#e8f0fd', justifyContent: 'center', alignItems: 'center' },
  imgEmoji:  { fontSize: 48 },
  imgFoto:   { width: '100%', height: '100%' },
  cardBody:  { padding: 12 },
  cardName:  { fontSize: 13, fontWeight: '800', color: '#0f1d3e', marginBottom: 3, lineHeight: 17 },
  starsRow:  { fontSize: 11, marginBottom: 4 },
  starsFull: { color: '#f59e0b' },
  starsHalf: { color: '#d1d5db' },
  starsVal:  { fontSize: 10, color: '#64748b', fontWeight: '700' },
  cardDesc:  { fontSize: 10, color: '#94a3b8', marginBottom: 7, lineHeight: 14 },
  cardFoot:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardPrice:      { fontSize: 16, fontWeight: '900', color: '#0066CC' },
  enCarrito:      { fontSize: 10, color: '#0066CC', fontWeight: '700', marginTop: 1 },
  addBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0066CC', justifyContent: 'center', alignItems: 'center', shadowColor: '#0066CC', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  addBtnFlash:    { backgroundColor: '#16a34a' },
  addBtnDisabled: { backgroundColor: '#e5e7eb', shadowOpacity: 0 },
  addBtnText:     { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 26 },
})
