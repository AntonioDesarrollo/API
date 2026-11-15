import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Hero } from '@/components/Cards'
import { I } from '@/components/Icons'
import { TrackList } from '@/components/TrackList'
import { api } from '@/lib/api'
import { dominantColor } from '@/lib/colors'
import { fmtNumber, fmtTotal, imageFor, stripHtml } from '@/lib/format'
import type { Track } from '@/lib/types'
import { useAsync } from '@/lib/useAsync'
import { useAuth } from '@/store/auth'
import { usePlayer } from '@/store/player'
import { usePrefs } from '@/store/prefs'
import { toast } from '@/store/toast'

export function PlaylistPage() {
  const { id = '' } = useParams()
  const user = useAuth((s) => s.user)
  const { playContext, contextUri, isPlaying, togglePlay, toggleShuffle } = usePlayer()
  const dynamic = usePrefs((s) => s.dynamicColor)
  const [tracks, setTracks] = useState<Track[]>([])
  const [color, setColor] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  const { data: pl, loading, error } = useAsync(() => api.playlist(id), [id])

  useEffect(() => {
    if (!id) return
    let alive = true
    ;(async () => {
      const all: Track[] = []
      let offset = 0
      for (;;) {
        const page = await api.playlistTracks(id, 100, offset)
        all.push(...page.items.map((i) => i.track).filter((t): t is Track => !!t && !!t.id))
        if (!alive) return
        setTracks([...all])
        if (!page.next || offset > 2000) break
        offset += 100
      }
    })().catch(() => undefined)
    return () => {
      alive = false
    }
  }, [id])

  const cover = imageFor(pl?.images, 'lg')
  useEffect(() => {
    if (dynamic && cover) dominantColor(cover).then(setColor)
    else setColor(null)
  }, [cover, dynamic])

  if (loading) return <div className="spinner" />
  if (error || !pl) return <div className="empty">{error ?? 'Playlist no encontrada'}</div>
  const mine = pl.owner.id === user?.id
  const active = contextUri === pl.uri
  const total = tracks.reduce((a, t) => a + t.duration_ms, 0)
  const shown = filter ? tracks.filter((t) => `${t.name} ${t.artists.map((a) => a.name).join(' ')} ${t.album.name}`.toLowerCase().includes(filter.toLowerCase())) : tracks

  const remove = async (t: Track) => {
    try {
      await api.removeFromPlaylist(pl.id, [t.uri])
      setTracks((ts) => ts.filter((x) => x.uri !== t.uri))
      toast('Canción quitada')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo quitar', 'error')
    }
  }

  return (
    <div className="page">
      <Hero image={cover} kicker={pl.public === false ? 'Playlist privada' : 'Playlist'} title={pl.name} color={color}
        subtitle={<>{stripHtml(pl.description) && <p>{stripHtml(pl.description)}</p>}<p><b>{pl.owner.display_name}</b> · {fmtNumber(pl.tracks.total)} canciones{total > 0 && `, ${fmtTotal(total)}`}</p></>}>
        <div className="toolbar">
          <button className="icon-btn big" onClick={() => (active ? togglePlay() : playContext(pl.uri))} aria-label="Reproducir">{active && isPlaying ? <I.Pause /> : <I.Play />}</button>
          <button className="btn outline sm" onClick={() => { toggleShuffle(); playContext(pl.uri) }}><I.Shuffle width={16} height={16} /> Aleatorio</button>
        </div>
      </Hero>
      <input className="input" placeholder="Filtrar en esta playlist…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      <TrackList tracks={shown} contextUri={filter ? undefined : pl.uri} numbered onRemove={mine ? remove : undefined} />
      {tracks.length < pl.tracks.total && <div className="spinner" />}
    </div>
  )
}
