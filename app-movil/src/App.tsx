import { useState } from 'react';
import { Icono } from './components/ui';
import { ProveedorEstado } from './estado';
import { AjustesPage } from './pages/AjustesPage';
import { ComprasPage } from './pages/ComprasPage';
import { GastosPage } from './pages/GastosPage';
import { PlanPage } from './pages/PlanPage';
import { RecetasPage } from './pages/RecetasPage';

type Tab = 'plan' | 'compras' | 'recetas' | 'gastos' | 'ajustes';

const TABS: { id: Tab; nombre: string }[] = [
  { id: 'plan', nombre: 'Plan' },
  { id: 'compras', nombre: 'Compras' },
  { id: 'recetas', nombre: 'Recetas' },
  { id: 'gastos', nombre: 'Gastos' },
  { id: 'ajustes', nombre: 'Ajustes' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('plan');

  return (
    <ProveedorEstado>
      <main className="contenido">
        {tab === 'plan' && <PlanPage irAjustes={() => setTab('ajustes')} />}
        {tab === 'compras' && <ComprasPage />}
        {tab === 'recetas' && <RecetasPage />}
        {tab === 'gastos' && <GastosPage />}
        {tab === 'ajustes' && <AjustesPage />}
      </main>
      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'activo' : ''}`} onClick={() => { setTab(t.id); window.scrollTo(0, 0); }}>
            <Icono nombre={t.id} />
            <span>{t.nombre}</span>
          </button>
        ))}
      </nav>
    </ProveedorEstado>
  );
}
