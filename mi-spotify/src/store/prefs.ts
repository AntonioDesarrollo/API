import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FontId, Mode, ThemeId } from '@/themes/themes'

export type Density = 'compacta' | 'normal' | 'amplia'
export type CoverSize = 'chica' | 'media' | 'grande'
export type NavPosition = 'auto' | 'abajo' | 'lado'
export type HomeSection = 'recientes' | 'top' | 'playlists' | 'novedades' | 'albums' | 'artistas'

export interface Prefs {
  theme: ThemeId
  mode: Mode
  font: FontId
  fontScale: number
  radius: number | null
  accent: string | null
  density: Density
  coverSize: CoverSize
  animations: boolean
  dynamicColor: boolean
  blur: boolean
  navPosition: NavPosition
  gridMin: number
  useThisDevice: boolean
  deviceName: string
  homeSections: HomeSection[]
  showArtOnBar: boolean
  bold: boolean
}

export const DEFAULT_PREFS: Prefs = {
  theme: 'original',
  mode: 'system',
  font: 'tema',
  fontScale: 1,
  radius: null,
  accent: null,
  density: 'normal',
  coverSize: 'media',
  animations: true,
  dynamicColor: true,
  blur: true,
  navPosition: 'auto',
  gridMin: 150,
  useThisDevice: true,
  deviceName: 'Ondas Player',
  homeSections: ['recientes', 'top', 'playlists', 'novedades', 'albums', 'artistas'],
  showArtOnBar: true,
  bold: false,
}

interface PrefsStore extends Prefs {
  set: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void
  reset: () => void
  importJson: (json: string) => boolean
  exportJson: () => string
}

export const usePrefs = create<PrefsStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_PREFS,
      set: (key, value) => set({ [key]: value } as Partial<Prefs>),
      reset: () => set({ ...DEFAULT_PREFS }),
      importJson: (json) => {
        try {
          const data = JSON.parse(json) as Partial<Prefs>
          const clean: Partial<Prefs> = {}
          for (const k of Object.keys(DEFAULT_PREFS) as (keyof Prefs)[]) {
            if (k in data && typeof data[k] === typeof DEFAULT_PREFS[k] || (data[k] === null && DEFAULT_PREFS[k] === null)) {
              ;(clean as Record<string, unknown>)[k] = data[k]
            } else if (k in data && (k === 'radius' || k === 'accent')) {
              ;(clean as Record<string, unknown>)[k] = data[k]
            }
          }
          set(clean)
          return true
        } catch {
          return false
        }
      },
      exportJson: () => {
        const s = get()
        const out: Record<string, unknown> = {}
        for (const k of Object.keys(DEFAULT_PREFS) as (keyof Prefs)[]) out[k] = s[k]
        return JSON.stringify(out, null, 2)
      },
    }),
    { name: 'ondas.prefs', version: 1 },
  ),
)
