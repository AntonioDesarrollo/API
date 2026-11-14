import { Preferences } from '@capacitor/preferences';
import { emptyState, type AppState } from './types';

const KEY = 'finanzas-hogar:state';

export async function loadState(): Promise<AppState> {
  try {
    const { value } = await Preferences.get({ key: KEY });
    if (!value) return emptyState();
    return migrate(JSON.parse(value));
  } catch (err) {
    console.error('No se pudo cargar el estado', err);
    return emptyState();
  }
}

export async function saveState(state: AppState): Promise<void> {
  await Preferences.set({ key: KEY, value: JSON.stringify(state) });
}

export async function clearState(): Promise<void> {
  await Preferences.remove({ key: KEY });
}

/** Completa campos faltantes cuando el JSON viene de una versión anterior o de un respaldo. */
export function migrate(raw: unknown): AppState {
  const base = emptyState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<AppState>;
  const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  return {
    ...base,
    ...r,
    version: 1,
    members: arr(r.members),
    incomes: arr(r.incomes),
    expenses: arr(r.expenses),
    fixedExpenses: arr(r.fixedExpenses),
    budgets: arr(r.budgets),
    cards: arr(r.cards),
    plans: arr(r.plans),
    cardPayments: arr(r.cardPayments),
    debts: arr(r.debts),
    debtPayments: arr(r.debtPayments),
    goals: arr(r.goals),
    plan: { ...base.plan, ...(r.plan ?? {}) },
    settings: { ...base.settings, ...(r.settings ?? {}) },
  };
}

export function serialize(state: AppState): string {
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
}
