import type { ComidaPlan, DiaPlan, Estado, PlanSemanal, Receta, Tiempo } from '../types';
import { comidasDelDia, costoPlan, mapaIngredientes, nutricionDia, nutricionReceta, type MapaIngredientes } from './calculos';
import { prohibidas, TIEMPOS } from './etiquetas';

const FACTOR_MIN = 0.7;
const FACTOR_MAX = 1.6;
const ITERACIONES = 400;

/** Recetas que respetan restricciones, utensilios y "no me gusta". */
export function recetasPermitidas(estado: Estado): Receta[] {
  const mapa = mapaIngredientes(estado.ingredientes);
  const etiquetasProhibidas = new Set(estado.perfil.restricciones.flatMap((r) => prohibidas[r]));
  const utensilios = new Set(estado.perfil.utensilios);
  const vetadas = new Set(estado.vetadas);

  return estado.recetas.filter((rec) => {
    if (vetadas.has(rec.id)) return false;
    if (!rec.utensilios.every((u) => utensilios.has(u))) return false;
    return rec.ingredientes.every((ri) => {
      const ing = mapa.get(ri.ingredienteId);
      return ing !== undefined && !ing.etiquetas.some((e) => etiquetasProhibidas.has(e));
    });
  });
}

export function tiemposActivos(estado: Estado): Tiempo[] {
  return TIEMPOS.filter((t) => t !== 'colacion' || estado.perfil.incluirColacion);
}

/**
 * Ajusta el tamaño de porción del día para acercarse a la meta de calorías.
 * Todas las comidas no bloqueadas del día usan el mismo factor.
 */
export function ajustarFactores(dia: DiaPlan, estado: Estado, recetas: Map<string, Receta>, mapa: MapaIngredientes): DiaPlan {
  let kcalFijas = 0;
  let kcalBase = 0;
  for (const t of TIEMPOS) {
    const c = dia[t];
    if (!c) continue;
    const rec = recetas.get(c.recetaId);
    if (!rec) continue;
    if (c.bloqueada) kcalFijas += nutricionReceta(rec, mapa, c.factor).kcal;
    else kcalBase += nutricionReceta(rec, mapa, 1).kcal;
  }
  if (kcalBase === 0) return dia;
  const objetivo = Math.max(0, estado.perfil.kcalDiarias - kcalFijas);
  const f = Math.min(FACTOR_MAX, Math.max(FACTOR_MIN, objetivo / kcalBase));
  const factor = Math.round(f * 20) / 20; // múltiplos de 0.05
  const nuevo = { ...dia };
  for (const t of TIEMPOS) {
    const c = nuevo[t];
    if (c && !c.bloqueada) nuevo[t] = { ...c, factor };
  }
  return nuevo;
}

const azar = <T,>(lista: T[]): T => lista[Math.floor(Math.random() * lista.length)];

function elegir(candidatas: Receta[], usos: Map<string, number>, favoritas: Set<string>, maxUsos: number): Receta {
  const disponibles = candidatas.filter((r) => (usos.get(r.id) ?? 0) < maxUsos);
  const pool = disponibles.length ? disponibles : candidatas;
  // las favoritas cuentan doble
  const ponderado = pool.flatMap((r) => (favoritas.has(r.id) ? [r, r] : [r]));
  return azar(ponderado);
}

function puntuar(estado: Estado, dias: DiaPlan[], recetas: Map<string, Receta>, mapa: MapaIngredientes): number {
  const { presupuestoSemanal, proteinaDiaria, kcalDiarias } = estado.perfil;
  const costo = costoPlan({ ...estado, plan: { creado: '', dias, comprados: [] } });
  let score = 0;
  if (presupuestoSemanal > 0) {
    score += Math.max(0, costo - presupuestoSemanal) / presupuestoSemanal * 300; // pasarse del presupuesto pesa mucho
    score += (costo / presupuestoSemanal) * 10; // preferir lo más barato
  }
  for (const d of dias) {
    const n = nutricionDia(d, recetas, mapa);
    if (proteinaDiaria > 0) score += Math.max(0, proteinaDiaria - n.proteina) / proteinaDiaria * 40;
    if (kcalDiarias > 0) score += Math.abs(kcalDiarias - n.kcal) / kcalDiarias * 20;
  }
  return score;
}

/** Genera el plan semanal probando muchas combinaciones y quedándose con la mejor. */
export function generarPlan(estado: Estado): PlanSemanal {
  const mapa = mapaIngredientes(estado.ingredientes);
  const recetasMap = new Map(estado.recetas.map((r) => [r.id, r]));
  const permitidas = recetasPermitidas(estado);
  const favoritas = new Set(estado.favoritas);
  const activos = tiemposActivos(estado);
  const previo = estado.plan;

  const porTiempo = new Map<Tiempo, Receta[]>(
    TIEMPOS.map((t) => [t, permitidas.filter((r) => r.tiempos.includes(t))]),
  );

  let mejor: DiaPlan[] | null = null;
  let mejorScore = Infinity;

  for (let it = 0; it < ITERACIONES; it++) {
    const usos = new Map<string, number>();
    // contar las bloqueadas primero
    previo?.dias.forEach((d) => comidasDelDia(d).filter((c) => c.bloqueada).forEach((c) => usos.set(c.recetaId, (usos.get(c.recetaId) ?? 0) + 1)));

    const dias: DiaPlan[] = [];
    for (let d = 0; d < 7; d++) {
      const dia: DiaPlan = { desayuno: null, comida: null, cena: null, colacion: null };
      for (const t of activos) {
        const bloqueada = previo?.dias[d]?.[t];
        if (bloqueada?.bloqueada) {
          dia[t] = bloqueada;
          continue;
        }
        const candidatas = porTiempo.get(t) ?? [];
        if (!candidatas.length) continue;
        const rec = elegir(candidatas, usos, favoritas, t === 'colacion' ? 3 : 2);
        usos.set(rec.id, (usos.get(rec.id) ?? 0) + 1);
        dia[t] = { recetaId: rec.id, factor: 1 };
      }
      dias.push(ajustarFactores(dia, estado, recetasMap, mapa));
    }

    const score = puntuar(estado, dias, recetasMap, mapa);
    if (score < mejorScore) {
      mejorScore = score;
      mejor = dias;
    }
  }

  return { creado: new Date().toISOString(), dias: mejor ?? [], comprados: [] };
}

/** Cambia una sola comida por otra opción permitida distinta. */
export function cambiarComida(estado: Estado, diaIdx: number, tiempo: Tiempo): PlanSemanal | null {
  if (!estado.plan) return null;
  const mapa = mapaIngredientes(estado.ingredientes);
  const recetasMap = new Map(estado.recetas.map((r) => [r.id, r]));
  const actual = estado.plan.dias[diaIdx][tiempo];
  const usadas = new Set(estado.plan.dias.flatMap((d) => comidasDelDia(d).map((c) => c.recetaId)));
  const candidatas = recetasPermitidas(estado).filter((r) => r.tiempos.includes(tiempo) && r.id !== actual?.recetaId);
  if (!candidatas.length) return null;
  const nuevas = candidatas.filter((r) => !usadas.has(r.id));
  const rec = azar(nuevas.length ? nuevas : candidatas);

  const dias = estado.plan.dias.map((d, i) => {
    if (i !== diaIdx) return d;
    const dia: DiaPlan = { ...d, [tiempo]: { recetaId: rec.id, factor: 1 } as ComidaPlan };
    return ajustarFactores(dia, estado, recetasMap, mapa);
  });
  return { ...estado.plan, dias };
}
