import React, { useEffect, useState } from 'react'
import { View, ActivityIndicator, TouchableOpacity, Text, Alert, DeviceEventEmitter } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { useClienteAuth } from '../context/ClienteAuthContext'

import InicioScreen           from '../screens/InicioScreen'
import ProductosScreen        from '../screens/ProductosScreen'
import MisPedidosScreen       from '../screens/MisPedidosScreen'
import MiTarjetaScreen        from '../screens/MiTarjetaScreen'
import { useTarjeta }         from '../hooks/useTarjeta'
import Icono, { NombreIcono }  from '../components/Icono'
import LoginUnificadoScreen    from '../screens/LoginUnificadoScreen'
import RegistroClienteScreen   from '../screens/RegistroClienteScreen'
import RecuperarPasswordScreen from '../screens/RecuperarPasswordScreen'
import ConductorRutaScreen    from '../screens/conductor/ConductorRutaScreen'
import ClienteFijoScreen      from '../screens/ClienteFijoScreen'
import OnboardingScreen       from '../screens/OnboardingScreen'
import SplashScreen           from '../screens/SplashScreen'
import { NOMBRE_MARCA } from '../api'

function TabIcon({ icono, color }: { icono: NombreIcono; color: string }) {
  return <Icono nombre={icono} size={24} color={color} />
}

const Tab   = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

function LogoutButton() {
  const { logout } = useClienteAuth()
  function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ])
  }
  return (
    <TouchableOpacity onPress={handleLogout} style={{ marginRight: 14, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}>
      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Salir</Text>
    </TouchableOpacity>
  )
}

function ClienteTabs() {
  // La pestaña de la tarjeta solo aparece cuando la distribuidora activó el programa
  const { tarjeta, recargar } = useTarjeta()
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('tarjetaCambio', recargar)
    return () => sub.remove()
  }, [recargar])
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0066CC' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
        headerRight: () => <LogoutButton />,
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#e5e7eb', height: 80, paddingBottom: 16 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarActiveTintColor: '#0066CC',
        tabBarInactiveTintColor: '#94a3b8',
      }}
    >
      <Tab.Screen name="Inicio"     component={InicioScreen}
        options={{ title: NOMBRE_MARCA, tabBarLabel: 'Inicio',      tabBarIcon: ({ color }) => <TabIcon icono="casa" color={color} /> }} />
      <Tab.Screen name="Productos"  component={ProductosScreen}
        options={{ title: 'Productos', tabBarLabel: 'Productos',   tabBarIcon: ({ color }) => <TabIcon icono="gota" color={color} /> }} />
      <Tab.Screen name="MisPedidos" component={MisPedidosScreen}
        options={{ title: 'Mis pedidos', tabBarLabel: 'Mis pedidos', tabBarIcon: ({ color }) => <TabIcon icono="lista" color={color} /> }} />
      {tarjeta?.activo && (
        <Tab.Screen name="MiTarjeta" component={MiTarjetaScreen}
          options={{
            title: 'Mi tarjeta', tabBarLabel: 'Mi tarjeta',
            tabBarIcon: ({ color }) => <TabIcon icono="regalo" color={color} />,
            tabBarBadge: tarjeta.premiosDisponibles > 0 ? tarjeta.premiosDisponibles : undefined,
            tabBarBadgeStyle: { backgroundColor: '#e2a93b', color: '#3d2a05', fontWeight: '800' },
          }} />
      )}
    </Tab.Navigator>
  )
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LoginUnificado"     component={LoginUnificadoScreen} />
      <Stack.Screen name="RegistroCliente"    component={RegistroClienteScreen} />
      <Stack.Screen name="RecuperarPassword"  component={RecuperarPasswordScreen} />
    </Stack.Navigator>
  )
}

export default function RootNavigator() {
  const { cliente, loading, recienRegistrado } = useClienteAuth()
  const [conductorSesion, setConductorSesion] = useState<boolean | null>(null)
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null)
  const [splashDone,     setSplashDone]     = useState(false)

  useEffect(() => {
    AsyncStorage.multiGet(['conductor_token', 'onboarding_done']).then(([[, token], [, done]]) => {
      setConductorSesion(!!token)
      setOnboardingDone(!!done)
    })
    // Al iniciar/cerrar sesión de chofer, las pantallas cambian por estado (no por un "salto" que
    // en algunos teléfonos no se completaba y dejaba el botón de ingreso girando).
    const sub = DeviceEventEmitter.addListener('conductorSesion', (activa: boolean) => setConductorSesion(!!activa))
    return () => sub.remove()
  }, [])

  if (loading || conductorSesion === null || onboardingDone === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4ff' }}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    )
  }

  if (!splashDone) {
    return <SplashScreen onDone={() => setSplashDone(true)} />
  }

  if (!onboardingDone) {
    return <OnboardingScreen onDone={() => setOnboardingDone(true)} />
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {conductorSesion ? (
        <Stack.Screen name="ConductorRuta"  component={ConductorRutaScreen} />
      ) : cliente && recienRegistrado ? (
        <Stack.Screen name="ClienteFijo" component={ClienteFijoScreen} />
      ) : cliente ? (
        <>
          <Stack.Screen name="ClienteTabs" component={ClienteTabs} />
          <Stack.Screen
            name="ConfigurarVisitas"
            component={ClienteFijoScreen}
            options={{ headerShown: true, title: 'Días de entrega', headerStyle: { backgroundColor: '#0066CC' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '800' } }}
          />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
      <Stack.Screen name="ConductorLogin" component={LoginUnificadoScreen} />
      {!conductorSesion && (
        <Stack.Screen name="ConductorRuta" component={ConductorRutaScreen} />
      )}
    </Stack.Navigator>
  )
}
