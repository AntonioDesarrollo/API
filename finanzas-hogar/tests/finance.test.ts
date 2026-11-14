import { describe, expect, it } from 'vitest';
import {
  amortize,
  budgetStatus,
  cardSummary,
  contributions,
  debtsOrdered,
  distribution,
  goalMonthlyNeeded,
  healthScore,
  installmentMonthlyPayment,
  installmentProgress,
  monthSummary,
  upcomingPayments,
  alerts,
} from '../src/lib/finance';
import { emptyState, type AppState, type CreditCard, type Member } from '../src/lib/types';
import { nextOccurrence, shiftMonth, monthKeyOf, dateInMonth } from '../src/lib/dates';

const today = new Date(2026, 10, 14); // 14 nov 2026

function member(partial: Partial<Member> & { id: string; name: string }): Member {
  return { age: 30, role: 'yo', color: '#007aff', monthlyIncome: 0, contributionMode: 'proporcional', ...partial };
}

function card(partial: Partial<CreditCard> = {}): CreditCard {
  return {
    id: 'c1',
    issuer: 'nu',
    network: 'mastercard',
    limit: 20000,
    used: 5000,
    cutDay: 20,
    payDay: 10,
    annualRate: 60,
    ...partial,
  };
}

describe('dates', () => {
  it('shiftMonth cruza el año', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });
  it('dateInMonth acota al último día', () => {
    expect(dateInMonth('2026-02', 31).getDate()).toBe(28);
  });
  it('nextOccurrence devuelve hoy o el siguiente mes', () => {
    expect(monthKeyOf(nextOccurrence(20, today))).toBe('2026-11');
    expect(nextOccurrence(14, today).getDate()).toBe(14);
    const n = nextOccurrence(10, today);
    expect(monthKeyOf(n)).toBe('2026-12');
  });
});

describe('installments', () => {
  it('meses sin intereses divide exacto', () => {
    expect(installmentMonthlyPayment({ total: 12000, months: 12, interestFree: true })).toBe(1000);
  });
  it('con intereses usa amortización francesa', () => {
    const p = installmentMonthlyPayment({ total: 10000, months: 12, interestFree: false, annualRate: 24 });
    expect(p).toBeCloseTo(945.6, 0);
  });
  it('progreso según meses transcurridos', () => {
    const pr = installmentProgress(
      { id: 'p', cardId: 'c1', description: 'TV', total: 12000, months: 12, startDate: '2026-08-05', interestFree: true },
      today,
    );
    expect(pr.paidMonths).toBe(3);
    expect(pr.remainingMonths).toBe(9);
    expect(pr.remainingBalance).toBe(9000);
    expect(pr.done).toBe(false);
  });
});

describe('cardSummary', () => {
  it('calcula disponible, utilización y pagos', () => {
    const s = cardSummary(card(), [], today);
    expect(s.available).toBe(15000);
    expect(s.utilization).toBe(0.25);
    expect(s.payNoInterest).toBe(5000);
    // mínimo: max(1.5% de 5000 + interés (5000*0.05=250 *1.16=290), 1.25% de 20000=250) = 365
    expect(s.minPayment).toBeCloseTo(365, 0);
    expect(s.daysToCut).toBe(6);
  });
  it('separa planes a meses del revolvente', () => {
    const plans = [{ id: 'p', cardId: 'c1', description: 'Laptop', total: 12000, months: 12, startDate: '2026-10-01', interestFree: true }];
    const s = cardSummary(card({ used: 15000 }), plans, today);
    expect(s.installmentsDue).toBe(1000);
    expect(s.installmentsOutstanding).toBe(11000);
    expect(s.revolving).toBe(4000);
    expect(s.payNoInterest).toBe(5000);
  });
  it('nunca pide pagar más que lo usado', () => {
    const plans = [{ id: 'p', cardId: 'c1', description: 'X', total: 6000, months: 6, startDate: '2026-11-01', interestFree: true }];
    const s = cardSummary(card({ used: 500 }), plans, today);
    expect(s.payNoInterest).toBeLessThanOrEqual(500);
    expect(s.minPayment).toBeLessThanOrEqual(s.payNoInterest);
  });
});

describe('amortize', () => {
  it('liquida una deuda sin intereses', () => {
    const a = amortize(10000, 0, 1000);
    expect(a.months).toBe(10);
    expect(a.totalInterest).toBe(0);
  });
  it('detecta pagos que no cubren el interés', () => {
    const a = amortize(100000, 60, 4000);
    expect(a.coversInterest).toBe(false);
    expect(a.months).toBe(Infinity);
  });
  it('calcula meses e interés con tasa', () => {
    const a = amortize(50000, 24, 2500);
    expect(a.months).toBeGreaterThan(20);
    expect(a.months).toBeLessThan(30);
    expect(a.totalInterest).toBeGreaterThan(0);
    expect(a.totalPaid).toBe(50000 + a.totalInterest);
  });
});

