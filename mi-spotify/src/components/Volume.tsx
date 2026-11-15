import { usePlayer } from '@/store/player'
import { I } from './Icons'

export function Volume() {
  const volume = usePlayer((s) => s.volume)
  const setVolume = usePlayer((s) => s.setVolume)
  return (
    <div className="vol">
      <button className="icon-btn" onClick={() => setVolume(volume === 0 ? 50 : 0)} aria-label="Silenciar">
        {volume === 0 ? <I.Mute /> : <I.Volume />}
      </button>
      <input
        type="range"
        className="range"
        min={0}
        max={100}
        value={volume}
        style={{ '--pct': `${volume}%` } as React.CSSProperties}
        onChange={(e) => setVolume(Number(e.target.value))}
        aria-label="Volumen"
      />
    </div>
  )
}
