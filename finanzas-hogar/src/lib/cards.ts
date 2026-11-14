import type { CardNetwork } from './types';

export interface Issuer {
  key: string;
  name: string;
  /** Texto que se muestra como "logo" sobre la tarjeta */
  logo: string;
  /** Fondo (gradiente CSS) */
  bg: string;
  /** Color del texto */
  fg: string;
  /** Color de acento (barra de uso, chip) */
  accent: string;
  network: CardNetwork;
  /** Tasa anual típica (%) para prellenar */
  typicalRate: number;
  tags?: string[];
}

export const ISSUERS: Issuer[] = [
  { key: 'nu', name: 'Nu', logo: 'nu', bg: 'linear-gradient(135deg,#9B2FE8 0%,#820AD1 55%,#5A0A99 100%)', fg: '#ffffff', accent: '#E9D5FF', network: 'mastercard', typicalRate: 75, tags: ['fintech'] },
  { key: 'bbva', name: 'BBVA', logo: 'BBVA', bg: 'linear-gradient(135deg,#0E3C77 0%,#072146 60%,#041430 100%)', fg: '#ffffff', accent: '#5BBEFF', network: 'visa', typicalRate: 58 },
  { key: 'banorte', name: 'Banorte', logo: 'BANORTE', bg: 'linear-gradient(135deg,#FF3B4E 0%,#EB0029 60%,#A3001C 100%)', fg: '#ffffff', accent: '#FFD6DB', network: 'mastercard', typicalRate: 55 },
  { key: 'santander', name: 'Santander', logo: 'Santander', bg: 'linear-gradient(135deg,#FF2A2A 0%,#EC0000 60%,#9E0000 100%)', fg: '#ffffff', accent: '#FFE1E1', network: 'mastercard', typicalRate: 60 },
  { key: 'banamex', name: 'Citibanamex', logo: 'citibanamex', bg: 'linear-gradient(135deg,#1F7AE0 0%,#0B5ED7 55%,#003C8F 100%)', fg: '#ffffff', accent: '#D1E5FF', network: 'mastercard', typicalRate: 56 },
  { key: 'hsbc', name: 'HSBC', logo: 'HSBC', bg: 'linear-gradient(135deg,#3A3A3A 0%,#1D1D1B 60%,#000000 100%)', fg: '#ffffff', accent: '#DB0011', network: 'visa', typicalRate: 52 },
  { key: 'scotiabank', name: 'Scotiabank', logo: 'Scotiabank', bg: 'linear-gradient(135deg,#F03A42 0%,#EC111A 60%,#A50B11 100%)', fg: '#ffffff', accent: '#FFE2E3', network: 'visa', typicalRate: 50 },
  { key: 'amex', name: 'American Express', logo: 'AMERICAN EXPRESS', bg: 'linear-gradient(135deg,#2E8FE6 0%,#006FCF 60%,#004F93 100%)', fg: '#ffffff', accent: '#CFE6FF', network: 'amex', typicalRate: 45 },
  { key: 'amex-gold', name: 'Amex Gold', logo: 'AMERICAN EXPRESS', bg: 'linear-gradient(135deg,#E9C77B 0%,#C9A24B 55%,#8E6A1E 100%)', fg: '#2B2000', accent: '#FFF5D6', network: 'amex', typicalRate: 45 },
  { key: 'amex-platinum', name: 'Amex Platinum', logo: 'AMERICAN EXPRESS', bg: 'linear-gradient(135deg,#E6E8EC 0%,#B7BCC6 55%,#7E8591 100%)', fg: '#1A1D24', accent: '#FFFFFF', network: 'amex', typicalRate: 45 },
  { key: 'stori', name: 'Stori', logo: 'stori', bg: 'linear-gradient(135deg,#1C2B2B 0%,#0F1A1A 60%,#050A0A 100%)', fg: '#ffffff', accent: '#00D084', network: 'mastercard', typicalRate: 85, tags: ['fintech'] },
  { key: 'rappicard', name: 'RappiCard', logo: 'RappiCard', bg: 'linear-gradient(135deg,#2A2A2A 0%,#121212 60%,#000000 100%)', fg: '#ffffff', accent: '#FF441F', network: 'visa', typicalRate: 70, tags: ['fintech'] },
  { key: 'mercadopago', name: 'Mercado Pago', logo: 'mercado pago', bg: 'linear-gradient(135deg,#1B2A7A 0%,#0F1B5C 55%,#070F3A 100%)', fg: '#ffffff', accent: '#00AEEF', network: 'visa', typicalRate: 70, tags: ['fintech'] },
  { key: 'klar', name: 'Klar', logo: 'klar', bg: 'linear-gradient(135deg,#2E2E55 0%,#16213E 60%,#0B1024 100%)', fg: '#ffffff', accent: '#9F7AEA', network: 'mastercard', typicalRate: 80, tags: ['fintech'] },
  { key: 'plata', name: 'Plata', logo: 'plata', bg: 'linear-gradient(135deg,#1E293B 0%,#0F172A 60%,#05080F 100%)', fg: '#ffffff', accent: '#C8F560', network: 'mastercard', typicalRate: 90, tags: ['fintech'] },
  { key: 'didi', name: 'DiDi Card', logo: 'DiDi Card', bg: 'linear-gradient(135deg,#333333 0%,#1F1F1F 60%,#0A0A0A 100%)', fg: '#ffffff', accent: '#FC9153', network: 'mastercard', typicalRate: 85, tags: ['fintech'] },
  { key: 'hey', name: 'Hey Banco', logo: 'hey', bg: 'linear-gradient(135deg,#2B2B2B 0%,#111111 60%,#000000 100%)', fg: '#ffffff', accent: '#7C3AED', network: 'mastercard', typicalRate: 60, tags: ['fintech'] },
  { key: 'uala', name: 'Ualá', logo: 'ualá', bg: 'linear-gradient(135deg,#5A80FF 0%,#3564FF 60%,#1D3FB8 100%)', fg: '#ffffff', accent: '#E0E8FF', network: 'mastercard', typicalRate: 75, tags: ['fintech'] },
  { key: 'liverpool', name: 'Liverpool', logo: 'Liverpool', bg: 'linear-gradient(135deg,#FF3DB8 0%,#E10098 60%,#9C006A 100%)', fg: '#ffffff', accent: '#FFD9F1', network: 'visa', typicalRate: 58, tags: ['departamental'] },
  { key: 'coppel', name: 'Coppel', logo: 'Coppel', bg: 'linear-gradient(135deg,#FFE04D 0%,#FFD100 60%,#D9B000 100%)', fg: '#0033A0', accent: '#0033A0', network: 'carnet', typicalRate: 65, tags: ['departamental'] },
  { key: 'bancoppel', name: 'BanCoppel', logo: 'BanCoppel', bg: 'linear-gradient(135deg,#1A4FD1 0%,#0033A0 60%,#001F66 100%)', fg: '#ffffff', accent: '#FFD100', network: 'visa', typicalRate: 65 },
  { key: 'azteca', name: 'Banco Azteca', logo: 'Banco Azteca', bg: 'linear-gradient(135deg,#1DB954 0%,#00843D 60%,#005A29 100%)', fg: '#ffffff', accent: '#D9F7E3', network: 'visa', typicalRate: 80 },
  { key: 'invex', name: 'Invex', logo: 'INVEX', bg: 'linear-gradient(135deg,#7A3DA8 0%,#5A2A82 60%,#3A1A58 100%)', fg: '#ffffff', accent: '#E8D5FF', network: 'visa', typicalRate: 55 },
  { key: 'inbursa', name: 'Inbursa', logo: 'Inbursa', bg: 'linear-gradient(135deg,#1F5BD6 0%,#003DA5 60%,#002670 100%)', fg: '#ffffff', accent: '#D2E0FF', network: 'mastercard', typicalRate: 48 },
  { key: 'banregio', name: 'Banregio', logo: 'banregio', bg: 'linear-gradient(135deg,#FFA94D 0%,#F7941D 60%,#B86A0E 100%)', fg: '#1E1200', accent: '#FFF0DD', network: 'mastercard', typicalRate: 55 },
  { key: 'afirme', name: 'Afirme', logo: 'Afirme', bg: 'linear-gradient(135deg,#0E9B64 0%,#00754A 60%,#004A2F 100%)', fg: '#ffffff', accent: '#D4F5E6', network: 'visa', typicalRate: 55 },
  { key: 'otro', name: 'Otro banco', logo: 'TARJETA', bg: 'linear-gradient(135deg,#6B7280 0%,#4B5563 60%,#1F2937 100%)', fg: '#ffffff', accent: '#E5E7EB', network: 'visa', typicalRate: 60 },
];

export const ISSUER_MAP: Record<string, Issuer> = Object.fromEntries(ISSUERS.map((i) => [i.key, i]));

export function getIssuer(key: string): Issuer {
  return ISSUER_MAP[key] ?? ISSUER_MAP.otro;
}

export const NETWORK_LABELS: Record<CardNetwork, string> = {
  visa: 'VISA',
  mastercard: 'Mastercard',
  amex: 'AMEX',
  carnet: 'Carnet',
};

/** Gradiente para tarjetas "otro" con color personalizado */
export function customGradient(hex: string): string {
  return `linear-gradient(135deg, ${hex} 0%, ${shade(hex, -0.25)} 60%, ${shade(hex, -0.5)} 100%)`;
}

export function shade(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const adj = (c: number) => {
    const v = amount < 0 ? c * (1 + amount) : c + (255 - c) * amount;
    return Math.max(0, Math.min(255, Math.round(v)));
  };
  return `#${[adj(r), adj(g), adj(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** Color de texto legible sobre un fondo hex */
export function readableOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#111111' : '#ffffff';
}
