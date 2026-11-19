import { useEstado } from '../estado';
import { dinero, formatoGramos, listaCompras } from '../lib/calculos';
import type { Categoria } from '../types';

const ORDEN: Categoria[] = ['Frutas y verduras', 'Carnes y pescados', 'Lácteos y huevo', 'Panadería y tortillería', 'Abarrotes'];

export function ComprasPage() {
  const { estado, actualizar } = useEstado();
  const { plan, perfil } = estado;

  if (!plan) {
    return (
      <div className="pagina">
        <h1>Lista de compras</h1>
        <div className="tarjeta"><p>Primero genera tu semana en la pestaña Plan.</p></div>
      </div>
    );
  }

  const lista = listaCompras(estado);
  const comprados = new Set(plan.comprados);
  let total = 0;
  let pendiente = 0;
  for (const arts of lista.values())
    for (const a of arts) {
      total += a.costo;
      if (!comprados.has(a.ingrediente.id)) pendiente += a.costo;
    }

  const alternar = (id: string) =>
    actualizar((e) =>
      e.plan
        ? { ...e, plan: { ...e.plan, comprados: e.plan.comprados.includes(id) ? e.plan.comprados.filter((x) => x !== id) : [...e.plan.comprados, id] } }
        : e,
    );

  return (
    <div className="pagina">
      <h1>Lista de compras</h1>
      <div className="tarjeta">
        <div className="fila-entre"><span>Total estimado</span><b>{dinero(total, perfil.moneda)}</b></div>
        <div className="fila-entre"><span>Falta por comprar</span><b>{dinero(pendiente, perfil.moneda)}</b></div>
        <div className="fila-entre"><span>Presupuesto</span><b>{dinero(perfil.presupuestoSemanal, perfil.moneda)}</b></div>
        <p className="nota">Para {perfil.personas} persona(s), 7 días. Costos con tus precios por kg (edítalos en Ajustes). Marca lo que ya tienes o ya compraste.</p>
      </div>

      {ORDEN.filter((c) => lista.has(c)).map((cat) => (
        <section key={cat}>
          <h3>{cat}</h3>
          <ul className="lista tarjeta">
            {lista.get(cat)!.map((a) => {
              const hecho = comprados.has(a.ingrediente.id);
              return (
                <li key={a.ingrediente.id} className={`item check ${hecho ? 'hecho' : ''}`} onClick={() => alternar(a.ingrediente.id)}>
                  <input type="checkbox" checked={hecho} readOnly aria-label={a.ingrediente.nombre} />
                  <span className="crece">{a.ingrediente.nombre}</span>
                  <span className="cant">{formatoGramos(a.gramos)}</span>
                  <span className="precio">{dinero(a.costo, perfil.moneda)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
