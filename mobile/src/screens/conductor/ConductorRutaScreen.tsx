import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, RefreshControl, Linking, ActivityIndicator, Alert, Animated, Modal, KeyboardAvoidingView, DeviceEventEmitter,
} from 'react-native'
import { WebView } from 'react-native-webview'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Location from 'expo-location'
import { apiUrl, fetchT, MAPBOX_TOKEN } from '../../api'
import Icono from '../../components/Icono'
import { registrarPush, eliminarPush } from '../../lib/push'
import { useAutoRefresh } from '../../hooks/useAutoRefresh'
import leafletData from './leafletHtml.json'

type ClienteBase = {
  nombre:          string
  telefono:        string | null
  callePrincipal:  string | null
  calleSecundaria: string | null
  referencia:      string | null
  latitud:         number | null
  longitud:        number | null
}

type PedidoParada = {
  tipo:             'pedido'
  orden:            number
  estado:           string
  pedidoId:         number
  cliente:          ClienteBase
  productos:        { nombre: string; cantidad: number; gratis?: boolean }[]   // gratis = premio de fidelidad
  total:            number
  notas:            string | null
  motivoNoEntrega:  string | null
}

type VisitaFijaParada = {
  tipo:       'visita_fija'
  orden:      number
  clienteId:  number
  hora:       string | null
  resultado:  string | null
  cantidades: { nombre: string; cantidad: number }[] | null
  visitaId:   number | null
  total:      number | null
  cliente:    ClienteBase & { productosDefault: { nombre: string; cantidad: number }[] }
}

type Parada = PedidoParada | VisitaFijaParada

type Ruta = {
  id:      number
  nombre:  string
  fecha:   string
  color:   string
  paradas: Parada[]
}

type ProductoDisponible = { id: number; nombre: string }

function direccion(c: ClienteBase) {
  const partes = [c.callePrincipal, c.calleSecundaria, c.referencia].filter(Boolean)
  return partes.join(', ') || 'Sin dirección registrada'
}

type CurrentPos = { lat: number; lng: number } | null
type MapSelectionId = string | null

