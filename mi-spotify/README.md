# Ondas Player

Reproductor web personalizable para **Spotify Premium**, hecho con React + Vite + TypeScript. Es una PWA: se instala en Android/iOS/escritorio como una app desde el navegador.

> App personal, no afiliada a Spotify. Usa la Web API y el Web Playback SDK oficiales con **tu propia** clave de desarrollador.

## Qué hace

- Inicio de sesión seguro con PKCE (solo Client ID, sin secret).
- Reproduce en el propio navegador (Web Playback SDK) o controla cualquier dispositivo de Spotify (Connect).
- Inicio, búsqueda, biblioteca (playlists, álbumes, artistas, Me gusta), cola, crear playlists, añadir/quitar canciones.
- **8 estilos**: Original, iOS, Material, Retro, Futurista, Papel, Minimal y Neón. Cada uno en claro y oscuro (o según el sistema).
- Todo editable: fuente (12 opciones), tamaño de letra, negrita, bordes, color de acento, densidad, tamaño de carátulas y tarjetas, posición de navegación, secciones de Inicio, fondo dinámico según carátula, animaciones, desenfoque.
- Exportar e importar preferencias en JSON.

## 1. Obtener tu Client ID (una sola vez)

1. Entra a <https://developer.spotify.com/dashboard> con tu cuenta de Spotify (Premium).
2. **Create app**. Nombre y descripción libres.
3. En **Redirect URIs** añade la dirección donde va a correr la app. La app te la muestra en su primera pantalla. Ejemplos:
   - Desarrollo local: `http://127.0.0.1:5173/` (Spotify ya **no** acepta `localhost`).
   - GitHub Pages: `https://TU-USUARIO.github.io/API/`
4. Marca **Web API** y **Web Playback SDK**, acepta y guarda.
5. En la app creada ve a **Settings** y copia el **Client ID**. Pégalo en la primera pantalla de Ondas Player.

No necesitas el Client Secret. Nunca lo pegues en la app ni lo subas al repositorio.

## 2. Correr en tu PC

```bash
cd mi-spotify
npm install
npm run dev
```

Abre <http://127.0.0.1:5173/> (usa 127.0.0.1, no localhost).

## 3. Instalarla en el teléfono

La forma más sencilla es publicarla en GitHub Pages (ya hay un workflow en `.github/workflows/deploy-pages.yml`):

1. En GitHub: **Settings → Pages → Source: GitHub Actions**.
2. Haz merge a `main`. El workflow construye y publica en `https://TU-USUARIO.github.io/API/`.
3. Añade esa URL (con la barra final) a los Redirect URIs de tu app en el dashboard de Spotify.
4. Ábrela en Chrome en el teléfono → menú → **Instalar app** / **Añadir a pantalla de inicio**.

Para generar un `.apk` nativo se puede envolver esta misma app con Capacitor; la PWA ya cubre el uso diario.

## Notas y límites

- Reproducir en el navegador requiere Premium y funciona mejor en Chrome/Edge/Firefox de escritorio y Chrome Android. Si no reproduce, usa el botón de dispositivos para mandar la música al Spotify del teléfono.
- Spotify pone las apps nuevas en "modo desarrollo": solo la cuenta del dueño (y hasta un puñado de usuarios añadidos a mano) pueden entrar. Para uso personal es suficiente.
- Desde noviembre de 2024 las apps nuevas no tienen acceso a recomendaciones, playlists editoriales ni artistas relacionados, así que esas secciones no existen aquí.

## Estructura

```
src/
  lib/        auth PKCE, cliente de la API, tipos, utilidades
  store/      zustand: prefs, auth, player, toasts
  themes/     definiciones de temas y motor que aplica variables CSS
  components/ barra de reproductor, pantalla "ahora suena", listas, tarjetas…
  pages/      Inicio, Buscar, Biblioteca, Playlist, Álbum, Artista, Me gusta, Cola, Ajustes
```
