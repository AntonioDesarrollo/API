export type ID = string;

/** Fecha en formato ISO corto: YYYY-MM-DD */
export type ISODate = string;
/** Mes en formato YYYY-MM */
export type MonthKey = string;

export type Role = 'yo' | 'pareja' | 'hijo' | 'hija' | 'padre' | 'madre' | 'otro';

export type ContributionMode = 'proporcional' | 'igual' | 'porcentaje' | 'fijo';

export interface Member {
  id: ID;
  name: string;
  age: number;
  role: Role;
  color: string;
  /** Ingreso mensual estimado (nómina + extras habituales) */
  monthlyIncome: number;
  /** Cómo aporta al gasto común */
  contributionMode: ContributionMode;
  /** Porcentaje (0-100) o monto fijo según contributionMode */
  contributionValue?: number;
}

export type IncomeSource = 'nomina' | 'extra' | 'bono' | 'negocio' | 'aguinaldo' | 'otro';

export interface Income {
  id: ID;
  memberId: ID;
  amount: number;
  date: ISODate;
  source: IncomeSource;
  note?: string;
}

export type ExpenseCategory =
  | 'comida'
  | 'super'
  | 'renta'
  | 'servicios'
  | 'transporte'
  | 'salud'
  | 'educacion'
  | 'entretenimiento'
  | 'ropa'
  | 'mascotas'
  | 'hogar'
  | 'suscripciones'
  | 'hijos'
  | 'regalos'
  | 'otros';

export type PaymentType = 'efectivo' | 'debito' | 'tarjeta';

export interface PaymentMethod {
  type: PaymentType;
  cardId?: ID;
}

export interface Expense {
  id: ID;
  amount: number;
  date: ISODate;
  category: ExpenseCategory;
  /** Quién pagó */
  memberId?: ID;
  payment: PaymentMethod;
  note?: string;
  /** Si viene de un gasto fijo mensual, su id */
  fixedId?: ID;
}

/** Gasto fijo que se repite cada mes (renta, luz, internet, Netflix...) */
export interface FixedExpense {
  id: ID;
  name: string;
  amount: number;
  category: ExpenseCategory;
  dayOfMonth: number;
  payment: PaymentMethod;
  memberId?: ID;
  active: boolean;
}

export interface Budget {
  category: ExpenseCategory;
  monthly: number;
}

export type CardNetwork = 'visa' | 'mastercard' | 'amex' | 'carnet';

export interface CreditCard {
  id: ID;
  issuer: string;
  nickname?: string;
  last4?: string;
  network: CardNetwork;
  limit: number;
  /** Saldo utilizado actual (incluye compras a meses) */
  used: number;
  cutDay: number;
  payDay: number;
  /** Tasa de interés anual (%) */
  annualRate: number;
  holderMemberId?: ID;
  /** Color personalizado cuando el emisor es "otro" */
  customColor?: string;
}

/** Compra a meses (con o sin intereses) cargada a una tarjeta */
export interface InstallmentPlan {
  id: ID;
  cardId: ID;
  description: string;
  total: number;
  months: number;
  startDate: ISODate;
  interestFree: boolean;
  /** Tasa anual del plan si no es sin intereses */
  annualRate?: number;
}

export interface CardPayment {
  id: ID;
  cardId: ID;
  amount: number;
  date: ISODate;
  memberId?: ID;
}

export type DebtKind = 'personal' | 'auto' | 'hipoteca' | 'familiar' | 'estudiantil' | 'nomina' | 'otro';

export interface Debt {
  id: ID;
  name: string;
  kind: DebtKind;
  principal: number;
  balance: number;
  annualRate: number;
  monthlyPayment: number;
  payDay: number;
  memberId?: ID;
  startDate: ISODate;
  note?: string;
}

export interface DebtPayment {
  id: ID;
  debtId: ID;
  amount: number;
  date: ISODate;
  memberId?: ID;
}

export interface SavingsGoal {
  id: ID;
  name: string;
  icon: string;
  target: number;
  saved: number;
  deadline?: ISODate;
  isEmergencyFund?: boolean;
}

export type BudgetRule = '50-30-20' | '70-20-10' | '60-20-20' | 'custom';

export interface PlanSettings {
  rule: BudgetRule;
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
  emergencyMonths: 3 | 6 | 9 | 12;
  /** Estrategia para liquidar deudas */
  debtStrategy: 'avalancha' | 'bola-de-nieve';
}