function decodePolyline6(encoded: string): { latitude: number; longitude: number }[] {
  const coords: { latitude: number; longitude: number }[] = []
  let lat = 0, lng = 0, i = 0
  while (i < encoded.length) {
    let b, shift = 0, result = 0
    do { b = encoded.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lat += (result & 1) ? ~(result >> 1) : (result >> 1)
    shift = 0; result = 0
    do { b = encoded.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lng += (result & 1) ? ~(result >> 1) : (result >> 1)
    coords.push({ latitude: lat / 1e6, longitude: lng / 1e6 })
  }
  return coords
}

// ── Mapa (Leaflet WebView + OSM) ─────────────────────────────────────────────
const MOTIVOS_NO_ENTREGA = [
  { key: 'no_estaba',       label: 'No estaba',        emoji: '🚪' },
  { key: 'rechazo',         label: 'Rechazó',          emoji: '🙅' },
  { key: 'dir_incorrecta',  label: 'Dir. incorrecta',  emoji: '📍' },
  { key: 'sin_dinero',      label: 'Sin dinero',       emoji: '💸' },
]

const RESULTADO_VISITA: Record<string, { label: string; emoji: string; color: string; bg: string; border: string }> = {
  compro:      { label: 'Compró',      emoji: '✓', color: '#15803d', bg: '#f0fdf4', border: '#86efac' },
  no_necesita: { label: 'No necesita', emoji: '—', color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
  no_estaba:   { label: 'No estaba',   emoji: '✗', color: '#dc2626', bg: '#fff1f2', border: '#fca5a5' },
}

const LEAFLET_HTML = leafletData.html

function paradaMapId(p: Parada) {
  return p.tipo === 'pedido' ? `p-${(p as PedidoParada).pedidoId}` : `v-${(p as VisitaFijaParada).clienteId}`
}

function paradaDone(p: Parada) {
  return p.tipo === 'pedido' ? (p as PedidoParada).estado === 'entregado' : !!(p as VisitaFijaParada).resultado
}

// Mapa a pantalla completa: solo dibuja ruta y paradas; la tarjeta de abajo la pone la pantalla
function MapaRuta({ paradas, currentPos, selectedId, onSelect, centrarEn, recorrido }: {
  paradas:    Parada[]
  currentPos: CurrentPos
  selectedId: MapSelectionId
  onSelect:   (id: MapSelectionId) => void
  centrarEn:  { lat: number; lng: number; n: number } | null   // n cambia para forzar el centrado
  recorrido:  { lat: number; lng: number }[]                  // lo ya recorrido hoy (línea continua)
}) {
  const wvRef = useRef<any>(null)
  const [roadCoords,   setRoadCoords]   = useState<{ latitude: number; longitude: number }[] | null>(null)
  const [mapReady,     setMapReady]     = useState(false)
  const [spiderGroupId,setSpiderGroupId]= useState<string | null>(null)
  const firstFit = useRef(false)

  const conGps = paradas.filter(p => p.cliente.latitud != null && p.cliente.longitud != null)

  // Waypoints de paradas pendientes en orden
  const pendientesWp = useMemo(() => {
    const pts = conGps
      .filter(p => !paradaDone(p))
      .sort((a, b) => a.orden - b.orden)
      .map(p => ({ latitude: p.cliente.latitud!, longitude: p.cliente.longitud! }))
    return currentPos ? [{ latitude: currentPos.lat, longitude: currentPos.lng }, ...pts] : pts
  }, [ // eslint-disable-line react-hooks/exhaustive-deps
    conGps.filter(p => !paradaDone(p)).map(p => p.orden).join(','),
    currentPos?.lat, currentPos?.lng,
  ])

  // Línea recta inmediata (siempre disponible, sin red)
  const routeCoords = roadCoords ?? pendientesWp

  // Ruta por calles: Mapbox → Valhalla → OSRM
  useEffect(() => {
    if (pendientesWp.length < 2) { setRoadCoords(null); return }
    setRoadCoords(null)
    let cancelled = false

    function fetchTo(url: string, opts: RequestInit = {}, ms: number) {
      const ctrl = new AbortController()
      const id   = setTimeout(() => ctrl.abort(), ms)
      return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(id))
    }

    async function calcular() {
      const allPts = pendientesWp
      const wpAll  = allPts.map(p => `${p.longitude},${p.latitude}`).join(';')

      if (allPts.length <= 25) {
        try {
          const res  = await fetchTo(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${wpAll}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`,
            {}, 8000
          )
          const data = await res.json()
          if (!cancelled && data.routes?.[0]) {
            setRoadCoords(data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => ({ latitude: lat, longitude: lng })))
            return
          }
        } catch {}
      }

      try {
        const body = JSON.stringify({ locations: allPts.map(p => ({ lon: p.longitude, lat: p.latitude })), costing: 'auto' })
        const res  = await fetchTo('https://valhalla1.openstreetmap.de/route', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
        }, 10000)
        const data = await res.json()
        if (!cancelled && data.trip?.legs) {
          const coords = data.trip.legs.flatMap((leg: any) => leg.shape ? decodePolyline6(leg.shape) : [])
          if (coords.length > 1) { setRoadCoords(coords); return }
        }
      } catch {}

      for (const url of [
        `https://routing.openstreetmap.de/routed-car/route/v1/driving/${wpAll}?overview=full&geometries=geojson`,
        `https://router.project-osrm.org/route/v1/driving/${wpAll}?overview=full&geometries=geojson`,
      ]) {
        try {
          const res  = await fetchTo(url, {}, 10000)
          const data = await res.json()
          if (!cancelled && data.routes?.[0]) {
            setRoadCoords(data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => ({ latitude: lat, longitude: lng })))
            return
          }
        } catch {}
      }

      if (!cancelled) setRoadCoords(null)
    }

    calcular()
    return () => { cancelled = true }
  }, [pendientesWp.map(p => `${p.latitude},${p.longitude}`).join('|')]) // eslint-disable-line react-hooks/exhaustive-deps

  const mapGroups = useMemo(() => {
    const groups = new Map<string, { id: string; lat: number; lng: number; items: Parada[] }>()
    conGps.forEach(p => {
      const lat = p.cliente.latitud!
      const lng = p.cliente.longitud!
      const key = `${lat.toFixed(5)},${lng.toFixed(5)}`
      const current = groups.get(key)
      if (current) current.items.push(p)
      else groups.set(key, { id: `g-${key}`, lat, lng, items: [p] })
    })
    return Array.from(groups.values()).map(g => ({
      ...g,
      items: [...g.items].sort((a, b) => {
        const aDone = paradaDone(a), bDone = paradaDone(b)
        if (aDone !== bDone) return aDone ? 1 : -1
        return a.orden - b.orden
      }),
    }))
  }, [conGps])

  function spiderLatLng(lat: number, lng: number, index: number, total: number) {
    const meters = total <= 2 ? 22 : 26
    const angle = Math.PI / 2 + (index * 2 * Math.PI / total)
    const latOffset = Math.sin(angle) * meters / 111320
    const lngOffset = Math.cos(angle) * meters / (111320 * Math.max(Math.cos(lat * Math.PI / 180), 0.25))
    return { lat: lat + latOffset, lng: lng + lngOffset }
  }

  const stopsKey = conGps.map(p =>
    `${paradaMapId(p)}-${p.orden}-${p.cliente.latitud}-${p.cliente.longitud}-${paradaDone(p)}-${p.tipo === 'pedido' ? (p as PedidoParada).estado : (p as VisitaFijaParada).resultado}`
  ).join('|')

  useEffect(() => {
    if (!mapReady || !wvRef.current) return
    const fit = !firstFit.current && conGps.length > 0
    if (fit) firstFit.current = true
    const stops = mapGroups.flatMap(g => {
      const first = g.items[0]
      const isGroup = g.items.length > 1
      const pending = g.items.filter(p => !paradaDone(p))
      const done = pending.length === 0

      if (isGroup && spiderGroupId === g.id) {
        return g.items.map((p, index) => {
          const pos = spiderLatLng(g.lat, g.lng, index, g.items.length)
          const id = paradaMapId(p)
          return {
            id, lat: pos.lat, lng: pos.lng, orden: p.orden, fijo: p.tipo === 'visita_fija', done: paradaDone(p),
            sel: id === selectedId,
            z: p.tipo === 'pedido' ? (id === selectedId ? 3000 : 2000) : (id === selectedId ? 1500 : 500),
          }
        })
      }

      const id = isGroup ? g.id : paradaMapId(first)
      return {
        id, lat: g.lat, lng: g.lng,
        orden: isGroup ? Math.max(pending.length, 1) : first.orden,
        fijo: isGroup ? false : first.tipo === 'visita_fija',
        done,
        sel: id === selectedId || (isGroup && g.items.some(p => paradaMapId(p) === selectedId)),
        group: isGroup,
        total: isGroup ? g.items.length : undefined,
        z: isGroup ? 1200 : first.tipo === 'pedido' ? (id === selectedId ? 3000 : 2000) : (id === selectedId ? 1500 : 500),
      }
    })
    wvRef.current.injectJavaScript(`
      var __d=${JSON.stringify({ stops, pos: currentPos, rc: routeCoords, fit, hecho: recorrido })};
      updateMap(__d);
      // Detrás del camión: el recorrido real, continuo. Por delante hasta las entregas: punteado.
      if (line) { map.removeLayer(line); line = null; }
      var capas = [];
      if (__d.hecho && __d.hecho.length > 1) {
        var h = __d.hecho.map(function(c){ return [c.lat, c.lng]; });
        capas.push(L.polyline(h, { color: '#ffffff', weight: 9, opacity: 0.9 }));
        capas.push(L.polyline(h, { color: '#0066CC', weight: 5.5, opacity: 1 }));
      }
      if (__d.rc && __d.rc.length > 1) {
        var r = __d.rc.map(function(c){ return [c.latitude, c.longitude]; });
        capas.push(L.polyline(r, { color: '#0066CC', weight: 4.5, opacity: 0.9, dashArray: '2 11', lineCap: 'round' }));
      }
      if (capas.length) line = L.layerGroup(capas).addTo(map);
      if (typeof mm !== 'undefined') {
        __d.stops.forEach(function(s){
          if (mm[s.id] && mm[s.id].setZIndexOffset) mm[s.id].setZIndexOffset(s.z || 0);
        });
      }
      // Posición del chofer: un camión en lugar del punto
      if (__d.pos) {
        if (typeof dot !== 'undefined' && dot && map.hasLayer(dot)) map.removeLayer(dot);
        if (!window.__camion) {
          window.__camion = L.marker([__d.pos.lat, __d.pos.lng], { zIndexOffset: 9000, interactive: false, icon: L.divIcon({ className: '',
            html: '<div style="width:40px;height:40px;border-radius:50%;background:#0f1d3e;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center">'
              + '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
              + '<path d="M1.5 6h12v10h-12z"/><path d="M13.5 9.5h4.3l3.2 3.5V16h-7.5z"/><circle cx="6" cy="17.5" r="2" fill="#0f1d3e"/><circle cx="17" cy="17.5" r="2" fill="#0f1d3e"/></svg></div>',
            iconSize: [40, 40], iconAnchor: [20, 20] }) }).addTo(map);
        } else {
          window.__camion.setLatLng([__d.pos.lat, __d.pos.lng]);
        }
      }
      true;
    `)
  }, [mapReady, stopsKey, currentPos?.lat, currentPos?.lng, roadCoords, selectedId, spiderGroupId, mapGroups, recorrido.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Centrar el mapa en la parada elegida (o en el chofer), un poco arriba por la tarjeta de abajo
  useEffect(() => {
    if (!mapReady || !wvRef.current || !centrarEn) return
    wvRef.current.injectJavaScript(`
      (function(){
        var z = Math.max(map.getZoom(), 15);
        var p = map.project([${centrarEn.lat}, ${centrarEn.lng}], z).add([0, 120]);
        map.setView(map.unproject(p, z), z, { animate: true });
      })();
      true;
    `)
  }, [mapReady, centrarEn?.n]) // eslint-disable-line react-hooks/exhaustive-deps

  function onMessage(evt: any) {
    try {
      const msg = JSON.parse(evt.nativeEvent.data)
      if (msg.type === 'select') {
        const id = String(msg.id)
        if (id.startsWith('g-')) setSpiderGroupId(prev => prev === id ? null : id)
        else onSelect(id)
      }
      if (msg.type === 'deselect') setSpiderGroupId(null)
    } catch {}
  }

  return (
    <WebView
      ref={wvRef}
      source={{ html: LEAFLET_HTML, baseUrl: 'https://unpkg.com' }}
      style={{ flex: 1 }}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      mixedContentMode="always"
      onMessage={onMessage}
      onLoad={() => setMapReady(true)}
    />
  )
}

// ── Pantalla principal ────────────────────────────────────────────────────────
export default function ConductorRutaScreen() {
  const navigation = useNavigation<any>()
  const insets = useSafeAreaInsets()
  const [ruta,        setRuta]        = useState<Ruta | null>(null)
  const [nombre,      setNombre]      = useState('')
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [tab,         setTab]         = useState<'pendiente' | 'entregado'>('pendiente')
  const [productos,        setProductos]        = useState<ProductoDisponible[]>([])
  const [confirming,       setConfirming]       = useState<number | null>(null)
  const [confirmingVisita, setConfirmingVisita] = useState<number | null>(null)
  const [nuevoPedido,      setNuevoPedido]      = useState<string | null>(null)
  const [currentPos,       setCurrentPos]       = useState<CurrentPos>(null)
  // Pantalla del mapa: parada en foco, estado de la tarjeta de abajo y menú
  const [sel,          setSel]          = useState<MapSelectionId>(null)
  const [modo,         setModo]         = useState<'siguiente' | 'motivos' | 'lista'>('siguiente')
  const [menu,         setMenu]         = useState(false)
  const [centrar,      setCentrar]      = useState<{ lat: number; lng: number; n: number } | null>(null)
  const [altoTarjeta,  setAltoTarjeta]  = useState(300)
  const [recorrido,    setRecorrido]    = useState<{ lat: number; lng: number }[]>([])
  const [modalVenta,   setModalVenta]   = useState(false)
  const [ventaNombre,  setVentaNombre]  = useState('')
  const [ventaItems,   setVentaItems]   = useState<{ nombre: string; cantidad: number }[]>([])
  const [ventaLoading, setVentaLoading] = useState(false)
  const [modalCompro, setModalCompro] = useState<{
    clienteId: number
    nombre:    string
    items:     { nombre: string; cantidad: number }[]
  } | null>(null)
  const bannerAnim = useRef(new Animated.Value(-140)).current
  const rutaRef    = useRef<Ruta | null>(null)

  async function getToken() {
    return AsyncStorage.getItem('conductor_token')
  }

  const mostrarBannerRef = useRef<(msg: string) => void>(() => {})

  const cargar = useCallback(async (background = false) => {
    const [token, n] = await AsyncStorage.multiGet(['conductor_token', 'conductor_nombre'])
    const tk  = token[1]
    const nom = n[1] ?? ''
    if (!tk) { { DeviceEventEmitter.emit('conductorSesion', false); navigation.replace('ConductorLogin') }; return }
    if (!background) setNombre(nom)
    try {
      const res = await fetchT(apiUrl('/api/conductores/mi-ruta'), {
        headers: { Authorization: `Bearer ${tk}` },
      })
      if (res.status === 401) { { DeviceEventEmitter.emit('conductorSesion', false); navigation.replace('ConductorLogin') }; return }
      const data = await res.json()
      const rawRuta = data.ruta
      const nuevaRuta: Ruta | null = rawRuta
        ? { ...rawRuta, paradas: rawRuta.paradas ?? [] }
        : null
      if (data.productosDisponibles) setProductos(data.productosDisponibles)

      // Detectar pedidos recién asignados y mostrar banner
      if (nuevaRuta && rutaRef.current) {
        const antesIds = new Set(rutaRef.current.paradas.filter(p => p.tipo === 'pedido').map(p => (p as PedidoParada).pedidoId))
        const agregados = nuevaRuta.paradas.filter(p => p.tipo === 'pedido' && !antesIds.has((p as PedidoParada).pedidoId))
        if (agregados.length > 0) {
          mostrarBannerRef.current(`Nuevo pedido: ${agregados.map(p => p.cliente.nombre).join(', ')}`)
          setTab('pendiente')
        }
      }

      setRuta(nuevaRuta)
      rutaRef.current = nuevaRuta
    } catch (e: any) {
      // Sin respuesta del servidor (red móvil caída, tiempo agotado): avisar y reintentar en el próximo refresco
      if (!background) mostrarBannerRef.current(e?.name === 'AbortError' ? 'El servidor no respondió. Reintentando…' : 'Sin conexión con el servidor. Reintentando…')
    }
    finally {
      if (!background) { setLoading(false); setRefreshing(false) }
      else setRefreshing(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // Auto-refresh cada 5 s
  useAutoRefresh(() => cargar(true), 5000)

  // GPS: pedir permiso, leer posición inmediata y luego actualizar cada 15 s / 20 m
  useEffect(() => {
    let suscripcion: Location.LocationSubscription | null = null
    let lastServerSend = 0

    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Ubicación requerida',
          'Para ordenar los pedidos por cercanía y compartir tu posición necesitamos acceso a tu ubicación. Actívala en Configuración.',
          [{ text: 'Entendido' }]
        )
        return
      }
      const token = await AsyncStorage.getItem('conductor_token')
      if (!token) return

      // Posición inmediata al abrir: la última conocida y una lectura nueva, SIN esperarlas.
      // (Si se espera la lectura y hay poca señal, el seguimiento nunca empieza.)
      Location.getLastKnownPositionAsync().then(pos => {
        if (pos) setCurrentPos(prev => prev ?? { lat: pos.coords.latitude, lng: pos.coords.longitude })
      }).catch(() => {})
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).then(pos => {
        setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      }).catch(() => {})

      // Actualización continua mientras conduce (cada 5 s o 10 m, para dibujar bien el recorrido)
      suscripcion = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5_000, distanceInterval: 10 },
        async ({ coords }) => {
          setCurrentPos({ lat: coords.latitude, lng: coords.longitude })
          // Enviar al servidor máximo cada 30 s para no saturarlo
          const now = Date.now()
          if (now - lastServerSend >= 30_000) {
            lastServerSend = now
            fetch(apiUrl('/api/conductores/mi-ubicacion'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ lat: coords.latitude, lng: coords.longitude }),
            }).catch(() => {})
          }
        },
      )
    })()
    return () => { suscripcion?.remove() }
  }, [])

  // Recorrido del día: se va sumando cada posición nueva (a más de 15 m de la anterior)
  // y se guarda en el teléfono para no perderlo si la app se cierra.
  const claveRecorrido = `recorrido_${new Date().toISOString().slice(0, 10)}`
  useEffect(() => {
    AsyncStorage.getItem(claveRecorrido).then(v => { if (v) { try { setRecorrido(JSON.parse(v)) } catch {} } })
    AsyncStorage.getAllKeys()
      .then(ks => AsyncStorage.multiRemove(ks.filter(k => k.startsWith('recorrido_') && k !== claveRecorrido)))
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!currentPos) return
    setRecorrido(prev => {
      const ultimo = prev[prev.length - 1]
      if (ultimo) {
        const dLat = (currentPos.lat - ultimo.lat) * 111320
        const dLng = (currentPos.lng - ultimo.lng) * 111320 * Math.cos(currentPos.lat * Math.PI / 180)
        if (Math.sqrt(dLat * dLat + dLng * dLng) < 15) return prev
      }
      const next = [...prev, { lat: currentPos.lat, lng: currentPos.lng }].slice(-2000)
      AsyncStorage.setItem(claveRecorrido, JSON.stringify(next)).catch(() => {})
      return next
    })
  }, [currentPos?.lat, currentPos?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  // Registrar push token al montar la pantalla (por si el login fue en otra sesión)
  useEffect(() => {
    AsyncStorage.getItem('conductor_token').then(t => { if (t) registrarPush('conductor', t) })
  }, [])

  function mostrarBanner(msg: string) {
    setNuevoPedido(msg)
    Animated.sequence([
      Animated.spring(bannerAnim, { toValue: 0,   useNativeDriver: true }),
      Animated.delay(4000),
      Animated.spring(bannerAnim, { toValue: -140, useNativeDriver: true }),
    ]).start(() => setNuevoPedido(null))
  }
  mostrarBannerRef.current = mostrarBanner

  async function confirmar(pedidoId: number) {
    setConfirming(pedidoId)
    const token = await getToken()
    try {
      const res = await fetchT(apiUrl(`/api/conductores/mi-ruta/pedidos/${pedidoId}`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      setRuta(prev => prev ? {
        ...prev,
        paradas: prev.paradas.map(p =>
          p.tipo === 'pedido' && p.pedidoId === pedidoId ? { ...p, estado: 'entregado' } : p
        ),
      } : prev)
      setSel(null)   // la tarjeta pasa sola a la siguiente parada
    } catch {
      Alert.alert('Error', 'No se pudo confirmar la entrega')
    } finally { setConfirming(null) }
  }

  async function registrarVisita(clienteId: number, resultado: string, cantidades?: { nombre: string; cantidad: number }[]) {
    setConfirmingVisita(clienteId)
    const token = await getToken()
    try {
      const res = await fetchT(apiUrl('/api/conductores/visita-fijo'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ clienteId, resultado, cantidades }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const totalVisita: number | null = data.total ?? null
      setRuta(prev => prev ? {
        ...prev,
        paradas: prev.paradas.map(p =>
          p.tipo === 'visita_fija' && p.clienteId === clienteId
            ? { ...p, resultado, cantidades: cantidades ?? null, total: totalVisita }
            : p
        ),
      } : prev)
      setSel(null)
    } catch {
      Alert.alert('Error', 'No se pudo registrar la visita')
    } finally { setConfirmingVisita(null) }
  }

  function abrirModalCompro(parada: VisitaFijaParada) {
    const defaultItems = parada.cliente.productosDefault ?? []
    const items = defaultItems.length > 0
      ? defaultItems.map(p => ({ ...p }))
      : productos.map(p => ({ nombre: p.nombre, cantidad: 0 }))
    setModalCompro({ clienteId: parada.clienteId, nombre: parada.cliente.nombre, items })
  }

  async function noEntrega(pedidoId: number, motivo: string) {
    const token = await getToken()
    try {
      const res = await fetchT(apiUrl(`/api/conductores/mi-ruta/pedidos/${pedidoId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ estado: 'no_entregado', motivo }),
      })
      if (!res.ok) throw new Error()
      setRuta(prev => prev ? {
        ...prev,
        paradas: prev.paradas.map(p =>
          p.tipo === 'pedido' && p.pedidoId === pedidoId
            ? { ...p, estado: 'no_entregado', motivoNoEntrega: motivo }
            : p
        ),
      } : prev)
    } catch {
      Alert.alert('Error', 'No se pudo registrar la novedad')
    }
  }

  function abrirModalVenta() {
    setVentaItems(productos.map(p => ({ nombre: p.nombre, cantidad: 0 })))
    setVentaNombre('')
    setModalVenta(true)
  }

  async function registrarVenta() {
    const items = ventaItems.filter(i => i.cantidad > 0)
    if (!ventaNombre.trim()) { Alert.alert('Falta el nombre', 'Ingresa el nombre del cliente'); return }
    if (items.length === 0)  { Alert.alert('Sin productos', 'Selecciona al menos un producto'); return }
    setVentaLoading(true)
    const token = await getToken()
    try {
      const res  = await fetchT(apiUrl('/api/conductores/venta-rapida'), {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          nombre: ventaNombre.trim(),
          productos: items,
          lat: currentPos?.lat ?? null,
          lng: currentPos?.lng ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { Alert.alert('Error', data.message || 'No se pudo registrar'); return }
      setModalVenta(false)
      cargar(true)
      Alert.alert('¡Venta registrada!', `$${parseFloat(data.total).toFixed(2)} — ${ventaNombre.trim()}`)
    } catch {
      Alert.alert('Error', 'No se pudo conectar al servidor')
    } finally {
      setVentaLoading(false)
    }
  }

  // Modal de venta rápida — reutilizado en la ruta y en la pantalla sin ruta
  function renderModalVenta() {
    return (
      <Modal visible={modalVenta} transparent animationType="slide" onRequestClose={() => setModalVenta(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={8}>
          <View style={s.modalOverlay}>
            <View style={s.modalBox}>
              <Text style={s.modalTitle}>Nueva venta directa</Text>

              <Text style={s.ventaLabel}>Nombre del cliente</Text>
              <TextInput
                style={s.ventaInput}
                placeholder="Ej: Juan Pérez"
                placeholderTextColor="#9ca3af"
                value={ventaNombre}
                onChangeText={setVentaNombre}
                autoFocus
                returnKeyType="done"
              />

              <Text style={[s.ventaLabel, { marginTop: 14 }]}>Productos</Text>
              <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                {ventaItems.map((item, idx) => (
                  <View key={idx} style={s.modalItem}>
                    <Text style={s.modalItemNombre}>{item.nombre}</Text>
                    <View style={s.modalQtyRow}>
                      <TouchableOpacity style={s.qtyBtn} onPress={() =>
                        setVentaItems(prev => prev.map((it, i) => i === idx ? { ...it, cantidad: Math.max(0, it.cantidad - 1) } : it))
                      }>
                        <Text style={s.qtyBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={[s.qtyCant, item.cantidad > 0 && { color: '#0066CC' }]}>{item.cantidad}</Text>
                      <TouchableOpacity style={s.qtyBtn} onPress={() =>
                        setVentaItems(prev => prev.map((it, i) => i === idx ? { ...it, cantidad: it.cantidad + 1 } : it))
                      }>
                        <Text style={s.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={s.modalActions}>
                <TouchableOpacity style={s.modalCancel} onPress={() => setModalVenta(false)}>
                  <Text style={s.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.modalConfirm, ventaLoading && { opacity: 0.7 }]} onPress={registrarVenta} disabled={ventaLoading}>
                  {ventaLoading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.modalConfirmText}>Registrar</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    )
  }

  async function logout() {
    const t = await AsyncStorage.getItem('conductor_token')
    eliminarPush('conductor', t)
    await AsyncStorage.multiRemove(['conductor_token', 'conductor_nombre'])
    { DeviceEventEmitter.emit('conductorSesion', false); navigation.replace('ConductorLogin') }
  }

  // Re-ordenar paradas pendientes por vecino más cercano desde posición actual del conductor
  const todasParadas = useMemo((): Parada[] => {
    const raw = ruta?.paradas ?? []
    if (!currentPos || raw.length === 0) return raw

    const pendientesList = raw.filter(p => p.tipo === 'pedido' ? p.estado !== 'entregado' : !p.resultado)
    const completadasList = raw.filter(p => p.tipo === 'pedido' ? p.estado === 'entregado' : !!p.resultado)
    const conGps = pendientesList.filter(p => p.cliente.latitud != null && p.cliente.longitud != null)
    const sinGps = pendientesList.filter(p => p.cliente.latitud == null  || p.cliente.longitud == null)

    function dist(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
      const R = 6371
      const dLat = (b.lat - a.lat) * Math.PI / 180
      const dLng = (b.lng - a.lng) * Math.PI / 180
      const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
      return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
    }

    const ordenadas: Parada[] = []
    const restantes = [...conGps]
    let actual: { lat: number; lng: number } = currentPos

    while (restantes.length > 0) {
      let minIdx = 0
      let minDist = dist(actual, { lat: restantes[0].cliente.latitud!, lng: restantes[0].cliente.longitud! })
      for (let i = 1; i < restantes.length; i++) {
        const d = dist(actual, { lat: restantes[i].cliente.latitud!, lng: restantes[i].cliente.longitud! })
        if (d < minDist) { minDist = d; minIdx = i }
      }
      ordenadas.push(restantes[minIdx])
      actual = { lat: restantes[minIdx].cliente.latitud!, lng: restantes[minIdx].cliente.longitud! }
      restantes.splice(minIdx, 1)
    }

    return [
      ...ordenadas.map((p, i) => ({ ...p, orden: i + 1 })),
      ...sinGps.map((p, i)    => ({ ...p, orden: ordenadas.length + i + 1 })),
      ...completadasList,
    ]
  }, [ruta?.paradas, currentPos])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1d3e' }}>
        <ActivityIndicator color="#60a5fa" size="large" />
      </View>
    )
  }

  if (!ruta) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4ff', padding: 24 }}>
        <View style={{ marginBottom: 16 }}><Icono nombre="camion" size={52} color="#94a3b8" /></View>
        <Text style={{ fontWeight: '800', fontSize: 18, color: '#0f1d3e', marginBottom: 8 }}>Sin ruta asignada</Text>
        <Text style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
          No tienes una ruta programada para hoy.{'\n'}Puedes registrar tus ventas con el botón de abajo.
        </Text>

        {/* Registrar venta: siempre disponible, aunque no haya ruta */}
        <TouchableOpacity
          style={{ marginTop: 24, backgroundColor: '#0066CC', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' }}
          onPress={abrirModalVenta}
          activeOpacity={0.85}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>+  Registrar venta</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ marginTop: 14, paddingHorizontal: 24, paddingVertical: 10 }}
          onPress={logout}
        >
          <Text style={{ color: '#64748b', fontWeight: '700' }}>Cerrar sesión</Text>
        </TouchableOpacity>

        {/* Modal de venta rápida (mismo que en la ruta) */}
        {renderModalVenta()}
      </View>
    )
  }

  const pedidoParadas   = todasParadas.filter((p): p is PedidoParada     => p.tipo === 'pedido')
  const visitaParadas   = todasParadas.filter((p): p is VisitaFijaParada => p.tipo === 'visita_fija')
  const pendientes      = pedidoParadas.filter(p => p.estado !== 'entregado' && p.estado !== 'no_entregado')
  const entregados      = pedidoParadas.filter(p => p.estado === 'entregado')
  const noEntregados    = pedidoParadas.filter(p => p.estado === 'no_entregado')
  const fijasPendientes = visitaParadas.filter(v => !v.resultado)
  const fijasCompro     = visitaParadas.filter(v => v.resultado === 'compro')

  const totalParadas    = pedidoParadas.length + visitaParadas.length
  const completadas     = entregados.length + visitaParadas.filter(v => v.resultado !== null).length
  const progreso        = totalParadas > 0 ? Math.round((completadas / totalParadas) * 100) : 0
  const completa        = totalParadas > 0 && completadas === totalParadas

  const listado: Parada[] = tab === 'pendiente'
    ? [...pendientes, ...noEntregados, ...fijasPendientes].sort((a, b) => a.orden - b.orden)
    : [...entregados, ...visitaParadas.filter(v => v.resultado)].sort((a, b) => a.orden - b.orden)

  const totalMonto = [
    ...pedidoParadas.map(p => parseFloat(String(p.total))),
    ...fijasCompro.filter(v => v.total != null).map(v => parseFloat(String(v.total))),
  ].reduce((s, v) => s + v, 0)

  function abrirRutaCompleta() {
    const stops = [...pendientes, ...fijasPendientes].sort((a, b) => a.orden - b.orden)
    if (stops.length === 0) return
    const puntos = stops.map(it =>
      it.cliente.latitud && it.cliente.longitud
        ? `${it.cliente.latitud},${it.cliente.longitud}`
        : encodeURIComponent(direccion(it.cliente))
    )
    let url: string
    if (puntos.length === 1) {
      url = `https://maps.google.com/?q=${puntos[0]}`
    } else {
      const destino   = puntos[puntos.length - 1]
      const waypoints = puntos.slice(0, -1).join('|')
      url = `https://www.google.com/maps/dir/?api=1&destination=${destino}&waypoints=optimize:true|${waypoints}&travelmode=driving`
    }
    Linking.openURL(url)
  }

  // ── Parada en foco: la que eligió el chofer, o la siguiente pendiente ──────
  const porHacer  = [...pendientes, ...fijasPendientes].sort((a, b) => a.orden - b.orden)
  const siguiente = porHacer[0] ?? noEntregados[0] ?? null
  const elegida   = sel ? todasParadas.find(p => paradaMapId(p) === sel) ?? null : null
  const actual    = elegida ?? siguiente
  const esSiguiente = !!actual && !!siguiente && paradaMapId(actual) === paradaMapId(siguiente)

  function distancia(p: Parada | null) {
    if (!p || !currentPos || p.cliente.latitud == null || p.cliente.longitud == null) return null
    const R = 6371000
    const dLat = (p.cliente.latitud - currentPos.lat) * Math.PI / 180
    const dLng = (p.cliente.longitud - currentPos.lng) * Math.PI / 180
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(currentPos.lat * Math.PI / 180) * Math.cos(p.cliente.latitud * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    const m = R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
    return m < 1000 ? `a ${Math.max(10, Math.round(m / 10) * 10)} m` : `a ${(m / 1000).toFixed(1).replace('.', ',')} km`
  }

  function elegir(p: Parada | null) {
    setSel(p ? paradaMapId(p) : null)
    setModo('siguiente')
    if (p?.cliente.latitud != null && p.cliente.longitud != null) {
      setCentrar(c => ({ lat: p.cliente.latitud!, lng: p.cliente.longitud!, n: (c?.n ?? 0) + 1 }))
    }
  }

  function comoLlegar(p: Parada) {
    const destino = p.cliente.latitud != null && p.cliente.longitud != null
      ? `${p.cliente.latitud},${p.cliente.longitud}`
      : encodeURIComponent(direccion(p.cliente))
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destino}&travelmode=driving`)
  }

  function productosDe(p: Parada) {
    if (p.tipo === 'pedido') return p.productos
    return (p.resultado && p.cantidades?.length ? p.cantidades : p.cliente.productosDefault ?? []).map(x => ({ ...x, gratis: false }))
  }

  const RESULTADO_TXT: Record<string, string> = { compro: 'Compró', no_necesita: 'No necesita', no_estaba: 'No estaba' }

  // Tarjeta de abajo: detalle y acciones de la parada en foco
  function renderDetalle() {
    if (!actual) {
      return (
        <View style={{ alignItems: 'center', paddingVertical: 10 }}>
          <Text style={s.shTitulo}>Sin paradas pendientes</Text>
          <Text style={s.shDir}>Las nuevas entregas aparecerán aquí.</Text>
        </View>
      )
    }
    const dist   = distancia(actual)
    const esFijo = actual.tipo === 'visita_fija'
    const kicker = esFijo
      ? `CLIENTE FIJO${(actual as VisitaFijaParada).hora ? ` · ${(actual as VisitaFijaParada).hora}` : ''}`
      : esSiguiente ? 'SIGUIENTE PARADA' : `PARADA ${actual.orden}`
    const prods  = productosDe(actual)
    const isConfirm = actual.tipo === 'pedido' && confirming === actual.pedidoId
    const isBusyFijo = actual.tipo === 'visita_fija' && confirmingVisita === actual.clienteId

    return (
      <View>
        <View style={s.shKickerRow}>
          <Text style={s.shKicker}>{kicker}{dist ? ` · ${dist.toUpperCase()}` : ''}</Text>
          {elegida && !esSiguiente && siguiente && (
            <TouchableOpacity onPress={() => elegir(null)}><Text style={s.shVolver}>Ir a la siguiente</Text></TouchableOpacity>
          )}
        </View>

        <View style={s.shFila}>
          <View style={[s.shNum, esFijo && { backgroundColor: '#16a34a' }, paradaDone(actual) && { backgroundColor: '#94a3b8' }]}>
            {esFijo ? <Icono nombre="casa" size={16} color="#fff" /> : <Text style={s.shNumTxt}>{actual.orden}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.shTitulo} numberOfLines={1}>{actual.cliente.nombre}</Text>
            <Text style={s.shDir} numberOfLines={2}>{direccion(actual.cliente)}</Text>
          </View>
          {actual.tipo === 'pedido' && <Text style={s.shTotal}>${parseFloat(String(actual.total)).toFixed(2)}</Text>}
        </View>

        {prods.length > 0 && (
          <View style={s.chips}>
            {prods.map((p, i) => (
              <View key={i} style={[s.chip, p.gratis && s.chipGratis]}>
                <Text style={[s.chipTxt, p.gratis && s.chipGratisTxt]}>{p.gratis ? 'Gratis (premio) · ' : ''}{p.nombre} ×{p.cantidad}</Text>
              </View>
            ))}
          </View>
        )}
        {actual.tipo === 'pedido' && !!actual.notas && (
          <View style={s.nota}><Text style={s.notaTxt}>{actual.notas}</Text></View>
        )}

        {modo === 'motivos' && actual.tipo === 'pedido' ? (
          <View style={{ marginTop: 12 }}>
            <Text style={s.motivosTit}>¿Por qué no se entregó?</Text>
            <View style={s.motivosGrid}>
              {MOTIVOS_NO_ENTREGA.map(m => (
                <TouchableOpacity key={m.key} style={s.motivoBtn} onPress={() => { noEntrega(actual.pedidoId, m.key); setModo('siguiente'); setSel(null) }}>
                  <Text style={s.motivoTxt}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => setModo('siguiente')} style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={s.shVolverGris}>Volver</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={s.accRow}>
              {!!actual.cliente.telefono && (
                <TouchableOpacity style={s.accBtn} onPress={() => Linking.openURL(`tel:${actual.cliente.telefono}`)}>
                  <Icono nombre="telefono" size={15} color="#0f1d3e" /><Text style={s.accTxt}>Llamar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.accBtn} onPress={() => comoLlegar(actual)}>
                <Icono nombre="pin" size={15} color="#0f1d3e" /><Text style={s.accTxt}>Cómo llegar</Text>
              </TouchableOpacity>
            </View>

            {actual.tipo === 'pedido' && actual.estado === 'entregado' && (
              <View style={s.estadoOk}><Icono nombre="check" size={14} color="#15803d" /><Text style={s.estadoOkTxt}>Entregado</Text></View>
            )}
            {actual.tipo === 'pedido' && actual.estado === 'no_entregado' && (
              <>
                <View style={s.estadoNo}>
                  <Text style={s.estadoNoTxt}>
                    No entregado{actual.motivoNoEntrega ? ` · ${MOTIVOS_NO_ENTREGA.find(m => m.key === actual.motivoNoEntrega)?.label ?? actual.motivoNoEntrega}` : ''}
                  </Text>
                </View>
                <TouchableOpacity style={[s.okBtn, isConfirm && { opacity: 0.7 }]} disabled={isConfirm} onPress={() => confirmar(actual.pedidoId)}>
                  {isConfirm ? <ActivityIndicator color="#fff" /> : <Text style={s.okTxt}>Marcar como entregado</Text>}
                </TouchableOpacity>
              </>
            )}
            {actual.tipo === 'pedido' && actual.estado !== 'entregado' && actual.estado !== 'no_entregado' && (
              <>
                <TouchableOpacity style={[s.okBtn, isConfirm && { opacity: 0.7 }]} disabled={isConfirm} onPress={() => confirmar(actual.pedidoId)}>
                  {isConfirm
                    ? <ActivityIndicator color="#fff" />
                    : <><Icono nombre="check" size={16} color="#fff" /><Text style={s.okTxt}>Entregado</Text></>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setModo('motivos')} style={{ alignItems: 'center', paddingTop: 10 }}>
                  <Text style={s.noTxt}>No se pudo entregar</Text>
                </TouchableOpacity>
              </>
            )}

            {actual.tipo === 'visita_fija' && (actual.resultado ? (
              <View style={s.estadoOk}>
                <Text style={s.estadoOkTxt}>
                  {RESULTADO_TXT[actual.resultado] ?? actual.resultado}
                  {actual.resultado === 'compro' && actual.total != null ? ` · $${parseFloat(String(actual.total)).toFixed(2)}` : ''}
                </Text>
              </View>
            ) : isBusyFijo ? <ActivityIndicator color="#16a34a" style={{ marginTop: 12 }} /> : (
              <>
                <TouchableOpacity style={s.okBtn} onPress={() => abrirModalCompro(actual)}>
                  <Icono nombre="check" size={16} color="#fff" /><Text style={s.okTxt}>Compró</Text>
                </TouchableOpacity>
                <View style={[s.accRow, { marginTop: 8 }]}>
                  <TouchableOpacity style={s.accBtn} onPress={() => registrarVisita(actual.clienteId, 'no_necesita')}>
                    <Text style={s.accTxt}>No necesita</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.accBtn, { borderColor: '#f3cfd4' }]} onPress={() => registrarVisita(actual.clienteId, 'no_estaba')}>
                    <Text style={[s.accTxt, { color: '#b42318' }]}>No estaba</Text>
                  </TouchableOpacity>
                </View>
              </>
            ))}
          </>
        )}
      </View>
    )
  }

  // Tarjeta de abajo abierta: lista de todas las paradas
  function renderLista() {
    const lista = tab === 'pendiente'
      ? [...pendientes, ...fijasPendientes, ...noEntregados].sort((a, b) => a.orden - b.orden)
      : [...entregados, ...visitaParadas.filter(v => v.resultado)].sort((a, b) => a.orden - b.orden)
    return (
      <View style={{ flex: 1 }}>
        <View style={s.lTabs}>
          <TouchableOpacity style={[s.lTab, tab === 'pendiente' && s.lTabOn]} onPress={() => setTab('pendiente')}>
            <Text style={[s.lTabTxt, tab === 'pendiente' && s.lTabTxtOn]}>Pendientes ({pendientes.length + fijasPendientes.length + noEntregados.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.lTab, tab === 'entregado' && s.lTabOn]} onPress={() => setTab('entregado')}>
            <Text style={[s.lTabTxt, tab === 'entregado' && s.lTabTxtOn]}>Entregados ({entregados.length + visitaParadas.filter(v => v.resultado).length})</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar() }} tintColor="#0066CC" />}>
          {lista.length === 0 && (
            <Text style={[s.shDir, { textAlign: 'center', paddingVertical: 24 }]}>
              {tab === 'pendiente' ? 'Sin paradas pendientes' : 'Aún no hay entregas confirmadas'}
            </Text>
          )}
          {lista.map(p => {
            const done   = paradaDone(p)
            const esSig  = !!siguiente && paradaMapId(p) === paradaMapId(siguiente)
            const sinGps = p.cliente.latitud == null || p.cliente.longitud == null
            const noEnt  = p.tipo === 'pedido' && p.estado === 'no_entregado'
            const prods  = productosDe(p)
            const sub = [
              p.tipo === 'visita_fija' ? `Cliente fijo${p.hora ? ` · ${p.hora}` : ''}` : prods.map(x => `${x.nombre} ×${x.cantidad}`).join(', '),
              noEnt ? 'No entregado' : sinGps ? 'Sin GPS' : distancia(p),
            ].filter(Boolean).join(' · ')
            return (
              <TouchableOpacity key={paradaMapId(p)} style={s.lFila} onPress={() => elegir(p)} activeOpacity={0.7}>
                <View style={[
                  s.lCirculo,
                  done ? s.lCirculoOk : esSig ? s.lCirculoSig : p.tipo === 'visita_fija' ? s.lCirculoFijo : noEnt ? s.lCirculoNo : s.lCirculoPend,
                ]}>
                  {done ? <Icono nombre="check" size={12} color="#fff" />
                    : p.tipo === 'visita_fija' ? <Icono nombre="casa" size={13} color="#fff" />
                    : <Text style={[s.lCirculoTxt, (esSig || noEnt) && { color: '#fff' }]}>{p.orden}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.lNombre, done && { color: '#64748b' }]} numberOfLines={1}>{p.cliente.nombre}</Text>
                  <Text style={s.lSub} numberOfLines={1}>{sub}</Text>
                </View>
                {p.tipo === 'pedido'
                  ? <Text style={s.lTotal}>${parseFloat(String(p.total)).toFixed(2)}</Text>
                  : p.resultado === 'compro' && p.total != null ? <Text style={s.lTotal}>${parseFloat(String(p.total)).toFixed(2)}</Text> : null}
              </TouchableOpacity>
            )
          })}
          <TouchableOpacity style={s.gmBtn} onPress={abrirRutaCompleta}>
            <Icono nombre="pin" size={15} color="#0f1d3e" /><Text style={s.gmTxt}>Abrir ruta completa en Google Maps</Text>
          </TouchableOpacity>
          <View style={{ height: 12 }} />
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#e8edf3' }}>

      {/* MAPA A PANTALLA COMPLETA */}
      {!completa && (
        <MapaRuta
          paradas={todasParadas}
          currentPos={currentPos}
          selectedId={actual ? paradaMapId(actual) : null}
          onSelect={id => { const p = todasParadas.find(x => paradaMapId(x) === id); if (p) elegir(p) }}
          centrarEn={centrar}
          recorrido={recorrido}
        />
      )}

      {/* BANNER NUEVO PEDIDO */}
      {nuevoPedido && (
        <Animated.View style={[s.banner, { paddingTop: insets.top + 10, transform: [{ translateY: bannerAnim }] }]}>
          <Text style={s.bannerText}>{nuevoPedido}</Text>
        </Animated.View>
      )}

      {/* CUADRO SUPERIOR: ruta y avance */}
      <View style={[s.top, { top: insets.top + 8 }]}>
        <View style={s.topFila}>
          <View style={s.topIco}><Icono nombre="camion" size={20} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.topRuta} numberOfLines={1}>{ruta.nombre}</Text>
            <Text style={s.topNombre} numberOfLines={1}>{nombre}</Text>
          </View>
          <View style={s.topChip}><Text style={s.topChipTxt}>{completadas} de {totalParadas}</Text></View>
          <TouchableOpacity style={s.topMenu} onPress={() => setMenu(v => !v)}>
            <View style={s.hamb} /><View style={s.hamb} /><View style={s.hamb} />
          </TouchableOpacity>
        </View>
        <View style={s.topBarra}><View style={[s.topBarraFill, { width: `${progreso}%` as any }]} /></View>
      </View>

      {menu && (
        <>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setMenu(false)} />
          <View style={[s.menu, { top: insets.top + 84 }]}>
            <TouchableOpacity style={s.menuItem} onPress={() => { setMenu(false); abrirRutaCompleta() }}>
              <Text style={s.menuTxt}>Ruta completa en Google Maps</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.menuItem} onPress={() => { setMenu(false); setRefreshing(true); cargar() }}>
              <Text style={s.menuTxt}>Actualizar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.menuItem, { borderBottomWidth: 0 }]} onPress={() => { setMenu(false); logout() }}>
              <Text style={[s.menuTxt, { color: '#b42318' }]}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {completa ? (
        <View style={[s.completa, { paddingTop: insets.top + 110 }]}>
          <View style={s.completaIco}><Icono nombre="check" size={34} color="#fff" /></View>
          <Text style={s.completaTit}>Ruta completada</Text>
          <Text style={s.completaSub}>Completaste todas las entregas del día.</Text>
          <View style={s.completedCard}>
            <Text style={s.completedSub}>Total entregado hoy</Text>
            <Text style={s.completedTotal}>${totalMonto.toFixed(2)}</Text>
            <Text style={s.completedSub}>{totalParadas} entregas · {ruta.nombre}</Text>
          </View>
        </View>
      ) : (
        <>
          {/* Botones flotantes sobre la tarjeta */}
          {modo !== 'lista' && (
            <View style={[s.fabs, { bottom: altoTarjeta + 12 }]}>
              <TouchableOpacity style={s.fabMini} onPress={() => currentPos && setCentrar(c => ({ lat: currentPos.lat, lng: currentPos.lng, n: (c?.n ?? 0) + 1 }))}>
                <Icono nombre="mira" size={20} color="#0066CC" />
              </TouchableOpacity>
              <TouchableOpacity style={s.fabVenta} onPress={abrirModalVenta} activeOpacity={0.85}>
                <Text style={s.fabVentaMas}>+</Text><Text style={s.fabVentaTxt}>Venta</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* TARJETA DE ABAJO */}
          <View
            style={[s.sheet, { paddingBottom: insets.bottom + 12 }, modo === 'lista' && { top: insets.top + 96 }]}
            onLayout={e => { if (modo !== 'lista') setAltoTarjeta(e.nativeEvent.layout.height) }}
          >
            <TouchableOpacity style={s.asaZona} onPress={() => setModo(m => m === 'lista' ? 'siguiente' : 'lista')}>
              <View style={s.asa} />
            </TouchableOpacity>
            {modo === 'lista' ? renderLista() : renderDetalle()}
            <TouchableOpacity style={s.verTodas} onPress={() => setModo(m => m === 'lista' ? 'siguiente' : 'lista')}>
              <Text style={s.verTodasTxt}>{modo === 'lista' ? 'Cerrar lista' : `Ver las ${totalParadas} paradas`}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}


      {/* MODAL VENTA RÁPIDA */}
      {renderModalVenta()}

      {/* MODAL CANTIDADES "COMPRÓ" */}
      <Modal visible={!!modalCompro} transparent animationType="slide" onRequestClose={() => setModalCompro(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>¿Qué llevó {modalCompro?.nombre}?</Text>
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {modalCompro?.items.map((item, idx) => (
                <View key={idx} style={s.modalItem}>
                  <Text style={s.modalItemNombre}>{item.nombre}</Text>
                  <View style={s.modalQtyRow}>
                    <TouchableOpacity style={s.qtyBtn} onPress={() =>
                      setModalCompro(prev => prev ? { ...prev, items: prev.items.map((it, i) => i === idx ? { ...it, cantidad: Math.max(0, it.cantidad - 1) } : it) } : null)
                    }>
                      <Text style={s.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={s.qtyCant}>{item.cantidad}</Text>
                    <TouchableOpacity style={s.qtyBtn} onPress={() =>
                      setModalCompro(prev => prev ? { ...prev, items: prev.items.map((it, i) => i === idx ? { ...it, cantidad: it.cantidad + 1 } : it) } : null)
                    }>
                      <Text style={s.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setModalCompro(null)}>
                <Text style={s.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalConfirm} onPress={() => {
                if (modalCompro) {
                  registrarVisita(modalCompro.clienteId, 'compro', modalCompro.items)
                  setModalCompro(null)
                }
              }}>
                <Text style={s.modalConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  )
}

const s = StyleSheet.create({
  // ── Pantalla del mapa ──
  top:        { position: 'absolute', left: 12, right: 12, zIndex: 20, backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 11,
                shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  topFila:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topIco:     { width: 38, height: 38, borderRadius: 12, backgroundColor: '#0f1d3e', alignItems: 'center', justifyContent: 'center' },
  topRuta:    { fontSize: 15, fontWeight: '800', color: '#0f1d3e' },
  topNombre:  { fontSize: 12, color: '#64748b', marginTop: 1 },
  topChip:    { backgroundColor: '#e8f1fd', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  topChipTxt: { fontSize: 12, fontWeight: '800', color: '#0066CC' },
  topMenu:    { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', gap: 3 },
  hamb:       { width: 14, height: 2, borderRadius: 2, backgroundColor: '#334155' },
  topBarra:   { height: 5, borderRadius: 9, backgroundColor: '#e2e8f0', marginTop: 10, overflow: 'hidden' },
  topBarraFill: { height: '100%', borderRadius: 9, backgroundColor: '#16a34a' },
  menu:       { position: 'absolute', right: 12, zIndex: 30, backgroundColor: '#fff', borderRadius: 14, minWidth: 230,
                shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 12 },
  menuItem:   { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  menuTxt:    { fontSize: 14, fontWeight: '600', color: '#0f1d3e' },

  fabs:       { position: 'absolute', right: 12, zIndex: 15, alignItems: 'flex-end', gap: 10 },
  fabMini:    { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
                shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  fabVenta:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0f1d3e', borderRadius: 22, paddingHorizontal: 16, height: 44,
                shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  fabVentaMas:{ color: '#fff', fontSize: 20, fontWeight: '800', marginTop: -2 },
  fabVentaTxt:{ color: '#fff', fontSize: 14, fontWeight: '800' },

  sheet:      { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 18, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
                paddingHorizontal: 16, shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 16 },
  asaZona:    { alignItems: 'center', paddingTop: 9, paddingBottom: 10 },
  asa:        { width: 40, height: 5, borderRadius: 3, backgroundColor: '#d5dbe3' },
  shKickerRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shKicker:   { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: '#0066CC' },
  shVolver:   { fontSize: 12, fontWeight: '700', color: '#0066CC' },
  shVolverGris: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  shFila:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  shNum:      { width: 38, height: 38, borderRadius: 19, backgroundColor: '#0f1d3e', alignItems: 'center', justifyContent: 'center' },
  shNumTxt:   { color: '#fff', fontWeight: '900', fontSize: 15 },
  shTitulo:   { fontSize: 17, fontWeight: '800', color: '#0f1d3e' },
  shDir:      { fontSize: 13, color: '#64748b', marginTop: 1 },
  shTotal:    { fontSize: 18, fontWeight: '900', color: '#0f1d3e' },
  chips:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip:       { backgroundColor: '#f1f5f9', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 5 },
  chipTxt:    { fontSize: 12, fontWeight: '700', color: '#334155' },
  chipGratis: { backgroundColor: '#fbe7ad' },
  chipGratisTxt: { color: '#7a520f' },
  nota:       { marginTop: 8, backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', padding: 8 },
  notaTxt:    { fontSize: 12, color: '#475569' },
  accRow:     { flexDirection: 'row', gap: 8, marginTop: 12 },
  accBtn:     { flex: 1, height: 42, borderRadius: 12, borderWidth: 1.5, borderColor: '#dbe3ec', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  accTxt:     { fontSize: 13, fontWeight: '700', color: '#0f1d3e' },
  okBtn:      { marginTop: 10, height: 50, borderRadius: 14, backgroundColor: '#16a34a', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  okTxt:      { color: '#fff', fontSize: 16, fontWeight: '800' },
  noTxt:      { fontSize: 13, fontWeight: '700', color: '#b42318' },
  estadoOk:   { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#effaf4', borderRadius: 12, paddingVertical: 11, borderWidth: 1, borderColor: '#c6ead6' },
  estadoOkTxt:{ fontSize: 14, fontWeight: '800', color: '#15803d' },
  estadoNo:   { marginTop: 10, alignItems: 'center', backgroundColor: '#fdf2f3', borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#f3cfd4' },
  estadoNoTxt:{ fontSize: 13, fontWeight: '700', color: '#9f1239' },
  motivosTit: { fontSize: 13, fontWeight: '800', color: '#0f1d3e', marginBottom: 8 },
  motivosGrid:{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  motivoBtn:  { width: '48%', flexGrow: 1, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: '#f3cfd4', backgroundColor: '#fdf8f8', alignItems: 'center', justifyContent: 'center' },
  motivoTxt:  { fontSize: 14, fontWeight: '700', color: '#9f1239' },
  verTodas:   { marginTop: 12, paddingTop: 11, borderTopWidth: 1, borderTopColor: '#eef2f6', alignItems: 'center' },
  verTodasTxt:{ fontSize: 13, fontWeight: '700', color: '#475569' },

  lTabs:      { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 3, marginBottom: 6 },
  lTab:       { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  lTabOn:     { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  lTabTxt:    { fontSize: 13, fontWeight: '700', color: '#64748b' },
  lTabTxtOn:  { color: '#0f1d3e' },
  lFila:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eef2f6' },
  lCirculo:   { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  lCirculoOk: { backgroundColor: '#16a34a' },
  lCirculoSig:{ backgroundColor: '#0f1d3e' },
  lCirculoPend: { borderWidth: 2, borderColor: '#b6c3d1' },
  lCirculoFijo: { backgroundColor: '#16a34a' },
  lCirculoNo: { backgroundColor: '#be123c' },
  lCirculoTxt:{ fontSize: 12, fontWeight: '800', color: '#334155' },
  lNombre:    { fontSize: 14, fontWeight: '700', color: '#0f1d3e' },
  lSub:       { fontSize: 12, color: '#64748b', marginTop: 1 },
  lTotal:     { fontSize: 14, fontWeight: '800', color: '#0f1d3e' },
  gmBtn:      { marginTop: 12, height: 44, borderRadius: 12, backgroundColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  gmTxt:      { fontSize: 13, fontWeight: '700', color: '#0f1d3e' },

  completa:     { flex: 1, alignItems: 'center', paddingHorizontal: 24, backgroundColor: '#f5f7fa' },
  completaIco:  { width: 72, height: 72, borderRadius: 36, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  completaTit:  { fontSize: 22, fontWeight: '900', color: '#0f1d3e', marginBottom: 6 },
  completaSub:  { fontSize: 14, color: '#64748b', marginBottom: 22, textAlign: 'center' },

  hero: {
    backgroundColor: '#0f1d3e',
    paddingHorizontal: 20, paddingBottom: 20,
  },
  heroTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  heroLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 },
  heroName:  { color: '#fff', fontWeight: '900', fontSize: 18 },
  heroRoute: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 },

  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  logoutText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12, padding: 12, alignItems: 'center',
  },
  statVal: { color: '#fff', fontWeight: '900', fontSize: 18, lineHeight: 22 },
  statLbl: { color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 2 },

  routeBtn:     { backgroundColor: '#16a34a', paddingVertical: 13, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  routeBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  progressWrap: { backgroundColor: '#1a2f5a', paddingHorizontal: 20, paddingVertical: 14 },
  progressTop:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLbl:  { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600' },
  progressPct:  { color: '#60a5fa', fontWeight: '800', fontSize: 12 },
  progressTrack:{ height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 999 },

  tabs:          { flexDirection: 'row', backgroundColor: '#f0f4ff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab:           { flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabActive:     { borderBottomColor: '#0066CC' },
  tabText:       { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
  tabTextActive: { color: '#0066CC' },

  stopCard: {
    backgroundColor: '#fff', borderRadius: 18, marginBottom: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 4 },
  },
  stopHead:        { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  stopHeadPending: { backgroundColor: 'rgba(59,130,246,0.04)' },
  stopHeadDone:    { backgroundColor: 'rgba(22,163,74,0.04)' },

  stopNum:     { width: 30, height: 30, borderRadius: 15, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' },
  stopNumDone: { backgroundColor: '#16a34a' },
  stopNumText: { color: '#fff', fontWeight: '900', fontSize: 13 },

  stopName:  { fontWeight: '800', fontSize: 14, color: '#0f1d3e' },
  stopAddr:  { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  stopTotal: { fontSize: 15, fontWeight: '900', color: '#0066CC' },

  deliveredBadge:     { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 3 },
  deliveredBadgeText: { color: '#16a34a', fontSize: 10, fontWeight: '700' },

  stopBody: { padding: 14 },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  tag:         { backgroundColor: '#f0f4ff', borderWidth: 1, borderColor: '#dbeafe', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  tagDone:     { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  tagText:     { color: '#0066CC', fontSize: 11, fontWeight: '700' },
  tagGratis:     { backgroundColor: '#fbe7ad', borderColor: '#efcf78' },
  tagGratisText: { color: '#7a520f' },
  tagTextDone: { color: '#16a34a' },

  notasBox:  { backgroundColor: '#fefce8', borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#fde68a' },
  notasText: { color: '#713f12', fontSize: 12 },

  actions:       { flexDirection: 'row', gap: 8, marginBottom: 10 },
  actionBtn:     { flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 10, alignItems: 'center' },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: '#374151' },

  confirmBtn:     { backgroundColor: '#16a34a', borderRadius: 14, padding: 13, alignItems: 'center', shadowColor: '#16a34a', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } },
  confirmBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  completedCard:  { backgroundColor: '#fff', borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0', shadowColor: '#16a34a', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, width: '100%' },
  completedSub:   { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  completedTotal: { fontSize: 32, fontWeight: '900', color: '#16a34a', marginVertical: 4 },

  stopCardHighlight:    { borderWidth: 2, borderColor: '#0066CC' },
  stopCardNoEntregado:  { borderWidth: 1.5, borderColor: '#fcd34d' },
  stopHeadNoEntregado:  { backgroundColor: 'rgba(245,158,11,0.07)' },
  stopNumNoEntregado:   { backgroundColor: '#f59e0b' },

  noEntregadoListBadge: { backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fcd34d', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 3 },
  noEntregadoListTxt:   { color: '#92400e', fontSize: 10, fontWeight: '700' },

  noEntregarListBtn: { borderWidth: 1.5, borderColor: '#fca5a5', borderRadius: 14, padding: 12, alignItems: 'center', backgroundColor: '#fff1f2' },
  noEntregarListTxt: { color: '#dc2626', fontWeight: '700', fontSize: 14 },

  noEntregaOpcionesBox:   { backgroundColor: '#fff1f2', borderWidth: 1.5, borderColor: '#fca5a5', borderRadius: 14, padding: 14 },
  noEntregaOpcionesLabel: { fontSize: 12, fontWeight: '700', color: '#dc2626', textAlign: 'center', marginBottom: 10 },
  noEntregaOpcionesGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  noEntregaOpcionChip:    { flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: '#fca5a5', borderRadius: 10, padding: 10, backgroundColor: '#fff' },
  noEntregaOpcionChipEmoji: { fontSize: 16 },
  noEntregaOpcionChipTxt:   { fontSize: 13, fontWeight: '700', color: '#dc2626' },
  noEntregaVolverBtn: { alignItems: 'center', paddingTop: 4 },
  noEntregaVolverTxt: { color: '#9ca3af', fontSize: 12, fontWeight: '600' },

  banner: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999,
    backgroundColor: '#dc2626', paddingVertical: 14, paddingHorizontal: 20,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  bannerText: { color: '#fff', fontWeight: '800', fontSize: 14, textAlign: 'center' },

  // ── Clientes fijos ──
  fijoSeparador:     { flexDirection: 'row', alignItems: 'center', marginVertical: 14, gap: 8 },
  fijoSeparadorLinea:{ flex: 1, height: 1, backgroundColor: '#d1fae5' },
  fijoSeparadorTxt:  { color: '#15803d', fontWeight: '700', fontSize: 12, flexShrink: 1 },

  fijoCard:  { borderWidth: 1.5, borderColor: '#86efac' },
  fijoHead:  { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(22,163,74,0.06)' },
  fijoIcon:  { width: 30, height: 30, borderRadius: 15, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#86efac' },
  fijoNombre:{ fontWeight: '800', fontSize: 14, color: '#14532d' },
  fijoHora:  { fontSize: 10, color: '#16a34a', marginTop: 2, fontWeight: '600' },

  fijoTag:     { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  fijoTagText: { color: '#16a34a', fontSize: 11, fontWeight: '700' },

  fijoAcciones:      { flexDirection: 'row', gap: 6, marginTop: 4 },
  fijoBtn:           { flex: 1, borderWidth: 1.5, borderColor: '#d1fae5', borderRadius: 10, paddingVertical: 9, alignItems: 'center', backgroundColor: '#f0fdf4' },
  fijoBtnActive:     { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  fijoBtnCompro:     { borderColor: '#86efac' },
  fijoBtnNoEstaba:   { borderColor: '#fca5a5', backgroundColor: '#fff1f2' },
  fijoBtnText:       { fontSize: 11, fontWeight: '700', color: '#15803d' },
  fijoBtnTextActive: { color: '#fff' },

  // ── FAB ──
  fab: {
    position: 'absolute', right: 20, bottom: 32, width: 58, height: 58,
    borderRadius: 29, backgroundColor: '#00763E', zIndex: 200,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  fabIcon: { color: '#fff', fontSize: 32, fontWeight: '300', lineHeight: 36, marginTop: -2 },

  // ── Modal venta rápida ──
  ventaLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6 },
  ventaInput: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 12, fontSize: 15, color: '#1a1a1a', backgroundColor: '#f9fafb',
  },

  // ── Modal cantidades ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:     { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle:   { fontWeight: '900', fontSize: 16, color: '#0f1d3e', marginBottom: 20, textAlign: 'center' },

  modalItem:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalItemNombre: { fontSize: 14, fontWeight: '700', color: '#14532d', flex: 1 },
  modalQtyRow:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
  qtyBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0fdf4', borderWidth: 1.5, borderColor: '#86efac', justifyContent: 'center', alignItems: 'center' },
  qtyBtnText:   { fontSize: 20, fontWeight: '700', color: '#16a34a', lineHeight: 24 },
  qtyCant:      { fontSize: 20, fontWeight: '900', color: '#0f1d3e', minWidth: 28, textAlign: 'center' },

  modalActions:     { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalCancel:      { flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  modalCancelText:  { fontSize: 14, fontWeight: '700', color: '#6b7280' },
  modalConfirm:     { flex: 2, backgroundColor: '#16a34a', borderRadius: 14, paddingVertical: 14, alignItems: 'center', shadowColor: '#16a34a', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  modalConfirmText: { fontSize: 14, fontWeight: '800', color: '#fff' },
})
