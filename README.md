# Plato Listo: planificador de comidas personal

App Android para planear tus comidas de la semana, cuidar tu presupuesto y llevar tus gastos del súper.
Toma como referencia las funciones de las apps comerciales de planificación (como Mealbird), pero no tiene suscripción y tus datos se quedan en el teléfono.

**APK listo para instalar:** [`apk/PlatoListo-v1.0.apk`](apk/PlatoListo-v1.0.apk)

---

## 1. Análisis de la app de referencia (Mealbird)

| Aspecto | Mealbird | Plato Listo |
|---|---|---|
| Precio | Descarga gratis, pero **pide suscripción sin prueba gratis**: US$9.99 al mes o US$29.99 al año (precios de la App Store de EE. UU.) | Gratis, sin cuenta |
| Enfoque | Plan semanal orientado a macros: llegar a tu meta de calorías y proteína | Lo mismo, más control del gasto real |
| Configuración | Presupuesto, personas, restricciones, utensilios | Lo mismo, más meta de kcal y proteína, moneda y colación opcional |
| Nutrición | USDA FoodData Central, gramos exactos por ingrediente | Valores por 100 g con referencia USDA, gramos exactos ajustados a tu meta |
| Lista de compras | Agrupada por pasillo con precio estimado | Agrupada por pasillo, con casillas y total pendiente |
| Precios | Promedios estimados por tienda (Walmart, Costco, Sam's), sin conexión real con la tienda | **Tú editas el precio por kg** de cada ingrediente para que el costo sea el de tu tienda |
| Gasto real | No lo registra | Pestaña **Gastos**: lo que pagas, comparado contra presupuesto y plan |
| Recetas propias | No | Puedes crear, editar y eliminar recetas |
| Datos | En sus servidores (requiere cuenta) | Locales, con respaldo en JSON |

**Lo que dicen las reseñas:** la calificación es alta (4.8 a 4.9). Se elogia lo rápido que se arma una semana con buena proteína. La queja principal es que **el precio aparece hasta el final del registro**, no hay versión gratis y el costo parece alto. El desarrollador lo justifica diciendo que cada plan generado tiene un costo para ellos.

**Ideas que se tomaron:** plan semanal automático, metas de calorías y proteína, gramos exactos, lista por pasillo con costo, restricciones y utensilios.
**Lo que se mejoró:** sin paywall, precios editables, registro de gasto real, recetas propias, bloquear o cambiar comidas una por una.

Fuentes: [App Store](https://apps.apple.com/us/app/mealbird-macro-meal-planner/id6794577462) · [Google Play](https://play.google.com/store/apps/details?id=app.mealbird) · [mealbird.app](https://mealbird.app/) · [mwm.ai](https://mwm.ai/apps/mealbird/6794577462)

---

## 2. Funciones de Plato Listo

- **Plan**: genera 7 días (desayuno, comida, cena y colación opcional). Prueba unas 400 combinaciones y se queda con la que mejor respeta tu presupuesto, tus calorías y tu proteína. Ajusta automáticamente el tamaño de la porción para que cada día quede cerca de tu meta. Puedes 🔒 **bloquear** una comida y 🔄 **cambiarla** por otra.
- **Compras**: lista agregada para todas las personas de la semana, agrupada por pasillo, con gramos, costo y casillas para tachar.
- **Recetas**: 36 recetas mexicanas incluidas (cada una con kcal, proteína, costo y pasos). Puedes marcar favoritas (aparecen más en el plan), marcar "no me gusta" (no vuelven a salir) y crear o editar las tuyas.
- **Gastos**: registra cada compra (fecha, tienda, monto). Muestra lo gastado en la semana contra el presupuesto, el total del mes y una gráfica de las últimas 6 semanas.
- **Ajustes**: perfil (presupuesto, personas, metas, restricciones, utensilios, moneda), **ingredientes y precios** editables y **respaldo** de todos tus datos.

## 3. Tecnología

- **React 19 + TypeScript + Vite**: la interfaz, en `app-movil/src`.
- **Capacitor 7**: empaqueta la web como app nativa de Android (`app-movil/android`).
- Datos en `localStorage` con copia en `@capacitor/preferences`.

```
app-movil/src/
├── types.ts              # Modelos (como tus DTOs en C#)
├── data/                 # Ingredientes (USDA + precio) y recetas base
├── lib/calculos.ts       # Nutrición, costos y lista de compras
├── lib/generador.ts      # Algoritmo del plan semanal
├── lib/almacen.ts        # Guardado local y respaldo
├── estado.tsx            # Estado global (Context)
├── components/           # UI reutilizable, detalle y editor de receta
└── pages/                # Plan, Compras, Recetas, Gastos, Ajustes
```

## 4. Instalar el APK

1. Pasa `apk/PlatoListo-v1.0.apk` a tu teléfono (por Drive, cable o correo).
2. Ábrelo. Android te pedirá permitir **"Instalar apps de origen desconocido"** para esa app (Archivos, Chrome, etc.).
3. Instala y abre **Plato Listo**.

> El APK está firmado con una clave de *debug*. Si después instalas una versión compilada en otra máquina, Android puede pedirte desinstalar la anterior. **Antes de actualizar, ve a Ajustes > Respaldo > Copiar respaldo**.

## 5. Compilar tú mismo

Requisitos: Node 20+, JDK 21 y Android SDK (o Android Studio).

```bash
cd app-movil
npm install
npm run dev                  # probar en el navegador
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug
# APK en android/app/build/outputs/apk/debug/app-debug.apk
```

O abre la carpeta `app-movil/android` en Android Studio y dale ▶ Run con tu teléfono conectado.

## 6. Ideas para seguir (con tu experiencia en C#)

- Una **API en ASP.NET Core** para sincronizar datos entre dispositivos (los modelos de `types.ts` se traducen casi uno a uno a clases de C#).
- Consultar la API pública de **USDA FoodData Central** para buscar ingredientes nuevos.
- Exportar la lista de compras a PDF o compartirla por WhatsApp.
