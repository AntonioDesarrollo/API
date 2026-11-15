export type ThemeId = 'original' | 'ios' | 'material' | 'retro' | 'futurista' | 'papel' | 'minimal' | 'neon'
export type Mode = 'light' | 'dark' | 'system'

export interface Palette {
  bg: string; surface: string; surface2: string; text: string; muted: string; border: string; accent: string; onAccent: string; shadow: string
}
export interface ThemeDef {
  id: ThemeId
  name: string
  description: string
  font: FontId
  radius: number
  light: Palette
  dark: Palette
}

export type FontId = 'tema' | 'sistema' | 'inter' | 'figtree' | 'lora' | 'space' | 'orbitron' | 'vt323' | 'mono' | 'comic' | 'playfair' | 'nunito'

export const FONTS: Record<FontId, { name: string; stack: string; google?: string }> = {
  tema: { name: 'La del tema', stack: '' },
  sistema: { name: 'Sistema', stack: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  inter: { name: 'Inter', stack: '"Inter", system-ui, sans-serif', google: 'Inter:wght@400;500;600;700;800' },
  figtree: { name: 'Figtree', stack: '"Figtree", system-ui, sans-serif', google: 'Figtree:wght@400;500;600;700;800' },
  nunito: { name: 'Nunito', stack: '"Nunito", system-ui, sans-serif', google: 'Nunito:wght@400;600;700;800' },
  lora: { name: 'Lora (serif)', stack: '"Lora", Georgia, serif', google: 'Lora:ital,wght@0,400;0,600;0,700;1,400' },
  playfair: { name: 'Playfair (serif)', stack: '"Playfair Display", Georgia, serif', google: 'Playfair+Display:wght@400;600;700' },
  space: { name: 'Space Grotesk', stack: '"Space Grotesk", system-ui, sans-serif', google: 'Space+Grotesk:wght@400;500;600;700' },
  orbitron: { name: 'Orbitron', stack: '"Orbitron", system-ui, sans-serif', google: 'Orbitron:wght@400;600;700;800' },
  vt323: { name: 'VT323 (pixel)', stack: '"VT323", monospace', google: 'VT323' },
  mono: { name: 'JetBrains Mono', stack: '"JetBrains Mono", ui-monospace, monospace', google: 'JetBrains+Mono:wght@400;500;700' },
  comic: { name: 'Comic Neue', stack: '"Comic Neue", cursive', google: 'Comic+Neue:wght@400;700' },
}

export const THEMES: ThemeDef[] = [
  {
    id: 'original',
    name: 'Original',
    description: 'El look clásico: verde, oscuro y redondeado.',
    font: 'figtree',
    radius: 8,
    dark: { bg: '#121212', surface: '#181818', surface2: '#282828', text: '#ffffff', muted: '#a7a7a7', border: '#2a2a2a', accent: '#1ed760', onAccent: '#000000', shadow: '0 8px 24px rgba(0,0,0,.5)' },
    light: { bg: '#f6f6f6', surface: '#ffffff', surface2: '#ececec', text: '#121212', muted: '#5c5c5c', border: '#dedede', accent: '#1db954', onAccent: '#ffffff', shadow: '0 8px 24px rgba(0,0,0,.12)' },
  },
  {
    id: 'ios',
    name: 'iOS',
    description: 'Cristal esmerilado, bordes muy redondeados y azul sistema.',
    font: 'inter',
    radius: 18,
    dark: { bg: '#000000', surface: '#1c1c1e', surface2: '#2c2c2e', text: '#ffffff', muted: '#8e8e93', border: '#38383a', accent: '#0a84ff', onAccent: '#ffffff', shadow: '0 10px 30px rgba(0,0,0,.6)' },
    light: { bg: '#f2f2f7', surface: '#ffffff', surface2: '#e5e5ea', text: '#000000', muted: '#6e6e73', border: '#d1d1d6', accent: '#007aff', onAccent: '#ffffff', shadow: '0 10px 30px rgba(0,0,0,.1)' },
  },
  {
    id: 'material',
    name: 'Material',
    description: 'Estilo Android: superficies tonales y morado dinámico.',
    font: 'nunito',
    radius: 24,
    dark: { bg: '#141218', surface: '#1d1b20', surface2: '#2b2930', text: '#e6e0e9', muted: '#cac4d0', border: '#49454f', accent: '#d0bcff', onAccent: '#381e72', shadow: '0 6px 20px rgba(0,0,0,.45)' },
    light: { bg: '#fef7ff', surface: '#f7f2fa', surface2: '#e8def8', text: '#1d1b20', muted: '#49454f', border: '#cac4d0', accent: '#6750a4', onAccent: '#ffffff', shadow: '0 6px 20px rgba(0,0,0,.1)' },
  },
  {
    id: 'retro',
    name: 'Retro',
    description: 'Cassette de los 80: naranja, marrón y tipografía pixel.',
    font: 'vt323',
    radius: 2,
    dark: { bg: '#1a120b', surface: '#2b1d12', surface2: '#3d2a1a', text: '#f5e6c8', muted: '#c9a978', border: '#6b4a2b', accent: '#ff8c32', onAccent: '#1a120b', shadow: '6px 6px 0 #000' },
    light: { bg: '#f4e7c9', surface: '#fff6df', surface2: '#ecd9ad', text: '#2b1d12', muted: '#6b4a2b', border: '#b58b55', accent: '#d9541e', onAccent: '#fff6df', shadow: '6px 6px 0 #2b1d12' },
  },
  {
    id: 'futurista',
    name: 'Futurista',
    description: 'Cian y magenta sobre negro, bordes rectos y brillo.',
    font: 'orbitron',
    radius: 0,
    dark: { bg: '#05070f', surface: '#0b1020', surface2: '#131a33', text: '#e6f6ff', muted: '#7fa6c9', border: '#1f3a66', accent: '#00e5ff', onAccent: '#001018', shadow: '0 0 24px rgba(0,229,255,.25)' },
    light: { bg: '#eef5fb', surface: '#ffffff', surface2: '#dce9f5', text: '#0a1a2f', muted: '#4a6a8a', border: '#9ec1e3', accent: '#0077ff', onAccent: '#ffffff', shadow: '0 0 24px rgba(0,119,255,.2)' },
  },
  {
    id: 'papel',
    name: 'Papel',
    description: 'Crema, tinta y serif: como un cuaderno.',
    font: 'lora',
    radius: 4,
    light: { bg: '#f7f1e3', surface: '#fffcf3', surface2: '#efe6d0', text: '#2b2520', muted: '#6f6456', border: '#d8ccb2', accent: '#8b2e2e', onAccent: '#fffcf3', shadow: '0 2px 0 #d8ccb2, 0 6px 14px rgba(60,40,10,.12)' },
    dark: { bg: '#1f1b16', surface: '#2a241d', surface2: '#3a3128', text: '#efe6d3', muted: '#b4a68e', border: '#4e4335', accent: '#e07a5f', onAccent: '#1f1b16', shadow: '0 2px 0 #4e4335, 0 6px 14px rgba(0,0,0,.4)' },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Blanco y negro, sin distracciones.',
    font: 'inter',
    radius: 6,
    light: { bg: '#ffffff', surface: '#ffffff', surface2: '#f3f3f3', text: '#111111', muted: '#777777', border: '#e3e3e3', accent: '#111111', onAccent: '#ffffff', shadow: 'none' },
    dark: { bg: '#0d0d0d', surface: '#0d0d0d', surface2: '#1c1c1c', text: '#f2f2f2', muted: '#8a8a8a', border: '#262626', accent: '#f2f2f2', onAccent: '#0d0d0d', shadow: 'none' },
  },
  {
    id: 'neon',
    name: 'Neón',
    description: 'Noche de ciudad: rosa y violeta con resplandor.',
    font: 'space',
    radius: 12,
    dark: { bg: '#0f0518', surface: '#190a2a', surface2: '#26123d', text: '#fdf2ff', muted: '#b48bd4', border: '#3f2060', accent: '#ff3cac', onAccent: '#1a0526', shadow: '0 0 28px rgba(255,60,172,.3)' },
    light: { bg: '#fdf4ff', surface: '#ffffff', surface2: '#f3e0ff', text: '#2a0f3d', muted: '#7a4e9c', border: '#e0c3f5', accent: '#d61c8a', onAccent: '#ffffff', shadow: '0 0 28px rgba(214,28,138,.2)' },
  },
]

export const themeById = (id: ThemeId) => THEMES.find((t) => t.id === id) ?? THEMES[0]
