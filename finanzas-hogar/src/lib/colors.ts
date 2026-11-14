import type { ExpenseCategory } from './types';

/** Colores fijos por categoría (orden fijo, nunca cíclico). */
export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  comida: '#ff9500',
  super: '#34c759',
  renta: '#5856d6',
  servicios: '#ffcc00',
  transporte: '#007aff',
  salud: '#ff2d55',
  educacion: '#af52de',
  hijos: '#5ac8fa',
  hogar: '#a2845e',
  entretenimiento: '#ff3b30',
  suscripciones: '#00c7be',
  ropa: '#ff6482',
  mascotas: '#8e8e93',
  regalos: '#bf5af2',
  otros: '#636366',
};

export const PLAN_COLORS = {
  needs: '#007aff',
  wants: '#ff9500',
  savings: '#34c759',
  debts: '#ff3b30',
};
