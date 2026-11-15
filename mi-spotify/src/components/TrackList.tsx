import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Track } from '@/lib/types'
import { artistNames, fmtTime } from '@/lib/format'
import { usePlayer } from '@/store/player'
import { I } from './Icons'
import { TrackMenu } from './TrackMenu'

interface Props {
  tracks: Track[]
  contextUri?: string
  showArt?: boolean
  showAlbum?: boolean
  numbered?: boolean
  onRemove?: (track: Track) => void
}

export function TrackList({ tracks, contextUri, showArt = true, numbered = false, onRemove }: Props) {
  const { track: current, isPlaying, playContext, playUris, liked, toggleLike, checkLiked } = usePlayer()
  const [menu, setMenu] = useState<Track | null>(null)

  useEffect(() => {
    checkLiked(tracks.map((t) => t.id).filter(Boolean))
  }, [tracks, checkLiked])

  const play = (i: number) => {
    const t = tracks[i]
    if (contextUri) playContext(contextUri, { uri: t.uri })
    else playUris(tracks.map((x) => x.uri).filter(Boolean), i)
  }

  return (
    <div className="track-list">
      {tracks.map((t, i) => {
        const active = current?.id === t.id || current?.uri === t.uri
        return (
          <div key={`${t.id}-${i}`} className={`track ${active ? 'playing' : ''} ${showArt ? '' : 'no-art'}`}>
            <button className="num" onClick={() => play(i)} aria-label="Reproducir">
              {active && isPlaying ? (
                <span className="playing-anim"><span /><span /><span /></span>
              ) : numbered ? (
                i + 1
              ) : (
                <I.Play width={16} height={16} />
              )}
            </button>
            {showArt && (t.album?.images?.length ? <img src={t.album.images[t.album.images.length - 1].url} alt="" loading="lazy" onClick={() => play(i)} /> : <div className="ph" />)}
            <div className="col" style={{ gap: 0, minWidth: 0 }} onClick={() => play(i)}>
              <span className="name truncate">{t.explicit && <I.Explicit width={14} height={14} style={{ verticalAlign: '-2px', marginRight: 6, opacity: 0.7 }} />}{t.name}</span>
              <span className="sub truncate">
                {t.artists.map((a, k) => (
                  <span key={a.id || k}>
                    {k > 0 && ', '}
                    {a.id ? <Link to={`/artist/${a.id}`} onClick={(e) => e.stopPropagation()}>{a.name}</Link> : a.name}
                  </span>
                ))}
                {t.album?.name && t.artists.length === 0 && artistNames(t.artists)}
              </span>
            </div>
            <span className="dur">{fmtTime(t.duration_ms)}</span>
            <div className="actions">
              <button className={`icon-btn ${liked[t.id] ? 'active' : ''}`} onClick={() => toggleLike(t.id)} aria-label="Me gusta">
                {liked[t.id] ? <I.HeartFill /> : <I.Heart />}
              </button>
              <button className="icon-btn" onClick={() => setMenu(t)} aria-label="Más opciones"><I.More /></button>
            </div>
          </div>
        )
      })}
      {menu && <TrackMenu track={menu} onClose={() => setMenu(null)} onRemove={onRemove ? () => onRemove(menu) : undefined} />}
    </div>
  )
}
