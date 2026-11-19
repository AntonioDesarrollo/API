import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { ingredientesBase } from '../data/ingredientes';
import { recetasBase } from '../data/recetas';
import type { Estado } from '../types';

const CLAVE = 'plato-listo:estado';
const VERSION = 1;

export function estadoInicial(): Estado {
  return {
    version: VERSION,
    perfil: {
      presupuestoSemanal: 900,
      personas: 1,
      kcalDiarias: 2000,
      proteinaDiaria: 110,
      restricciones: [],
      utensilios: ['estufa', 'horno', 'microondas', 'licuadora'],
      incluirColacion: true,
      moneda: 'MXN',
    },
    ingredientes: ingredientesBase,
    recetas: recetasBase,
    favoritas: [],
    vetadas: [],
    plan: null,
    gastos: [],
  };
}

/** Valida lo mínimo y rellena campos faltantes (por si el respaldo es de otra versión). */
export function normalizar(datos: unknown): Estado {
  const base = estadoInicial();
  if (!datos || typeof datos !== 'object') return base;
  const d = datos as Partial<Estado>;
  return {
    version: VERSION,
    perfil: { ...base.perfil, ...(d.perfil ?? {}) },
    ingredientes: Array.isArray(d.ingredientes) && d.ingredientes.length ? d.ingredientes : base.ingredientes,
    recetas: Array.isArray(d.recetas) && d.recetas.length ? d.recetas : base.recetas,
    favoritas: Array.isArray(d.favoritas) ? d.favoritas : [],
    vetadas: Array.isArray(d.vetadas) ? d.vetadas : [],
    plan: d.plan ?? null,
    gastos: Array.isArray(d.gastos) ? d.gastos : [],
  };
}

export function cargarLocal(): Estado | null {
  try {
    const txt = localStorage.getItem(CLAVE);
    return txt ? normalizar(JSON.parse(txt)) : null;
  } catch {
    return null;
  }
}

/** En el teléfono también guarda una copia en las preferencias nativas de Android. */
export async function cargarNativo(): Promise<Estado | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { value } = await Preferences.get({ key: CLAVE });
    return value ? normalizar(JSON.parse(value)) : null;
  } catch {
    return null;
  }
}

export function guardar(estado: Estado): void {
  const txt = JSON.stringify(estado);
  try {
    localStorage.setItem(CLAVE, txt);
  } catch {
    /* almacenamiento no disponible */
  }
  if (Capacitor.isNativePlatform()) void Preferences.set({ key: CLAVE, value: txt });
}
