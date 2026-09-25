import 'react-native-gesture-handler'
import React from 'react'
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StatusBar } from 'expo-status-bar'
import { CartProvider } from './src/context/CartContext'
import { ClienteAuthProvider } from './src/context/ClienteAuthContext'
import RootNavigator from './src/navigation'
import { configurarNotificaciones, useNotificacionTap } from './src/lib/push'

export const navigationRef = createNavigationContainerRef<any>()

// Cómo se muestran las notificaciones con la app abierta (banner + sonido)
configurarNotificaciones()

export default function App() {
  // Al tocar una notificación → Mis pedidos (cliente) o Ruta (conductor)
  useNotificacionTap(navigationRef)

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ClienteAuthProvider>
          <CartProvider>
            <NavigationContainer ref={navigationRef}>
              <StatusBar style="light" />
              <RootNavigator />
            </NavigationContainer>
          </CartProvider>
        </ClienteAuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
