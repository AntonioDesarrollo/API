import type {
  AppState,
  Budget,
  CardPayment,
  CreditCard,
  Debt,
  DebtPayment,
  Expense,
  ExpenseCategory,
  FixedExpense,
  Income,
  InstallmentPlan,
  Member,
  MonthKey,
  PlanSettings,
  SavingsGoal,
} from './types';
import { CATEGORIES } from './types';
import { daysBetween, monthKeyOf, monthsBetween, nextOccurrence, parseISODate } from './dates';

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export function sum(ns: number[]): number {
  return ns.reduce((a, b) => a + b, 0);
}

export function inMonth<T extends { date: string }>(items: T[], month: MonthKey): T[] {
  return items.filter((i) => monthKeyOf(i.date) === month);
}

// ---------- Ingresos / gastos ----------

export function totalIncome(incomes: Income[], month: MonthKey): number {
  return sum(inMonth(incomes, month).map((i) => i.amount));
}

export function totalExpenses(expenses: Expense[], month: MonthKey): number {
  return sum(inMonth(expenses, month).map((e) => e.amount));
}

export function expensesByCategory(expenses: Expense[], month: MonthKey): Record<ExpenseCategory, number> {
  const out = {} as Record<ExpenseCategory, number>;
  for (const e of inMonth(expenses, month)) {
    out[e.category] = (out[e.category] ?? 0) + e.amount;
  }
  return out;
}

export function expensesByMember(expenses: Expense[], month: MonthKey): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of inMonth(expenses, month)) {
    const k = e.memberId ?? 'sin-asignar';
    out[k] = (out[k] ?? 0) + e.amount;
  }
  return out;
}

export function incomeByMember(incomes: Income[], month: MonthKey): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of inMonth(incomes, month)) out[i.memberId] = (out[i.memberId] ?? 0) + i.amount;
  return out;
}

/** Gastos divididos en necesidades y deseos según la categoría */
export function needsWants(expenses: Expense[], month: MonthKey): { needs: number; wants: number } {
  let needs = 0;
  let wants = 0;
  for (const e of inMonth(expenses, month)) {
    if (CATEGORIES[e.category].kind === 'necesidad') needs += e.amount;
    else wants += e.amount;
  }
  return { needs, wants };
}

export interface BudgetStatus {
  category: ExpenseCategory;
  budget: number;
  spent: number;
  ratio: number;
  status: 'ok' | 'alerta' | 'excedido';
}

export function budgetStatus(budgets: Budget[], expenses: Expense[], month: MonthKey): BudgetStatus[] {
  const spent = expensesByCategory(expenses, month);
  return budgets
    .filter((b) => b.monthly > 0)
    .map((b) => {
      const s = spent[b.category] ?? 0;
      const ratio = s / b.monthly;
      return {
        category: b.category,
        budget: b.monthly,
        spent: s,
        ratio,
        status: ratio > 1 ? 'excedido' : ratio >= 0.8 ? 'alerta' : 'ok',
      };
    });
}

export function totalFixedExpenses(fixed: FixedExpense[]): number {
  return sum(fixed.filter((f) => f.active).map((f) => f.amount));
}

/** Gastos fijos que todavía no se han registrado en el mes */
export function pendingFixedExpenses(fixed: FixedExpense[], expenses: Expense[], month: MonthKey): FixedExpense[] {
  const registered = new Set(inMonth(expenses, month).map((e) => e.fixedId).filter(Boolean));
  return fixed.filter((f) => f.active && !registered.has(f.id));
}

// ---------- Tarjetas ----------

export function cardUtilization(card: CreditCard): number {
  if (card.limit <= 0) return 0;
  return Math.min(1.5, card.used / card.limit);
}

export function cardAvailable(card: CreditCard): number {
  return Math.max(0, card.limit - card.used);
}

