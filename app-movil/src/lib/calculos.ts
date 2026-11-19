import type { Categoria, ComidaPlan, DiaPlan, Estado, Ingrediente, Receta } from '../types';
import { TIEMPOS } from './etiquetas';

export interface Nutricion {
  kcal: number;
  proteina: number;
  carbohidratos: number;
  grasa: number;
  costo: number;
}

export const vacia = (): Nutricion => ({ kcal: 0, proteina: 0, carbohidratos: 0, grasa: 0, costo: 0 });

export const sumar = (a: Nutricion, b: Nutricion): Nutricion => ({
  kcal: a.kcal + b.kcal,
  proteina: a.proteina + b.proteina,
  carbohidratos: a.carbohidratos + b.carbohidratos,
  grasa: a.grasa + b.grasa,
  costo: a.costo + b.costo,
});

export type MapaIngredientes = Map<string, Ingrediente>;

export const mapaIngredientes = (ingredientes: Ingrediente[]): MapaIngredientes =>
  new Map(ingredientes.map((x) => [x.id, x]));

/** Nutrición y costo de un ingrediente para cierta cantidad de gramos. */
export function deGramos(ing: Ingrediente, gramos: number): Nutricion {
  const f = gramos / 100;
  return {
    kcal: ing.kcal * f,
    proteina: ing.proteina * f,
    carbohidratos: ing.carbohidratos * f,
    grasa: ing.grasa * f,
    costo: (ing.precioKg * gramos) / 1000,
  };
}

/** Nutrición de UNA porción de la receta multiplicada por `factor`. */
export function nutricionReceta(receta: Receta, mapa: MapaIngredientes, factor = 1): Nutricion {
  let total = vacia();
  for (const ri of receta.ingredientes) {
    const ing = mapa.get(ri.ingredienteId);
    if (ing) total = sumar(total, deGramos(ing, ri.gramos * factor));
  }
  return total;
}

export function comidasDelDia(dia: DiaPlan): ComidaPlan[] {
  return TIEMPOS.map((t) => dia[t]).filter((c): c is ComidaPlan => c !== null);
}

/** Nutrición POR PERSONA de un día. */
export function nutricionDia(dia: DiaPlan, recetas: Map<string, Receta>, mapa: MapaIngredientes): Nutricion {
  let total = vacia();
  for (const c of comidasDelDia(dia)) {
    const rec = recetas.get(c.recetaId);
    if (rec) total = sumar(total, nutricionReceta(rec, mapa, c.factor));
  }
  return total;
}

export interface Articulo {
  ingrediente: Ingrediente;
  gramos: number;
  costo: number;
}

/** Lista de compras agregada para todo el plan y todas las personas. */
export function listaCompras(estado: Estado): Map<Categoria, Articulo[]> {
  const mapa = mapaIngredientes(estado.ingredientes);
  const recetas = new Map(estado.recetas.map((r) => [r.id, r]));
  const gramos = new Map<string, number>();
  const personas = estado.perfil.personas;

  for (const dia of estado.plan?.dias ?? []) {
    for (const c of comidasDelDia(dia)) {
      const rec = recetas.get(c.recetaId);
      if (!rec) continue;
      for (const ri of rec.ingredientes) {
        gramos.set(ri.ingredienteId, (gramos.get(ri.ingredienteId) ?? 0) + ri.gramos * c.factor * personas);
      }
    }
  }

  const porCategoria = new Map<Categoria, Articulo[]>();
  for (const [id, g] of gramos) {
    const ing = mapa.get(id);
    if (!ing) continue;
    const lista = porCategoria.get(ing.categoria) ?? [];
    lista.push({ ingrediente: ing, gramos: g, costo: (ing.precioKg * g) / 1000 });
    porCategoria.set(ing.categoria, lista);
  }
  for (const lista of porCategoria.values()) lista.sort((a, b) => a.ingrediente.nombre.localeCompare(b.ingrediente.nombre));
  return porCategoria;
}

export function costoPlan(estado: Estado): number {
  let total = 0;
  for (const lista of listaCompras(estado).values()) for (const a of lista) total += a.costo;
  return total;
}

export const formatoGramos = (g: number): string =>
  g >= 1000 ? `${(g / 1000).toFixed(g >= 10000 ? 1 : 2)} kg` : `${Math.round(g)} g`;

export const dinero = (n: number, moneda = 'MXN'): string =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: moneda, maximumFractionDigits: 0 }).format(n);

export const redondeo = (n: number): number => Math.round(n);
