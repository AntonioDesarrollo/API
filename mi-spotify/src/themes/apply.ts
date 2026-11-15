import { usePrefs, type Prefs } from '@/store/prefs'
import { FONTS, themeById, type FontId } from './themes'

const loadedFonts = new Set<FontId>()

function ensureFont(id: FontId) {
  const f = FONTS[id]
  if (!f?.google || loadedFonts.has(id)) return
  loadedFonts.add(id)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${f.google}&display=swap`
  document.head.appendChild(link)
}

export function resolveMode(mode: Prefs['mode']): 'light' | 'dark' {
  if (mode !== 'system') return mode
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null
}
export function contrastText(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#000'
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return L > 0.4 ? '#000000' : '#ffffff'
}

export function applyPrefs(p: Prefs) {
  const theme = themeById(p.theme)
  const mode = resolveMode(p.mode)
  const pal = theme[mode]
  const root = document.documentElement
  const s = root.style

  root.dataset.theme = theme.id
  root.dataset.mode = mode
  root.dataset.density = p.density
  root.dataset.cover = p.coverSize
  root.dataset.anim = p.animations ? 'on' : 'off'
  root.dataset.blur = p.blur ? 'on' : 'off'
  root.dataset.nav = p.navPosition
  root.dataset.bold = p.bold ? 'on' : 'off'

  const accent = p.accent || pal.accent
  s.setProperty('--bg', pal.bg)
  s.setProperty('--surface', pal.surface)
  s.setProperty('--surface-2', pal.surface2)
  s.setProperty('--text', pal.text)
  s.setProperty('--muted', pal.muted)
  s.setProperty('--border', pal.border)
  s.setProperty('--accent', accent)
  s.setProperty('--on-accent', p.accent ? contrastText(accent) : pal.onAccent)
  s.setProperty('--shadow', pal.shadow)
  const rgb = hexToRgb(accent)
  s.setProperty('--accent-rgb', rgb ? rgb.join(',') : '30,215,96')
  const radius = p.radius ?? theme.radius
  s.setProperty('--radius', `${radius}px`)
  s.setProperty('--radius-sm', `${Math.max(0, Math.round(radius * 0.5))}px`)
  s.setProperty('--radius-lg', `${Math.round(radius * 1.5)}px`)
  s.setProperty('--font-scale', String(p.fontScale))
  s.setProperty('--grid-min', `${p.gridMin}px`)

  const fontId: FontId = p.font === 'tema' ? theme.font : p.font
  ensureFont(fontId)
  s.setProperty('--font', FONTS[fontId].stack || FONTS.sistema.stack)
  // La fuente pixel es muy pequeña a tamaño normal.
  s.setProperty('--font-boost', fontId === 'vt323' ? '1.22' : '1')

  const meta = document.querySelector('meta[name="theme-color"]')
  meta?.setAttribute('content', pal.bg)
  root.style.colorScheme = mode
}

/** Se llama una vez en el arranque: aplica y re-aplica cuando cambien prefs o el modo del sistema. */
export function startThemeEngine() {
  applyPrefs(usePrefs.getState())
  usePrefs.subscribe((state) => applyPrefs(state))
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyPrefs(usePrefs.getState()))
}
