import { useEffect, useState } from 'react'
import { NATIVE_REDIRECT } from '@/lib/native'

/**
 * La versión web recibe el código de Spotify cuando el login lo inició el APK
 * (porque el usuario registró la URL web como redirect). Solo lo reenvía a la app.
 */
export function Bridge() {
  const [target] = useState(() => {
    const u = new URL(window.location.href)
    const q = new URLSearchParams()
    for (const k of ['code', 'state', 'error']) if (u.searchParams.get(k)) q.set(k, u.searchParams.get(k)!)
    return `${NATIVE_REDIRECT}?${q}`
  })
  useEffect(() => {
    const t = setTimeout(() => window.location.assign(target), 400)
    return () => clearTimeout(t)
  }, [target])
  return (
    <div className="center-card">
      <img className="logo" src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
      <h1 style={{ textAlign: 'center' }}>Volviendo a la app…</h1>
      <p className="muted" style={{ textAlign: 'center' }}>Si no se abre sola, toca el botón.</p>
      <a className="btn primary" href={target}>Abrir Ondas Player</a>
    </div>
  )
}
