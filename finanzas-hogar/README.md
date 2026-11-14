# Finanzas del Hogar 💙

App Android (estilo iOS) para llevar las finanzas de la casa en pareja/familia:
ingresos, gastos, tarjetas de crédito con diseño por banco, compras a meses,
deudas, presupuestos, plan de distribución y ahorro.

Construida con **React 19 + TypeScript + Vite** y empaquetada con **Capacitor 8**.
Todos los datos se guardan en el teléfono (sin servidor).

## Funciones

- **Onboarding**: integrantes (nombre, edad, rol, ingreso), gastos fijos del hogar,
  forma de reparto (según ingreso / mitad y mitad) y meta de ahorro.
- **Inicio**: disponible del mes, alertas (tarjeta muy usada, pago próximo,
  presupuesto excedido), gastos fijos pendientes con registro de un toque,
  próximos pagos (cortes, fechas límite, mensualidades), salud financiera (0-100),
  gasto por categoría y quién pagó qué.
- **Movimientos**: gastos (categoría, quién pagó, efectivo/débito/tarjeta) e
  ingresos (nómina, extra, bono, aguinaldo…) por mes.
- **Tarjetas**: elige el banco (Nu, BBVA, Banorte, Santander, Citibanamex, HSBC,
  Amex, Stori, RappiCard, Mercado Pago, Klar, Plata, DiDi, Hey, Ualá, Liverpool,
  Coppel, Banco Azteca, Invex, Inbursa, Banregio, Afirme, Scotiabank…) y la
  tarjeta toma sus colores, red y tasa típica. Límite, usado, disponible,
  fecha de corte y de pago, pago para no generar intereses, pago mínimo
  estimado, compras a meses (MSI o con intereses) y registro de pagos.
- **Deudas**: préstamos personales, auto, hipoteca, familiares… con
  amortización (meses para liquidar, intereses totales), estrategia avalancha
  o bola de nieve y registro de pagos.
- **Plan**: regla 50/30/20 (o 60/20/20, 70/20/10, personalizada), plan vs
  realidad, a dónde va cada peso, cuánto aporta cada integrante, fondo de
  emergencia, metas de ahorro con fecha y consejos.
- **Ajustes**: familia, gastos fijos, presupuestos por categoría, tema
  claro/oscuro, moneda, respaldo/restauración en JSON.

## Desarrollo

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # pruebas unitarias (vitest)
npm run build        # genera dist/
npm run e2e          # pruebas end-to-end con Playwright (usa vite preview)
```

## Generar el APK

Requisitos: JDK 21 y Android SDK (platform 36, build-tools 36) con `ANDROID_HOME`.

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
# APK en android/app/build/outputs/apk/debug/app-debug.apk
```

Para instalarlo: copia el APK al teléfono, ábrelo y permite "instalar apps de
origen desconocido", o con `adb install app-debug.apk`.

Para una versión firmada para Play Store genera un keystore
(`keytool -genkey -v -keystore hogar.jks -alias hogar -keyalg RSA -keysize 2048 -validity 10000`),
configúralo en `android/app/build.gradle` (`signingConfigs`) y ejecuta
`./gradlew assembleRelease`.

## Estructura

```
src/lib/        tipos, cálculos financieros (finance.ts), store, almacenamiento, catálogo de bancos
src/components/ kit de UI estilo iOS y tarjeta de crédito visual
src/screens/    Onboarding, Inicio, Movimientos, Tarjetas, Deudas, Plan, Ajustes
tests/          pruebas unitarias del motor financiero y del reducer
e2e/            flujo completo en navegador móvil + capturas
android/        proyecto nativo generado por Capacitor
```
