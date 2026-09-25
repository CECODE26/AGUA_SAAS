import React, { useEffect, useState, useCallback } from 'react'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, RefreshControl,
} from 'react-native'
import { Swipeable } from 'react-native-gesture-handler'
import { useClienteAuth } from '../context/ClienteAuthContext'
import { apiUrl, fetchT, NOMBRE_MARCA } from '../api'
import Icono, { NombreIcono } from '../components/Icono'

type EstadoKey = 'pendiente' | 'entregado' | 'suspendido'

const ESTADO: Record<EstadoKey, { bg: string; border: string; color: string; icon: NombreIcono; label: string; msg: string }> = {
  pendiente:  { bg: '#eef4fc', border: '#cfe0f5', color: '#1d4f91', icon: 'reloj', label: 'En preparación', msg: 'Tu pedido está siendo preparado. Te contactaremos pronto para coordinar la entrega.' },
  entregado:  { bg: '#effaf4', border: '#c6ead6', color: '#166534', icon: 'check', label: 'Entregado',      msg: 'Tu pedido fue entregado correctamente. Gracias por confiar en ' + NOMBRE_MARCA + '.' },
  suspendido: { bg: '#fdf2f3', border: '#f3cfd4', color: '#9f1239', icon: 'cruz',  label: 'Cancelado',      msg: 'Pedido cancelado. Si tienes dudas contáctanos al (03) 2936000.' },
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-EC', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function MisPedidosScreen() {
  const { cliente, token } = useClienteAuth()
  const [pedidos,    setPedidos]    = useState<any[]>([])
  const [cargando,   setCargando]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expanded,   setExpanded]   = useState<Record<number, boolean>>({})
  const [cancelando, setCancelando] = useState<number | null>(null)

  const cargar = useCallback(async () => {
    if (!cliente?.email) return
    try {
      const res  = await fetchT(apiUrl(`/api/pedidos/cliente/${encodeURIComponent(cliente.email)}`))
      const data = await res.json()
      setPedidos(data.pedidos || [])
    } catch {}
    finally { setCargando(false); setRefreshing(false) }
  }, [cliente?.email])

  useEffect(() => { cargar() }, [cargar])
  useAutoRefresh(cargar, 5000)

  function toggle(id: number) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function renderCancelAction(pedidoId: number) {
    const loading = cancelando === pedidoId
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={s.swipeAction}
        onPress={() => cancelar(pedidoId)}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Text style={s.swipeActionIcon}>×</Text>
            <Text style={s.swipeActionText}>Cancelar</Text>
          </>
        )}
      </TouchableOpacity>
    )
  }

  function renderPedido(p: any) {
    const b   = ESTADO[(p.estado as EstadoKey)] ?? ESTADO.pendiente
    const exp = expanded[p.id]
    const esPendiente = p.estado === 'pendiente'
    const card = (
      <View style={[s.orderCard, exp && s.orderCardExpanded]}>
        <TouchableOpacity style={s.orderHead} onPress={() => toggle(p.id)} activeOpacity={0.85}>
          <View style={[s.orderStatusIcon, { backgroundColor: b.bg, borderColor: b.border }]}>
            <Icono nombre={b.icon} size={20} color={b.color} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={s.orderTitleRow}>
              <Text style={s.orderNum}>Pedido #{p.id}</Text>
              <View style={[s.statusBadge, { backgroundColor: b.bg, borderColor: b.border }]}>
                <Text style={[s.statusBadgeText, { color: b.color }]}>{b.label}</Text>
              </View>
            </View>
            <Text style={s.orderDate}>{formatFecha(p.creadoEn)}</Text>
            {esPendiente && <Text style={s.swipeHint}>Desliza hacia la izquierda para cancelar</Text>}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={s.orderTotal}>${parseFloat(p.total).toFixed(2)}</Text>
            <Text style={s.expandMark}>{exp ? '↑' : '↓'}</Text>
          </View>
        </TouchableOpacity>

        {exp && (
          <View style={s.orderDetail}>
            <View style={s.itemsBox}>
              {p.items.map((item: any, i: number) => (
                <View key={i} style={[s.itemRow, i < p.items.length - 1 && s.itemRowBorder]}>
                  <Text style={s.itemName}>{item.nombre} <Text style={{ color: '#94a3b8' }}>×{item.cantidad}</Text></Text>
                  {Number(item.precioUnitario) <= 0
                    ? <Text style={[s.itemPrice, { color: '#b27a14' }]}>Gratis · premio</Text>
                    : <Text style={s.itemPrice}>${(item.precioUnitario * item.cantidad).toFixed(2)}</Text>}
                </View>
              ))}
              {p.descuentoFidelidad > 0 && (
                <View style={[s.itemRow, { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 6 }]}>
                  <Text style={[s.itemName, { color: '#b27a14', fontWeight: '700' }]}>Premio de fidelidad</Text>
                  <Text style={[s.itemPrice, { color: '#b27a14' }]}>-${Number(p.descuentoFidelidad).toFixed(2)}</Text>
                </View>
              )}
              <View style={s.itemTotal}>
                <Text style={s.itemTotalLabel}>Total</Text>
                <Text style={s.itemTotalVal}>${parseFloat(p.total).toFixed(2)}</Text>
              </View>
            </View>
            <View style={s.statusMsg}>
              <Icono nombre={b.icon} size={15} color={b.color} />
              <Text style={s.statusMsgText}>{b.msg}</Text>
            </View>
          </View>
        )}
      </View>
    )

    if (!esPendiente) {
      return <View key={p.id} style={s.swipeWrap}>{card}</View>
    }

    return (
      <Swipeable
        key={p.id}
        containerStyle={s.swipeWrap}
        renderRightActions={() => renderCancelAction(p.id)}
        rightThreshold={42}
        friction={1.8}
        overshootRight={false}
      >
        {card}
      </Swipeable>
    )
  }

  async function cancelar(pedidoId: number) {
    Alert.alert(
      'Cancelar pedido',
      '¿Estás seguro de que quieres cancelar este pedido?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            setCancelando(pedidoId)
            try {
              const res  = await fetchT(apiUrl(`/api/pedidos/${pedidoId}/cancelar`), {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` },
              })
              const data = await res.json()
              if (!data.success) { Alert.alert('Error', data.message); return }
              setPedidos(prev => prev.map(p =>
                p.id === pedidoId ? { ...p, estado: 'suspendido' } : p
              ))
            } catch {
              Alert.alert('Error', 'No se pudo cancelar el pedido')
            } finally { setCancelando(null) }
          },
        },
      ]
    )
  }

  if (cargando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4ff' }}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    )
  }

  return (
    <ScrollView
      style={s.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar() }} tintColor="#0066CC" />}
    >
      {/* HERO */}
      <View style={s.hero}>
        <View style={s.heroIcon}><Icono nombre="lista" size={26} color="#fff" /></View>
        <Text style={s.heroTitle}>Mis pedidos</Text>
        <Text style={s.heroSub}>Hola {cliente?.nombre?.split(' ')[0]} · {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''}</Text>
      </View>

      <View style={{ padding: 14 }}>

        {pedidos.length === 0 ? (
          <View style={s.emptyCard}>
            <View style={{ marginBottom: 12 }}><Icono nombre="lista" size={44} color="#94a3b8" /></View>
            <Text style={s.emptyTitle}>Sin pedidos aún</Text>
            <Text style={s.emptyDesc}>Cuando hagas tu primer pedido{'\n'}aparecerá aquí.</Text>
          </View>
        ) : (
          pedidos.map(renderPedido)
        )}
        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },

  hero: { backgroundColor: '#0066CC', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 26 },
  heroIcon: { width: 50, height: 50, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  heroTitle: { color: '#fff', fontWeight: '900', fontSize: 22, marginBottom: 3 },
  heroSub:   { color: 'rgba(255,255,255,0.6)', fontSize: 12 },

  emptyCard: { backgroundColor: '#fff', borderRadius: 20, padding: 40, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } },
  emptyTitle: { fontWeight: '800', fontSize: 16, color: '#0f1d3e', marginBottom: 6 },
  emptyDesc:  { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },

  swipeWrap:         { marginBottom: 12, borderRadius: 20, overflow: 'hidden' },
  swipeAction:       { width: 104, backgroundColor: '#dc2626', justifyContent: 'center', alignItems: 'center' },
  swipeActionIcon:   { color: '#fff', fontSize: 24, lineHeight: 24, fontWeight: '900' },
  swipeActionText:   { color: '#fff', fontSize: 12, fontWeight: '900', marginTop: 4 },
  swipeHint:         { color: '#64748b', fontSize: 10, fontWeight: '700', marginTop: 5 },

  orderCard:         { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } },
  orderCardExpanded: { borderColor: '#0066CC33' },
  orderHead:         { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  orderStatusIcon:   { width: 42, height: 42, borderRadius: 12, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  orderTitleRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' },
  orderNum:          { fontWeight: '800', fontSize: 14, color: '#0f1d3e' },
  orderDate:         { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  orderTotal:        { fontSize: 16, fontWeight: '900', color: '#0066CC' },
  expandMark:        { color: '#94a3b8', fontSize: 15, fontWeight: '900' },

  statusBadge:     { borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },

  orderDetail:   { borderTopWidth: 1, borderTopColor: '#f1f5f9', padding: 14 },
  itemsBox:      { backgroundColor: '#f8fafc', borderRadius: 12, padding: 10, marginBottom: 10 },
  itemRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 6, marginBottom: 6 },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  itemName:      { fontSize: 12, color: '#374151' },
  itemPrice:     { fontSize: 12, fontWeight: '700', color: '#0f1d3e' },
  itemTotal:     { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, marginTop: 4, borderTopWidth: 1.5, borderTopColor: '#e5e7eb' },
  itemTotalLabel: { fontSize: 14, fontWeight: '900', color: '#0066CC' },
  itemTotalVal:   { fontSize: 14, fontWeight: '900', color: '#0066CC' },

  statusMsg:     { borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e9f0', padding: 10, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  statusMsgText: { fontSize: 12, lineHeight: 17, flex: 1, color: '#475569' },
})
