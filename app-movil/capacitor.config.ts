import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.antonio.platolisto',
  appName: 'Plato Listo',
  webDir: 'dist',
  android: {
    // Android 15 dibuja de borde a borde: Capacitor agrega márgenes para la barra de estado y navegación
    adjustMarginsForEdgeToEdge: 'force',
  },
};

export default config;