export function utilizationLevel(ratio: number): 'ok' | 'alerta' | 'alto' {
  if (ratio <= 0.3) return 'ok';
  if (ratio <= 0.7) return 'alerta';
  return 'alto';
}

export function monthlyRate(annualRatePct: number): number {
  return annualRatePct / 100 / 12;
}

/** Pago mensual de una compra a plazos (sin intereses o con amortización francesa). */
export function installmentMonthlyPayment(plan: Pick<InstallmentPlan, 'total' | 'months' | 'interestFree' | 'annualRate'>): number {
  if (plan.months <= 0) return plan.total;
  if (plan.interestFree || !plan.annualRate) return round2(plan.total / plan.months);
  const r = monthlyRate(plan.annualRate);
  if (r === 0) return round2(plan.total / plan.months);
  const p = (plan.total * r) / (1 - Math.pow(1 + r, -plan.months));
  return round2(p);
}

export interface InstallmentProgress {
  monthly: number;
  paidMonths: number;
  remainingMonths: number;
  remainingBalance: number;
  totalCost: number;
  done: boolean;
}

export function installmentProgress(plan: InstallmentPlan, today: Date = new Date()): InstallmentProgress {
  const monthly = installmentMonthlyPayment(plan);
  const elapsed = Math.max(0, monthsBetween(plan.startDate, today));
  const paidMonths = Math.min(plan.months, elapsed);
  const remainingMonths = plan.months - paidMonths;
  const totalCost = round2(monthly * plan.months);
  return {
    monthly,
    paidMonths,
    remainingMonths,
    remainingBalance: round2(monthly * remainingMonths),
    totalCost,
    done: remainingMonths <= 0,
  };
}

export interface CardSummary {
  card: CreditCard;
  utilization: number;
  available: number;
  /** Suma de mensualidades de planes activos que caen en el próximo estado de cuenta */
  installmentsDue: number;
  /** Saldo pendiente de planes a meses (aún no exigible) */
  installmentsOutstanding: number;
  /** Saldo revolvente (lo usado menos lo que está a meses) */
  revolving: number;
  /** Pago para no generar intereses */
  payNoInterest: number;
  /** Pago mínimo estimado */
  minPayment: number;
  /** Interés mensual estimado si solo paga el mínimo */
  monthlyInterestIfMin: number;
  nextCut: Date;
  nextPay: Date;
  daysToCut: number;
  daysToPay: number;
}

export function cardSummary(card: CreditCard, plans: InstallmentPlan[], today: Date = new Date()): CardSummary {
  const active = plans.filter((p) => p.cardId === card.id).map((p) => installmentProgress(p, today)).filter((p) => !p.done);
  const installmentsDue = round2(sum(active.map((p) => p.monthly)));
  const installmentsOutstanding = round2(sum(active.map((p) => p.remainingBalance)));
  const revolving = Math.max(0, round2(card.used - installmentsOutstanding));
  // Pago para no generar intereses: saldo revolvente + mensualidades del periodo.
  const payNoInterest = Math.min(card.used, round2(revolving + installmentsDue));
  // Pago mínimo (estimación tipo CNBV): max(1.5% del revolvente + intereses con IVA, 1.25% del límite) + mensualidades.
  const interest = revolving * monthlyRate(card.annualRate);
  const minRevolving = Math.max(revolving * 0.015 + interest * 1.16, card.limit * 0.0125);
  const minPayment = Math.min(payNoInterest, round2(Math.min(revolving, minRevolving) + installmentsDue));
  const nextCut = nextOccurrence(card.cutDay, today);
  const nextPay = nextOccurrence(card.payDay, today);
  return {
    card,
    utilization: cardUtilization(card),
    available: cardAvailable(card),
    installmentsDue,
    installmentsOutstanding,
    revolving,
    payNoInterest,
    minPayment,
    monthlyInterestIfMin: round2(interest * 1.16),
    nextCut,
    nextPay,
    daysToCut: daysBetween(today, nextCut),
    daysToPay: daysBetween(today, nextPay),
  };
}

