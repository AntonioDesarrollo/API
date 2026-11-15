import { useState } from 'react'
import { fmtTime } from '@/lib/format'
import { usePlayer } from '@/store/player'
import { useProgress } from './useProgress'

export function Seek({ showTimes = true, always = false }: { showTimes?: boolean; always?: boolean }) {
  const duration = usePlayer((s) => s.durationMs)
  const seek = usePlayer((s) => s.seek)
  const progress = useProgress()
  const [drag, setDrag] = useState<number | null>(null)
  const value = drag ?? progress
  const pct = duration ? (value / duration) * 100 : 0
  const slider = (
    <input
      type="range"
      className={`range ${always ? 'always' : ''}`}
      min={0}
      max={duration || 1}
      value={value}
      style={{ '--pct': `${pct}%` } as React.CSSProperties}
      onChange={(e) => setDrag(Number(e.target.value))}
      onPointerUp={() => drag !== null && (seek(drag), setDrag(null))}
      onKeyUp={() => drag !== null && (seek(drag), setDrag(null))}
      aria-label="Posición"
    />
  )
  if (!showTimes) return slider
  return (
    <>
      <span>{fmtTime(value)}</span>
      {slider}
      <span>{fmtTime(duration)}</span>
    </>
  )
}
