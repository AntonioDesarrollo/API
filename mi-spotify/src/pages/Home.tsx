import { Link } from 'react-router-dom'
import { Card, Section, Shelf } from '@/components/Cards'
import { TrackList } from '@/components/TrackList'
import { api } from '@/lib/api'
import { imageFor } from '@/lib/format'
import type { Track } from '@/lib/types'
import { useAsync } from '@/lib/useAsync'
import { useAuth } from '@/store/auth'
import { usePrefs, type HomeSection } from '@/store/prefs'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

const settle = <T,>(p: Promise<T>) => p.then((v) => v, () => null)

export function Home() {
  const user = useAuth((s) => s.user)
  const sections = usePrefs((s) => s.homeSections)
  const { data, loading, error } = useAsync(
    () =>
      Promise.all([
        settle(api.recentlyPlayed(30)),
        settle(api.topTracks('short_term', 10)),
        settle(api.myPlaylists(20)),
        settle(api.newReleases(20)),
        settle(api.savedAlbums(20)),
        settle(api.topArtists('medium_term', 20)),
      ]),
    [],
  )
  if (loading) return <div className="spinner" />
  if (error) return <div className="empty">{error}</div>
  const [recent, top, playlists, releases, albums, artists] = data!

  const recentUnique: Track[] = []
  const seen = new Set<string>()
  for (const r of recent?.items ?? []) {
    if (!seen.has(r.track.id)) {
      seen.add(r.track.id)
      recentUnique.push(r.track)
    }
  }

  const render: Record<HomeSection, () => React.ReactNode> = {
    recientes: () =>
      recentUnique.length > 0 && (
        <Section title="Escuchado recientemente" key="recientes">
          <Shelf>
            {recentUnique.slice(0, 12).map((t) => (
              <Card key={t.id} to={`/album/${t.album.id}`} image={imageFor(t.album.images)} title={t.name} subtitle={t.artists.map((a) => a.name).join(', ')} playUri={t.album.uri} />
            ))}
          </Shelf>
        </Section>
      ),
    top: () =>
      top && top.items.length > 0 && (
        <Section title="Tus más escuchadas" key="top">
          <TrackList tracks={top.items} />
        </Section>
      ),
    playlists: () =>
      playlists && playlists.items.length > 0 && (
        <Section title="Tus playlists" to="/library" key="playlists">
          <Shelf>
            {playlists.items.filter(Boolean).map((p) => (
              <Card key={p.id} to={`/playlist/${p.id}`} image={imageFor(p.images)} title={p.name} subtitle={`De ${p.owner.display_name}`} playUri={p.uri} />
            ))}
          </Shelf>
        </Section>
      ),
    novedades: () =>
      releases && releases.albums.items.length > 0 && (
        <Section title="Novedades" key="novedades">
          <Shelf>
            {releases.albums.items.map((a) => (
              <Card key={a.id} to={`/album/${a.id}`} image={imageFor(a.images)} title={a.name} subtitle={a.artists.map((x) => x.name).join(', ')} playUri={a.uri} />
            ))}
          </Shelf>
        </Section>
      ),
    albums: () =>
      albums && albums.items.length > 0 && (
        <Section title="Álbumes guardados" to="/library?tab=albums" key="albums">
          <Shelf>
            {albums.items.map(({ album }) => (
              <Card key={album.id} to={`/album/${album.id}`} image={imageFor(album.images)} title={album.name} subtitle={album.artists.map((x) => x.name).join(', ')} playUri={album.uri} />
            ))}
          </Shelf>
        </Section>
      ),
    artistas: () =>
      artists && artists.items.length > 0 && (
        <Section title="Tus artistas" key="artistas">
          <Shelf>
            {artists.items.map((a) => (
              <Card key={a.id} to={`/artist/${a.id}`} image={imageFor(a.images)} title={a.name} subtitle="Artista" round playUri={a.uri} />
            ))}
          </Shelf>
        </Section>
      ),
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>{greeting()}{user?.display_name ? `, ${user.display_name.split(' ')[0]}` : ''}</h1>
        <span className="spacer" />
        <Link to="/liked" className="chip">Me gusta</Link>
        <Link to="/settings" className="chip">Ajustes</Link>
      </div>
      {sections.map((s) => render[s]?.())}
      {sections.length === 0 && <div className="empty">Activa secciones de Inicio en Ajustes.</div>}
    </div>
  )
}