export function totalCardPayments(payments: CardPayment[], month: MonthKey): number {
  return sum(inMonth(payments, month).map((p) => p.amount));
}

// ---------- Deudas ----------

export interface Amortization {
  /** Meses para liquidar (Infinity si el pago no cubre el interés) */
  months: number;
  totalInterest: number;
  totalPaid: number;
  /** Interés del primer mes */
  firstInterest: number;
  coversInterest: boolean;
}

export function amortize(balance: number, annualRatePct: number, monthlyPayment: number): Amortization {
  if (balance <= 0) return { months: 0, totalInterest: 0, totalPaid: 0, firstInterest: 0, coversInterest: true };
  const r = monthlyRate(annualRatePct);
  const firstInterest = round2(balance * r);
  if (monthlyPayment <= 0 || (r > 0 && monthlyPayment <= balance * r)) {
    return { months: Infinity, totalInterest: Infinity, totalPaid: Infinity, firstInterest, coversInterest: false };
  }
  let b = balance;
  let months = 0;
  let interest = 0;
  while (b > 0.005 && months < 1200) {
    const i = b * r;
    interest += i;
    const pay = Math.min(monthlyPayment, b + i);
    b = b + i - pay;
    months += 1;
  }
  return {
    months,
    totalInterest: round2(interest),
    totalPaid: round2(balance + interest),
    firstInterest,
    coversInterest: true,
  };
}

export function totalDebtPayments(payments: DebtPayment[], month: MonthKey): number {
  return sum(inMonth(payments, month).map((p) => p.amount));
}

export function debtMonthlyTotal(debts: Debt[]): number {
  return sum(debts.filter((d) => d.balance > 0).map((d) => d.monthlyPayment));
}

export function debtsOrdered(debts: Debt[], strategy: PlanSettings['debtStrategy']): Debt[] {
  const live = debts.filter((d) => d.balance > 0);
  return [...live].sort((a, b) =>
    strategy === 'avalancha' ? b.annualRate - a.annualRate || a.balance - b.balance : a.balance - b.balance || b.annualRate - a.annualRate,
  );
}

/** Relación deuda/ingreso: pagos mensuales (deudas + mínimos de tarjetas) sobre ingreso mensual. */
export function debtToIncome(monthlyDebtPayments: number, monthlyIncome: number): number {
  if (monthlyIncome <= 0) return monthlyDebtPayments > 0 ? 1 : 0;
  return monthlyDebtPayments / monthlyIncome;
}

// ---------- Plan familiar ----------

export function householdIncomeEstimate(members: Member[]): number {
  return sum(members.map((m) => m.monthlyIncome));
}

export interface ContributionLine {
  member: Member;
  income: number;
  share: number;
  amount: number;
  /** Lo que le queda después de aportar */
  remaining: number;
}

/**
 * Reparte el gasto común entre integrantes.
 * - proporcional: según ingreso (quien gana más aporta más, el mismo % para todos).
 * - igual: partes iguales entre quienes tienen ingreso.
 * - porcentaje / fijo: lo que cada quien definió.
 */
