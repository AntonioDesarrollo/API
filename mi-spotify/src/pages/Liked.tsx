import { useEffect, useState } from 'react'
import { Hero } from '@/components/Cards'
import { I } from '@/components/Icons'
import { TrackList } from '@/components/TrackList'
import { api } from '@/lib/api'
import { fmtNumber } from '@/lib/format'
import type { Track } from '@/lib/types'
import { useAuth } from '@/store/auth'
import { usePlayer } from '@/store/player'

export function LikedPage() {
  const user = useAuth((s) => s.user)
  const { playContext, playUris } = usePlayer()
  const [tracks, setTracks] = useState<Track[]>([])
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const all: Track[] = []
      let offset = 0
      for (;;) {
        const page = await api.savedTracks(50, offset)
        if (!alive) return
        all.push(...page.items.map((i) => i.track))
        setTotal(page.total)
        setTracks([...all])
        if (!page.next || offset > 3000) break
        offset += 50
      }
      setDone(true)
    })().catch(() => setDone(true))
    return () => {
      alive = false
    }
  }, [])

  const uri = user ? `spotify:user:${user.id}:collection` : ''
  const shown = filter ? tracks.filter((t) => `${t.name} ${t.artists.map((a) => a.name).join(' ')}`.toLowerCase().includes(filter.toLowerCase())) : tracks

  return (
    <div className="page">
      <Hero image="" kicker="Playlist" title="Canciones que te gustan" subtitle={<p>{fmtNumber(total)} canciones</p>}>
        <div className="toolbar">
          <button className="icon-btn big" onClick={() => (uri ? playContext(uri).catch(() => playUris(tracks.slice(0, 100).map((t) => t.uri))) : playUris(tracks.slice(0, 100).map((t) => t.uri)))} aria-label="Reproducir"><I.Play /></button>
        </div>
      </Hero>
      <input className="input" placeholder="Filtrar…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      <TrackList tracks={shown} />
      {!done && <div className="spinner" />}
    </div>
  )
}
