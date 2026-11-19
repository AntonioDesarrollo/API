import { useState } from 'react';
import { RecetaDetalle } from '../components/RecetaDetalle';
import { Barra, Icono } from '../components/ui';
import { useEstado } from '../estado';
import { costoPlan, dinero, mapaIngredientes, nutricionDia, nutricionReceta } from '../lib/calculos';
import { DIAS, nombreTiempo } from '../lib/etiquetas';
import { cambiarComida, generarPlan, recetasPermitidas, tiemposActivos } from '../lib/generador';
import type { Receta, Tiempo } from '../types';

const hoyIdx = () => (new Date().getDay() + 6) % 7; // lunes = 0

export function PlanPage({ irAjustes }: { irAjustes: () => void }) {
  const { estado, actualizar } = useEstado();
  const [dia, setDia] = useState(hoyIdx);
  const [abierta, setAbierta] = useState<{ receta: Receta; factor: number } | null>(null);
  const [generando, setGenerando] = useState(false);

  const { perfil, plan } = estado;
  const mapa = mapaIngredientes(estado.ingredientes);
  const recetas = new Map(estado.recetas.map((r) => [r.id, r]));
  const permitidas = recetasPermitidas(estado);

  const generar = () => {
    setGenerando(true);
    // setTimeout para que se pinte el "Generando..." antes del cálculo
    setTimeout(() => {
      actualizar((e) => ({ ...e, plan: generarPlan(e) }));
      setGenerando(false);
    }, 30);
  };

  if (!plan) {
    return (
      <div className="pagina">
        <h1>Tu semana</h1>
        <div className="tarjeta bienvenida">
          <h2>Arma tu menú semanal</h2>
          <p>Genero 7 días de comidas según tu presupuesto, número de personas, restricciones y utensilios. Calculo calorías, proteína y la lista de compras con costo estimado.</p>
          <ul className="resumen-perfil">
            <li>Presupuesto: <b>{dinero(perfil.presupuestoSemanal, perfil.moneda)}</b> / semana</li>
            <li>Personas: <b>{perfil.personas}</b></li>
            <li>Meta diaria: <b>{perfil.kcalDiarias} kcal · {perfil.proteinaDiaria} g proteína</b></li>
            <li>Recetas disponibles con tus filtros: <b>{permitidas.length}</b></li>
          </ul>
          <div className="botones">
            <button className="btn btn-primario" onClick={generar} disabled={generando}>
              {generando ? 'Generando…' : 'Generar mi semana'}
            </button>
            <button className="btn" onClick={irAjustes}>Ajustar mi perfil</button>
          </div>
        </div>
      </div>
    );
  }

  const costo = costoPlan(estado);
  const diaPlan = plan.dias[dia];
  const nDia = nutricionDia(diaPlan, recetas, mapa);
  const sobrePresupuesto = perfil.presupuestoSemanal > 0 && costo > perfil.presupuestoSemanal;
  const pocas = tiemposActivos(estado).filter((t) => permitidas.filter((r) => r.tiempos.includes(t)).length < 4);

  const alternarBloqueo = (t: Tiempo) =>
    actualizar((e) => {
      if (!e.plan) return e;
      const dias = e.plan.dias.map((d, i) => {
        const c = d[t];
        return i === dia && c ? { ...d, [t]: { ...c, bloqueada: !c.bloqueada } } : d;
      });
      return { ...e, plan: { ...e.plan, dias } };
    });

  const cambiar = (t: Tiempo) =>
    actualizar((e) => {
      const nuevo = cambiarComida(e, dia, t);
      return nuevo ? { ...e, plan: nuevo } : e;
    });

  return (
    <div className="pagina">
      <h1>Tu semana</h1>

      <div className="tarjeta">
        <div className="fila-entre">
          <span>Costo estimado de la semana</span>
          <b className={sobrePresupuesto ? 'alerta' : 'ok'}>{dinero(costo, perfil.moneda)}</b>
        </div>
        <Barra valor={costo} meta={perfil.presupuestoSemanal} etiqueta="Presupuesto" unidad={perfil.moneda} />
        {sobrePresupuesto && <p className="nota alerta">Te pasas del presupuesto. Prueba regenerar, cambiar comidas caras o ajustar precios.</p>}
        {pocas.length > 0 && (
          <p className="nota alerta">
            Pocas recetas para {pocas.map((t) => nombreTiempo[t].toLowerCase()).join(', ')} con tus filtros, por eso se repiten. Agrega recetas o utensilios.
          </p>
        )}
      </div>

      <div className="dias" role="tablist">
        {DIAS.map((d, i) => (
          <button key={d} role="tab" aria-selected={i === dia} className={`dia ${i === dia ? 'activo' : ''}`} onClick={() => setDia(i)}>
            {d.slice(0, 2)}
          </button>
        ))}
      </div>

      <div className="tarjeta">
        <h3 className="sin-margen">{DIAS[dia]}</h3>
        <Barra valor={nDia.kcal} meta={perfil.kcalDiarias} etiqueta="Calorías" unidad="kcal" />
        <Barra valor={nDia.proteina} meta={perfil.proteinaDiaria} etiqueta="Proteína" unidad="g" />
        <p className="nota">Por persona · Carbs {Math.round(nDia.carbohidratos)} g · Grasa {Math.round(nDia.grasa)} g</p>
      </div>

      {tiemposActivos(estado).map((t) => {
        const c = diaPlan[t];
        const rec = c ? recetas.get(c.recetaId) : undefined;
        if (!c || !rec) {
          return (
            <div key={t} className="tarjeta comida vacia">
              <span className="tiempo">{nombreTiempo[t]}</span>
              <p>Sin recetas que cumplan tus filtros para este tiempo.</p>
            </div>
          );
        }
        const n = nutricionReceta(rec, mapa, c.factor);
        return (
          <div key={t} className={`tarjeta comida ${c.bloqueada ? 'bloqueada' : ''}`}>
            <button className="comida-info" onClick={() => setAbierta({ receta: rec, factor: c.factor })}>
              <span className="tiempo">{nombreTiempo[t]}</span>
              <span className="comida-nombre">{rec.nombre}</span>
              <span className="sub">
                {Math.round(n.kcal)} kcal · {Math.round(n.proteina)} g prot · porción ×{c.factor.toFixed(2)} · {dinero(n.costo * perfil.personas, perfil.moneda)}
              </span>
            </button>
            <div className="comida-acciones">
              <button className="btn-icono" onClick={() => alternarBloqueo(t)} aria-label={c.bloqueada ? 'Desbloquear' : 'Bloquear'}>
                <Icono nombre={c.bloqueada ? 'candado' : 'abierto'} size={20} />
              </button>
              <button className="btn-icono" onClick={() => cambiar(t)} disabled={c.bloqueada} aria-label="Cambiar comida">
                <Icono nombre="cambiar" size={20} />
              </button>
            </div>
          </div>
        );
      })}

      <button className="btn btn-primario btn-ancho" onClick={generar} disabled={generando}>
        {generando ? 'Generando…' : 'Regenerar semana (respeta las bloqueadas)'}
      </button>
      <p className="nota centrado">Toca una comida para ver gramos exactos y preparación.</p>

      {abierta && <RecetaDetalle receta={abierta.receta} factor={abierta.factor} onCerrar={() => setAbierta(null)} />}
    </div>
  );
}