export function contributions(members: Member[], commonExpenses: number): ContributionLine[] {
  const earners = members.filter((m) => m.monthlyIncome > 0);
  const totalIncome = householdIncomeEstimate(members);
  const fixedOrPct = members.filter((m) => m.contributionMode === 'fijo' || m.contributionMode === 'porcentaje');
  let covered = 0;
  const preset = new Map<string, number>();
  for (const m of fixedOrPct) {
    const amt = m.contributionMode === 'fijo' ? (m.contributionValue ?? 0) : (commonExpenses * (m.contributionValue ?? 0)) / 100;
    preset.set(m.id, amt);
    covered += amt;
  }
  const rest = Math.max(0, commonExpenses - covered);
  const flexible = members.filter((m) => !preset.has(m.id));
  const flexIncome = sum(flexible.map((m) => m.monthlyIncome));
  const equalCount = flexible.filter((m) => m.monthlyIncome > 0).length || flexible.length;

  return members.map((m) => {
    let amount: number;
    if (preset.has(m.id)) {
      amount = preset.get(m.id)!;
    } else if (m.contributionMode === 'igual') {
      amount = equalCount > 0 ? rest / equalCount : 0;
    } else {
      amount = flexIncome > 0 ? (rest * m.monthlyIncome) / flexIncome : flexible.length ? rest / flexible.length : 0;
    }
    amount = round2(amount);
    return {
      member: m,
      income: m.monthlyIncome,
      share: commonExpenses > 0 ? amount / commonExpenses : earners.length ? (m.monthlyIncome / (totalIncome || 1)) : 0,
      amount,
      remaining: round2(m.monthlyIncome - amount),
    };
  });
}

export interface Distribution {
  income: number;
  needs: number;
  wants: number;
  savings: number;
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
}

export function distribution(income: number, plan: PlanSettings): Distribution {
  const total = plan.needsPct + plan.wantsPct + plan.savingsPct || 100;
  const needsPct = (plan.needsPct / total) * 100;
  const wantsPct = (plan.wantsPct / total) * 100;
  const savingsPct = (plan.savingsPct / total) * 100;
  return {
    income,
    needs: round2((income * needsPct) / 100),
    wants: round2((income * wantsPct) / 100),
    savings: round2((income * savingsPct) / 100),
    needsPct,
    wantsPct,
    savingsPct,
  };
}

export function emergencyFundTarget(monthlyEssentials: number, months: number): number {
  return round2(monthlyEssentials * months);
}

export function goalMonthlyNeeded(goal: SavingsGoal, today: Date = new Date()): number | null {
  if (!goal.deadline) return null;
  const left = Math.max(0, goal.target - goal.saved);
  const months = Math.max(1, monthsBetween(monthKeyOf(today) + '-01', parseISODate(goal.deadline)));
  return round2(left / months);
}

export function goalProgress(goal: SavingsGoal): number {
  if (goal.target <= 0) return 0;
  return Math.min(1, goal.saved / goal.target);
}

// ---------- Resumen del mes ----------

export interface MonthSummary {
  month: MonthKey;
  income: number;
  expenses: number;
  /** Gastos pagados con efectivo/débito (salida real de dinero) */
  cashExpenses: number;
  /** Gastos cargados a tarjeta de crédito */
  cardExpenses: number;
  cardPayments: number;
  debtPayments: number;
  /** Salida real de efectivo: cash + pagos a tarjetas + pagos de deudas */
  cashOut: number;
  /** Lo que queda del ingreso del mes después de todo lo pagado */
  balance: number;
  savingsRate: number;
  needs: number;
  wants: number;
  pendingFixed: number;
  fixedTotal: number;
}

export function monthSummary(state: AppState, month: MonthKey): MonthSummary {
  const income = totalIncome(state.incomes, month);
  const exp = inMonth(state.expenses, month);
  const expenses = sum(exp.map((e) => e.amount));
  const cardExpenses = sum(exp.filter((e) => e.payment.type === 'tarjeta').map((e) => e.amount));
  const cashExpenses = expenses - cardExpenses;
  const cardPayments = totalCardPayments(state.cardPayments, month);
  const debtPayments = totalDebtPayments(state.debtPayments, month);
  const cashOut = cashExpenses + cardPayments + debtPayments;
  const balance = round2(income - cashOut);
  const nw = needsWants(state.expenses, month);
  const pendingFixed = sum(pendingFixedExpenses(state.fixedExpenses, state.expenses, month).map((f) => f.amount));
  return {
    month,
    income,
    expenses,
    cashExpenses,
    cardExpenses,
    cardPayments,
    debtPayments,
    cashOut,
    balance,
    savingsRate: income > 0 ? Math.max(0, balance / income) : 0,
    needs: nw.needs,
    wants: nw.wants,
    pendingFixed,
    fixedTotal: totalFixedExpenses(state.fixedExpenses),
  };
}

