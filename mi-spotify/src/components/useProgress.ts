import { useEffect, useState } from 'react'
import { currentProgress, usePlayer } from '@/store/player'

/** Progreso interpolado localmente entre actualizaciones del servidor. */
export function useProgress(): number {
  const isPlaying = usePlayer((s) => s.isPlaying)
  const [p, setP] = useState(() => currentProgress(usePlayer.getState()))
  useEffect(() => {
    let raf = 0
    let last = 0
    const tick = (t: number) => {
      if (t - last > 250) {
        last = t
        setP(currentProgress(usePlayer.getState()))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPlaying])
  return p
}
