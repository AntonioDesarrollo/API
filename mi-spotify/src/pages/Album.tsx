import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Hero } from '@/components/Cards'
import { I } from '@/components/Icons'
import { TrackList } from '@/components/TrackList'
import { api } from '@/lib/api'
import { dominantColor } from '@/lib/colors'
import { fmtTotal, imageFor } from '@/lib/format'
import type { Track } from '@/lib/types'
import { useAsync } from '@/lib/useAsync'
import { usePlayer } from '@/store/player'
import { usePrefs } from '@/store/prefs'
import { toast } from '@/store/toast'

export function AlbumPage() {
  const { id = '' } = useParams()
  const { playContext, contextUri, isPlaying, togglePlay } = usePlayer()
  const dynamic = usePrefs((s) => s.dynamicColor)
  const [color, setColor] = useState<string | null>(null)
  const [saved, setSaved] = useState<boolean | null>(null)
  const { data: album, loading, error } = useAsync(() => api.album(id), [id])

  const cover = imageFor(album?.images, 'lg')
  useEffect(() => {
    if (dynamic && cover) dominantColor(cover).then(setColor)
    else setColor(null)
  }, [cover, dynamic])
  useEffect(() => {
    if (id) api.checkSavedAlbums([id]).then((r) => setSaved(r[0])).catch(() => undefined)
  }, [id])

  if (loading) return <div className="spinner" />
  if (error || !album) return <div className="empty">{error ?? 'Álbum no encontrado'}</div>
  const tracks: Track[] = album.tracks.items.map((t) => ({ ...t, album: { ...album, tracks: undefined } as unknown as Track['album'] }))
  const active = contextUri === album.uri
  const total = tracks.reduce((a, t) => a + t.duration_ms, 0)

  const toggleSave = async () => {
    try {
      if (saved) await api.removeAlbums([album.id])
      else await api.saveAlbums([album.id])
      setSaved(!saved)
      toast(saved ? 'Álbum quitado de tu biblioteca' : 'Álbum guardado')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Error', 'error')
    }
  }

  return (
    <div className="page">
      <Hero image={cover} kicker={album.album_type === 'single' ? 'Sencillo' : 'Álbum'} title={album.name} color={color}
        subtitle={<p>{album.artists.map((a, i) => <span key={a.id}>{i > 0 && ', '}<Link to={`/artist/${a.id}`}><b>{a.name}</b></Link></span>)} · {album.release_date?.slice(0, 4)} · {album.total_tracks} canciones, {fmtTotal(total)}</p>}>
        <div className="toolbar">
          <button className="icon-btn big" onClick={() => (active ? togglePlay() : playContext(album.uri))} aria-label="Reproducir">{active && isPlaying ? <I.Pause /> : <I.Play />}</button>
          <button className={`icon-btn ${saved ? 'active' : ''}`} onClick={toggleSave} aria-label="Guardar álbum">{saved ? <I.HeartFill /> : <I.Heart />}</button>
        </div>
      </Hero>
      <TrackList tracks={tracks} contextUri={album.uri} showArt={false} numbered />
      {album.copyrights?.[0] && <p className="muted small">{album.label} · {album.copyrights[0].text}</p>}
    </div>
  )
}
