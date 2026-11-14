import { describe, expect, it } from 'vitest';
import { reducer } from '../src/lib/store';
import { emptyState, type AppState, type Expense } from '../src/lib/types';
import { migrate } from '../src/lib/storage';

function withCard(): AppState {
  const s = emptyState();
  s.cards = [{ id: 'c1', issuer: 'nu', network: 'mastercard', limit: 10000, used: 1000, cutDay: 1, payDay: 20, annualRate: 60 }];
  return s;
}

describe('reducer tarjetas', () => {
  it('un gasto con tarjeta aumenta lo usado y al borrarlo lo regresa', () => {
    const e: Expense = { id: 'e1', amount: 500, date: '2026-11-10', category: 'comida', payment: { type: 'tarjeta', cardId: 'c1' } };
    let s = reducer(withCard(), { type: 'addExpense', expense: e });
    expect(s.cards[0].used).toBe(1500);
    s = reducer(s, { type: 'removeExpense', id: 'e1' });
    expect(s.cards[0].used).toBe(1000);
  });
  it('editar un gasto mueve el saldo entre métodos de pago', () => {
    const e: Expense = { id: 'e1', amount: 500, date: '2026-11-10', category: 'comida', payment: { type: 'tarjeta', cardId: 'c1' } };
    let s = reducer(withCard(), { type: 'addExpense', expense: e });
    s = reducer(s, { type: 'updateExpense', previous: e, expense: { ...e, payment: { type: 'efectivo' } } });
    expect(s.cards[0].used).toBe(1000);
    s = reducer(s, { type: 'updateExpense', previous: { ...e, payment: { type: 'efectivo' } }, expense: { ...e, amount: 800 } });
    expect(s.cards[0].used).toBe(1800);
  });
  it('plan a meses carga el total y el pago lo reduce', () => {
    let s = reducer(withCard(), {
      type: 'addPlan',
      plan: { id: 'p1', cardId: 'c1', description: 'TV', total: 6000, months: 6, startDate: '2026-11-01', interestFree: true },
    });
    expect(s.cards[0].used).toBe(7000);
    s = reducer(s, { type: 'payCard', payment: { id: 'cp1', cardId: 'c1', amount: 2000, date: '2026-11-20' } });
    expect(s.cards[0].used).toBe(5000);
    s = reducer(s, { type: 'removeCardPayment', id: 'cp1' });
    expect(s.cards[0].used).toBe(7000);
  });
  it('borrar tarjeta elimina sus planes y pagos', () => {
    let s = reducer(withCard(), {
      type: 'addPlan',
      plan: { id: 'p1', cardId: 'c1', description: 'TV', total: 6000, months: 6, startDate: '2026-11-01', interestFree: true },
    });
    s = reducer(s, { type: 'removeCard', id: 'c1' });
    expect(s.cards).toHaveLength(0);
    expect(s.plans).toHaveLength(0);
  });
});

describe('reducer deudas y gastos fijos', () => {
  it('pago de deuda reduce saldo sin bajar de cero', () => {
    const s0 = emptyState();
    s0.debts = [{ id: 'd1', name: 'Auto', kind: 'auto', principal: 100000, balance: 1500, annualRate: 12, monthlyPayment: 3000, payDay: 5, startDate: '2024-01-01' }];
    const s = reducer(s0, { type: 'payDebt', payment: { id: 'dp1', debtId: 'd1', amount: 3000, date: '2026-11-05' } });
    expect(s.debts[0].balance).toBe(0);
  });
  it('registrar gastos fijos es idempotente por mes', () => {
    const s0 = withCard();
    s0.fixedExpenses = [{ id: 'f1', name: 'Netflix', amount: 219, category: 'suscripciones', dayOfMonth: 3, payment: { type: 'tarjeta', cardId: 'c1' }, active: true }];
    let s = reducer(s0, { type: 'registerFixed', fixedIds: ['f1'], date: '2026-11-03' });
    s = reducer(s, { type: 'registerFixed', fixedIds: ['f1'], date: '2026-11-04' });
    expect(s.expenses).toHaveLength(1);
    expect(s.cards[0].used).toBe(1219);
  });
  it('setBudget con 0 elimina el presupuesto', () => {
    let s = reducer(emptyState(), { type: 'setBudget', budget: { category: 'comida', monthly: 3000 } });
    expect(s.budgets).toHaveLength(1);
    s = reducer(s, { type: 'setBudget', budget: { category: 'comida', monthly: 0 } });
    expect(s.budgets).toHaveLength(0);
  });
});

describe('migrate', () => {
  it('rellena campos faltantes de respaldos viejos', () => {
    const s = migrate({ members: [{ id: 'a', name: 'A' }], settings: { currency: 'USD' } });
    expect(s.cards).toEqual([]);
    expect(s.settings.currency).toBe('USD');
    expect(s.settings.locale).toBe('es-MX');
    expect(s.plan.rule).toBe('50-30-20');
  });
  it('tolera basura', () => {
    expect(migrate(null).members).toEqual([]);
    expect(migrate('x').cards).toEqual([]);
  });
});
