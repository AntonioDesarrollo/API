import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { isNative, NATIVE_REDIRECT } from './native'
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
  nativeRedirect: 'ondas.nativeRedirect',
  verifier: 'ondas.pkce.verifier',
  state: 'ondas.pkce.state',
  tokens: 'ondas.tokens',
}

export interface Tokens { access_token: string; refresh_token: string; expires_at: number; scope: string }

/** URL a la que Spotify regresa después del login: la raíz de la app (sin hash). */
export function redirectUri(): string {
  if (isNative) return getNativeRedirect()
  const base = import.meta.env.BASE_URL || '/'
  return `${window.location.origin}${base.endsWith('/') ? base : base + '/'}`
}

/**
 * En el APK el redirect por defecto es ondas://callback. Si Spotify rechazara el esquema
 * propio, el usuario puede poner aquí la URL https de la versión web, que hace de puente
 * y reenvía el código a la app (ver handleRedirect).
 */
export function getNativeRedirect(): string {
  return localStorage.getItem(K.nativeRedirect) || NATIVE_REDIRECT
}
export function setNativeRedirect(url: string) {
  const v = url.trim()
  if (v) localStorage.setItem(K.nativeRedirect, v)
  else localStorage.removeItem(K.nativeRedirect)
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
  // El prefijo "app-" avisa a la versión web que debe reenviar el código al APK.
  const state = (isNative ? 'app-' : '') + randomString(16)
  // En el APK usamos localStorage: el navegador del sistema abre aparte y sessionStorage se pierde.
  const store = isNative ? localStorage : sessionStorage
  store.setItem(K.verifier, verifier)
  store.setItem(K.state, state)
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: SCOPES.join(' '),
    code_challenge_method: 'S256',
    code_challenge: await codeChallenge(verifier),
    redirect_uri: redirectUri(),
    state,
  })
  const url = `https://accounts.spotify.com/authorize?${params}`
  if (isNative) await Browser.open({ url, presentationStyle: 'popover' })
  else window.location.assign(url)
}

let nativeListenerReady = false
/**
 * En el APK, Android abre la app con ondas://callback?code=... al terminar el login.
 * Aquí lo escuchamos y lo convertimos en tokens.
 */
export function listenNativeRedirect(onDone: (ok: boolean, error?: string) => void) {
  if (!isNative || nativeListenerReady) return
  nativeListenerReady = true
  App.addListener('appUrlOpen', async ({ url }) => {
    if (!url.startsWith(NATIVE_REDIRECT)) return
    try {
      await Browser.close().catch(() => undefined)
      const ok = await handleRedirect(url)
      onDone(ok)
    } catch (e) {
      onDone(false, e instanceof Error ? e.message : String(e))
    }
  })
}

/** Devuelve true si la URL actual es un login iniciado por el APK que la web debe reenviar. */
export function isBridgeRedirect(): boolean {
  const url = new URL(window.location.href)
  return !isNative && !!url.searchParams.get('code') && (url.searchParams.get('state') || '').startsWith('app-')
}

/** Si la URL trae ?code=..., lo intercambia por tokens. Devuelve true si hubo login. */
export async function handleRedirect(rawUrl = window.location.href): Promise<boolean> {
  const url = new URL(rawUrl)
  const code = url.searchParams.get('code')
  const err = url.searchParams.get('error')
  if (!code && !err) return false
  if (!isNative) {
    const cleanUrl = url.origin + url.pathname + (url.hash || '')
    window.history.replaceState({}, '', cleanUrl)
  }
  if (err) throw new Error(`Spotify rechazó el login: ${err}`)
  const store = isNative ? localStorage : sessionStorage
  const expected = store.getItem(K.state)
  if (expected && url.searchParams.get('state') !== expected) throw new Error('El estado del login no coincide (posible CSRF)')
  const verifier = store.getItem(K.verifier)
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
  store.removeItem(K.verifier)
  store.removeItem(K.state)
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