describe('plan familiar', () => {
  const yo = member({ id: 'a', name: 'Antonio', monthlyIncome: 30000 });
  const pareja = member({ id: 'b', name: 'Ana', monthlyIncome: 20000, role: 'pareja' });
  const hijo = member({ id: 'c', name: 'Leo', age: 5, role: 'hijo', monthlyIncome: 0 });

  it('reparte proporcional al ingreso', () => {
    const c = contributions([yo, pareja, hijo], 25000);
    expect(c[0].amount).toBe(15000);
    expect(c[1].amount).toBe(10000);
    expect(c[2].amount).toBe(0);
    expect(c[0].share).toBeCloseTo(0.6);
    expect(c[0].remaining).toBe(15000);
  });
  it('respeta aportes fijos y reparte el resto', () => {
    const c = contributions([{ ...yo, contributionMode: 'fijo', contributionValue: 5000 }, pareja], 25000);
    expect(c[0].amount).toBe(5000);
    expect(c[1].amount).toBe(20000);
  });
  it('reparte igual cuando se pide', () => {
    const c = contributions([{ ...yo, contributionMode: 'igual' }, { ...pareja, contributionMode: 'igual' }], 10000);
    expect(c[0].amount).toBe(5000);
    expect(c[1].amount).toBe(5000);
  });
  it('distribución 50/30/20', () => {
    const d = distribution(50000, { rule: '50-30-20', needsPct: 50, wantsPct: 30, savingsPct: 20, emergencyMonths: 3, debtStrategy: 'avalancha' });
    expect(d.needs).toBe(25000);
    expect(d.wants).toBe(15000);
    expect(d.savings).toBe(10000);
  });
  it('normaliza porcentajes personalizados que no suman 100', () => {
    const d = distribution(1000, { rule: 'custom', needsPct: 60, wantsPct: 20, savingsPct: 40, emergencyMonths: 3, debtStrategy: 'avalancha' });
    expect(d.needs + d.wants + d.savings).toBeCloseTo(1000, 1);
  });
  it('orden avalancha y bola de nieve', () => {
    const debts = [
      { id: '1', name: 'A', kind: 'personal' as const, principal: 1, balance: 20000, annualRate: 30, monthlyPayment: 1000, payDay: 1, startDate: '2026-01-01' },
      { id: '2', name: 'B', kind: 'personal' as const, principal: 1, balance: 5000, annualRate: 60, monthlyPayment: 500, payDay: 1, startDate: '2026-01-01' },
      { id: '3', name: 'C', kind: 'personal' as const, principal: 1, balance: 1000, annualRate: 10, monthlyPayment: 100, payDay: 1, startDate: '2026-01-01' },
    ];
    expect(debtsOrdered(debts, 'avalancha').map((d) => d.id)).toEqual(['2', '1', '3']);
    expect(debtsOrdered(debts, 'bola-de-nieve').map((d) => d.id)).toEqual(['3', '2', '1']);
  });
  it('meta de ahorro mensual', () => {
    const n = goalMonthlyNeeded({ id: 'g', name: 'Viaje', icon: '✈️', target: 12000, saved: 2000, deadline: '2027-09-01' }, today);
    expect(n).toBe(1000);
  });
});

describe('monthSummary y alertas', () => {
  function state(): AppState {
    const s = emptyState();
    s.members = [member({ id: 'a', name: 'A', monthlyIncome: 30000 })];
    s.incomes = [{ id: 'i1', memberId: 'a', amount: 30000, date: '2026-11-01', source: 'nomina' }];
    s.expenses = [
      { id: 'e1', amount: 8000, date: '2026-11-02', category: 'renta', payment: { type: 'debito' } },
      { id: 'e2', amount: 2000, date: '2026-11-03', category: 'comida', payment: { type: 'tarjeta', cardId: 'c1' } },
      { id: 'e3', amount: 500, date: '2026-10-30', category: 'comida', payment: { type: 'efectivo' } },
    ];
    s.cards = [card({ used: 16000 })];
    s.cardPayments = [{ id: 'cp', cardId: 'c1', amount: 3000, date: '2026-11-05' }];
    s.budgets = [{ category: 'comida', monthly: 1500 }];
    s.fixedExpenses = [{ id: 'f1', name: 'Internet', amount: 600, category: 'servicios', dayOfMonth: 25, payment: { type: 'debito' }, active: true }];
    return s;
  }
  it('resume el mes separando efectivo y tarjeta', () => {
    const m = monthSummary(state(), '2026-11');
    expect(m.income).toBe(30000);
    expect(m.expenses).toBe(10000);
    expect(m.cardExpenses).toBe(2000);
    expect(m.cashExpenses).toBe(8000);
    expect(m.cashOut).toBe(11000);
    expect(m.balance).toBe(19000);
    expect(m.pendingFixed).toBe(600);
  });
  it('estado de presupuestos', () => {
    const b = budgetStatus(state().budgets, state().expenses, '2026-11');
    expect(b[0].status).toBe('excedido');
  });
  it('genera alertas de utilización y presupuesto', () => {
    const a = alerts(state(), '2026-11', today);
    expect(a.some((x) => x.id === 'util-c1' && x.level === 'danger')).toBe(true);
    expect(a.some((x) => x.id === 'budget-comida')).toBe(true);
  });
  it('próximos pagos ordenados por fecha', () => {
    const u = upcomingPayments(state(), today, 60);
    expect(u.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < u.length; i++) expect(u[i].days).toBeGreaterThanOrEqual(u[i - 1].days);
  });
  it('score de salud', () => {
    const h = healthScore({ savingsRate: 0.2, avgUtilization: 0.1, dti: 0.1, budgetsExceeded: 0, budgetsTotal: 2, emergencyProgress: 1 });
    expect(h.score).toBe(100);
    const low = healthScore({ savingsRate: 0, avgUtilization: 0.95, dti: 0.6, budgetsExceeded: 2, budgetsTotal: 2, emergencyProgress: 0 });
    expect(low.score).toBe(0);
    expect(low.label).toBe('En riesgo');
  });
});
