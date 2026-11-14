import type { ISODate, MonthKey } from './types';

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseISODate(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

export function monthKeyOf(date: ISODate | Date): MonthKey {
  const d = typeof date === 'string' ? parseISODate(date) : date;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

export function currentMonthKey(): MonthKey {
  return monthKeyOf(new Date());
}

export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKeyOf(d);
}

export function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

/** Devuelve la fecha del día `day` del mes dado, acotando al último día del mes. */
export function dateInMonth(month: MonthKey, day: number): Date {
  const [y, m] = month.split('-').map(Number);
  const dim = daysInMonth(y, m - 1);
  return new Date(y, m - 1, Math.min(Math.max(1, day), dim));
}

/** Próxima ocurrencia (>= hoy) de un día del mes, p. ej. día de corte o de pago. */
export function nextOccurrence(day: number, from: Date = new Date()): Date {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const thisMonth = dateInMonth(monthKeyOf(today), day);
  if (thisMonth.getTime() >= today.getTime()) return thisMonth;
  return dateInMonth(shiftMonth(monthKeyOf(today), 1), day);
}

export function daysBetween(a: Date, b: Date): number {
  const ms = 24 * 60 * 60 * 1000;
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((db - da) / ms);
}

export function monthsBetween(from: ISODate, to: Date): number {
  const f = parseISODate(from);
  return (to.getFullYear() - f.getFullYear()) * 12 + (to.getMonth() - f.getMonth());
}

const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export function monthLabel(month: MonthKey, withYear = true): string {
  const [y, m] = month.split('-').map(Number);
  const name = MONTHS_ES[m - 1] ?? '';
  const cap = name.charAt(0).toUpperCase() + name.slice(1);
  return withYear ? `${cap} ${y}` : cap;
}

export function shortDate(date: ISODate | Date): string {
  const d = typeof date === 'string' ? parseISODate(date) : date;
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()].slice(0, 3)}`;
}

export function longDate(date: ISODate | Date): string {
  const d = typeof date === 'string' ? parseISODate(date) : date;
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  return `${days[d.getDay()]} ${d.getDate()} de ${MONTHS_ES[d.getMonth()]}`;
}

export function relativeDays(days: number): string {
  if (days < 0) return `hace ${Math.abs(days)} d`;
  if (days === 0) return 'hoy';
  if (days === 1) return 'mañana';
  return `en ${days} d`;
}
