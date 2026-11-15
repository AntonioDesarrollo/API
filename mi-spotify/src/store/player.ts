import { create } from 'zustand'
import { api, ApiError } from '@/lib/api'
import { getAccessToken } from '@/lib/auth'
import type { Device, Track } from '@/lib/types'
import { isNative } from '@/lib/native'
import { usePrefs } from './prefs'
import { toast } from './toast'

export interface PlayerState {
  ready: boolean
  sdkDeviceId: string | null
  sdkActive: boolean
  activeDevice: Device | null
  devices: Device[]
  isPlaying: boolean
  track: Track | null
  progressMs: number
  durationMs: number
  updatedAt: number
  shuffle: boolean
  repeat: 'off' | 'track' | 'context'
  volume: number
  contextUri: string | null
  queue: Track[]
  liked: Record<string, boolean>
  nowPlayingOpen: boolean
}

interface PlayerActions {
  init: () => void
  refresh: () => Promise<void>
  loadDevices: () => Promise<void>
  playContext: (contextUri: string, offset?: { position?: number; uri?: string }) => Promise<void>
  playUris: (uris: string[], offset?: number) => Promise<void>
  togglePlay: () => Promise<void>
  next: () => Promise<void>
  previous: () => Promise<void>
  seek: (ms: number) => Promise<void>
  setVolume: (pct: number) => Promise<void>
  toggleShuffle: () => Promise<void>
  cycleRepeat: () => Promise<void>
  transferTo: (deviceId: string) => Promise<void>
  addToQueue: (uri: string) => Promise<void>
  loadQueue: () => Promise<void>
  toggleLike: (trackId: string) => Promise<void>
  checkLiked: (ids: string[]) => Promise<void>
  setNowPlayingOpen: (open: boolean) => void
}

let sdkPlayer: Spotify.Player | null = null
let pollTimer: number | null = null
let sdkLoading = false

function mapSdkTrack(t: Spotify.Track): Track {
  return {
    id: t.id ?? '',
    name: t.name,
    uri: t.uri,
    duration_ms: t.duration_ms,
    explicit: false,
    artists: t.artists.map((a) => ({ id: a.uri.split(':').pop() ?? '', name: a.name, uri: a.uri, type: 'artist' })),
    album: { id: t.album.uri.split(':').pop() ?? '', name: t.album.name, uri: t.album.uri, images: t.album.images.map((i) => ({ url: i.url, width: i.width ?? null, height: i.height ?? null })), artists: [] },
  }
}

