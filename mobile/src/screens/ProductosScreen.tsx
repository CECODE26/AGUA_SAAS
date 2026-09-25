import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Modal, TextInput, Animated,
  KeyboardAvoidingView, ActivityIndicator, Alert, Switch, DeviceEventEmitter,
} from 'react-native'
import { WebView } from 'react-native-webview'
import * as Location from 'expo-location'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useCart } from '../context/CartContext'
import { useClienteAuth } from '../context/ClienteAuthContext'
import { apiUrl, fetchT } from '../api'
import { useTarjeta } from '../hooks/useTarjeta'
import Icono from '../components/Icono'
import leafletData from './conductor/leafletHtml.json'
import ProductCard, { type Producto as ProductoCard } from '../components/ProductCard'

const PUYO = { lat: -1.4924, lng: -77.9979 }

type Producto = {
  id: number; nombre: string; precio: string
  descripcion: string; stock: number; tag?: string; imagen?: string | null
}

type FormData = {
  nombre: string; email: string; telefono: string
  lat: number | null; lng: number | null; referencia: string
}

// Script inyectado en el HTML del conductor — reemplaza la inicialización del mapa del conductor
// con la lógica del picker. Se evalúa con las coordenadas iniciales concretas.
function buildPickerScript(initLat: number, initLng: number, tileUrl: string) {
  return `<script>
window.onerror=function(m,s,l,c,e){
  window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'maperr',message:String(m),line:l}));
};
var map=L.map('map',{zoomControl:false,attributionControl:false});
map.setView([${initLat},${initLng}],16);
var tl=L.tileLayer('${tileUrl}',{maxZoom:19});
tl.on('tileload',function(){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'tileok'}));});
tl.on('tileerror',function(e){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'tileerr',url:e.tile&&e.tile.src}));});
tl.addTo(map);
L.control.zoom({position:'bottomright'}).addTo(map);
var marker=null;
var pinIcon=L.divIcon({className:'',html:'<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:#0066CC;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 3px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center"><div style="width:8px;height:8px;border-radius:50%;background:#fff"></div></div>',iconSize:[32,32],iconAnchor:[16,34]});
function post(lat,lng){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'select',lat:lat,lng:lng}));}
function setMarker(lat,lng,center){
  if(!marker){marker=L.marker([lat,lng],{draggable:true,icon:pinIcon}).addTo(map);marker.on('dragend',function(){var p=marker.getLatLng();post(p.lat,p.lng);});}
  else{marker.setLatLng([lat,lng]);}
  if(center){map.setView([lat,lng],16);}
}
setMarker(${initLat},${initLng},false);
map.on('click',function(e){setMarker(e.latlng.lat,e.latlng.lng,false);post(e.latlng.lat,e.latlng.lng);});
document.addEventListener('message',function(e){try{var d=JSON.parse(e.data);if(d.type==='set'){setMarker(d.lat,d.lng,true);}}catch(_){}});
window.addEventListener('message',function(e){try{var d=JSON.parse(e.data);if(d.type==='set'){setMarker(d.lat,d.lng,true);}}catch(_){}});
map.whenReady(function(){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'mapready'}));});
<\/script>
</body>
</html>`
}