// ---------- Salud financiera ----------

export interface HealthScore {
  score: number;
  label: 'Excelente' | 'Bien' | 'Regular' | 'En riesgo';
  factors: { name: string; points: number; max: number; detail: string }[];
}

export function healthScore(input: {
  savingsRate: number;
  avgUtilization: number;
  dti: number;
  budgetsExceeded: number;
  budgetsTotal: number;
  emergencyProgress: number;
}): HealthScore {
  const factors: HealthScore['factors'] = [];
  // Ahorro (30)
  const sr = Math.max(0, Math.min(1, input.savingsRate));
  const savingsPts = Math.round(Math.min(30, (sr / 0.2) * 30));
  factors.push({ name: 'Tasa de ahorro', points: savingsPts, max: 30, detail: `${Math.round(sr * 100)}% del ingreso (meta 20%)` });
  // Uso de tarjetas (25)
  const u = Math.max(0, Math.min(1, input.avgUtilization));
  const utilPts = u <= 0.3 ? 25 : u >= 0.9 ? 0 : Math.round(25 * (1 - (u - 0.3) / 0.6));
  factors.push({ name: 'Uso de crédito', points: utilPts, max: 25, detail: `${Math.round(u * 100)}% de tus líneas (ideal < 30%)` });
  // Deuda/ingreso (25)
  const d = Math.max(0, Math.min(1, input.dti));
  const dtiPts = d <= 0.2 ? 25 : d >= 0.5 ? 0 : Math.round(25 * (1 - (d - 0.2) / 0.3));
  factors.push({ name: 'Deuda vs ingreso', points: dtiPts, max: 25, detail: `${Math.round(d * 100)}% del ingreso va a deudas (ideal < 20%)` });
  // Presupuestos (10)
  const bPts = input.budgetsTotal === 0 ? 5 : Math.round(10 * (1 - input.budgetsExceeded / input.budgetsTotal));
  factors.push({ name: 'Presupuestos', points: bPts, max: 10, detail: input.budgetsTotal ? `${input.budgetsExceeded} de ${input.budgetsTotal} excedidos` : 'Sin presupuestos definidos' });
  // Fondo de emergencia (10)
  const ePts = Math.round(10 * Math.max(0, Math.min(1, input.emergencyProgress)));
  factors.push({ name: 'Fondo de emergencia', points: ePts, max: 10, detail: `${Math.round(input.emergencyProgress * 100)}% de la meta` });

  const score = sum(factors.map((f) => f.points));
  const label = score >= 80 ? 'Excelente' : score >= 60 ? 'Bien' : score >= 40 ? 'Regular' : 'En riesgo';
  return { score, label, factors };
}

// ---------- Próximos pagos ----------

export interface UpcomingPayment {
  id: string;
  kind: 'corte' | 'pago-tarjeta' | 'deuda' | 'gasto-fijo';
  title: string;
  subtitle: string;
  amount: number;
  date: Date;
  days: number;
  refId: string;
}

