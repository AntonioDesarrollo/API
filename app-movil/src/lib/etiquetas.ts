import type { Etiqueta, Restriccion, Tiempo, Utensilio } from '../types';

export const TIEMPOS: Tiempo[] = ['desayuno', 'comida', 'cena', 'colacion'];

export const nombreTiempo: Record<Tiempo, string> = {
  desayuno: 'Desayuno',
  comida: 'Comida',
  cena: 'Cena',
  colacion: 'Colación',
};

export const nombreUtensilio: Record<Utensilio, string> = {
  estufa: 'Estufa',
  horno: 'Horno',
  microondas: 'Microondas',
  licuadora: 'Licuadora',
  freidora: 'Freidora de aire',
  olla_presion: 'Olla de presión',
};

export const nombreRestriccion: Record<Restriccion, string> = {
  vegetariano: 'Vegetariano',
  vegano: 'Vegano',
  sin_gluten: 'Sin gluten',
  sin_lacteos: 'Sin lácteos',
  sin_cerdo: 'Sin cerdo',
  sin_pescado: 'Sin pescado / mariscos',
  sin_huevo: 'Sin huevo',
};

/** Qué etiquetas de ingrediente prohíbe cada restricción. */
export const prohibidas: Record<Restriccion, Etiqueta[]> = {
  vegetariano: ['carne', 'cerdo', 'pescado'],
  vegano: ['carne', 'cerdo', 'pescado', 'lacteo', 'huevo'],
  sin_gluten: ['gluten'],
  sin_lacteos: ['lacteo'],
  sin_cerdo: ['cerdo'],
  sin_pescado: ['pescado'],
  sin_huevo: ['huevo'],
};

export const nombreEtiqueta: Record<Etiqueta, string> = {
  carne: 'Carne',
  cerdo: 'Cerdo',
  pescado: 'Pescado/mariscos',
  lacteo: 'Lácteo',
  huevo: 'Huevo',
  gluten: 'Gluten',
};

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
