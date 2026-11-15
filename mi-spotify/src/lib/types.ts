export interface Image { url: string; width: number | null; height: number | null }
export interface ArtistRef { id: string; name: string; uri: string; type: 'artist' }
export interface Artist extends ArtistRef { images?: Image[]; genres?: string[]; followers?: { total: number } }
export interface AlbumRef {
  id: string; name: string; uri: string; images: Image[]; release_date?: string; artists: ArtistRef[]; album_type?: string; total_tracks?: number
}
export interface Track {
  id: string; name: string; uri: string; duration_ms: number; explicit: boolean; is_local?: boolean
  artists: ArtistRef[]; album: AlbumRef; track_number?: number; preview_url?: string | null; is_playable?: boolean
}
export interface SimplifiedTrack extends Omit<Track, 'album'> { album?: AlbumRef }
export interface Playlist {
  id: string; name: string; uri: string; description: string | null; images: Image[] | null
  owner: { id: string; display_name: string }; tracks: { total: number; href: string }; public: boolean | null; collaborative?: boolean
}
export interface User { id: string; display_name: string; email?: string; images: Image[]; product?: string; country?: string }
export interface Paging<T> { items: T[]; total: number; limit: number; offset: number; next: string | null }
export interface Device { id: string | null; name: string; type: string; is_active: boolean; volume_percent: number | null; supports_volume?: boolean }
export interface PlaybackState {
  device: Device; shuffle_state: boolean; repeat_state: 'off' | 'track' | 'context'; progress_ms: number | null; is_playing: boolean
  item: Track | null; context: { uri: string; type: string } | null; timestamp: number
}
export interface Album extends AlbumRef { tracks: Paging<SimplifiedTrack>; genres?: string[]; label?: string; copyrights?: { text: string }[] }
export interface PlaylistTrackItem { added_at: string; track: Track | null; is_local: boolean }
export interface SavedTrackItem { added_at: string; track: Track }
export interface SavedAlbumItem { added_at: string; album: Album }
export interface SearchResult {
  tracks?: Paging<Track>; artists?: Paging<Artist>; albums?: Paging<AlbumRef>; playlists?: Paging<Playlist | null>
}
export interface PlayHistoryItem { played_at: string; track: Track; context: { uri: string; type: string } | null }
