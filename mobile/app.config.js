// Configuración de la app por distribuidora (marca blanca).
// app.json trae los valores genéricos; cada build los reemplaza con variables de entorno
// (en mobile/.env o en las variables del proyecto en expo.dev), ver .env.example.
module.exports = ({ config }) => {
  const nombre = process.env.EXPO_PUBLIC_NOMBRE_MARCA || config.name
  const appId  = process.env.APP_ID || config.android.package
  const permiso = `${nombre} necesita tu ubicación para asignarte entregas cercanas.`
  return {
    ...config,
    name: nombre,
    slug: process.env.APP_SLUG || config.slug,
    scheme: process.env.APP_SCHEME || config.scheme,
    ios: {
      ...config.ios,
      bundleIdentifier: process.env.APP_ID_IOS || appId,
      infoPlist: {
        ...config.ios.infoPlist,
        NSLocationWhenInUseUsageDescription: permiso,
        NSLocationAlwaysAndWhenInUseUsageDescription: permiso,
      },
    },
    android: {
      ...config.android,
      package: appId,
      config: { ...config.android.config, googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY || '' } },
    },
    plugins: config.plugins.map(p =>
      Array.isArray(p) && p[0] === 'expo-location' ? [p[0], { ...p[1], locationWhenInUsePermission: permiso }] : p
    ),
    extra: {
      ...config.extra,
      eas: { ...config.extra?.eas, ...(process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : {}) },
    },
    ...(process.env.EXPO_OWNER ? { owner: process.env.EXPO_OWNER } : {}),
  }
}
