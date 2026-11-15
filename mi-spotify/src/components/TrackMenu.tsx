import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Playlist, Track } from '@/lib/types'
import { useAuth } from '@/store/auth'
import { usePlayer } from '@/store/player'
import { toast } from '@/store/toast'
import { I } from './Icons'
import { Sheet } from './Sheet'

export function TrackMenu({ track, onClose, onRemove }: { track: Track; onClose: () => void; onRemove?: () => void }) {
  const { addToQueue, toggleLike, liked } = usePlayer()
  const user = useAuth((s) => s.user)
  const nav = useNavigate()
  const [playlists, setPlaylists] = useState<Playlist[] | null>(null)
  const [showPl, setShowPl] = useState(false)

  useEffect(() => {
    if (!showPl || playlists) return
    api.myPlaylists(50).then((r) => setPlaylists(r.items.filter((p) => p.owner.id === user?.id || p.collaborative)))
  }, [showPl, playlists, user])

  const go = (path: string) => {
    onClose()
    nav(path)
  }

  if (showPl) {
    return (
      <Sheet title="Añadir a playlist" onClose={onClose}>
        {!playlists && <div className="spinner" />}
        {playlists?.map((p) => (
          <button
            key={p.id}
            className="item"
            onClick={async () => {
              try {
                await api.addToPlaylist(p.id, [track.uri])
                toast(`Añadida a ${p.name}`)
              } catch (e) {
                toast(e instanceof Error ? e.message : 'No se pudo añadir', 'error')
              }
              onClose()
            }}
          >
            <I.Music /> {p.name}
          </button>
        ))}
      </Sheet>
    )
  }

  return (
    <Sheet onClose={onClose}>
      <div className="row" style={{ padding: '4px 8px 12px' }}>
        {track.album?.images?.[0] && <img src={track.album.images[track.album.images.length - 1].url} alt="" width={48} height={48} style={{ borderRadius: 'var(--radius-sm)' }} />}
        <div className="col" style={{ gap: 0, minWidth: 0 }}>
          <b className="truncate">{track.name}</b>
          <span className="muted small truncate">{track.artists.map((a) => a.name).join(', ')}</span>
        </div>
      </div>
      <button className="item" onClick={() => { addToQueue(track.uri); onClose() }}><I.Queue /> Añadir a la cola</button>
      <button className="item" onClick={() => { toggleLike(track.id); onClose() }}>
        {liked[track.id] ? <I.HeartFill /> : <I.Heart />} {liked[track.id] ? 'Quitar de Me gusta' : 'Añadir a Me gusta'}
      </button>
      <button className="item" onClick={() => setShowPl(true)}><I.Plus /> Añadir a playlist</button>
      {onRemove && <button className="item" onClick={() => { onRemove(); onClose() }}><I.Check /> Quitar de esta playlist</button>}
      {track.album?.id && <button className="item" onClick={() => go(`/album/${track.album.id}`)}><I.Music /> Ir al álbum</button>}
      {track.artists[0]?.id && <button className="item" onClick={() => go(`/artist/${track.artists[0].id}`)}><I.Music /> Ir al artista</button>}
    </Sheet>
  )
}
