import { useRef, useState } from 'react'
import { I } from '@/components/Icons'
import { useAuth } from '@/store/auth'
import { usePrefs, type Density, type CoverSize, type HomeSection, type NavPosition } from '@/store/prefs'
import { toast } from '@/store/toast'
import { FONTS, THEMES, type FontId, type Mode } from '@/themes/themes'

const ACCENTS = ['#1ed760', '#0a84ff', '#ff3cac', '#ff8c32', '#d0bcff', '#00e5ff', '#ff453a', '#ffd60a', '#30d158', '#bf5af2']
const HOME_SECTIONS: { id: HomeSection; label: string }[] = [
  { id: 'recientes', label: 'Escuchado recientemente' },
  { id: 'top', label: 'Tus más escuchadas' },
  { id: 'playlists', label: 'Tus playlists' },
  { id: 'novedades', label: 'Novedades' },
  { id: 'albums', label: 'Álbumes guardados' },
  { id: 'artistas', label: 'Tus artistas' },
]

function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return <button role="switch" aria-checked={on} className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} />
}
function Seg<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="segmented">
      {options.map((o) => <button key={o.id} className={value === o.id ? 'active' : ''} onClick={() => onChange(o.id)}>{o.label}</button>)}
    </div>
  )
}
function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="setting">
      <div className="label"><span>{label}</span>{hint && <span className="muted">{hint}</span>}</div>
      <div className="control">{children}</div>
    </div>
  )
}

