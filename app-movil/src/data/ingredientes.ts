import type { Ingrediente } from '../types';

// Nutrición por 100 g en crudo, aproximada a USDA FoodData Central.
// Precios por kg en MXN: son estimados y los puedes editar en Ajustes > Ingredientes.
const i = (
  id: string,
  nombre: string,
  categoria: Ingrediente['categoria'],
  kcal: number,
  proteina: number,
  carbohidratos: number,
  grasa: number,
  precioKg: number,
  etiquetas: Ingrediente['etiquetas'] = [],
): Ingrediente => ({ id, nombre, categoria, kcal, proteina, carbohidratos, grasa, precioKg, etiquetas });

export const ingredientesBase: Ingrediente[] = [
  // Carnes y pescados
  i('pollo_pechuga', 'Pechuga de pollo', 'Carnes y pescados', 120, 22.5, 0, 2.6, 140, ['carne']),
  i('pollo_muslo', 'Muslo de pollo sin piel', 'Carnes y pescados', 121, 19.7, 0, 4.1, 90, ['carne']),
  i('res_molida', 'Carne molida de res 90/10', 'Carnes y pescados', 176, 20, 0, 10, 170, ['carne']),
  i('res_bistec', 'Bistec de res', 'Carnes y pescados', 150, 22, 0, 6.5, 220, ['carne']),
  i('cerdo_lomo', 'Lomo de cerdo', 'Carnes y pescados', 143, 21.2, 0, 5.9, 130, ['carne', 'cerdo']),
  i('jamon', 'Jamón de pavo', 'Carnes y pescados', 124, 16, 3, 5, 150, ['carne']),
  i('atun', 'Atún en agua (lata, drenado)', 'Carnes y pescados', 116, 25.5, 0, 0.8, 180, ['pescado']),
  i('tilapia', 'Filete de tilapia', 'Carnes y pescados', 96, 20, 0, 1.7, 160, ['pescado']),
  i('camaron', 'Camarón limpio', 'Carnes y pescados', 85, 20, 0, 0.5, 280, ['pescado']),

  // Lácteos y huevo
  i('huevo', 'Huevo', 'Lácteos y huevo', 143, 12.6, 0.7, 9.5, 50, ['huevo']),
  i('leche', 'Leche entera', 'Lácteos y huevo', 61, 3.2, 4.8, 3.3, 28, ['lacteo']),
  i('yogur', 'Yogur natural', 'Lácteos y huevo', 61, 3.5, 4.7, 3.3, 50, ['lacteo']),
  i('queso_panela', 'Queso panela', 'Lácteos y huevo', 240, 20, 2, 17, 150, ['lacteo']),
  i('queso_oaxaca', 'Queso Oaxaca', 'Lácteos y huevo', 300, 22, 2.2, 22, 170, ['lacteo']),
  i('crema', 'Crema', 'Lácteos y huevo', 195, 2.7, 3.7, 19, 70, ['lacteo']),
  i('tofu', 'Tofu firme', 'Lácteos y huevo', 144, 17.3, 2.8, 8.7, 110),

  // Abarrotes
  i('frijol', 'Frijol negro (seco)', 'Abarrotes', 341, 21.6, 62.4, 1.4, 40),
  i('lenteja', 'Lenteja (seca)', 'Abarrotes', 352, 24.6, 63.4, 1.1, 45),
  i('garbanzo', 'Garbanzo (seco)', 'Abarrotes', 378, 20.5, 63, 6, 50),
  i('arroz', 'Arroz blanco (crudo)', 'Abarrotes', 365, 7.1, 80, 0.7, 32),
  i('pasta', 'Pasta seca', 'Abarrotes', 371, 13, 75, 1.5, 45, ['gluten']),
  i('avena', 'Avena en hojuelas', 'Abarrotes', 379, 13.2, 67.7, 6.5, 45),
  i('granola', 'Granola', 'Abarrotes', 471, 10, 64, 20, 110, ['gluten']),
  i('aceite', 'Aceite vegetal', 'Abarrotes', 884, 0, 0, 100, 45),
  i('cacahuate', 'Crema de cacahuate', 'Abarrotes', 588, 25, 20, 50, 120),
  i('miel', 'Miel', 'Abarrotes', 304, 0.3, 82, 0, 120),
  i('pure_tomate', 'Puré de tomate', 'Abarrotes', 38, 1.6, 9, 0.2, 40),

  // Panadería y tortillería
  i('pan_integral', 'Pan integral', 'Panadería y tortillería', 252, 12.4, 43, 3.5, 70, ['gluten']),
  i('tortilla_maiz', 'Tortilla de maíz', 'Panadería y tortillería', 218, 5.7, 44.6, 2.9, 24),
  i('tortilla_harina', 'Tortilla de harina', 'Panadería y tortillería', 304, 8, 50, 8, 60, ['gluten']),

  // Frutas y verduras
  i('papa', 'Papa', 'Frutas y verduras', 77, 2, 17, 0.1, 28),
  i('jitomate', 'Jitomate', 'Frutas y verduras', 18, 0.9, 3.9, 0.2, 30),
  i('cebolla', 'Cebolla', 'Frutas y verduras', 40, 1.1, 9.3, 0.1, 28),
  i('ajo', 'Ajo', 'Frutas y verduras', 149, 6.4, 33, 0.5, 90),
  i('chile', 'Chile serrano', 'Frutas y verduras', 32, 1.7, 6.7, 0.4, 40),
  i('calabacita', 'Calabacita', 'Frutas y verduras', 17, 1.2, 3.1, 0.3, 30),
  i('zanahoria', 'Zanahoria', 'Frutas y verduras', 41, 0.9, 9.6, 0.2, 22),
  i('brocoli', 'Brócoli', 'Frutas y verduras', 34, 2.8, 6.6, 0.4, 45),
  i('espinaca', 'Espinaca', 'Frutas y verduras', 23, 2.9, 3.6, 0.4, 50),
  i('lechuga', 'Lechuga', 'Frutas y verduras', 15, 1.4, 2.9, 0.2, 35),
  i('pepino', 'Pepino', 'Frutas y verduras', 15, 0.7, 3.6, 0.1, 25),
  i('aguacate', 'Aguacate', 'Frutas y verduras', 160, 2, 8.5, 14.7, 70),
  i('nopal', 'Nopal', 'Frutas y verduras', 16, 1.3, 3.3, 0.1, 25),
  i('elote', 'Elote (granos)', 'Frutas y verduras', 86, 3.3, 19, 1.4, 30),
  i('platano', 'Plátano', 'Frutas y verduras', 89, 1.1, 22.8, 0.3, 25),
  i('manzana', 'Manzana', 'Frutas y verduras', 52, 0.3, 13.8, 0.2, 45),
  i('papaya', 'Papaya', 'Frutas y verduras', 43, 0.5, 10.8, 0.3, 25),
  i('fresa', 'Fresa', 'Frutas y verduras', 32, 0.7, 7.7, 0.3, 70),
  i('limon', 'Limón', 'Frutas y verduras', 29, 1.1, 9.3, 0.3, 30),
];
