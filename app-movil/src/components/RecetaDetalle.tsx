import { useState } from 'react';
import { useEstado } from '../estado';
import { deGramos, dinero, formatoGramos, mapaIngredientes, nutricionReceta } from '../lib/calculos';
import { nombreTiempo, nombreUtensilio } from '../lib/etiquetas';
import type { Receta } from '../types';
import { EditorReceta } from './EditorReceta';
import { Hoja, Icono } from './ui';

interface Props {
  receta: Receta;
  /** porción por persona (viene del plan); si no, 1 */
  factor?: number;
  onCerrar: () => void;
}

export function RecetaDetalle({ receta, factor = 1, onCerrar }: Props) {
  const { estado, actualizar } = useEstado();
  const [editando, setEditando] = useState(false);
  const [personas, setPersonas] = useState(estado.perfil.personas);
  const mapa = mapaIngredientes(estado.ingredientes);
  const porPersona = nutricionReceta(receta, mapa, factor);
  const esFav = estado.favoritas.includes(receta.id);
  const esVetada = estado.vetadas.includes(receta.id);
  const mult = factor * personas;

  const alternar = (lista: 'favoritas' | 'vetadas') =>
    actualizar((e) => ({
      ...e,
      [lista]: e[lista].includes(receta.id) ? e[lista].filter((x) => x !== receta.id) : [...e[lista], receta.id],
    }));

  const eliminar = () => {
    if (!confirm(`¿Eliminar "${receta.nombre}"?`)) return;
    actualizar((e) => ({ ...e, recetas: e.recetas.filter((r) => r.id !== receta.id) }));
    onCerrar();
  };

  if (editando) return <EditorReceta receta={receta} onCerrar={() => setEditando(false)} />;

  return (
    <Hoja
      titulo={receta.nombre}
      onCerrar={onCerrar}
      acciones={
        <button className="btn-icono" onClick={() => setEditando(true)} aria-label="Editar">
          <Icono nombre="editar" />
        </button>
      }
    >
      <div className="etiquetas">
        {receta.tiempos.map((t) => <span key={t} className="tag">{nombreTiempo[t]}</span>)}
        {receta.utensilios.map((u) => <span key={u} className="tag tag-gris">{nombreUtensilio[u]}</span>)}
        <span className="tag tag-gris">{receta.minutos} min</span>
      </div>

      <div className="tarjeta macros">
        <div><b>{Math.round(porPersona.kcal)}</b><span>kcal</span></div>
        <div><b>{Math.round(porPersona.proteina)} g</b><span>proteína</span></div>
        <div><b>{Math.round(porPersona.carbohidratos)} g</b><span>carbs</span></div>
        <div><b>{Math.round(porPersona.grasa)} g</b><span>grasa</span></div>
      </div>
      <p className="nota">Por persona{factor !== 1 ? ` (porción ×${factor.toFixed(2)} ajustada a tu meta)` : ''}. Costo por persona: {dinero(porPersona.costo, estado.perfil.moneda)}</p>

      <div className="fila-entre">
        <h3>Ingredientes</h3>
        <div className="contador">
          <button onClick={() => setPersonas((p) => Math.max(1, p - 1))}>−</button>
          <span>{personas} pers.</span>
          <button onClick={() => setPersonas((p) => p + 1)}>+</button>
        </div>
      </div>
      <ul className="lista">
        {receta.ingredientes.map((ri) => {
          const ing = mapa.get(ri.ingredienteId);
          if (!ing) return null;
          const g = ri.gramos * mult;
          const n = deGramos(ing, g);
          return (
            <li key={ri.ingredienteId} className="item">
              <div className="crece">
                <div>{ing.nombre}</div>
                <div className="sub">{Math.round(n.kcal)} kcal · {n.proteina.toFixed(1)} g prot · {dinero(n.costo, estado.perfil.moneda)}</div>
              </div>
              <b>{formatoGramos(g)}</b>
            </li>
          );
        })}
      </ul>

      <h3>Preparación</h3>
      <ol className="pasos">
        {receta.pasos.map((p, i) => <li key={i}>{p}</li>)}
      </ol>

      <div className="botones">
        <button className={`btn ${esFav ? 'btn-primario' : ''}`} onClick={() => alternar('favoritas')}>
          <Icono nombre="estrella" relleno={esFav} size={18} /> {esFav ? 'Favorita' : 'Marcar favorita'}
        </button>
        <button className={`btn ${esVetada ? 'btn-peligro' : ''}`} onClick={() => alternar('vetadas')}>
          <Icono nombre="no" size={18} /> {esVetada ? 'Excluida del plan' : 'No me gusta'}
        </button>
        <button className="btn btn-texto-peligro" onClick={eliminar}>
          <Icono nombre="basura" size={18} /> Eliminar receta
        </button>
      </div>
    </Hoja>
  );
}