export function Settings() {
  const p = usePrefs()
  const { user, logout, saveClientId, clientId } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [json, setJson] = useState('')

  const exportPrefs = () => {
    const blob = new Blob([p.exportJson()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'ondas-preferencias.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const importFile = (f: File) => f.text().then((t) => toast(p.importJson(t) ? 'Preferencias importadas' : 'Archivo no válido', p.importJson(t) ? 'info' : 'error'))

  return (
    <div className="page">
      <h1>Ajustes</h1>

      <div className="settings-group">
        <h2><I.Palette width={18} height={18} style={{ verticalAlign: '-3px', marginRight: 6 }} /> Estilo</h2>
        <div className="theme-grid" style={{ padding: '8px 0 14px' }}>
          {THEMES.map((t) => {
            const pal = t[p.mode === 'light' ? 'light' : p.mode === 'dark' ? 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light']
            return (
              <button key={t.id} className={`theme-card ${p.theme === t.id ? 'active' : ''}`} onClick={() => p.set('theme', t.id)} style={{ background: pal.bg, color: pal.text }}>
                <div className="swatches"><span style={{ background: pal.surface2 }} /><span style={{ background: pal.accent }} /><span style={{ background: pal.text }} /></div>
                <span className="name" style={{ fontFamily: FONTS[t.font].stack }}>{t.name}</span>
                <span className="desc" style={{ color: pal.muted }}>{t.description}</span>
              </button>
            )
          })}
        </div>
        <Row label="Modo" hint="Claro, oscuro o según el sistema">
          <Seg<Mode> value={p.mode} options={[{ id: 'light', label: 'Claro' }, { id: 'dark', label: 'Oscuro' }, { id: 'system', label: 'Sistema' }]} onChange={(v) => p.set('mode', v)} />
        </Row>
        <Row label="Color de acento" hint="Vacío = el del tema">
          <div className="chips">
            {ACCENTS.map((c) => <button key={c} className="chip" style={{ background: c, width: 28, height: 28, padding: 0, border: p.accent === c ? '3px solid var(--text)' : '1px solid var(--border)' }} onClick={() => p.set('accent', c)} aria-label={c} />)}
            <input type="color" value={p.accent ?? '#1ed760'} onChange={(e) => p.set('accent', e.target.value)} aria-label="Color personalizado" />
            {p.accent && <button className="chip" onClick={() => p.set('accent', null)}>Del tema</button>}
          </div>
        </Row>
        <Row label="Bordes redondeados" hint={p.radius === null ? 'Del tema' : `${p.radius}px`}>
          <input type="range" className="range always" min={0} max={28} value={p.radius ?? 8} style={{ '--pct': `${((p.radius ?? 8) / 28) * 100}%`, width: 140 } as React.CSSProperties} onChange={(e) => p.set('radius', Number(e.target.value))} />
          {p.radius !== null && <button className="chip" onClick={() => p.set('radius', null)}>Del tema</button>}
        </Row>
        <Row label="Fondo dinámico" hint="Colorea según la carátula"><Switch on={p.dynamicColor} onChange={(v) => p.set('dynamicColor', v)} /></Row>
        <Row label="Desenfoque (cristal)" hint="En temas que lo usan, como iOS"><Switch on={p.blur} onChange={(v) => p.set('blur', v)} /></Row>
        <Row label="Animaciones"><Switch on={p.animations} onChange={(v) => p.set('animations', v)} /></Row>
      </div>

      <div className="settings-group">
        <h2>Texto</h2>
        <Row label="Fuente">
          <select className="input" style={{ width: 'auto' }} value={p.font} onChange={(e) => p.set('font', e.target.value as FontId)}>
            {(Object.keys(FONTS) as FontId[]).map((f) => <option key={f} value={f}>{FONTS[f].name}</option>)}
          </select>
        </Row>
        <Row label="Tamaño de letra" hint={`${Math.round(p.fontScale * 100)}%`}>
          <input type="range" className="range always" min={0.8} max={1.35} step={0.05} value={p.fontScale} style={{ '--pct': `${((p.fontScale - 0.8) / 0.55) * 100}%`, width: 140 } as React.CSSProperties} onChange={(e) => p.set('fontScale', Number(e.target.value))} />
        </Row>
        <Row label="Texto en negrita"><Switch on={p.bold} onChange={(v) => p.set('bold', v)} /></Row>
      </div>

      <div className="settings-group">
        <h2>Diseño</h2>
        <Row label="Densidad" hint="Espacio entre elementos">
          <Seg<Density> value={p.density} options={[{ id: 'compacta', label: 'Compacta' }, { id: 'normal', label: 'Normal' }, { id: 'amplia', label: 'Amplia' }]} onChange={(v) => p.set('density', v)} />
        </Row>
        <Row label="Tamaño de carátulas">
          <Seg<CoverSize> value={p.coverSize} options={[{ id: 'chica', label: 'Chica' }, { id: 'media', label: 'Media' }, { id: 'grande', label: 'Grande' }]} onChange={(v) => p.set('coverSize', v)} />
        </Row>
        <Row label="Tamaño de tarjetas" hint={`${p.gridMin}px`}>
          <input type="range" className="range always" min={110} max={240} step={10} value={p.gridMin} style={{ '--pct': `${((p.gridMin - 110) / 130) * 100}%`, width: 140 } as React.CSSProperties} onChange={(e) => p.set('gridMin', Number(e.target.value))} />
        </Row>
        <Row label="Navegación" hint="Abajo (móvil) o lateral (escritorio)">
          <Seg<NavPosition> value={p.navPosition} options={[{ id: 'auto', label: 'Auto' }, { id: 'abajo', label: 'Abajo' }, { id: 'lado', label: 'Lateral' }]} onChange={(v) => p.set('navPosition', v)} />
        </Row>
        <Row label="Carátula en la barra del reproductor"><Switch on={p.showArtOnBar} onChange={(v) => p.set('showArtOnBar', v)} /></Row>
        <Row label="Secciones de Inicio" hint="Toca para activar o desactivar">
          <div className="chips">
            {HOME_SECTIONS.map((s) => {
              const on = p.homeSections.includes(s.id)
              return <button key={s.id} className={`chip ${on ? 'active' : ''}`} onClick={() => p.set('homeSections', on ? p.homeSections.filter((x) => x !== s.id) : [...p.homeSections, s.id])}>{s.label}</button>
            })}
          </div>
        </Row>
      </div>

      <div className="settings-group">
        <h2>Reproducción</h2>
        <Row label="Reproducir en este navegador" hint="Convierte esta app en un dispositivo de Spotify (requiere Premium). Cambios al recargar.">
          <Switch on={p.useThisDevice} onChange={(v) => p.set('useThisDevice', v)} />
        </Row>
        <Row label="Nombre de este dispositivo" hint="Así aparece en la lista de dispositivos de Spotify">
          <input className="input" style={{ width: 200 }} value={p.deviceName} onChange={(e) => p.set('deviceName', e.target.value)} onBlur={() => toast('Se aplica al recargar la app')} />
        </Row>
      </div>

      <div className="settings-group">
        <h2>Preferencias</h2>
        <Row label="Exportar / importar" hint="Guarda tu configuración en un archivo JSON">
          <button className="btn sm" onClick={exportPrefs}>Exportar</button>
          <button className="btn sm" onClick={() => fileRef.current?.click()}>Importar</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
        </Row>
        <Row label="Pegar JSON">
          <textarea className="input" rows={2} value={json} onChange={(e) => setJson(e.target.value)} placeholder='{"theme":"retro", ...}' style={{ width: 220 }} />
          <button className="btn sm" disabled={!json.trim()} onClick={() => { toast(p.importJson(json) ? 'Importado' : 'JSON no válido'); setJson('') }}>Aplicar</button>
        </Row>
        <Row label="Restablecer todo"><button className="btn sm outline" onClick={() => { p.reset(); toast('Preferencias restablecidas') }}>Restablecer</button></Row>
      </div>

      <div className="settings-group">
        <h2>Cuenta</h2>
        <Row label={user?.display_name ?? 'Usuario'} hint={`${user?.product === 'premium' ? 'Spotify Premium' : user?.product ?? ''} · ${user?.email ?? ''}`}>
          <button className="btn sm outline" onClick={logout}><I.Logout width={16} height={16} /> Cerrar sesión</button>
        </Row>
        <Row label="Client ID" hint={clientId}>
          <button className="btn sm outline" onClick={() => { logout(); saveClientId('') }}>Cambiar</button>
        </Row>
        <p className="muted small" style={{ padding: '10px 0' }}>Ondas Player v{__APP_VERSION__} · App personal no afiliada a Spotify. Usa la Web API y el Web Playback SDK oficiales.</p>
      </div>
    </div>
  )
}
