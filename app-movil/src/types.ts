// Modelos de datos de la app (equivalente a tus clases/DTOs en C#)

export type Tiempo = 'desayuno' | 'comida' | 'cena' | 'colacion';

export type Etiqueta = 'carne' | 'cerdo' | 'pescado' | 'lacteo' | 'huevo' | 'gluten';

export type Utensilio = 'estufa' | 'horno' | 'microondas' | 'licuadora' | 'freidora' | 'olla_presion';

export type Restriccion =
  | 'vegetariano'
  | 'vegano'
  | 'sin_gluten'
  | 'sin_lacteos'
  | 'sin_cerdo'
  | 'sin_pescado'
  | 'sin_huevo';

export type Categoria =
  | 'Frutas y verduras'
  | 'Carnes y pescados'
  | 'Lácteos y huevo'
  | 'Abarrotes'
  | 'Panadería y tortillería';

/** Valores nutricionales por 100 g (referencia USDA FoodData Central) y precio por kg. */
export interface Ingrediente {
  id: string;
  nombre: string;
  categoria: Categoria;
  kcal: number;
  proteina: number;
  carbohidratos: number;
  grasa: number;
  precioKg: number;
  etiquetas: Etiqueta[];
}

export interface IngredienteReceta {
  ingredienteId: string;
  /** gramos para 1 porción */
  gramos: number;
}

export interface Receta {
  id: string;
  nombre: string;
  tiempos: Tiempo[];
  utensilios: Utensilio[];
  minutos: number;
  ingredientes: IngredienteReceta[];
  pasos: string[];
  personalizada?: boolean;
}

export interface Perfil {
  presupuestoSemanal: number;
  personas: number;
  kcalDiarias: number;
  proteinaDiaria: number;
  restricciones: Restriccion[];
  utensilios: Utensilio[];
  incluirColacion: boolean;
  moneda: string;
}

export interface ComidaPlan {
  recetaId: string;
  /** multiplicador de porción por persona (ajusta gramos a tu meta de calorías) */
  factor: number;
  bloqueada?: boolean;
}

export interface DiaPlan {
  desayuno: ComidaPlan | null;
  comida: ComidaPlan | null;
  cena: ComidaPlan | null;
  colacion: ComidaPlan | null;
}

export interface PlanSemanal {
  creado: string;
  dias: DiaPlan[]; // 7 días, lunes a domingo
  comprados: string[]; // ids de ingredientes marcados en la lista
}

export interface Gasto {
  id: string;
  fecha: string; // yyyy-mm-dd
  tienda: string;
  monto: number;
  nota?: string;
}

export interface Estado {
  version: number;
  perfil: Perfil;
  ingredientes: Ingrediente[];
  recetas: Receta[];
  favoritas: string[];
  vetadas: string[];
  plan: PlanSemanal | null;
  gastos: Gasto[];
}
