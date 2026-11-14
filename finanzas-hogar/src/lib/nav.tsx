import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export type Tab = 'inicio' | 'movimientos' | 'tarjetas' | 'deudas' | 'plan';

export type Route =
  | { name: 'card'; id: string }
  | { name: 'card-form'; id?: string }
  | { name: 'debt'; id: string }
  | { name: 'debt-form'; id?: string }
  | { name: 'settings' }
  | { name: 'family' }
  | { name: 'member-form'; id?: string }
  | { name: 'fixed' }
  | { name: 'budgets' }
  | { name: 'goals' }
  | { name: 'health' }
  | { name: 'backup' };

interface NavValue {
  tab: Tab;
  setTab: (t: Tab) => void;
  stack: Route[];
  push: (r: Route) => void;
  pop: () => void;
  popTo: (count: number) => void;
  reset: () => void;
  /** Registra un cierre (sheet/alert) que debe atender el botón atrás antes que la pila */
  registerBack: (fn: () => void) => () => void;
}

const NavContext = createContext<NavValue | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const [tab, setTabState] = useState<Tab>('inicio');
  const [stack, setStack] = useState<Route[]>([]);
  const [backHandlers, setBackHandlers] = useState<(() => void)[]>([]);

  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    setStack([]);
  }, []);
  const push = useCallback((r: Route) => setStack((s) => [...s, r]), []);
  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const popTo = useCallback((count: number) => setStack((s) => s.slice(0, Math.max(0, count))), []);
  const reset = useCallback(() => setStack([]), []);

  const registerBack = useCallback((fn: () => void) => {
    setBackHandlers((h) => [...h, fn]);
    return () => setBackHandlers((h) => h.filter((x) => x !== fn));
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const sub = CapApp.addListener('backButton', () => {
      if (backHandlers.length) {
        backHandlers[backHandlers.length - 1]();
        return;
      }
      if (stack.length) {
        pop();
        return;
      }
      if (tab !== 'inicio') {
        setTab('inicio');
        return;
      }
      CapApp.minimizeApp().catch(() => {});
    });
    return () => {
      sub.then((s) => s.remove()).catch(() => {});
    };
  }, [backHandlers, stack, tab, pop, setTab]);

  const value = useMemo(
    () => ({ tab, setTab, stack, push, pop, popTo, reset, registerBack }),
    [tab, setTab, stack, push, pop, popTo, reset, registerBack],
  );
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavValue {
  const v = useContext(NavContext);
  if (!v) throw new Error('useNav fuera de NavProvider');
  return v;
}
