import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'mx.antonio.ondas',
  appName: 'Ondas Player',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#121212',
  },
  server: {
    // El WebView carga la app desde https://localhost (origen seguro para el SDK y para PKCE).
    androidScheme: 'https',
  },
}

export default config
