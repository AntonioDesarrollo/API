import { useAuth } from '@/store/auth'

export function Login() {
  const { login, error, saveClientId, clientId } = useAuth()
  return (
    <div className="center-card">
      <img className="logo" src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
      <h1 style={{ textAlign: 'center' }}>Ondas Player</h1>
      <p className="muted" style={{ textAlign: 'center' }}>Inicia sesión con tu cuenta de Spotify Premium para escuchar tu música con el estilo que tú elijas.</p>
      {error && <div className="error-box">{error}</div>}
      <button className="btn primary" onClick={login}>Iniciar sesión con Spotify</button>
      <button className="btn outline sm" onClick={() => saveClientId('')}>Cambiar Client ID ({clientId.slice(0, 6)}…)</button>
    </div>
  )
}
