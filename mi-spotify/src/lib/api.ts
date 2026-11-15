import { getAccessToken } from './auth'
import type {
  Album, AlbumRef, Artist, Device, Paging, PlayHistoryItem, PlaybackState, Playlist, PlaylistTrackItem, SavedAlbumItem,
  SavedTrackItem, SearchResult, SimplifiedTrack, Track, User,
} from './types'

const BASE = 'https://api.spotify.com/v1'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(method: string, path: string, body?: unknown, retry = true): Promise<T> {
  const token = await getAccessToken()
  const res = await fetch(path.startsWith('http') ? path : BASE + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401 && retry) {
    await getAccessToken(true)
    return request<T>(method, path, body, false)
  }
  if (res.status === 429 && retry) {
    const wait = Number(res.headers.get('Retry-After') || '1') * 1000
    await new Promise((r) => setTimeout(r, Math.min(wait, 10_000)))
    return request<T>(method, path, body, false)
  }
  if (res.status === 204 || res.status === 202) return undefined as T
  if (!res.ok) {
    let msg = res.statusText
    try {
      const j = await res.json()
      msg = j?.error?.message || msg
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, msg)
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

const get = <T>(path: string) => request<T>('GET', path)
const put = <T = void>(path: string, body?: unknown) => request<T>('PUT', path, body)
const post = <T = void>(path: string, body?: unknown) => request<T>('POST', path, body)
const del = <T = void>(path: string, body?: unknown) => request<T>('DELETE', path, body)

const q = (params: Record<string, string | number | boolean | undefined>) => {
  const s = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') s.set(k, String(v))
  const str = s.toString()
  return str ? `?${str}` : ''
}

export const api = {
  me: () => get<User>('/me'),
  // Biblioteca
  myPlaylists: (limit = 50, offset = 0) => get<Paging<Playlist>>(`/me/playlists${q({ limit, offset })}`),
  savedTracks: (limit = 50, offset = 0) => get<Paging<SavedTrackItem>>(`/me/tracks${q({ limit, offset })}`),
  savedAlbums: (limit = 50, offset = 0) => get<Paging<SavedAlbumItem>>(`/me/albums${q({ limit, offset })}`),
  followedArtists: (limit = 50) => get<{ artists: Paging<Artist> }>(`/me/following${q({ type: 'artist', limit })}`),
  topTracks: (range: 'short_term' | 'medium_term' | 'long_term' = 'short_term', limit = 20) =>
    get<Paging<Track>>(`/me/top/tracks${q({ time_range: range, limit })}`),
  topArtists: (range: 'short_term' | 'medium_term' | 'long_term' = 'short_term', limit = 20) =>
    get<Paging<Artist>>(`/me/top/artists${q({ time_range: range, limit })}`),
  recentlyPlayed: (limit = 30) => get<{ items: PlayHistoryItem[] }>(`/me/player/recently-played${q({ limit })}`),
  newReleases: (limit = 20) => get<{ albums: Paging<AlbumRef> }>(`/browse/new-releases${q({ limit })}`),
  checkSavedTracks: (ids: string[]) => get<boolean[]>(`/me/tracks/contains${q({ ids: ids.join(',') })}`),
  saveTracks: (ids: string[]) => put(`/me/tracks`, { ids }),
  removeTracks: (ids: string[]) => del(`/me/tracks`, { ids }),
  checkSavedAlbums: (ids: string[]) => get<boolean[]>(`/me/albums/contains${q({ ids: ids.join(',') })}`),
  saveAlbums: (ids: string[]) => put(`/me/albums`, { ids }),
  removeAlbums: (ids: string[]) => del(`/me/albums`, { ids }),
  isFollowingArtists: (ids: string[]) => get<boolean[]>(`/me/following/contains${q({ type: 'artist', ids: ids.join(',') })}`),
  followArtists: (ids: string[]) => put(`/me/following${q({ type: 'artist', ids: ids.join(',') })}`),
  unfollowArtists: (ids: string[]) => del(`/me/following${q({ type: 'artist', ids: ids.join(',') })}`),
  // Catálogo
  search: (query: string, types = 'track,artist,album,playlist', limit = 10) =>
    get<SearchResult>(`/search${q({ q: query, type: types, limit })}`),
  playlist: (id: string) => get<Playlist>(`/playlists/${id}`),
  playlistTracks: (id: string, limit = 100, offset = 0) =>
    get<Paging<PlaylistTrackItem>>(`/playlists/${id}/tracks${q({ limit, offset })}`),
  album: (id: string) => get<Album>(`/albums/${id}`),
  albumTracks: (id: string, limit = 50, offset = 0) => get<Paging<SimplifiedTrack>>(`/albums/${id}/tracks${q({ limit, offset })}`),
  artist: (id: string) => get<Artist>(`/artists/${id}`),
  artistTopTracks: (id: string) => get<{ tracks: Track[] }>(`/artists/${id}/top-tracks`),
  artistAlbums: (id: string, limit = 50) =>
    get<Paging<AlbumRef>>(`/artists/${id}/albums${q({ limit, include_groups: 'album,single,compilation' })}`),
  track: (id: string) => get<Track>(`/tracks/${id}`),
  // Playlists (modificación)
  createPlaylist: (userId: string, name: string, description = '', isPublic = false) =>
    post<Playlist>(`/users/${userId}/playlists`, { name, description, public: isPublic }),
  addToPlaylist: (playlistId: string, uris: string[]) => post(`/playlists/${playlistId}/tracks`, { uris }),
  removeFromPlaylist: (playlistId: string, uris: string[]) =>
    del(`/playlists/${playlistId}/tracks`, { tracks: uris.map((uri) => ({ uri })) }),
  // Reproductor (Spotify Connect)
  playbackState: () => get<PlaybackState | undefined>('/me/player'),
  devices: () => get<{ devices: Device[] }>('/me/player/devices'),
  transfer: (deviceId: string, play = true) => put('/me/player', { device_ids: [deviceId], play }),
  play: (opts: { deviceId?: string; contextUri?: string; uris?: string[]; offset?: { position?: number; uri?: string }; positionMs?: number }) =>
    put(`/me/player/play${q({ device_id: opts.deviceId })}`, {
      ...(opts.contextUri ? { context_uri: opts.contextUri } : {}),
      ...(opts.uris ? { uris: opts.uris } : {}),
      ...(opts.offset ? { offset: opts.offset } : {}),
      ...(opts.positionMs !== undefined ? { position_ms: opts.positionMs } : {}),
    }),
  resume: (deviceId?: string) => put(`/me/player/play${q({ device_id: deviceId })}`),
  pause: (deviceId?: string) => put(`/me/player/pause${q({ device_id: deviceId })}`),
  next: (deviceId?: string) => post(`/me/player/next${q({ device_id: deviceId })}`),
  previous: (deviceId?: string) => post(`/me/player/previous${q({ device_id: deviceId })}`),
  seek: (positionMs: number, deviceId?: string) => put(`/me/player/seek${q({ position_ms: Math.round(positionMs), device_id: deviceId })}`),
  volume: (percent: number, deviceId?: string) =>
    put(`/me/player/volume${q({ volume_percent: Math.round(percent), device_id: deviceId })}`),
  shuffle: (state: boolean, deviceId?: string) => put(`/me/player/shuffle${q({ state, device_id: deviceId })}`),
  repeat: (state: 'off' | 'track' | 'context', deviceId?: string) => put(`/me/player/repeat${q({ state, device_id: deviceId })}`),
  queue: () => get<{ currently_playing: Track | null; queue: Track[] }>('/me/player/queue'),
  addToQueue: (uri: string, deviceId?: string) => post(`/me/player/queue${q({ uri, device_id: deviceId })}`),
}

export type Api = typeof api
