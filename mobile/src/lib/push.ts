// Notificaciones push (Expo Notifications + FCM/APNs).
// - registrarPush(): pide permiso, obtiene el Expo push token y lo guarda en el servidor
// - eliminarPush():  lo borra del servidor al cerrar sesión
// - configurarNotificaciones(): cómo se muestran con la app abierta
// - useNotificacionTap(): navega a la pantalla correcta al tocar una notificación
//
// expo-notifications se importa de forma dinámica porque Expo Go (SDK 53+)
// ya no soporta push y el import estático rompería el arranque.
import { useEffect } from 'react'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import { apiUrl, fetchT } from '../api'

export type TipoUsuario = 'cliente' | 'conductor'

const KEY_REGISTRADO = 'push_registrado'   // "tipo:usuarioId:ExpoPushToken[...]"

const ENDPOINT: Record<TipoUsuario, string> = {
  cliente:   '/api/clientes/auth/push-token',
  conductor: '/api/conductores/push-token',
}

const soportado = () => Constants.appOwnership !== 'expo'

async function obtenerExpoToken(): Promise<string | null> {
  if (!soportado()) return null
  const Notifications = await import('expo-notifications')
  const Device        = await import('expo-device')
  if (!Device.isDevice) return null   // emuladores no reciben push

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('pedidos', {
      name:             'Pedidos y entregas',
      importance:       Notifications.AndroidImportance.MAX,
      sound:            'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor:       '#0066CC',
    })
  }

  const { status: actual } = await Notifications.getPermissionsAsync()
  const status = actual === 'granted'
    ? actual
    : (await Notifications.requestPermissionsAsync()).status
  if (status !== 'granted') return null

  const projectId =
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra as any)?.eas?.projectId
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId })
  return data ?? null
}

/** Registra el token del teléfono para el usuario autenticado. Nunca lanza. */
export async function registrarPush(tipo: TipoUsuario, authToken: string, usuarioId?: number | string) {
  try {
    if (!authToken) return
    const expoToken = await obtenerExpoToken()
    if (!expoToken) return

    const clave = `${tipo}:${usuarioId ?? ''}:${expoToken}`
    if ((await AsyncStorage.getItem(KEY_REGISTRADO)) === clave) return   // ya está en el servidor

    const res = await fetchT(apiUrl(ENDPOINT[tipo]), {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body:    JSON.stringify({ pushToken: expoToken }),
    })
    if (res.ok) await AsyncStorage.setItem(KEY_REGISTRADO, clave)
    else console.warn('[push] servidor respondió', res.status)
  } catch (e: any) {
    console.warn('[push] registro falló:', e?.message ?? e)
  }
}

/** Borra el token del servidor (cerrar sesión). Nunca lanza. */
export async function eliminarPush(tipo: TipoUsuario, authToken: string | null) {
  try {
    await AsyncStorage.removeItem(KEY_REGISTRADO)
    if (!authToken) return
    await fetchT(apiUrl(ENDPOINT[tipo]), {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    })
  } catch {}
}

/** Mostrar la notificación (banner + sonido) aunque la app esté abierta. */
export function configurarNotificaciones() {
  if (!soportado()) return
  import('expo-notifications').then(Notifications => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert:  true,
        shouldPlaySound:  true,
        shouldSetBadge:   false,
        shouldShowBanner: true,
        shouldShowList:   true,
      }),
    })
  }).catch(() => {})
}

type NavRef = { isReady: () => boolean; navigate: (...args: any[]) => void }

/** Al tocar una notificación, llevar al usuario a la pantalla que corresponde. */
export function useNotificacionTap(navRef: NavRef) {
  useEffect(() => {
    if (!soportado()) return
    let sub: { remove: () => void } | null = null

    function irA(data: any) {
      const destino = data?.destino
      // La navegación puede no estar lista en arranque en frío: reintentar un poco
      let intentos = 0
      const t = setInterval(() => {
        intentos++
        if (navRef.isReady()) {
          clearInterval(t)
          try {
            if (destino === 'cliente')   navRef.navigate('ClienteTabs', { screen: 'MisPedidos' })
            if (destino === 'conductor') navRef.navigate('ConductorRuta')
          } catch {}
        } else if (intentos > 20) clearInterval(t)
      }, 250)
    }

    import('expo-notifications').then(Notifications => {
      // App abierta o en segundo plano
      sub = Notifications.addNotificationResponseReceivedListener(r => {
        irA(r.notification.request.content.data)
      })
      // App cerrada: la notificación que la abrió
      Notifications.getLastNotificationResponseAsync().then(r => {
        if (r) irA(r.notification.request.content.data)
      }).catch(() => {})
    }).catch(() => {})

    return () => { sub?.remove() }
  }, [navRef])
}
