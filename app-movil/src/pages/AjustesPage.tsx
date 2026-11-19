import { useState } from 'react';
import { Campo, Chips, Hoja, Icono, NumeroInput } from '../components/ui';
import { nuevoId, useEstado } from '../estado';
import { estadoInicial, normalizar } from '../lib/almacen';
import { dinero } from '../lib/calculos';
import { nombreEtiqueta, nombreRestriccion, nombreUtensilio } from '../lib/etiquetas';
import type { Categoria, Etiqueta, Ingrediente, Perfil, Restriccion, Utensilio } from '../types';

const RESTRICCIONES = Object.keys(nombreRestriccion) as Restriccion[];
const UTENSILIOS = Object.keys(nombreUtensilio) as Utensilio[];
const ETIQUETAS = Object.keys(nombreEtiqueta) as Etiqueta[];
const CATEGORIAS: Categoria[] = ['Frutas y verduras', 'Carnes y pescados', 'Lácteos y huevo', 'Panadería y tortillería', 'Abarrotes'];

export function AjustesPage() {
  const { estado, actualizar, reemplazar } = useEstado();
  const [vista, setVista] = useState<'ingredientes' | 'respaldo' | null>(null);
  const p = estado.perfil;
  const set = <K extends keyof Perfil>(k: K, v: Perfil[K]) => actualizar((e) => ({ ...e, perfil: { ...e.perfil, [k]: v } }));

  return (
    <div className="pagina">
      <h1>Ajustes</h1>

      <div className="tarjeta">
        <h3 className="sin-margen">Mi perfil</h3>
        <div className="dos-col">
          <Campo etiqueta={`Presupuesto semanal (${p.moneda})`}><NumeroInput valor={p.presupuestoSemanal} onCambio={(n) => set('presupuestoSemanal', n)} paso={50} /></Campo>
          <Campo etiqueta="Personas"><NumeroInput valor={p.personas} onCambio={(n) => set('personas', Math.max(1, Math.round(n)))} min={1} /></Campo>
          <Campo etiqueta="Calorías diarias (por persona)"><NumeroInput valor={p.kcalDiarias} onCambio={(n) => set('kcalDiarias', n)} paso={50} /></Campo>
          <Campo etiqueta="Proteína diaria (g)"><NumeroInput valor={p.proteinaDiaria} onCambio={(n) => set('proteinaDiaria', n)} paso={5} /></Campo>
        </div>
        <Campo etiqueta="Moneda" ayuda="Código ISO: MXN, USD, COP…">
          <input value={p.moneda} maxLength={3} onChange={(e) => set('moneda', e.target.value.toUpperCase())} onBlur={(e) => {
            try { new Intl.NumberFormat('es', { style: 'currency', currency: e.target.value }); } catch { set('moneda', 'MXN'); }
          }} />
        </Campo>
        <Campo etiqueta="Restricciones alimentarias">
          <Chips opciones={RESTRICCIONES} seleccion={p.restricciones} nombres={nombreRestriccion} onCambio={(v) => set('restricciones', v)} />
        </Campo>
        <Campo etiqueta="Utensilios que tengo">
          <Chips opciones={UTENSILIOS} seleccion={p.utensilios} nombres={nombreUtensilio} onCambio={(v) => set('utensilios', v)} />
        </Campo>
        <label className="switch">
          <input type="checkbox" checked={p.incluirColacion} onChange={(e) => set('incluirColacion', e.target.checked)} />
          <span>Incluir colación (snack) diaria</span>
        </label>
        <p className="nota">Los cambios se aplican la próxima vez que generes la semana.</p>
      </div>

      <div className="tarjeta menu">
        <button className="item clic" onClick={() => setVista('ingredientes')}>
          <span className="crece">Ingredientes y precios</span><span className="sub">{estado.ingredientes.length}</span>
        </button>
        <button className="item clic" onClick={() => setVista('respaldo')}>
          <span className="crece">Respaldo de mis datos</span>
        </button>
        <button className="item clic texto-peligro" onClick={() => {
          if (confirm('Esto borra tu plan, gastos, recetas y precios personalizados. ¿Continuar?')) reemplazar(estadoInicial());
        }}>
          <span className="crece">Restablecer todo</span>
        </button>
      </div>
      <p className="nota centrado">Plato Listo · Nutrición por 100 g con referencia en USDA FoodData Central. Los precios son estimados.</p>

      {vista === 'ingredientes' && <Ingredientes onCerrar={() => setVista(null)} />}
      {vista === 'respaldo' && <Respaldo onCerrar={() => setVista(null)} reemplazar={reemplazar} />}
    </div>
  );
}