// ── Picker de mapa — View puro (NO Modal) para que el WebView acceda a la red sin restricciones
function MapPickerView({
  initLat, initLng, onConfirm, onClose,
}: {
  initLat: number; initLng: number
  onConfirm: (lat: number, lng: number) => void
  onClose: () => void
}) {
  const insets = useSafeAreaInsets()
  const mapRef = useRef<any>(null)
  const [pin, setPin] = useState({ lat: initLat, lng: initLng })
  const [gpsLoading, setGpsLoading] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const progress = useRef(new Animated.Value(0)).current

  const tileUrl = apiUrl('/api/map-tiles/{z}/{x}/{y}')
  const pickerHtml = leafletData.html
    .replace('mix-blend-mode:plus-lighter', 'mix-blend-mode:normal')
    .replace(/<script>var map=[\s\S]*?<\/script>\s*<\/body>\s*<\/html>\s*$/, buildPickerScript(initLat, initLng, tileUrl))

  useEffect(() => {
    Animated.timing(progress, { toValue: 0.85, duration: 3000, useNativeDriver: false }).start()
    const timeout = setTimeout(() => {
      Animated.timing(progress, { toValue: 1, duration: 300, useNativeDriver: false }).start(() => setMapReady(true))
    }, 12000)
    return () => clearTimeout(timeout)
  }, [])

  async function usarGPS() {
    setGpsLoading(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Activa la ubicación en ajustes para usar el GPS.')
        return
      }
      let loc: Location.LocationObject | null = null
      try {
        loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      } catch {
        loc = await Location.getLastKnownPositionAsync({ maxAge: 60000 })
      }
      if (!loc) {
        Alert.alert('GPS no disponible', 'Toca el mapa para marcar tu punto de entrega.')
        return
      }
      const { latitude: lat, longitude: lng } = loc.coords
      setPin({ lat, lng })
      mapRef.current?.postMessage(JSON.stringify({ type: 'set', lat, lng }))
    } catch {
      Alert.alert('GPS no disponible', 'Toca el mapa para marcar tu punto de entrega.')
    } finally { setGpsLoading(false) }
  }

  function onMapMessage(evt: any) {
    try {
      const msg = JSON.parse(evt.nativeEvent.data)
      if (msg.type === 'select') setPin({ lat: msg.lat, lng: msg.lng })
      if (msg.type === 'mapready') {
        Animated.timing(progress, { toValue: 1, duration: 300, useNativeDriver: false }).start(() => setMapReady(true))
      }
    } catch {}
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header */}
      <View style={[mp.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={onClose} style={mp.closeBtn}>
          <Text style={mp.closeTxt}>✕</Text>
        </TouchableOpacity>
        <Text style={mp.title}>Punto de entrega</Text>
        <TouchableOpacity onPress={usarGPS} style={mp.gpsBtn} disabled={gpsLoading}>
          {gpsLoading
            ? <ActivityIndicator color="#0066CC" size="small" />
            : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Icono nombre="mira" size={14} color="#0066CC" /><Text style={mp.gpsTxt}>GPS</Text></View>
          }
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {/* Hint flotante */}
        <View style={mp.hint} pointerEvents="none">
          <Text style={mp.hintTxt}>Toca el mapa o arrastra el pin</Text>
        </View>

        <WebView
          ref={mapRef}
          source={{ html: pickerHtml, baseUrl: 'http://localhost' }}
          style={{ flex: 1 }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          allowFileAccess
          onMessage={onMapMessage}
        />

        {/* Overlay de carga */}
        {!mapReady && (
          <View style={mp.loadingOverlay}>
            <Text style={mp.loadingTxt}>Cargando mapa...</Text>
            <View style={mp.progressBar}>
              <Animated.View style={[mp.progressFill, {
                width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
              }]} />
            </View>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={[mp.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={mp.coords}>Lat: {pin.lat.toFixed(5)}{'\n'}Lng: {pin.lng.toFixed(5)}</Text>
        <TouchableOpacity style={mp.confirmBtn} onPress={() => onConfirm(pin.lat, pin.lng)}>
          <Text style={mp.confirmTxt}>✓ Confirmar</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

/* ── Modal de checkout ────────────────────────────────────────────────────── */
function CheckoutModal({
  visible, onClose, cliente, token, onOpenMap, externalCoords,
}: {
  visible: boolean; onClose: () => void
  cliente: any; token: string | null
  onOpenMap: (lat: number, lng: number) => void
  externalCoords: { lat: number; lng: number } | null
}) {
  const { items, total, clearCart } = useCart()
  const [form,   setForm]   = useState<FormData>({
    nombre: cliente?.nombre ?? '', email: cliente?.email ?? '',
    telefono: cliente?.telefono ?? '',
    lat: cliente?.latitud ?? null, lng: cliente?.longitud ?? null,
    referencia: '',
  })
  const [saving, setSaving] = useState(false)
  const [done,   setDone]   = useState(false)
  const [premioUsado, setPremioUsado] = useState(false)

  // Premio de la tarjeta de fidelidad: si lo tiene, se ofrece usarlo en este pedido
  const { tarjeta, recargar: recargarTarjeta } = useTarjeta(visible)
  const tienePremio = !!tarjeta?.activo && tarjeta.premiosDisponibles > 0
  const [usarPremio, setUsarPremio] = useState(true)
  const descuento = tienePremio && usarPremio && tarjeta?.tipoPremio === 'descuento'
    ? +(total * (tarjeta.descuentoPct ?? 0) / 100).toFixed(2) : 0
  const totalFinal = +(total - descuento).toFixed(2)

  // Resetear cuando abre el modal con datos frescos del cliente
  useEffect(() => {
    if (visible) {
      setDone(false)
      setUsarPremio(true)
      setForm({
        nombre:     cliente?.nombre   ?? '',
        email:      cliente?.email    ?? '',
        telefono:   cliente?.telefono ?? '',
        lat:        cliente?.latitud  ?? null,
        lng:        cliente?.longitud ?? null,
        referencia: '',
      })
    }
  }, [visible])

  // Aplicar coordenadas seleccionadas en el mapa
  useEffect(() => {
    if (externalCoords) {
      setForm(prev => ({ ...prev, lat: externalCoords.lat, lng: externalCoords.lng }))
    }
  }, [externalCoords])

  async function usarGPSDirecto() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') { Alert.alert('Permiso denegado', 'Activa la ubicación en ajustes'); return }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      setForm(prev => ({ ...prev, lat: loc.coords.latitude, lng: loc.coords.longitude }))
    } catch {
      Alert.alert('GPS no disponible', 'No se pudo obtener tu ubicación. Usa el mapa para seleccionarla manualmente.')
    }
  }

  async function enviar() {
    if (!form.lat || !form.lng) {
      Alert.alert('Ubicación requerida', 'Selecciona dónde quieres recibir el agua')
      return
    }
    setSaving(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetchT(apiUrl('/api/pedidos'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cliente: {
            nombre:   form.nombre,
            email:    form.email,
            telefono: form.telefono,
            latitud:  form.lat,
            longitud: form.lng,
            callePrincipal:  cliente?.callePrincipal || 'Ubicación en mapa',
            referencia:      form.referencia || cliente?.referencia || null,
          },
          productos: items.map(i => ({ nombre: i.nombre, cantidad: i.cantidad })),
          total: totalFinal.toFixed(2),
          ...(tienePremio && usarPremio ? { usarPremio: true } : {}),
        }),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(txt || String(res.status))
      }
      const data = await res.json().catch(() => ({}))
      setPremioUsado(!!data.premioAplicado)
      if (data.premioAplicado) { recargarTarjeta(); DeviceEventEmitter.emit('tarjetaCambio') }
      setDone(true)
      clearCart()
    } catch (e: any) {
      const msg = e?.name === 'AbortError'
        ? 'El servidor no respondió. Verifica tu conexión.'
        : 'No se pudo enviar el pedido. Intenta nuevamente.'
      Alert.alert('Error', msg)
    } finally { setSaving(false) }
  }

  function cerrar() {
    setDone(false)
    clearCart()
    setForm({
      nombre: cliente?.nombre ?? '', email: cliente?.email ?? '',
      telefono: cliente?.telefono ?? '',
      lat: cliente?.latitud ?? null, lng: cliente?.longitud ?? null,
      referencia: '',
    })
    onClose()
  }

  const initLat = form.lat ?? PUYO.lat
  const initLng = form.lng ?? PUYO.lng

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={m.overlay}>
        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={8}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <View style={m.sheet}>
            <View style={m.sheetTop}>
              <View style={m.handle} />
              {!done && (
                <TouchableOpacity style={m.closeBtn} onPress={cerrar}>
                  <Text style={m.closeBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {done ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Text style={m.doneTitle}>Pedido realizado con éxito</Text>
                <Text style={m.doneSub}>
                  Nos pondremos en contacto contigo para coordinar la entrega.
                </Text>
                {premioUsado && (
                  <View style={m.premioOk}>
                    <Text style={m.premioOkTxt}>Usaste tu premio de fidelidad</Text>
                  </View>
                )}
                <TouchableOpacity style={m.doneBtn} onPress={cerrar}>
                  <Text style={m.doneBtnText}>Aceptar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>

                {/* Resumen pedido */}
                <Text style={m.sectionLabel}>Tu pedido</Text>
                <View style={m.summary}>
                  {items.map((it, i) => (
                    <View key={i} style={[m.sumRow, i < items.length - 1 && m.sumRowBorder]}>
                      <Text style={m.sumItem}>{it.nombre} <Text style={{ color: '#94a3b8' }}>×{it.cantidad}</Text></Text>
                      <Text style={m.sumPrice}>${(it.precio * it.cantidad).toFixed(2)}</Text>
                    </View>
                  ))}
                  {tienePremio && usarPremio && (
                    <View style={[m.sumRow, m.sumRowBorder]}>
                      <Text style={[m.sumItem, { color: '#8a5a0c', fontWeight: '700' }]}>
                        Premio: {tarjeta!.textoPremio}
                      </Text>
                      <Text style={[m.sumPrice, { color: '#8a5a0c' }]}>
                        {tarjeta!.tipoPremio === 'descuento' ? `-$${descuento.toFixed(2)}` : '$0.00'}
                      </Text>
                    </View>
                  )}
                  <View style={m.sumTotal}>
                    <Text style={m.sumTotalLabel}>Total</Text>
                    <Text style={m.sumTotalVal}>${totalFinal.toFixed(2)}</Text>
                  </View>
                </View>

                {/* Premio de fidelidad */}
                {tienePremio && (
                  <View style={m.premio}>
                    <View style={{ flex: 1 }}>
                      <Text style={m.premioKicker}>TIENES UN PREMIO</Text>
                      <Text style={m.premioTit}>{tarjeta!.textoPremio}</Text>
                      <Text style={m.premioSub}>{usarPremio ? 'Se aplicará en este pedido' : 'Lo guardas para otro pedido'}</Text>
                    </View>
                    <Switch value={usarPremio} onValueChange={setUsarPremio}
                      trackColor={{ true: '#1f8a6c', false: '#d6c9a8' }} thumbColor="#fff" />
                  </View>
                )}

                {/* Datos del cliente */}
                <Text style={[m.sectionLabel, { marginTop: 16 }]}>Datos de entrega</Text>
                <View style={m.clienteCard}>
                  <View style={m.clienteRow}>
                    <Icono nombre="usuario" size={18} color="#0066CC" style={{ width: 24 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={m.clienteLabel}>Nombre</Text>
                      <Text style={m.clienteVal}>{form.nombre}</Text>
                    </View>
                  </View>
                  <View style={m.clienteSep} />
                  <View style={m.clienteRow}>
                    <Icono nombre="correo" size={18} color="#0066CC" style={{ width: 24 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={m.clienteLabel}>Correo</Text>
                      <Text style={m.clienteVal}>{form.email}</Text>
                    </View>
                  </View>
                  <View style={m.clienteSep} />
                  <View style={m.clienteRow}>
                    <Icono nombre="telefono" size={18} color="#0066CC" style={{ width: 24 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={m.clienteLabel}>Teléfono</Text>
                      <Text style={m.clienteVal}>{form.telefono}</Text>
                    </View>
                  </View>
                </View>

                {/* Ubicación */}
                <Text style={[m.sectionLabel, { marginTop: 16 }]}>Punto de entrega</Text>

                {form.lat && form.lng ? (
                  <View style={m.locCard}>
                    <View style={m.locIcon}><Icono nombre="pin" size={22} color="#0066CC" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={m.locTitle}>Ubicación seleccionada</Text>
                      <Text style={m.locCoords}>{form.lat.toFixed(5)}, {form.lng.toFixed(5)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => onOpenMap(initLat, initLng)} style={m.locChangeBtn}>
                      <Text style={m.locChangeTxt}>Cambiar</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={m.locEmpty}>
                    <Text style={m.locEmptyTxt}>Sin ubicación seleccionada</Text>
                  </View>
                )}

                <View style={m.locBtns}>
                  <TouchableOpacity style={m.locBtn} onPress={usarGPSDirecto}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icono nombre="mira" size={15} color="#fff" /><Text style={m.locBtnTxt}>Usar mi GPS</Text></View>
                  </TouchableOpacity>
                  <TouchableOpacity style={[m.locBtn, m.locBtnMap]} onPress={() => onOpenMap(initLat, initLng)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icono nombre="pin" size={15} color="#0066CC" /><Text style={[m.locBtnTxt, { color: '#0066CC' }]}>Elegir en mapa</Text></View>
                  </TouchableOpacity>
                </View>

                {/* Notas */}
                <Text style={m.fieldLabel}>Notas adicionales (opcional)</Text>
                <TextInput
                  style={[m.input, { height: 70, textAlignVertical: 'top' }]}
                  placeholder="Ej: Casa azul, portón negro, frente al parque..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  value={form.referencia}
                  onChangeText={v => setForm(prev => ({ ...prev, referencia: v }))}
                />

                <TouchableOpacity
                  style={[m.sendBtn, saving && { opacity: 0.7 }]}
                  onPress={enviar} disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={m.sendBtnText}>Confirmar pedido</Text>
                  }
                </TouchableOpacity>
                <Text style={m.note}>Sin pago online · Coordinamos contigo</Text>
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function ProductosScreen({ navigation }: any) {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading,   setLoading]   = useState(true)
  const [checkout,  setCheckout]  = useState(false)
  const [mapOpen,   setMapOpen]   = useState(false)
  const [mapInitCoords, setMapInitCoords] = useState({ lat: PUYO.lat, lng: PUYO.lng })
  const [mapCoords,     setMapCoords]     = useState<{ lat: number; lng: number } | null>(null)
  const { count, total } = useCart()
  const { cliente, token } = useClienteAuth()

  useEffect(() => {
    fetchT(apiUrl(`/api/productos?_=${Date.now()}`), {
      headers: { 'Cache-Control': 'no-cache' },
    })
      .then(r => r.json())
      .then(d => { setProductos(d.productos || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Ocultar header y tab bar cuando el mapa está abierto para pantalla completa real
  useEffect(() => {
    if (mapOpen) {
      navigation.setOptions({ headerShown: false, tabBarStyle: { display: 'none' } })
    } else {
      navigation.setOptions({
        headerShown: true,
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#e5e7eb', height: 80, paddingBottom: 16 },
      })
    }
  }, [mapOpen, navigation])

  function abrirMapa(lat: number, lng: number) {
    setMapInitCoords({ lat, lng })
    setCheckout(false) // cerrar checkout para que el WebView no esté en Modal stack
    setMapOpen(true)
  }

  function confirmarMapa(lat: number, lng: number) {
    setMapCoords({ lat, lng })
    setMapOpen(false)
    setCheckout(true) // volver al checkout con la ubicación seleccionada
  }

  function cerrarMapa() {
    setMapOpen(false)
    setCheckout(true)
  }

  const BADGES = ['100% natural', 'Entrega gratis en Puyo', 'Sin aditivos', 'De los Llanganates']

  // El mapa se muestra como pantalla completa (no Modal) para que las tiles carguen correctamente
  if (mapOpen) {
    return (
      <MapPickerView
        initLat={mapInitCoords.lat}
        initLng={mapInitCoords.lng}
        onConfirm={confirmarMapa}
        onClose={cerrarMapa}
      />
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f4ff' }}>
      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: count > 0 ? 120 : 30 }}>

        <View style={s.hero}>
          <View style={s.heroIcon}><Icono nombre="gota" size={26} color="#fff" /></View>
          <Text style={s.heroTitle}>Nuestros productos</Text>
          <Text style={s.heroSub}>Agua mineral natural · Entrega en Puyo</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 14 }}>
          {BADGES.map(b => (
            <View key={b} style={s.badge}><Text style={s.badgeText}>{b}</Text></View>
          ))}
          <View style={{ width: 14 }} />
        </ScrollView>

        {loading
          ? <ActivityIndicator color="#0066CC" size="large" style={{ marginTop: 60 }} />
          : <View style={s.grid}>{productos.map(p => <ProductCard key={p.id} p={p} />)}</View>
        }
      </ScrollView>

      {count > 0 && (
        <TouchableOpacity style={s.cartBar} onPress={() => setCheckout(true)}>
          <View style={s.cartBarIcon}>
            <Icono nombre="carrito" size={22} color="#fff" />
            <View style={s.cartBarBadge}>
              <Text style={s.cartBarBadgeText}>{count}</Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cartBarTitle}>{count} producto{count !== 1 ? 's' : ''} seleccionado{count !== 1 ? 's' : ''}</Text>
            <Text style={s.cartBarSub}>Total: <Text style={{ color: '#fff', fontWeight: '800' }}>${total.toFixed(2)}</Text></Text>
          </View>
          <View style={s.cartBarBtn}>
            <Text style={s.cartBarBtnText}>Pedir →</Text>
          </View>
        </TouchableOpacity>
      )}

      <CheckoutModal
        visible={checkout}
        onClose={() => setCheckout(false)}
        cliente={cliente}
        token={token}
        onOpenMap={abrirMapa}
        externalCoords={mapCoords}
      />
    </View>
  )
}

/* ── Estilos ──────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  hero: { backgroundColor: '#0066CC', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 26 },
  heroIcon: { width: 50, height: 50, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  heroTitle: { color: '#fff', fontWeight: '900', fontSize: 22, marginBottom: 3 },
  heroSub:   { color: 'rgba(255,255,255,0.6)', fontSize: 12 },

  badge: { backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 14, borderWidth: 1, borderColor: '#e8f0fd', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  badgeText: { color: '#0055bb', fontSize: 11, fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 12 },

  card: { backgroundColor: '#fff', borderRadius: 20, width: '47.5%', overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } },
  cardFlash: { borderColor: '#0066CC' },
  tagBadge: { position: 'absolute', top: 10, left: 10, zIndex: 2, backgroundColor: '#0066CC', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  tagText:  { color: '#fff', fontSize: 9, fontWeight: '700' },
  imgBox:   { width: '100%', aspectRatio: 1, backgroundColor: '#e8f0fd', justifyContent: 'center', alignItems: 'center' },
  imgEmoji: { fontSize: 48 },
  imgFoto:  { width: '100%', height: '100%' },
  cardBody: { padding: 12 },
  cardName: { fontSize: 13, fontWeight: '800', color: '#0f1d3e', marginBottom: 3, lineHeight: 17 },
  cardDesc: { fontSize: 10, color: '#94a3b8', marginBottom: 7, lineHeight: 14 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardPrice:  { fontSize: 16, fontWeight: '900', color: '#0066CC' },
  enCarrito:  { fontSize: 10, color: '#0066CC', fontWeight: '700', marginTop: 1 },
  addBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0066CC', justifyContent: 'center', alignItems: 'center', shadowColor: '#0066CC', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  addBtnFlash:    { backgroundColor: '#16a34a' },
  addBtnDisabled: { backgroundColor: '#e5e7eb', shadowOpacity: 0 },
  addBtnText:     { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 26 },

  cartBar: { position: 'absolute', bottom: 14, left: 14, right: 14, backgroundColor: '#0055bb', borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#0055bb', shadowOpacity: 0.45, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  cartBarIcon:       { width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  cartBarBadge:      { position: 'absolute', top: -6, right: -6, backgroundColor: '#ff3b30', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  cartBarBadgeText:  { color: '#fff', fontSize: 10, fontWeight: '900' },
  cartBarTitle:      { color: '#fff', fontWeight: '800', fontSize: 13 },
  cartBarSub:        { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 1 },
  cartBarBtn:        { backgroundColor: '#fff', borderRadius: 11, paddingHorizontal: 12, paddingVertical: 7 },
  cartBarBtnText:    { color: '#0055bb', fontSize: 12, fontWeight: '800' },
})

const m = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:    { backgroundColor: '#fff', borderRadius: 24, padding: 20, paddingBottom: 36, maxHeight: '92%' },
  sheetTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 18, position: 'relative' },
  handle:   { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 99 },
  closeBtn: { position: 'absolute', right: 0, top: -6, width: 30, height: 30, borderRadius: 15, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { fontSize: 13, color: '#374151', fontWeight: '800' },

  sectionLabel: { fontWeight: '900', fontSize: 15, color: '#0f1d3e', marginBottom: 10 },
  premio:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fbe7ad', borderRadius: 16, padding: 14, marginTop: 12, borderWidth: 1, borderColor: '#efcf78' },
  premioKicker: { fontSize: 10, letterSpacing: 1.2, fontWeight: '900', color: '#7a520f' },
  premioTit:    { fontSize: 15, fontWeight: '900', color: '#3d2a05', marginTop: 2 },
  premioSub:    { fontSize: 11.5, color: '#7a520f', marginTop: 1 },
  premioOk:     { marginTop: 4, marginBottom: 18, backgroundColor: '#fbe7ad', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  premioOkTxt:  { fontSize: 13, fontWeight: '800', color: '#7a520f' },

  summary:      { backgroundColor: '#f8fafc', borderRadius: 14, padding: 12, marginBottom: 4 },
  sumRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 6, marginBottom: 6 },
  sumRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sumItem:      { fontSize: 13, color: '#374151' },
  sumPrice:     { fontSize: 13, fontWeight: '700', color: '#0f1d3e' },
  sumTotal:     { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1.5, borderTopColor: '#e5e7eb', marginTop: 4 },
  sumTotalLabel: { fontSize: 14, fontWeight: '900', color: '#0066CC' },
  sumTotalVal:   { fontSize: 14, fontWeight: '900', color: '#0066CC' },

  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#374151', marginBottom: 4 },
  input: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, fontSize: 14, color: '#1a1a1a', backgroundColor: '#f9fafb', marginBottom: 10 },

  locCard:      { backgroundColor: '#f0f9ff', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, borderWidth: 1.5, borderColor: '#bfdbfe' },
  locIcon:      { width: 40, height: 40, backgroundColor: '#dbeafe', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  locTitle:     { fontSize: 13, fontWeight: '800', color: '#1e40af' },
  locCoords:    { fontSize: 11, color: '#64748b', marginTop: 1 },
  locChangeBtn: { backgroundColor: '#0066CC', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  locChangeTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  locEmpty:     { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 8, borderWidth: 1.5, borderColor: '#e5e7eb', borderStyle: 'dashed' },
  locEmptyTxt:  { color: '#94a3b8', fontSize: 13 },
  locBtns:      { flexDirection: 'row', gap: 8, marginBottom: 14 },
  locBtn:       { flex: 1, backgroundColor: '#0066CC', borderRadius: 12, padding: 12, alignItems: 'center', shadowColor: '#0066CC', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  locBtnMap:    { backgroundColor: '#f0f4ff', borderWidth: 1.5, borderColor: '#bfdbfe', shadowOpacity: 0 },
  locBtnTxt:    { color: '#fff', fontSize: 13, fontWeight: '700' },

  sendBtn:     { backgroundColor: '#0066CC', borderRadius: 14, padding: 15, alignItems: 'center', marginTop: 6, shadowColor: '#0066CC', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  sendBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  note:        { textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 10 },

  doneTitle: { fontWeight: '900', fontSize: 20, color: '#0f1d3e', marginBottom: 8 },
  doneSub:   { fontSize: 13, color: '#64748b', lineHeight: 20, textAlign: 'center', marginBottom: 24, paddingHorizontal: 20 },
  doneBtn:   { backgroundColor: '#0066CC', borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  doneBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  clienteCard:  { backgroundColor: '#f0f9ff', borderRadius: 14, borderWidth: 1.5, borderColor: '#bfdbfe', marginBottom: 4, overflow: 'hidden' },
  clienteRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  clienteSep:   { height: 1, backgroundColor: '#dbeafe', marginHorizontal: 14 },
  clienteIcon:  { fontSize: 16, width: 24, textAlign: 'center' },
  clienteLabel: { fontSize: 10, color: '#64748b', fontWeight: '600', marginBottom: 1 },
  clienteVal:   { fontSize: 13, fontWeight: '700', color: '#1e40af' },
})

const mp = StyleSheet.create({
  header:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  closeBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  closeTxt:   { fontSize: 14, color: '#374151', fontWeight: '700' },
  title:      { flex: 1, textAlign: 'center', fontWeight: '800', fontSize: 16, color: '#0f1d3e' },
  gpsBtn:     { backgroundColor: '#f0f4ff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#bfdbfe', minWidth: 70, alignItems: 'center' },
  gpsTxt:     { fontSize: 13, fontWeight: '700', color: '#0066CC' },
  hint:       { position: 'absolute', top: 12, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 6, zIndex: 10 },
  hintTxt:    { color: '#fff', fontSize: 12 },
  footer:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 },
  coords:     { flex: 1, fontSize: 12, color: '#64748b', lineHeight: 18 },
  confirmBtn: { backgroundColor: '#0066CC', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 22, shadowColor: '#0066CC', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  confirmTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center', alignItems: 'center', gap: 16,
  },
  loadingTxt:   { fontSize: 14, fontWeight: '700', color: '#0066CC' },
  progressBar:  { width: '60%', height: 6, backgroundColor: '#dbeafe', borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#0066CC', borderRadius: 99 },
})
