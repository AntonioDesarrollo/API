import { codeChallenge, randomString } from './pkce'

export const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-library-read',
  'user-library-modify',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-top-read',
  'user-read-recently-played',
  'user-follow-read',
  'user-follow-modify',
]

const K = {
  clientId: 'ondas.clientId',
  verifier: 'ondas.pkce.verifier',
  state: 'ondas.pkce.state',
  tokens: 'ondas.tokens',
}

export interface Tokens { access_token: string; refresh_token: string; expires_at: number; scope: string }

/** URL a la que Spotify regresa después del login: la raíz de la app (sin hash). */
export function redirectUri(): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${window.location.origin}${base.endsWith('/') ? base : base + '/'}`
}

export function getClientId(): string {
  return localStorage.getItem(K.clientId) || (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined) || ''
}
export function setClientId(id: string) {
  localStorage.setItem(K.clientId, id.trim())
}

export function loadTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(K.tokens)
    return raw ? (JSON.parse(raw) as Tokens) : null
  } catch {
    return null
  }
}
function saveTokens(t: Tokens) {
  localStorage.setItem(K.tokens, JSON.stringify(t))
}
export function clearTokens() {
  localStorage.removeItem(K.tokens)
}

export async function beginLogin(): Promise<void> {
  const clientId = getClientId()
  if (!clientId) throw new Error('Falta el Client ID')
  const verifier = randomString(64)
  const state = randomString(16)
  sessionStorage.setItem(K.verifier, verifier)
  sessionStorage.setItem(K.state, state)
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: SCOPES.join(' '),
    code_challenge_method: 'S256',
    code_challenge: await codeChallenge(verifier),
    redirect_uri: redirectUri(),
    state,
  })
  window.location.assign(`https://accounts.spotify.com/authorize?${params}`)
}

/** Si la URL trae ?code=..., lo intercambia por tokens. Devuelve true si hubo login. */
export async function handleRedirect(): Promise<boolean> {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  const err = url.searchParams.get('error')
  if (!code && !err) return false
  const cleanUrl = url.origin + url.pathname + (url.hash || '')
  window.history.replaceState({}, '', cleanUrl)
  if (err) throw new Error(`Spotify rechazó el login: ${err}`)
  const expected = sessionStorage.getItem(K.state)
  if (expected && url.searchParams.get('state') !== expected) throw new Error('El estado del login no coincide (posible CSRF)')
  const verifier = sessionStorage.getItem(K.verifier)
  if (!verifier) throw new Error('No se encontró el verificador PKCE; vuelve a iniciar sesión')
  const body = new URLSearchParams({
    client_id: getClientId(),
    grant_type: 'authorization_code',
    code: code!,
    redirect_uri: redirectUri(),
    code_verifier: verifier,
  })
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error(`No se pudo obtener el token (${res.status}): ${await res.text()}`)
  const data = await res.json()
  saveTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  })
  sessionStorage.removeItem(K.verifier)
  sessionStorage.removeItem(K.state)
  return true
}

let refreshing: Promise<string> | null = null

export async function getAccessToken(force = false): Promise<string> {
  const t = loadTokens()
  if (!t) throw new NotLoggedIn()
  if (!force && Date.now() < t.expires_at - 60_000) return t.access_token
  if (!refreshing) {
    refreshing = (async () => {
      const body = new URLSearchParams({ client_id: getClientId(), grant_type: 'refresh_token', refresh_token: t.refresh_token })
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      })
      if (!res.ok) {
        clearTokens()
        throw new NotLoggedIn()
      }
      const data = await res.json()
      const next: Tokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token || t.refresh_token,
        expires_at: Date.now() + data.expires_in * 1000,
        scope: data.scope || t.scope,
      }
      saveTokens(next)
      return next.access_token
    })().finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

export class NotLoggedIn extends Error {
  constructor() {
    super('No has iniciado sesión')
    this.name = 'NotLoggedIn'
  }
}
