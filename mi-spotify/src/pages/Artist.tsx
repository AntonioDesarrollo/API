import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card, Hero, Section } from '@/components/Cards'
import { I } from '@/components/Icons'
import { TrackList } from '@/components/TrackList'
import { api } from '@/lib/api'
import { dominantColor } from '@/lib/colors'
import { fmtNumber, imageFor } from '@/lib/format'
import { useAsync } from '@/lib/useAsync'
import { usePlayer } from '@/store/player'
import { usePrefs } from '@/store/prefs'
import { toast } from '@/store/toast'

export function ArtistPage() {
  const { id = '' } = useParams()
  const { playContext, contextUri, isPlaying, togglePlay } = usePlayer()
  const dynamic = usePrefs((s) => s.dynamicColor)
  const [color, setColor] = useState<string | null>(null)
  const [following, setFollowing] = useState<boolean | null>(null)
  const [showAll, setShowAll] = useState(false)
  const { data, loading, error } = useAsync(() => Promise.all([api.artist(id), api.artistTopTracks(id), api.artistAlbums(id)]), [id])

  const cover = imageFor(data?.[0]?.images, 'lg')
  useEffect(() => {
    if (dynamic && cover) dominantColor(cover).then(setColor)
    else setColor(null)
  }, [cover, dynamic])
  useEffect(() => {
    if (id) api.isFollowingArtists([id]).then((r) => setFollowing(r[0])).catch(() => undefined)
  }, [id])

  if (loading) return <div className="spinner" />
  if (error || !data) return <div className="empty">{error ?? 'Artista no encontrado'}</div>
  const [artist, top, albums] = data
  const active = contextUri === artist.uri
  const seen = new Set<string>()
  const uniqueAlbums = albums.items.filter((a) => {
    const k = `${a.name}-${a.album_type}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  const toggleFollow = async () => {
    try {
      if (following) await api.unfollowArtists([artist.id])
      else await api.followArtists([artist.id])
      setFollowing(!following)
      toast(following ? 'Dejaste de seguir' : 'Ahora sigues a este artista')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Error', 'error')
    }
  }

  return (
    <div className="page">
      <Hero image={cover} kicker="Artista" title={artist.name} round color={color}
        subtitle={<p>{artist.followers ? `${fmtNumber(artist.followers.total)} seguidores` : ''}{artist.genres?.length ? ` · ${artist.genres.slice(0, 3).join(', ')}` : ''}</p>}>
        <div className="toolbar">
          <button className="icon-btn big" onClick={() => (active ? togglePlay() : playContext(artist.uri))} aria-label="Reproducir">{active && isPlaying ? <I.Pause /> : <I.Play />}</button>
          <button className={`btn outline sm ${following ? 'active' : ''}`} onClick={toggleFollow}>{following ? 'Siguiendo ✓' : 'Seguir'}</button>
        </div>
      </Hero>
      <Section title="Populares">
        <TrackList tracks={showAll ? top.tracks : top.tracks.slice(0, 5)} />
        {top.tracks.length > 5 && <button className="btn sm outline" style={{ alignSelf: 'flex-start' }} onClick={() => setShowAll(!showAll)}>{showAll ? 'Ver menos' : 'Ver más'}</button>}
      </Section>
      <Section title="Discografía">
        <div className="grid">
          {uniqueAlbums.map((a) => <Card key={a.id} to={`/album/${a.id}`} image={imageFor(a.images)} title={a.name} subtitle={`${a.release_date?.slice(0, 4) ?? ''} · ${a.album_type === 'single' ? 'Sencillo' : a.album_type === 'compilation' ? 'Recopilatorio' : 'Álbum'}`} playUri={a.uri} />)}
        </div>
      </Section>
    </div>
  )
}