export const usePlayer = create<PlayerState & PlayerActions>((set, get) => ({
  ready: false,
  sdkDeviceId: null,
  sdkActive: false,
  activeDevice: null,
  devices: [],
  isPlaying: false,
  track: null,
  progressMs: 0,
  durationMs: 0,
  updatedAt: Date.now(),
  shuffle: false,
  repeat: 'off',
  volume: 50,
  contextUri: null,
  queue: [],
  liked: {},
  nowPlayingOpen: false,

  init: () => {
    const { useThisDevice, deviceName } = usePrefs.getState()
    if (useThisDevice && !sdkPlayer && !sdkLoading) {
      sdkLoading = true
      window.onSpotifyWebPlaybackSDKReady = () => {
        const player = new window.Spotify.Player({
          name: deviceName || 'Ondas Player',
          getOAuthToken: (cb) => getAccessToken().then(cb).catch(() => undefined),
          volume: get().volume / 100,
        })
        player.addListener('ready', ({ device_id }) => {
          set({ sdkDeviceId: device_id, ready: true })
          get().loadDevices()
        })
        player.addListener('not_ready', () => set({ sdkDeviceId: null, sdkActive: false }))
        player.addListener('player_state_changed', (state) => {
          if (!state) {
            set({ sdkActive: false })
            return
          }
          const t = state.track_window.current_track
          set({
            sdkActive: true,
            isPlaying: !state.paused,
            track: t ? mapSdkTrack(t) : null,
            progressMs: state.position,
            durationMs: state.duration,
            updatedAt: Date.now(),
            shuffle: state.shuffle,
            repeat: (['off', 'context', 'track'] as const)[state.repeat_mode] ?? 'off',
            contextUri: state.context?.uri ?? null,
          })
          if (t?.id) get().checkLiked([t.id])
        })
        player.addListener('initialization_error', ({ message }) => toast(`SDK: ${message}`, 'error'))
        player.addListener('authentication_error', ({ message }) => toast(`Autenticación: ${message}`, 'error'))
        player.addListener('account_error', () => toast('Reproducir en el navegador requiere Spotify Premium', 'error'))
        player.addListener('playback_error', ({ message }) => toast(`Reproducción: ${message}`, 'error'))
        player.connect()
        sdkPlayer = player
      }
      if (!document.getElementById('spotify-sdk')) {
        const s = document.createElement('script')
        s.id = 'spotify-sdk'
        s.src = 'https://sdk.scdn.co/spotify-player.js'
        s.async = true
        document.body.appendChild(s)
      }
    }
    if (pollTimer) window.clearInterval(pollTimer)
    const poll = () => {
      if (document.visibilityState !== 'visible') return
      get().refresh()
    }
    poll()
    pollTimer = window.setInterval(poll, 4000)
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && get().refresh())
  },

  refresh: async () => {
    try {
      const st = await api.playbackState()
      if (!st) {
        if (!get().sdkActive) set({ isPlaying: false, activeDevice: null })
        return
      }
      const sdkIsActive = !!get().sdkDeviceId && st.device?.id === get().sdkDeviceId
      set({
        activeDevice: st.device,
        sdkActive: sdkIsActive,
        volume: st.device?.volume_percent ?? get().volume,
        ...(sdkIsActive
          ? {}
          : {
              isPlaying: st.is_playing,
              track: st.item,
              progressMs: st.progress_ms ?? 0,
              durationMs: st.item?.duration_ms ?? 0,
              updatedAt: Date.now(),
              shuffle: st.shuffle_state,
              repeat: st.repeat_state,
              contextUri: st.context?.uri ?? null,
            }),
      })
      if (st.item?.id && !sdkIsActive) get().checkLiked([st.item.id])
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) return
    }
  },

  loadDevices: async () => {
    try {
      const { devices } = await api.devices()
      set({ devices })
    } catch {
      /* ignore */
    }
  },

  playContext: async (contextUri, offset) => {
    await ensureDevice(get, set)
    try {
      await api.play({ deviceId: targetDevice(get), contextUri, offset })
      setTimeout(() => get().refresh(), 600)
    } catch (e) {
      handlePlayError(e)
    }
  },
  playUris: async (uris, offset = 0) => {
    await ensureDevice(get, set)
    try {
      await api.play({ deviceId: targetDevice(get), uris, offset: { position: offset } })
      setTimeout(() => get().refresh(), 600)
    } catch (e) {
      handlePlayError(e)
    }
  },
  togglePlay: async () => {
    const s = get()
    if (s.sdkActive && sdkPlayer) return sdkPlayer.togglePlay()
    try {
      if (s.isPlaying) await api.pause()
      else await api.resume(targetDevice(get))
      set({ isPlaying: !s.isPlaying, updatedAt: Date.now(), progressMs: currentProgress(s) })
    } catch (e) {
      handlePlayError(e)
    }
  },
  next: async () => {
    if (get().sdkActive && sdkPlayer) return sdkPlayer.nextTrack()
    await api.next().catch(handlePlayError)
    setTimeout(() => get().refresh(), 500)
  },
  previous: async () => {
    if (get().sdkActive && sdkPlayer) return sdkPlayer.previousTrack()
    await api.previous().catch(handlePlayError)
    setTimeout(() => get().refresh(), 500)
  },
  seek: async (ms) => {
    set({ progressMs: ms, updatedAt: Date.now() })
    if (get().sdkActive && sdkPlayer) return sdkPlayer.seek(ms)
    await api.seek(ms).catch(handlePlayError)
  },
  setVolume: async (pct) => {
    set({ volume: pct })
    if (get().sdkActive && sdkPlayer) return sdkPlayer.setVolume(pct / 100)
    await api.volume(pct).catch(() => undefined)
  },
  toggleShuffle: async () => {
    const next = !get().shuffle
    set({ shuffle: next })
    await api.shuffle(next).catch(handlePlayError)
  },
  cycleRepeat: async () => {
    const order = ['off', 'context', 'track'] as const
    const next = order[(order.indexOf(get().repeat) + 1) % order.length]
    set({ repeat: next })
    await api.repeat(next).catch(handlePlayError)
  },
  transferTo: async (deviceId) => {
    try {
      await api.transfer(deviceId, get().isPlaying)
      toast('Reproducción transferida')
      setTimeout(() => {
        get().refresh()
        get().loadDevices()
      }, 800)
    } catch (e) {
      handlePlayError(e)
    }
  },
  addToQueue: async (uri) => {
    try {
      await api.addToQueue(uri, targetDevice(get))
      toast('Añadido a la cola')
    } catch (e) {
      handlePlayError(e)
    }
  },
  loadQueue: async () => {
    try {
      const r = await api.queue()
      set({ queue: r.queue })
    } catch {
      /* ignore */
    }
  },
  toggleLike: async (trackId) => {
    const liked = !!get().liked[trackId]
    set({ liked: { ...get().liked, [trackId]: !liked } })
    try {
      if (liked) await api.removeTracks([trackId])
      else await api.saveTracks([trackId])
      toast(liked ? 'Quitada de Me gusta' : 'Añadida a Me gusta')
    } catch (e) {
      set({ liked: { ...get().liked, [trackId]: liked } })
      handlePlayError(e)
    }
  },
  checkLiked: async (ids) => {
    const missing = ids.filter((id) => id && !(id in get().liked))
    if (missing.length === 0) return
    try {
      const res = await api.checkSavedTracks(missing.slice(0, 50))
      const liked = { ...get().liked }
      missing.slice(0, 50).forEach((id, i) => (liked[id] = res[i]))
      set({ liked })
    } catch {
      /* ignore */
    }
  },
  setNowPlayingOpen: (open) => set({ nowPlayingOpen: open }),
}))