function Ingredientes({ onCerrar }: { onCerrar: () => void }) {
  const { estado, actualizar } = useEstado();
  const [editar, setEditar] = useState<Ingrediente | null>(null);
  const [busca, setBusca] = useState('');
  const q = busca.trim().toLowerCase();
  const lista = [...estado.ingredientes].filter((i) => !q || i.nombre.toLowerCase().includes(q)).sort((a, b) => a.nombre.localeCompare(b.nombre));

  if (editar) {
    return <EditorIngrediente ing={editar} onCerrar={() => setEditar(null)} onGuardar={(ing) => {
      actualizar((e) => ({
        ...e,
        ingredientes: e.ingredientes.some((x) => x.id === ing.id) ? e.ingredientes.map((x) => (x.id === ing.id ? ing : x)) : [...e.ingredientes, ing],
      }));
      setEditar(null);
    }} />;
  }

  return (
    <Hoja titulo="Ingredientes y precios" onCerrar={onCerrar} acciones={
      <button className="btn-icono" aria-label="Nuevo ingrediente" onClick={() => setEditar({ id: nuevoId('ing'), nombre: '', categoria: 'Abarrotes', kcal: 0, proteina: 0, carbohidratos: 0, grasa: 0, precioKg: 0, etiquetas: [] })}>
        <Icono nombre="mas" />
      </button>
    }>
      <input className="buscador" placeholder="Buscar ingrediente…" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <ul className="lista tarjeta">
        {lista.map((i) => (
          <li key={i.id} className="item clic" onClick={() => setEditar(i)}>
            <div className="crece">
              <div>{i.nombre}</div>
              <div className="sub">{i.kcal} kcal · {i.proteina} g prot por 100 g</div>
            </div>
            <b>{dinero(i.precioKg, estado.perfil.moneda)}/kg</b>
          </li>
        ))}
      </ul>
    </Hoja>
  );
}

function EditorIngrediente({ ing, onCerrar, onGuardar }: { ing: Ingrediente; onCerrar: () => void; onGuardar: (i: Ingrediente) => void }) {
  const [x, setX] = useState(ing);
  const s = <K extends keyof Ingrediente>(k: K, v: Ingrediente[K]) => setX((o) => ({ ...o, [k]: v }));
  return (
    <Hoja titulo={ing.nombre || 'Nuevo ingrediente'} onCerrar={onCerrar}>
      <Campo etiqueta="Nombre"><input value={x.nombre} onChange={(e) => s('nombre', e.target.value)} /></Campo>
      <Campo etiqueta="Pasillo / categoría">
        <select value={x.categoria} onChange={(e) => s('categoria', e.target.value as Categoria)}>
          {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Campo>
      <Campo etiqueta="Precio por kg (o litro)" ayuda="Pon lo que pagas en tu tienda para que el costo sea real."><NumeroInput valor={x.precioKg} onCambio={(n) => s('precioKg', n)} paso={0.5} /></Campo>
      <h3>Por cada 100 g</h3>
      <div className="dos-col">
        <Campo etiqueta="Calorías"><NumeroInput valor={x.kcal} onCambio={(n) => s('kcal', n)} /></Campo>
        <Campo etiqueta="Proteína (g)"><NumeroInput valor={x.proteina} onCambio={(n) => s('proteina', n)} paso={0.1} /></Campo>
        <Campo etiqueta="Carbohidratos (g)"><NumeroInput valor={x.carbohidratos} onCambio={(n) => s('carbohidratos', n)} paso={0.1} /></Campo>
        <Campo etiqueta="Grasa (g)"><NumeroInput valor={x.grasa} onCambio={(n) => s('grasa', n)} paso={0.1} /></Campo>
      </div>
      <Campo etiqueta="Contiene" ayuda="Se usa para respetar tus restricciones.">
        <Chips opciones={ETIQUETAS} seleccion={x.etiquetas} nombres={nombreEtiqueta} onCambio={(v) => s('etiquetas', v)} />
      </Campo>
      <button className="btn btn-primario btn-ancho" disabled={!x.nombre.trim()} onClick={() => onGuardar({ ...x, nombre: x.nombre.trim() })}>Guardar</button>
    </Hoja>
  );
}

function Respaldo({ onCerrar, reemplazar }: { onCerrar: () => void; reemplazar: (e: ReturnType<typeof estadoInicial>) => void }) {
  const { estado } = useEstado();
  const [texto, setTexto] = useState('');
  const [msg, setMsg] = useState('');
  const json = JSON.stringify(estado);

  return (
    <Hoja titulo="Respaldo" onCerrar={onCerrar}>
      <p>Tus datos se guardan solo en este teléfono. Copia este texto y guárdalo (notas, correo, Drive) para no perderlo si desinstalas la app.</p>
      <button className="btn btn-primario btn-ancho" onClick={async () => {
        try { await navigator.clipboard.writeText(json); setMsg('Respaldo copiado al portapapeles.'); }
        catch { setTexto(json); setMsg('No pude copiar; selecciona el texto de abajo y cópialo manualmente.'); }
      }}>Copiar respaldo</button>
      <Campo etiqueta="Restaurar: pega aquí un respaldo">
        <textarea rows={6} value={texto} onChange={(e) => setTexto(e.target.value)} />
      </Campo>
      <button className="btn btn-ancho" disabled={!texto.trim()} onClick={() => {
        try {
          reemplazar(normalizar(JSON.parse(texto)));
          setMsg('Datos restaurados.');
        } catch {
          setMsg('El texto no es un respaldo válido.');
        }
      }}>Restaurar respaldo</button>
      {msg && <p className="nota">{msg}</p>}
    </Hoja>
  );
}
