import { Capacitor } from '@capacitor/core'

/** true cuando corremos dentro del APK (Capacitor), false en el navegador. */
export const isNative = Capacitor.isNativePlatform()

/** Esquema propio que Android abre con la app tras el login. */
export const NATIVE_REDIRECT = 'ondas://callback'