type Get = () => PlayerState & PlayerActions
type Set = (p: Partial<PlayerState>) => void

function currentProgress(s: PlayerState): number {
  if (!s.isPlaying) return s.progressMs
  return Math.min(s.durationMs || Infinity, s.progressMs + (Date.now() - s.updatedAt))
}

function targetDevice(get: Get): string | undefined {
  const s = get()
  if (s.activeDevice?.id) return undefined // ya hay un dispositivo activo: Spotify lo usa
  return s.sdkDeviceId ?? undefined
}

let elementActivated = false
/** Si no hay dispositivo activo pero nuestro SDK está listo, lo activa. */
async function ensureDevice(get: Get, set: Set) {
  const s = get()
  // En móvil/WebView el audio necesita un gesto del usuario: lo hacemos en el primer play.
  if (sdkPlayer && !elementActivated && (isNative || /Android|iPhone|iPad/i.test(navigator.userAgent))) {
    elementActivated = true
    await sdkPlayer.activateElement().catch(() => undefined)
  }
  if (s.activeDevice?.id) return
  if (s.sdkDeviceId) {
    try {
      await api.transfer(s.sdkDeviceId, false)
      set({ activeDevice: { id: s.sdkDeviceId, name: usePrefs.getState().deviceName, type: 'Computer', is_active: true, volume_percent: s.volume } })
    } catch {
      /* el play con device_id también funciona */
    }
  }
}

function handlePlayError(e: unknown) {
  if (e instanceof ApiError) {
    if (e.status === 404) toast('No hay ningún dispositivo activo. Abre Spotify en otro dispositivo o activa "Reproducir aquí" en Ajustes.', 'error')
    else if (e.status === 403) toast(`Spotify no lo permite: ${e.message} (se requiere Premium)`, 'error')
    else toast(`Error ${e.status}: ${e.message}`, 'error')
  } else if (e instanceof Error) toast(e.message, 'error')
}

export { currentProgress }
