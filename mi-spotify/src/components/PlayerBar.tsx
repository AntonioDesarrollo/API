import { useState } from 'react'
import { artistNames } from '@/lib/format'
import { usePlayer } from '@/store/player'
import { usePrefs } from '@/store/prefs'
import { DevicePicker } from './DevicePicker'
import { I } from './Icons'
import { Seek } from './Seek'
import { useProgress } from './useProgress'
import { Volume } from './Volume'

export function PlayerBar() {
  const p = usePlayer()
  const showArt = usePrefs((s) => s.showArtOnBar)
  const progress = useProgress()
  const [devices, setDevices] = useState(false)
  const t = p.track

  if (!t) {
    return (
      <div className="player-bar empty" onClick={() => setDevices(true)}>
        <span>Nada sonando. Elige algo o toca aquí para ver tus dispositivos.</span>
        {devices && <DevicePicker onClose={() => setDevices(false)} />}
      </div>
    )
  }
  const pct = p.durationMs ? (progress / p.durationMs) * 100 : 0
  const stop = (e: React.MouseEvent) => e.stopPropagation()

  return (
    <div className="player-bar" onClick={() => p.setNowPlayingOpen(true)}>
      <div className="progress"><div style={{ width: `${pct}%` }} /></div>
      <div className="meta">
        {showArt && t.album?.images?.length > 0 && <img src={t.album.images[t.album.images.length - 1].url} alt="" />}
        <div className="col" style={{ gap: 0, minWidth: 0 }}>
          <span className="name truncate">{t.name}</span>
          <span className="sub truncate">{artistNames(t.artists)}{p.activeDevice && !p.sdkActive ? ` · ${p.activeDevice.name}` : ''}</span>
        </div>
        <button className={`icon-btn secondary ${p.liked[t.id] ? 'active' : ''}`} onClick={(e) => { stop(e); p.toggleLike(t.id) }} aria-label="Me gusta">
          {p.liked[t.id] ? <I.HeartFill /> : <I.Heart />}
        </button>
      </div>
      <div className="controls wide" onClick={stop}>
        <div className="btns">
          <button className={`icon-btn secondary ${p.shuffle ? 'active' : ''}`} onClick={p.toggleShuffle} aria-label="Aleatorio"><I.Shuffle /></button>
          <button className="icon-btn secondary" onClick={p.previous} aria-label="Anterior"><I.Prev /></button>
          <button className="icon-btn main" onClick={p.togglePlay} aria-label={p.isPlaying ? 'Pausar' : 'Reproducir'}>{p.isPlaying ? <I.Pause /> : <I.Play />}</button>
          <button className="icon-btn" onClick={p.next} aria-label="Siguiente"><I.Next /></button>
          <button className={`icon-btn secondary ${p.repeat !== 'off' ? 'active' : ''}`} onClick={p.cycleRepeat} aria-label="Repetir">{p.repeat === 'track' ? <I.RepeatOne /> : <I.Repeat />}</button>
        </div>
        <div className="seek"><Seek /></div>
      </div>
      <div className="extra" onClick={stop}>
        <button className={`icon-btn ${p.activeDevice && !p.sdkActive ? 'active' : ''}`} onClick={() => setDevices(true)} aria-label="Dispositivos"><I.Devices /></button>
        <Volume />
      </div>
      {devices && <DevicePicker onClose={() => setDevices(false)} />}
    </div>
  )
}
