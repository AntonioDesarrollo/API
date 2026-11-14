import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'mx.hogar.finanzas',
  appName: 'Finanzas del Hogar',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#f2f2f7',
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DEFAULT',
      backgroundColor: '#f2f2f7',
    },
  },
};

export default config;
