import { useState } from 'react';
import { nuevoId, useEstado } from '../estado';
import { mapaIngredientes, nutricionReceta } from '../lib/calculos';
import { nombreTiempo, nombreUtensilio, TIEMPOS } from '../lib/etiquetas';
import type { IngredienteReceta, Receta, Tiempo, Utensilio } from '../types';
import { Campo, Chips, Hoja, Icono, NumeroInput } from './ui';

const UTENSILIOS = Object.keys(nombreUtensilio) as Utensilio[];

export function EditorReceta({ receta, onCerrar }: { receta?: Receta; onCerrar: () => void }) {
  const { estado, actualizar } = useEstado();
  const [nombre, setNombre] = useState(receta?.nombre ?? '');
  const [tiempos, setTiempos] = useState<Tiempo[]>(receta?.tiempos ?? ['comida']);
  const [utensilios, setUtensilios] = useState<Utensilio[]>(receta?.utensilios ?? ['estufa']);
  const [minutos, setMinutos] = useState(receta?.minutos ?? 20);
  const [ingredientes, setIngredientes] = useState<IngredienteReceta[]>(receta?.ingredientes ?? []);
  const [pasos, setPasos] = useState((receta?.pasos ?? []).join('\n'));
  const [error, setError] = useState('');

  const ordenados = [...estado.ingredientes].sort((a, b) => a.nombre.localeCompare(b.nombre));
  const borrador: Receta = { id: receta?.id ?? '', nombre, tiempos, utensilios, minutos, ingredientes, pasos: [] };
  const n = nutricionReceta(borrador, mapaIngredientes(estado.ingredientes));

  const guardar = () => {
    if (!nombre.trim()) return setError('Ponle un nombre.');
    if (!tiempos.length) return setError('Elige al menos un tiempo de comida.');
    if (!ingredientes.length) return setError('Agrega al menos un ingrediente.');
    const final: Receta = {
      ...borrador,
      id: receta?.id ?? nuevoId('rec'),
      nombre: nombre.trim(),
      ingredientes: ingredientes.filter((x) => x.gramos > 0),
      pasos: pasos.split('\n').map((p) => p.trim()).filter(Boolean),
      personalizada: true,
    };
    actualizar((e) => ({
      ...e,
      recetas: receta ? e.recetas.map((r) => (r.id === receta.id ? final : r)) : [...e.recetas, final],
    }));
    onCerrar();
  };

  return (
    <Hoja titulo={receta ? 'Editar receta' : 'Nueva receta'} onCerrar={onCerrar}>
      <Campo etiqueta="Nombre">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Enchiladas verdes" />
      </Campo>
      <Campo etiqueta="¿Para cuándo sirve?">
        <Chips opciones={TIEMPOS} seleccion={tiempos} nombres={nombreTiempo} onCambio={setTiempos} />
      </Campo>
      <Campo etiqueta="Utensilios necesarios">
        <Chips opciones={UTENSILIOS} seleccion={utensilios} nombres={nombreUtensilio} onCambio={setUtensilios} />
      </Campo>
      <Campo etiqueta="Minutos de preparación">
        <NumeroInput valor={minutos} onCambio={setMinutos} />
      </Campo>

      <h3>Ingredientes (gramos por 1 porción)</h3>
      {ingredientes.map((ri, idx) => (
        <div key={idx} className="fila-ing">
          <select value={ri.ingredienteId} onChange={(e) => setIngredientes((l) => l.map((x, i) => (i === idx ? { ...x, ingredienteId: e.target.value } : x)))}>
            {ordenados.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
          <NumeroInput valor={ri.gramos} onCambio={(g) => setIngredientes((l) => l.map((x, i) => (i === idx ? { ...x, gramos: g } : x)))} />
          <button className="btn-icono" onClick={() => setIngredientes((l) => l.filter((_, i) => i !== idx))} aria-label="Quitar">
            <Icono nombre="basura" size={18} />
          </button>
        </div>
      ))}
      <button className="btn" onClick={() => setIngredientes((l) => [...l, { ingredienteId: ordenados[0].id, gramos: 100 }])}>
        <Icono nombre="mas" size={18} /> Agregar ingrediente
      </button>
      <p className="nota">Por porción: {Math.round(n.kcal)} kcal · {Math.round(n.proteina)} g proteína</p>

      <Campo etiqueta="Pasos (uno por línea)">
        <textarea rows={5} value={pasos} onChange={(e) => setPasos(e.target.value)} />
      </Campo>

      {error && <p className="error">{error}</p>}
      <button className="btn btn-primario btn-ancho" onClick={guardar}>Guardar receta</button>
    </Hoja>
  );
}
