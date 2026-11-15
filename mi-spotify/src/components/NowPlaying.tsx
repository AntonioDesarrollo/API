import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dominantColor } from '@/lib/colors'
import { fmtTime, imageFor } from '@/lib/format'
import { usePlayer } from '@/store/player'
import { usePrefs } from '@/store/prefs'
import { DevicePicker } from './DevicePicker'
import { I } from './Icons'
import { Seek } from './Seek'
import { TrackMenu } from './TrackMenu'
import { useProgress } from './useProgress'
import { Volume } from './Volume'

export function NowPlaying() {
  const p = usePlayer()
  const dynamic = usePrefs((s) => s.dynamicColor)
  const [color, setColor] = useState<string | null>(null)
  const [devices, setDevices] = useState(false)
  const [menu, setMenu] = useState(false)
  const t = p.track
  const art = imageFor(t?.album?.images, 'lg')

  useEffect(() => {
    if (!dynamic || !art) return setColor(null)
    dominantColor(art).then(setColor)
  }, [art, dynamic])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && p.setNowPlayingOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [p])

  if (!p.nowPlayingOpen || !t) return null
  const close = () => p.setNowPlayingOpen(false)
  const ctxLabel = p.contextUri?.split(':')[1]
  const ctxNames: Record<string, string> = { playlist: 'Reproduciendo playlist', album: 'Reproduciendo álbum', artist: 'Reproduciendo artista', collection: 'Tus canciones favoritas' }

  return (
    <div className={`now-playing ${color ? 'dyn' : ''}`} style={color ? ({ '--hero-color': color } as React.CSSProperties) : undefined}>
      <div className="np-head">
        <button className="icon-btn" onClick={close} aria-label="Cerrar"><I.Down /></button>
        <div className="ctx muted">
          {ctxLabel && ctxNames[ctxLabel] ? ctxNames[ctxLabel] : 'Reproduciendo'}
          <b>{p.activeDevice?.name ?? ''}</b>
        </div>
        <button className="icon-btn" onClick={() => setMenu(true)} aria-label="Opciones"><I.More /></button>
      </div>
      <div className="np-body">
        {art ? <img className={`art ${p.isPlaying ? '' : 'paused'}`} src={art} alt="" /> : <div className="art" />}
        <div className="np-title">
          <div className="col" style={{ gap: 2, minWidth: 0, flex: 1 }}>
            <h2 className="truncate">{t.name}</h2>
            <span className="muted truncate">
              {t.artists.map((a, i) => (
                <span key={a.id || i}>{i > 0 && ', '}{a.id ? <Link to={`/artist/${a.id}`} onClick={close}>{a.name}</Link> : a.name}</span>
              ))}
            </span>
          </div>
          <button className={`icon-btn ${p.liked[t.id] ? 'active' : ''}`} onClick={() => p.toggleLike(t.id)} aria-label="Me gusta">
            {p.liked[t.id] ? <I.HeartFill /> : <I.Heart />}
          </button>
        </div>
        <div className="np-seek">
          <Seek showTimes={false} always />
          <div className="times"><Times /></div>
        </div>
        <div className="np-controls">
          <button className={`icon-btn ${p.shuffle ? 'active' : ''}`} onClick={p.toggleShuffle} aria-label="Aleatorio"><I.Shuffle /></button>
          <button className="icon-btn" onClick={p.previous} aria-label="Anterior"><I.Prev /></button>
          <button className="icon-btn big" onClick={p.togglePlay} aria-label={p.isPlaying ? 'Pausar' : 'Reproducir'}>{p.isPlaying ? <I.Pause /> : <I.Play />}</button>
          <button className="icon-btn" onClick={p.next} aria-label="Siguiente"><I.Next /></button>
          <button className={`icon-btn ${p.repeat !== 'off' ? 'active' : ''}`} onClick={p.cycleRepeat} aria-label="Repetir">{p.repeat === 'track' ? <I.RepeatOne /> : <I.Repeat />}</button>
        </div>
        <div className="np-foot">
          <button className={`icon-btn ${p.activeDevice && !p.sdkActive ? 'active' : ''}`} onClick={() => setDevices(true)} aria-label="Dispositivos"><I.Devices /></button>
          <Volume />
          <Link className="icon-btn" to="/queue" onClick={close} aria-label="Cola"><I.Queue /></Link>
        </div>
      </div>
      {devices && <DevicePicker onClose={() => setDevices(false)} />}
      {menu && <TrackMenu track={t} onClose={() => setMenu(false)} />}
    </div>
  )
}

function Times() {
  const duration = usePlayer((s) => s.durationMs)
  const progress = useProgress()
  return (
    <>
      <span>{fmtTime(progress)}</span>
      <span>{fmtTime(duration)}</span>
    </>
  )
}
