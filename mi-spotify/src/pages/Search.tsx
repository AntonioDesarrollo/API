import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, Section } from '@/components/Cards'
import { I } from '@/components/Icons'
import { TrackList } from '@/components/TrackList'
import { api } from '@/lib/api'
import { imageFor } from '@/lib/format'
import type { SearchResult } from '@/lib/types'

const TYPES = [
  { id: 'all', label: 'Todo' },
  { id: 'track', label: 'Canciones' },
  { id: 'artist', label: 'Artistas' },
  { id: 'album', label: 'Álbumes' },
  { id: 'playlist', label: 'Playlists' },
]

export function Search() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const type = params.get('type') ?? 'all'
  const [input, setInput] = useState(q)
  const [res, setRes] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<string[]>(() => JSON.parse(localStorage.getItem('ondas.search') || '[]'))

  useEffect(() => {
    const t = setTimeout(() => {
      if (input !== q) setParams(input ? { q: input, type } : {}, { replace: true })
    }, 350)
    return () => clearTimeout(t)
  }, [input, q, type, setParams])

  useEffect(() => {
    if (!q) return setRes(null)
    let alive = true
    setLoading(true)
    const types = type === 'all' ? 'track,artist,album,playlist' : type
    api.search(q, types, type === 'all' ? 8 : 30).then((r) => {
      if (!alive) return
      setRes(r)
      setLoading(false)
      const h = [q, ...history.filter((x) => x !== q)].slice(0, 8)
      setHistory(h)
      localStorage.setItem('ondas.search', JSON.stringify(h))
    }, () => alive && setLoading(false))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, type])

  return (
    <div className="page">
      <h1>Buscar</h1>
      <div className="search-box">
        <I.Search />
        <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Canciones, artistas, álbumes…" autoFocus enterKeyHint="search" />
      </div>
      <div className="chips">
        {TYPES.map((t) => (
          <button key={t.id} className={`chip ${type === t.id ? 'active' : ''}`} onClick={() => setParams(q ? { q, type: t.id } : { type: t.id }, { replace: true })}>{t.label}</button>
        ))}
      </div>
      {!q && history.length > 0 && (
        <Section title="Búsquedas recientes">
          <div className="chips">
            {history.map((h) => <button key={h} className="chip" onClick={() => setInput(h)}>{h}</button>)}
            <button className="chip" onClick={() => { setHistory([]); localStorage.removeItem('ondas.search') }}>Borrar</button>
          </div>
        </Section>
      )}
      {loading && <div className="spinner" />}
      {res?.tracks && res.tracks.items.length > 0 && (
        <Section title="Canciones"><TrackList tracks={res.tracks.items} /></Section>
      )}
      {res?.artists && res.artists.items.length > 0 && (
        <Section title="Artistas">
          <div className="grid">{res.artists.items.map((a) => <Card key={a.id} to={`/artist/${a.id}`} image={imageFor(a.images)} title={a.name} subtitle="Artista" round playUri={a.uri} />)}</div>
        </Section>
      )}
      {res?.albums && res.albums.items.length > 0 && (
        <Section title="Álbumes">
          <div className="grid">{res.albums.items.map((a) => <Card key={a.id} to={`/album/${a.id}`} image={imageFor(a.images)} title={a.name} subtitle={`${a.release_date?.slice(0, 4) ?? ''} · ${a.artists.map((x) => x.name).join(', ')}`} playUri={a.uri} />)}</div>
        </Section>
      )}
      {res?.playlists && res.playlists.items.filter(Boolean).length > 0 && (
        <Section title="Playlists">
          <div className="grid">{res.playlists.items.filter((p): p is NonNullable<typeof p> => !!p).map((p) => <Card key={p.id} to={`/playlist/${p.id}`} image={imageFor(p.images)} title={p.name} subtitle={`De ${p.owner.display_name}`} playUri={p.uri} />)}</div>
        </Section>
      )}
      {q && !loading && res && !res.tracks?.items.length && !res.artists?.items.length && !res.albums?.items.length && !res.playlists?.items.length && (
        <div className="empty">Sin resultados para "{q}".</div>
      )}
    </div>
  )
}
