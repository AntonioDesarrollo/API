import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import type {
  AppState,
  Budget,
  CardPayment,
  CreditCard,
  Debt,
  DebtPayment,
  Expense,
  FixedExpense,
  Income,
  InstallmentPlan,
  Member,
  PlanSettings,
  SavingsGoal,
  Settings,
} from './types';
import { emptyState } from './types';
import { loadState, saveState, clearState, migrate } from './storage';
import { configureFormat } from './format';
import { round2 } from './finance';
import { uid } from './id';
import { monthKeyOf } from './dates';

export type Action =
  | { type: 'hydrate'; state: AppState }
  | { type: 'reset' }
  | { type: 'import'; state: AppState }
  | { type: 'setOnboarded'; value: boolean }
  | { type: 'upsertMember'; member: Member }
  | { type: 'removeMember'; id: string }
  | { type: 'addIncome'; income: Income }
  | { type: 'updateIncome'; income: Income }
  | { type: 'removeIncome'; id: string }
  | { type: 'addExpense'; expense: Expense }
  | { type: 'updateExpense'; expense: Expense; previous: Expense }
  | { type: 'removeExpense'; id: string }
  | { type: 'upsertFixed'; fixed: FixedExpense }
  | { type: 'removeFixed'; id: string }
  | { type: 'registerFixed'; fixedIds: string[]; date: string }
  | { type: 'setBudget'; budget: Budget }
  | { type: 'upsertCard'; card: CreditCard }
  | { type: 'removeCard'; id: string }
  | { type: 'addPlan'; plan: InstallmentPlan }
  | { type: 'updatePlan'; plan: InstallmentPlan }
  | { type: 'removePlan'; id: string }
  | { type: 'payCard'; payment: CardPayment }
  | { type: 'removeCardPayment'; id: string }
  | { type: 'upsertDebt'; debt: Debt }
  | { type: 'removeDebt'; id: string }
  | { type: 'payDebt'; payment: DebtPayment }
  | { type: 'removeDebtPayment'; id: string }
  | { type: 'upsertGoal'; goal: SavingsGoal }
  | { type: 'removeGoal'; id: string }
  | { type: 'addToGoal'; id: string; amount: number }
  | { type: 'setPlan'; plan: Partial<PlanSettings> }
  | { type: 'setSettings'; settings: Partial<Settings> };

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const copy = list.slice();
  copy[i] = item;
  return copy;
}

