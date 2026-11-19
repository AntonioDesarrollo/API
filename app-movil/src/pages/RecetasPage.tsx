import { useState } from 'react';
import { EditorReceta } from '../components/EditorReceta';
import { RecetaDetalle } from '../components/RecetaDetalle';
import { Icono } from '../components/ui';
import { useEstado } from '../estado';
import { dinero, mapaIngredientes, nutricionReceta } from '../lib/calculos';
import { nombreTiempo, TIEMPOS } from '../lib/etiquetas';
import { recetasPermitidas } from '../lib/generador';
import type { Receta, Tiempo } from '../types';

export function RecetasPage() {
  const { estado } = useEstado();
  const [busca, setBusca] = useState('');
  const [tiempo, setTiempo] = useState<Tiempo | 'todas'>('todas');
  const [abierta, setAbierta] = useState<string | null>(null);
  const [nueva, setNueva] = useState(false);

  const mapa = mapaIngredientes(estado.ingredientes);
  const permitidas = new Set(recetasPermitidas(estado).map((r) => r.id));
  const fav = new Set(estado.favoritas);
  const q = busca.trim().toLowerCase();

  const lista = estado.recetas
    .filter((r) => tiempo === 'todas' || r.tiempos.includes(tiempo))
    .filter((r) => !q || r.nombre.toLowerCase().includes(q))
    .sort((a, b) => Number(fav.has(b.id)) - Number(fav.has(a.id)) || a.nombre.localeCompare(b.nombre));

  const recetaAbierta: Receta | undefined = estado.recetas.find((r) => r.id === abierta);

  return (
    <div className="pagina">
      <div className="fila-entre">
        <h1>Recetas</h1>
        <button className="btn btn-primario" onClick={() => setNueva(true)}>
          <Icono nombre="mas" size={18} /> Nueva
        </button>
      </div>
      <input className="buscador" placeholder="Buscar receta…" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <div className="chips">
        {(['todas', ...TIEMPOS] as const).map((t) => (
          <button key={t} className={`chip ${tiempo === t ? 'activo' : ''}`} onClick={() => setTiempo(t)}>
            {t === 'todas' ? 'Todas' : nombreTiempo[t]}
          </button>
        ))}
      </div>

      <ul className="lista tarjeta">
        {lista.map((r) => {
          const n = nutricionReceta(r, mapa);
          const ok = permitidas.has(r.id);
          return (
            <li key={r.id} className={`item clic ${ok ? '' : 'apagada'}`} onClick={() => setAbierta(r.id)}>
              <div className="crece">
                <div>
                  {fav.has(r.id) && <span className="estrella"><Icono nombre="estrella" relleno size={14} /></span>} {r.nombre}
                </div>
                <div className="sub">
                  {Math.round(n.kcal)} kcal · {Math.round(n.proteina)} g prot · {dinero(n.costo, estado.perfil.moneda)} · {r.minutos} min
                  {!ok && ' · fuera de tus filtros'}
                </div>
              </div>
            </li>
          );
        })}
        {!lista.length && <li className="item">No hay recetas con ese filtro.</li>}
      </ul>
      <p className="nota centrado">{estado.recetas.length} recetas · {permitidas.size} cumplen tu perfil. Valores por 1 porción.</p>

      {recetaAbierta && <RecetaDetalle receta={recetaAbierta} onCerrar={() => setAbierta(null)} />}
      {nueva && <EditorReceta onCerrar={() => setNueva(false)} />}
    </div>
  );
}
