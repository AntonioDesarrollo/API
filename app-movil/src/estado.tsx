import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { cargarLocal, cargarNativo, estadoInicial, guardar } from './lib/almacen';
import type { Estado } from './types';

interface Ctx {
  estado: Estado;
  actualizar: (fn: (e: Estado) => Estado) => void;
  reemplazar: (e: Estado) => void;
}

const EstadoContext = createContext<Ctx | null>(null);

export function ProveedorEstado({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>(() => cargarLocal() ?? estadoInicial());

  // Si localStorage se borró pero hay copia nativa, la restauramos.
  useEffect(() => {
    if (cargarLocal()) return;
    void cargarNativo().then((e) => e && setEstado(e));
  }, []);

  useEffect(() => guardar(estado), [estado]);

  const actualizar = useCallback((fn: (e: Estado) => Estado) => setEstado((e) => fn(e)), []);
  const reemplazar = useCallback((e: Estado) => setEstado(e), []);

  return <EstadoContext.Provider value={{ estado, actualizar, reemplazar }}>{children}</EstadoContext.Provider>;
}

export function useEstado(): Ctx {
  const ctx = useContext(EstadoContext);
  if (!ctx) throw new Error('useEstado fuera de ProveedorEstado');
  return ctx;
}

export const nuevoId = (prefijo: string) => `${prefijo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
