import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card } from '@/components/Cards'
import { I } from '@/components/Icons'
import { Sheet } from '@/components/Sheet'
import { api } from '@/lib/api'
import { imageFor } from '@/lib/format'
import { useAsync } from '@/lib/useAsync'
import { useAuth } from '@/store/auth'
import { toast } from '@/store/toast'

const TABS = [
  { id: 'playlists', label: 'Playlists' },
  { id: 'albums', label: 'Álbumes' },
  { id: 'artists', label: 'Artistas' },
]

export function Library() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'playlists'
  const user = useAuth((s) => s.user)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [view, setView] = useState<'grid' | 'list'>(() => (localStorage.getItem('ondas.libView') as 'grid' | 'list') || 'grid')

  const { data, loading, error, reload } = useAsync(async () => {
    if (tab === 'albums') return (await api.savedAlbums(50)).items.map((i) => ({ id: i.album.id, to: `/album/${i.album.id}`, image: imageFor(i.album.images), title: i.album.name, sub: i.album.artists.map((a) => a.name).join(', '), uri: i.album.uri, round: false }))
    if (tab === 'artists') return (await api.followedArtists(50)).artists.items.map((a) => ({ id: a.id, to: `/artist/${a.id}`, image: imageFor(a.images), title: a.name, sub: 'Artista', uri: a.uri, round: true }))
    const all = []
    let offset = 0
    for (;;) {
      const page = await api.myPlaylists(50, offset)
      all.push(...page.items.filter(Boolean))
      if (!page.next || all.length >= 300) break
      offset += 50
    }
    return all.map((p) => ({ id: p.id, to: `/playlist/${p.id}`, image: imageFor(p.images), title: p.name, sub: `${p.owner.display_name} · ${p.tracks.total} canciones`, uri: p.uri, round: false }))
  }, [tab])

  const setViewPersist = (v: 'grid' | 'list') => {
    setView(v)
    localStorage.setItem('ondas.libView', v)
  }

  const create = async () => {
    if (!user || !name.trim()) return
    try {
      await api.createPlaylist(user.id, name.trim())
      toast('Playlist creada')
      setCreating(false)
      setName('')
      reload()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo crear', 'error')
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Tu biblioteca</h1>
        <span className="spacer" />
        <div className="segmented">
          <button className={view === 'grid' ? 'active' : ''} onClick={() => setViewPersist('grid')}>Cuadrícula</button>
          <button className={view === 'list' ? 'active' : ''} onClick={() => setViewPersist('list')}>Lista</button>
        </div>
        {tab === 'playlists' && <button className="btn sm primary" onClick={() => setCreating(true)}><I.Plus width={16} height={16} /> Nueva</button>}
      </div>
      <div className="chips">
        <Link to="/liked" className="chip">♥ Me gusta</Link>
        {TABS.map((t) => (
          <button key={t.id} className={`chip ${tab === t.id ? 'active' : ''}`} onClick={() => setParams({ tab: t.id })}>{t.label}</button>
        ))}
      </div>
      {loading && <div className="spinner" />}
      {error && <div className="empty">{error}</div>}
      {data && data.length === 0 && <div className="empty">Nada por aquí todavía.</div>}
      {data && view === 'grid' && (
        <div className="grid">
          {data.map((x) => <Card key={x.id} to={x.to} image={x.image} title={x.title} subtitle={x.sub} round={x.round} playUri={x.uri} />)}
        </div>
      )}
      {data && view === 'list' && (
        <div className="track-list">
          {data.map((x) => (
            <Link key={x.id} to={x.to} className="track">
              <span className="num" />
              {x.image ? <img src={x.image} alt="" loading="lazy" style={x.round ? { borderRadius: '50%' } : undefined} /> : <div className="ph" />}
              <div className="col" style={{ gap: 0, minWidth: 0 }}>
                <span className="name truncate">{x.title}</span>
                <span className="sub truncate">{x.sub}</span>
              </div>
              <span /><span />
            </Link>
          ))}
        </div>
      )}
      {creating && (
        <Sheet title="Nueva playlist" onClose={() => setCreating(false)}>
          <div className="col" style={{ gap: 12, padding: 8 }}>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre de la playlist" autoFocus onKeyDown={(e) => e.key === 'Enter' && create()} />
            <button className="btn primary" onClick={create} disabled={!name.trim()}>Crear</button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