export function upcomingPayments(state: AppState, today: Date = new Date(), horizonDays = 31): UpcomingPayment[] {
  const out: UpcomingPayment[] = [];
  for (const card of state.cards) {
    const s = cardSummary(card, state.plans, today);
    const name = card.nickname || card.issuer;
    out.push({
      id: `cut-${card.id}`,
      kind: 'corte',
      title: `Corte ${name}`,
      subtitle: 'Fecha de corte',
      amount: 0,
      date: s.nextCut,
      days: s.daysToCut,
      refId: card.id,
    });
    if (card.used > 0) {
      out.push({
        id: `pay-${card.id}`,
        kind: 'pago-tarjeta',
        title: `Pagar ${name}`,
        subtitle: 'Para no generar intereses',
        amount: s.payNoInterest,
        date: s.nextPay,
        days: s.daysToPay,
        refId: card.id,
      });
    }
  }
  for (const debt of state.debts) {
    if (debt.balance <= 0) continue;
    const d = nextOccurrence(debt.payDay, today);
    out.push({
      id: `debt-${debt.id}`,
      kind: 'deuda',
      title: debt.name,
      subtitle: 'Mensualidad',
      amount: Math.min(debt.monthlyPayment, debt.balance),
      date: d,
      days: daysBetween(today, d),
      refId: debt.id,
    });
  }
  const month = monthKeyOf(today);
  for (const f of pendingFixedExpenses(state.fixedExpenses, state.expenses, month)) {
    const d = nextOccurrence(f.dayOfMonth, today);
    out.push({
      id: `fixed-${f.id}`,
      kind: 'gasto-fijo',
      title: f.name,
      subtitle: 'Gasto fijo pendiente',
      amount: f.amount,
      date: d,
      days: daysBetween(today, d),
      refId: f.id,
    });
  }
  return out.filter((p) => p.days <= horizonDays).sort((a, b) => a.days - b.days);
}

// ---------- Alertas ----------

export interface Alert {
  id: string;
  level: 'info' | 'warning' | 'danger';
  title: string;
  detail: string;
}

export function alerts(state: AppState, month: MonthKey, today: Date = new Date()): Alert[] {
  const out: Alert[] = [];
  const summary = monthSummary(state, month);
  if (state.members.length && summary.income === 0) {
    out.push({ id: 'no-income', level: 'info', title: 'Sin ingresos este mes', detail: 'Registra tu nómina para que el plan calcule tu disponible.' });
  }
  if (summary.balance < 0) {
    out.push({ id: 'neg', level: 'danger', title: 'Gastaste más de lo que ingresó', detail: 'Este mes el flujo de efectivo es negativo. Revisa tus gastos variables.' });
  }
  for (const card of state.cards) {
    const s = cardSummary(card, state.plans, today);
    const name = card.nickname || card.issuer;
    if (s.utilization >= 0.7) {
      out.push({ id: `util-${card.id}`, level: 'danger', title: `${name} al ${Math.round(s.utilization * 100)}%`, detail: 'Un uso mayor al 70% afecta tu historial. Intenta bajarlo del 30%.' });
    } else if (s.utilization > 0.3) {
      out.push({ id: `util-${card.id}`, level: 'warning', title: `${name} al ${Math.round(s.utilization * 100)}%`, detail: 'Lo ideal es usar menos del 30% de la línea.' });
    }
    if (card.used > 0 && s.daysToPay <= 3) {
      out.push({ id: `due-${card.id}`, level: 'warning', title: `Pago de ${name} ${s.daysToPay === 0 ? 'hoy' : `en ${s.daysToPay} días`}`, detail: `Paga al menos ${Math.round(s.payNoInterest)} para no generar intereses.` });
    }
  }
  for (const b of budgetStatus(state.budgets, state.expenses, month)) {
    if (b.status === 'excedido') {
      out.push({ id: `budget-${b.category}`, level: 'warning', title: `Presupuesto de ${CATEGORIES[b.category].label} excedido`, detail: `Llevas ${Math.round(b.ratio * 100)}% de lo planeado.` });
    }
  }
  for (const d of state.debts) {
    if (d.balance > 0) {
      const a = amortize(d.balance, d.annualRate, d.monthlyPayment);
      if (!a.coversInterest) {
        out.push({ id: `debt-${d.id}`, level: 'danger', title: `${d.name}: el pago no cubre los intereses`, detail: 'Con ese pago mensual la deuda nunca se liquida. Sube el pago.' });
      }
    }
  }
  return out;
}