export interface Settings {
  currency: 'MXN' | 'USD' | 'EUR' | 'COP' | 'ARS' | 'PEN' | 'CLP';
  locale: string;
  theme: 'auto' | 'light' | 'dark';
  haptics: boolean;
}

export interface AppState {
  version: 1;
  onboarded: boolean;
  members: Member[];
  incomes: Income[];
  expenses: Expense[];
  fixedExpenses: FixedExpense[];
  budgets: Budget[];
  cards: CreditCard[];
  plans: InstallmentPlan[];
  cardPayments: CardPayment[];
  debts: Debt[];
  debtPayments: DebtPayment[];
  goals: SavingsGoal[];
  plan: PlanSettings;
  settings: Settings;
}

export const ROLE_LABELS: Record<Role, string> = {
  yo: 'Yo',
  pareja: 'Pareja',
  hijo: 'Hijo',
  hija: 'Hija',
  padre: 'Padre',
  madre: 'Madre',
  otro: 'Otro',
};

export const INCOME_SOURCE_LABELS: Record<IncomeSource, string> = {
  nomina: 'Nómina',
  extra: 'Ingreso extra',
  bono: 'Bono',
  negocio: 'Negocio',
  aguinaldo: 'Aguinaldo',
  otro: 'Otro',
};

export interface CategoryMeta {
  label: string;
  emoji: string;
  /** Necesidad o deseo para la regla 50/30/20 */
  kind: 'necesidad' | 'deseo';
}

export const CATEGORIES: Record<ExpenseCategory, CategoryMeta> = {
  comida: { label: 'Comida', emoji: '🍽️', kind: 'necesidad' },
  super: { label: 'Súper y despensa', emoji: '🛒', kind: 'necesidad' },
  renta: { label: 'Renta / hipoteca', emoji: '🏠', kind: 'necesidad' },
  servicios: { label: 'Servicios (luz, agua, gas, internet)', emoji: '💡', kind: 'necesidad' },
  transporte: { label: 'Transporte y gasolina', emoji: '🚗', kind: 'necesidad' },
  salud: { label: 'Salud', emoji: '💊', kind: 'necesidad' },
  educacion: { label: 'Educación', emoji: '📚', kind: 'necesidad' },
  hijos: { label: 'Hijos', emoji: '🧸', kind: 'necesidad' },
  hogar: { label: 'Hogar y mantenimiento', emoji: '🧹', kind: 'necesidad' },
  entretenimiento: { label: 'Entretenimiento y salidas', emoji: '🎬', kind: 'deseo' },
  suscripciones: { label: 'Suscripciones', emoji: '📱', kind: 'deseo' },
  ropa: { label: 'Ropa y calzado', emoji: '👕', kind: 'deseo' },
  mascotas: { label: 'Mascotas', emoji: '🐶', kind: 'necesidad' },
  regalos: { label: 'Regalos', emoji: '🎁', kind: 'deseo' },
  otros: { label: 'Otros', emoji: '📦', kind: 'deseo' },
};

export const CATEGORY_ORDER: ExpenseCategory[] = [
  'comida',
  'super',
  'renta',
  'servicios',
  'transporte',
  'salud',
  'educacion',
  'hijos',
  'hogar',
  'entretenimiento',
  'suscripciones',
  'ropa',
  'mascotas',
  'regalos',
  'otros',
];

export const DEBT_KIND_LABELS: Record<DebtKind, string> = {
  personal: 'Préstamo personal',
  auto: 'Crédito automotriz',
  hipoteca: 'Hipoteca',
  familiar: 'Préstamo familiar',
  estudiantil: 'Crédito educativo',
  nomina: 'Crédito de nómina',
  otro: 'Otra deuda',
};

export const MEMBER_COLORS = [
  '#007aff',
  '#ff2d55',
  '#34c759',
  '#ff9500',
  '#af52de',
  '#5ac8fa',
  '#ffcc00',
  '#5856d6',
];

export function defaultPlanSettings(): PlanSettings {
  return {
    rule: '50-30-20',
    needsPct: 50,
    wantsPct: 30,
    savingsPct: 20,
    emergencyMonths: 3,
    debtStrategy: 'avalancha',
  };
}

export function emptyState(): AppState {
  return {
    version: 1,
    onboarded: false,
    members: [],
    incomes: [],
    expenses: [],
    fixedExpenses: [],
    budgets: [],
    cards: [],
    plans: [],
    cardPayments: [],
    debts: [],
    debtPayments: [],
    goals: [],
    plan: defaultPlanSettings(),
    settings: { currency: 'MXN', locale: 'es-MX', theme: 'auto', haptics: true },
  };
}
