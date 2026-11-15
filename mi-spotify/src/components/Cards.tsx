import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { imageFor } from '@/lib/format'
import { usePlayer } from '@/store/player'
import { I } from './Icons'

interface CardProps { to: string; image: string; title: string; subtitle?: string; round?: boolean; playUri?: string }

export function Card({ to, image, title, subtitle, round, playUri }: CardProps) {
  const playContext = usePlayer((s) => s.playContext)
  return (
    <Link to={to} className={`card ${round ? 'round' : ''}`}>
      {image ? <img src={image} alt="" loading="lazy" /> : <div className="ph" />}
      <div className="title truncate">{title}</div>
      {subtitle && <div className="muted small truncate">{subtitle}</div>}
      {playUri && (
        <button
          className="play-fab"
          aria-label="Reproducir"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            playContext(playUri)
          }}
        >
          <I.Play />
        </button>
      )}
    </Link>
  )
}

export function Section({ title, to, children }: { title: string; to?: string; children: ReactNode }) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>{title}</h2>
        {to && <Link to={to}>Ver todo</Link>}
      </div>
      {children}
    </section>
  )
}

export function Shelf({ children }: { children: ReactNode }) {
  return <div className="shelf">{children}</div>
}

export function Hero({
  image, kicker, title, subtitle, round, children, color,
}: { image: string; kicker: string; title: string; subtitle?: ReactNode; round?: boolean; children?: ReactNode; color?: string | null }) {
  return (
    <div className={`hero ${round ? 'round' : ''} ${color ? 'dyn' : ''}`} style={color ? ({ '--hero-color': color } as React.CSSProperties) : undefined}>
      {image ? <img src={image} alt="" /> : <div className="ph" />}
      <div className="info">
        <span className="kicker">{kicker}</span>
        <h1>{title}</h1>
        {subtitle && <div className="muted">{subtitle}</div>}
        {children}
      </div>
    </div>
  )
}

export const img = imageFor