function adjustCardUsed(cards: CreditCard[], cardId: string | undefined, delta: number): CreditCard[] {
  if (!cardId || delta === 0) return cards;
  return cards.map((c) => (c.id === cardId ? { ...c, used: Math.max(0, round2(c.used + delta)) } : c));
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'hydrate':
    case 'import':
      return action.state;
    case 'reset':
      return emptyState();
    case 'setOnboarded':
      return { ...state, onboarded: action.value };
    case 'upsertMember':
      return { ...state, members: upsert(state.members, action.member) };
    case 'removeMember':
      return { ...state, members: state.members.filter((m) => m.id !== action.id) };
    case 'addIncome':
      return { ...state, incomes: [...state.incomes, action.income] };
    case 'updateIncome':
      return { ...state, incomes: upsert(state.incomes, action.income) };
    case 'removeIncome':
      return { ...state, incomes: state.incomes.filter((i) => i.id !== action.id) };
    case 'addExpense': {
      const e = action.expense;
      return {
        ...state,
        expenses: [...state.expenses, e],
        cards: e.payment.type === 'tarjeta' ? adjustCardUsed(state.cards, e.payment.cardId, e.amount) : state.cards,
      };
    }
    case 'updateExpense': {
      const { expense, previous } = action;
      let cards = state.cards;
      if (previous.payment.type === 'tarjeta') cards = adjustCardUsed(cards, previous.payment.cardId, -previous.amount);
      if (expense.payment.type === 'tarjeta') cards = adjustCardUsed(cards, expense.payment.cardId, expense.amount);
      return { ...state, expenses: upsert(state.expenses, expense), cards };
    }
    case 'removeExpense': {
      const e = state.expenses.find((x) => x.id === action.id);
      if (!e) return state;
      return {
        ...state,
        expenses: state.expenses.filter((x) => x.id !== action.id),
        cards: e.payment.type === 'tarjeta' ? adjustCardUsed(state.cards, e.payment.cardId, -e.amount) : state.cards,
      };
    }
    case 'upsertFixed':
      return { ...state, fixedExpenses: upsert(state.fixedExpenses, action.fixed) };
    case 'removeFixed':
      return { ...state, fixedExpenses: state.fixedExpenses.filter((f) => f.id !== action.id) };
    case 'registerFixed': {
      const month = monthKeyOf(action.date);
      const already = new Set(state.expenses.filter((e) => monthKeyOf(e.date) === month).map((e) => e.fixedId));
      let cards = state.cards;
      const created: Expense[] = [];
      for (const id of action.fixedIds) {
        const f = state.fixedExpenses.find((x) => x.id === id);
        if (!f || already.has(id)) continue;
        const e: Expense = {
          id: uid('e'),
          amount: f.amount,
          date: action.date,
          category: f.category,
          memberId: f.memberId,
          payment: f.payment,
          note: f.name,
          fixedId: f.id,
        };
        created.push(e);
        if (e.payment.type === 'tarjeta') cards = adjustCardUsed(cards, e.payment.cardId, e.amount);
      }
      return { ...state, expenses: [...state.expenses, ...created], cards };
    }
    case 'setBudget': {
      const others = state.budgets.filter((b) => b.category !== action.budget.category);
      return { ...state, budgets: action.budget.monthly > 0 ? [...others, action.budget] : others };
    }
    case 'upsertCard':
      return { ...state, cards: upsert(state.cards, action.card) };
    case 'removeCard':
      return {
        ...state,
        cards: state.cards.filter((c) => c.id !== action.id),
        plans: state.plans.filter((p) => p.cardId !== action.id),
        cardPayments: state.cardPayments.filter((p) => p.cardId !== action.id),
      };
    case 'addPlan':
      return {
        ...state,
        plans: [...state.plans, action.plan],
        cards: adjustCardUsed(state.cards, action.plan.cardId, action.plan.total),
      };
    case 'updatePlan':
      return { ...state, plans: upsert(state.plans, action.plan) };
    case 'removePlan':
      return { ...state, plans: state.plans.filter((p) => p.id !== action.id) };
    case 'payCard':
      return {
        ...state,
        cardPayments: [...state.cardPayments, action.payment],
        cards: adjustCardUsed(state.cards, action.payment.cardId, -action.payment.amount),
      };
    case 'removeCardPayment': {
      const p = state.cardPayments.find((x) => x.id === action.id);
      if (!p) return state;
      return {
        ...state,
        cardPayments: state.cardPayments.filter((x) => x.id !== action.id),
        cards: adjustCardUsed(state.cards, p.cardId, p.amount),
      };
    }
    case 'upsertDebt':
      return { ...state, debts: upsert(state.debts, action.debt) };
    case 'removeDebt':
      return {
        ...state,
        debts: state.debts.filter((d) => d.id !== action.id),
        debtPayments: state.debtPayments.filter((p) => p.debtId !== action.id),
      };
    case 'payDebt':
      return {
        ...state,
        debtPayments: [...state.debtPayments, action.payment],
        debts: state.debts.map((d) =>
          d.id === action.payment.debtId ? { ...d, balance: Math.max(0, round2(d.balance - action.payment.amount)) } : d,
        ),
      };
    case 'removeDebtPayment': {
      const p = state.debtPayments.find((x) => x.id === action.id);
      if (!p) return state;
      return {
        ...state,
        debtPayments: state.debtPayments.filter((x) => x.id !== action.id),
        debts: state.debts.map((d) => (d.id === p.debtId ? { ...d, balance: round2(d.balance + p.amount) } : d)),
      };
    }
    case 'upsertGoal':
      return { ...state, goals: upsert(state.goals, action.goal) };
    case 'removeGoal':
      return { ...state, goals: state.goals.filter((g) => g.id !== action.id) };
    case 'addToGoal':
      return {
        ...state,
        goals: state.goals.map((g) => (g.id === action.id ? { ...g, saved: Math.max(0, round2(g.saved + action.amount)) } : g)),
      };
    case 'setPlan':
      return { ...state, plan: { ...state.plan, ...action.plan } };
    case 'setSettings':
      return { ...state, settings: { ...state.settings, ...action.settings } };
    default:
      return state;
  }
}

interface StoreValue {
  state: AppState;
  dispatch: (a: Action) => void;
  ready: boolean;
  importJSON: (json: string) => boolean;
  resetAll: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children, initial }: { children: ReactNode; initial?: AppState }) {
  const [state, dispatch] = useReducer(reducer, initial ?? emptyState());
  const [ready, setReady] = useState(Boolean(initial));
  const hydrated = useRef(Boolean(initial));
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    loadState().then((s) => {
      if (cancelled) return;
      dispatch({ type: 'hydrate', state: s });
      hydrated.current = true;
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [initial]);

  useEffect(() => {
    configureFormat(state.settings);
  }, [state.settings]);

  useEffect(() => {
    if (!hydrated.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveState(state).catch((err) => console.error('No se pudo guardar', err));
    }, 150);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state]);

  const importJSON = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json);
      const s = migrate(parsed);
      dispatch({ type: 'import', state: { ...s, onboarded: true } });
      return true;
    } catch {
      return false;
    }
  }, []);

  const resetAll = useCallback(async () => {
    await clearState();
    dispatch({ type: 'reset' });
  }, []);

  const value = useMemo(() => ({ state, dispatch, ready, importJSON, resetAll }), [state, ready, importJSON, resetAll]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(StoreContext);
  if (!v) throw new Error('useStore debe usarse dentro de StoreProvider');
  return v;
}
