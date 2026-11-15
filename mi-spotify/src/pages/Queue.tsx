import { useEffect } from 'react'
import { TrackList } from '@/components/TrackList'
import { usePlayer } from '@/store/player'

export function QueuePage() {
  const { queue, loadQueue, track } = usePlayer()
  useEffect(() => {
    loadQueue()
    const t = setInterval(loadQueue, 8000)
    return () => clearInterval(t)
  }, [loadQueue])
  return (
    <div className="page">
      <h1>Cola</h1>
      {track && (
        <section className="section">
          <h2>Sonando ahora</h2>
          <TrackList tracks={[track]} />
        </section>
      )}
      <section className="section">
        <h2>A continuación</h2>
        {queue.length === 0 ? <div className="empty">La cola está vacía.</div> : <TrackList tracks={queue} />}
      </section>
    </div>
  )
}
