import { useState } from 'react';
import { Barra, Campo, Icono, NumeroInput } from '../components/ui';
import { nuevoId, useEstado } from '../estado';
import { costoPlan, dinero } from '../lib/calculos';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Lunes de la semana de la fecha dada. */
function lunes(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

const fechaCorta = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
};

export function GastosPage() {
  const { estado, actualizar } = useEstado();
  const { perfil, gastos } = estado;
  const [fecha, setFecha] = useState(iso(new Date()));
  const [tienda, setTienda] = useState('');
  const [monto, setMonto] = useState(0);
  const [nota, setNota] = useState('');

  const inicioSemana = lunes(new Date());
  const semanas = Array.from({ length: 6 }, (_, i) => {
    const ini = new Date(inicioSemana);
    ini.setDate(ini.getDate() - 7 * (5 - i));
    const fin = new Date(ini);
    fin.setDate(fin.getDate() + 6);
    const total = gastos.filter((g) => g.fecha >= iso(ini) && g.fecha <= iso(fin)).reduce((s, g) => s + g.monto, 0);
    return { ini, total };
  });
  const estaSemana = semanas[5].total;
  const mes = iso(new Date()).slice(0, 7);
  const totalMes = gastos.filter((g) => g.fecha.startsWith(mes)).reduce((s, g) => s + g.monto, 0);
  const max = Math.max(perfil.presupuestoSemanal, ...semanas.map((s) => s.total), 1);
  const estimado = estado.plan ? costoPlan(estado) : null;

  const agregar = () => {
    if (monto <= 0) return;
    actualizar((e) => ({
      ...e,
      gastos: [{ id: nuevoId('g'), fecha, tienda: tienda.trim() || 'Super', monto, nota: nota.trim() || undefined }, ...e.gastos],
    }));
    setMonto(0);
    setNota('');
  };

  const borrar = (id: string) => actualizar((e) => ({ ...e, gastos: e.gastos.filter((g) => g.id !== id) }));
  const ordenados = [...gastos].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className="pagina">
      <h1>Mis gastos</h1>
      <div className="tarjeta">
        <Barra valor={estaSemana} meta={perfil.presupuestoSemanal} etiqueta="Gastado esta semana" unidad={perfil.moneda} />
        <div className="fila-entre"><span>Te queda esta semana</span><b className={estaSemana > perfil.presupuestoSemanal ? 'alerta' : 'ok'}>{dinero(perfil.presupuestoSemanal - estaSemana, perfil.moneda)}</b></div>
        {estimado !== null && <div className="fila-entre"><span>Estimado del plan</span><b>{dinero(estimado, perfil.moneda)}</b></div>}
        <div className="fila-entre"><span>Total del mes</span><b>{dinero(totalMes, perfil.moneda)}</b></div>
      </div>

      <div className="tarjeta">
        <h3 className="sin-margen">Últimas 6 semanas</h3>
        <div className="grafica" role="img" aria-label="Gasto por semana">
          {semanas.map((s, i) => (
            <div key={i} className="col">
              <span className="col-valor">{s.total ? Math.round(s.total) : ''}</span>
              <div className="col-area">
                <div className={`col-barra ${s.total > perfil.presupuestoSemanal ? 'alerta-bg' : ''}`} style={{ height: `${(s.total / max) * 100}%` }} />
                <div className="col-linea" style={{ bottom: `${(perfil.presupuestoSemanal / max) * 100}%` }} />
              </div>
              <span className="col-et">{s.ini.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
            </div>
          ))}
        </div>
        <p className="nota">La línea punteada es tu presupuesto semanal.</p>
      </div>

      <div className="tarjeta">
        <h3 className="sin-margen">Registrar compra</h3>
        <div className="dos-col">
          <Campo etiqueta="Fecha"><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Campo>
          <Campo etiqueta={`Monto (${perfil.moneda})`}><NumeroInput valor={monto} onCambio={setMonto} paso={0.5} /></Campo>
        </div>
        <Campo etiqueta="Tienda"><input value={tienda} onChange={(e) => setTienda(e.target.value)} placeholder="Ej. Mercado, Walmart, Sam's" /></Campo>
        <Campo etiqueta="Nota (opcional)"><input value={nota} onChange={(e) => setNota(e.target.value)} /></Campo>
        <button className="btn btn-primario btn-ancho" onClick={agregar} disabled={monto <= 0}>Agregar gasto</button>
      </div>

      <h3>Historial</h3>
      <ul className="lista tarjeta">
        {ordenados.map((g) => (
          <li key={g.id} className="item">
            <div className="crece">
              <div>{g.tienda}</div>
              <div className="sub">{fechaCorta(g.fecha)}{g.nota ? ` · ${g.nota}` : ''}</div>
            </div>
            <b>{dinero(g.monto, perfil.moneda)}</b>
            <button className="btn-icono" onClick={() => borrar(g.id)} aria-label="Borrar gasto"><Icono nombre="basura" size={18} /></button>
          </li>
        ))}
        {!ordenados.length && <li className="item">Aún no registras compras.</li>}
      </ul>
    </div>
  );
}
