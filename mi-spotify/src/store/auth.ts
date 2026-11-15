import { create } from 'zustand'
import { api } from '@/lib/api'
import { beginLogin, clearTokens, getClientId, handleRedirect, isBridgeRedirect, listenNativeRedirect, loadTokens, setClientId } from '@/lib/auth'
import { isNative } from '@/lib/native'
import type { User } from '@/lib/types'

type Status = 'loading' | 'setup' | 'anon' | 'ok' | 'bridge'

interface AuthStore {
  status: Status
  user: User | null
  error: string | null
  clientId: string
  init: () => Promise<void>
  saveClientId: (id: string) => void
  login: () => Promise<void>
  logout: () => void
}

export const useAuth = create<AuthStore>((set) => ({
  status: 'loading',
  user: null,
  error: null,
  clientId: getClientId(),
  init: async () => {
    if (isBridgeRedirect()) return set({ status: 'bridge' })
    if (isNative) {
      listenNativeRedirect(async (ok, error) => {
        if (!ok) return set({ error: error ?? 'No se completó el login', status: 'anon' })
        try {
          const user = await api.me()
          set({ status: 'ok', user, error: null })
        } catch (e) {
          set({ status: 'anon', error: e instanceof Error ? e.message : String(e) })
        }
      })
    }
    try {
      const clientId = getClientId()
      if (!clientId) return set({ status: 'setup', clientId })
      await handleRedirect()
      if (!loadTokens()) return set({ status: 'anon', clientId })
      const user = await api.me()
      set({ status: 'ok', user, clientId, error: null })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if ((e as Error).name === 'NotLoggedIn') return set({ status: 'anon' })
      set({ status: loadTokens() ? 'ok' : 'anon', error: msg })
    }
  },
  saveClientId: (id) => {
    setClientId(id)
    set({ clientId: id.trim(), status: id.trim() ? 'anon' : 'setup', error: null })
  },
  login: async () => {
    try {
      await beginLogin()
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) })
    }
  },
  logout: () => {
    clearTokens()
    set({ status: 'anon', user: null, error: null })
  },
}))
