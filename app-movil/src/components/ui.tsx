import { useEffect, type ReactNode } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

const paths: Record<string, string> = {
  plan: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  compras: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
  recetas: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5',
  gastos: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  ajustes: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  candado: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  abierto: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 7.9-1',
  cambiar: 'M21 2v6h-6M3 22v-6h6M21 13a9 9 0 0 1-15.4 6.4L3 16M3 11a9 9 0 0 1 15.4-6.4L21 8',
  atras: 'M15 18l-6-6 6-6',
  mas: 'M12 5v14M5 12h14',
  basura: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  estrella: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z',
  no: 'M4.9 4.9l14.2 14.2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  editar: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
};

export function Icono({ nombre, relleno = false, size = 22 }: { nombre: keyof typeof paths | string; relleno?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={relleno ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[nombre]} />
    </svg>
  );
}

export function Barra({ valor, meta, etiqueta, unidad }: { valor: number; meta: number; etiqueta: string; unidad: string }) {
  const pct = meta > 0 ? Math.min(100, (valor / meta) * 100) : 0;
  const pasado = meta > 0 && valor > meta * 1.1;
  return (
    <div className="barra">
      <div className="barra-txt">
        <span>{etiqueta}</span>
        <span className={pasado ? 'alerta' : ''}>
          {Math.round(valor)} / {Math.round(meta)} {unidad}
        </span>
      </div>
      <div className="barra-fondo">
        <div className={`barra-relleno ${pasado ? 'alerta-bg' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Pantalla completa sobre la actual; el botón "atrás" de Android la cierra. */
export function Hoja({ titulo, onCerrar, children, acciones }: { titulo: string; onCerrar: () => void; children: ReactNode; acciones?: ReactNode }) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const h = CapApp.addListener('backButton', onCerrar);
    return () => {
      void h.then((x) => x.remove());
    };
  }, [onCerrar]);

  return (
    <div className="hoja">
      <header className="hoja-cab">
        <button className="btn-icono" onClick={onCerrar} aria-label="Regresar">
          <Icono nombre="atras" />
        </button>
        <h2>{titulo}</h2>
        <div className="hoja-acciones">{acciones}</div>
      </header>
      <div className="hoja-cuerpo">{children}</div>
    </div>
  );
}

export function Chips<T extends string>({ opciones, seleccion, nombres, onCambio }: { opciones: T[]; seleccion: T[]; nombres: Record<T, string>; onCambio: (v: T[]) => void }) {
  return (
    <div className="chips">
      {opciones.map((o) => {
        const activo = seleccion.includes(o);
        return (
          <button key={o} type="button" className={`chip ${activo ? 'activo' : ''}`} onClick={() => onCambio(activo ? seleccion.filter((x) => x !== o) : [...seleccion, o])}>
            {nombres[o]}
          </button>
        );
      })}
    </div>
  );
}

export function Campo({ etiqueta, children, ayuda }: { etiqueta: string; children: ReactNode; ayuda?: string }) {
  return (
    <label className="campo">
      <span className="campo-et">{etiqueta}</span>
      {children}
      {ayuda && <span className="campo-ayuda">{ayuda}</span>}
    </label>
  );
}

export function NumeroInput({ valor, onCambio, min = 0, paso = 1 }: { valor: number; onCambio: (n: number) => void; min?: number; paso?: number }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      min={min}
      step={paso}
      value={Number.isFinite(valor) ? valor : ''}
      onChange={(e) => {
        const n = parseFloat(e.target.value);
        onCambio(Number.isFinite(n) ? n : 0);
      }}
    />
  );
}
