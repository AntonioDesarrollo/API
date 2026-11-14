import type { Settings } from './types';

let current: Pick<Settings, 'currency' | 'locale'> = { currency: 'MXN', locale: 'es-MX' };

export function configureFormat(s: Pick<Settings, 'currency' | 'locale'>): void {
  current = s;
}

const cache = new Map<string, Intl.NumberFormat>();

function fmt(key: string, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const k = `${current.locale}|${current.currency}|${key}`;
  let f = cache.get(k);
  if (!f) {
    f = new Intl.NumberFormat(current.locale, opts);
    cache.set(k, f);
  }
  return f;
}

export function money(n: number, opts: { compact?: boolean; decimals?: boolean } = {}): string {
  if (!Number.isFinite(n)) return '—';
  if (opts.compact && Math.abs(n) >= 100000) {
    return fmt('compact', {
      style: 'currency',
      currency: current.currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n);
  }
  const decimals = opts.decimals ?? Math.abs(n) < 1000;
  return fmt(decimals ? 'dec' : 'int', {
    style: 'currency',
    currency: current.currency,
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(n);
}

export function pct(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(digits)}%`;
}

export function num(n: number, digits = 0): string {
  return fmt(`n${digits}`, { maximumFractionDigits: digits }).format(n);
}

export function parseAmount(s: string): number {
  const cleaned = s.replace(/[^\d.,-]/g, '').replace(/,/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}
