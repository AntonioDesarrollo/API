import { useEffect } from 'react'
import { usePlayer } from '@/store/player'
import { I } from './Icons'
import { Sheet } from './Sheet'

function iconFor(type: string) {
  const t = type.toLowerCase()
  if (t.includes('phone') || t.includes('tablet')) return <I.Phone />
  if (t.includes('speaker') || t.includes('tv') || t.includes('cast')) return <I.Speaker />
  return <I.Laptop />
}

export function DevicePicker({ onClose }: { onClose: () => void }) {
  const { devices, loadDevices, transferTo, activeDevice, sdkDeviceId } = usePlayer()
  useEffect(() => {
    loadDevices()
  }, [loadDevices])
  return (
    <Sheet title="Dispositivos disponibles" onClose={onClose}>
      {devices.length === 0 && (
        <p className="muted small" style={{ padding: '0 8px 12px' }}>
          No se ven dispositivos. Abre Spotify en tu teléfono o computadora, o activa "Reproducir en este navegador" en Ajustes.
        </p>
      )}
      {devices.map((d) => (
        <button
          key={d.id ?? d.name}
          className={`item ${d.is_active || d.id === activeDevice?.id ? 'active' : ''}`}
          onClick={() => {
            if (d.id) transferTo(d.id)
            onClose()
          }}
        >
          {iconFor(d.type)}
          <span className="col" style={{ gap: 0 }}>
            <span>{d.name}{d.id === sdkDeviceId ? ' (este navegador)' : ''}</span>
            <span className="sub">{d.type}{d.is_active ? ' · activo' : ''}</span>
          </span>
          <span className="spacer" />
          {(d.is_active || d.id === activeDevice?.id) && <I.Check />}
        </button>
      ))}
      <button className="item" onClick={loadDevices}>
        <I.Refresh /> Actualizar lista
      </button>
    </Sheet>
  )
}
