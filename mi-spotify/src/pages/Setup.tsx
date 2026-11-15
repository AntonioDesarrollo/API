import { useState } from 'react'
import { redirectUri } from '@/lib/auth'
import { useAuth } from '@/store/auth'
import { toast } from '@/store/toast'
import { I } from '@/components/Icons'
import { isNative } from '@/lib/native'

const DASHBOARD = 'https://developer.spotify.com/dashboard'

export function Setup() {
  const { clientId, saveClientId, error } = useAuth()
  const [value, setValue] = useState(clientId)
  const uri = redirectUri()
  const copy = () => navigator.clipboard.writeText(uri).then(() => toast('Redirect URI copiada'))

  return (
    <div className="center-card">
      <img className="logo" src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
      <h1 style={{ textAlign: 'center' }}>Ondas Player</h1>
      <p className="muted" style={{ textAlign: 'center' }}>Tu reproductor personalizable para Spotify Premium. Primero conecta tu propia clave de desarrollador.</p>
      <ol className="small">
        <li>Entra a <a href={DASHBOARD} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontWeight: 700 }}>developer.spotify.com/dashboard</a> con tu cuenta de Spotify.</li>
        <li>Pulsa <b>Create app</b>. Nombre y descripción libres.</li>
        <li>En <b>Redirect URIs</b> pega exactamente esta dirección{isNative ? ' (es la de la app Android; si usas también la versión web, añade su URL aparte)' : ''}:
          <div className="copy-row" style={{ marginTop: 6 }}>
            <code className="inline">{uri}</code>
            <button className="icon-btn" onClick={copy} aria-label="Copiar"><I.Copy /></button>
          </div>
        </li>
        <li>Marca <b>Web API</b> y <b>Web Playback SDK</b>, acepta los términos y guarda.</li>
        <li>Abre la app creada, pulsa <b>Settings</b> y copia el <b>Client ID</b> aquí abajo. (No necesitas el Client Secret: nunca lo pegues en ningún lado.)</li>
      </ol>
      <label className="col">
        <span className="small muted">Client ID</span>
        <input className="input" value={value} onChange={(e) => setValue(e.target.value)} placeholder="32 caracteres hexadecimales" autoComplete="off" spellCheck={false} />
      </label>
      {error && <div className="error-box">{error}</div>}
      <button className="btn primary" disabled={!/^[0-9a-f]{32}$/i.test(value.trim())} onClick={() => saveClientId(value)}>
        Guardar y continuar
      </button>
    </div>
  )
}
