import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { StoreProvider, useStore } from '@/lib/store';
import { NavProvider, useNav, type Tab } from '@/lib/nav';
import { MonthProvider } from '@/lib/month';
import { setHapticsEnabled, tap } from '@/lib/haptics';
import { Onboarding } from '@/screens/Onboarding';
import { Home } from '@/screens/Home';
import { Movements } from '@/screens/Movements';
import { CardDetail, CardForm, Cards } from '@/screens/Cards';
import { DebtDetail, DebtForm, Debts } from '@/screens/Debts';
import { Health, Plan } from '@/screens/Plan';
import { Backup, Budgets, Family, FixedExpenses, MemberForm, SettingsScreen } from '@/screens/Settings';
import { CardIcon, DebtIcon, HomeIcon, ListIcon, PlanIcon } from '@/components/icons';

const TABS: { id: Tab; label: string; Icon: typeof HomeIcon }[] = [
  { id: 'inicio', label: 'Inicio', Icon: HomeIcon },
  { id: 'movimientos', label: 'Movimientos', Icon: ListIcon },
  { id: 'tarjetas', label: 'Tarjetas', Icon: CardIcon },
  { id: 'deudas', label: 'Deudas', Icon: DebtIcon },
  { id: 'plan', label: 'Plan', Icon: PlanIcon },
];

function useTheme() {
  const { state } = useStore();
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const dark = state.settings.theme === 'dark' || (state.settings.theme === 'auto' && prefersDark);
      root.setAttribute('data-theme', dark ? 'dark' : 'light');
      if (Capacitor.isNativePlatform()) {
        StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
        StatusBar.setBackgroundColor({ color: dark ? '#000000' : '#f2f2f7' }).catch(() => {});
      }
    };
    apply();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [state.settings.theme]);
  useEffect(() => setHapticsEnabled(state.settings.haptics), [state.settings.haptics]);
}

function Router() {
  const { state, ready } = useStore();
  const nav = useNav();
  useTheme();

  if (!ready) {
    return (
      <div className="splash">
        <div className="logo">💙</div>
        <div>Cargando…</div>
      </div>
    );
  }
  if (!state.onboarded) return <Onboarding />;

  const top = nav.stack[nav.stack.length - 1];
  let detail: React.ReactNode = null;
  if (top) {
    switch (top.name) {
      case 'card':
        detail = <CardDetail id={top.id} />;
        break;
      case 'card-form':
        detail = <CardForm id={top.id} />;
        break;
      case 'debt':
        detail = <DebtDetail id={top.id} />;
        break;
      case 'debt-form':
        detail = <DebtForm id={top.id} />;
        break;
      case 'settings':
        detail = <SettingsScreen />;
        break;
      case 'family':
        detail = <Family />;
        break;
      case 'member-form':
        detail = <MemberForm id={top.id} />;
        break;
      case 'fixed':
        detail = <FixedExpenses />;
        break;
      case 'budgets':
        detail = <Budgets />;
        break;
      case 'goals':
        detail = <Plan />;
        break;
      case 'health':
        detail = <Health />;
        break;
      case 'backup':
        detail = <Backup />;
        break;
    }
  }

  return (
    <div className="app">
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, visibility: detail ? 'hidden' : 'visible' }}>
          {nav.tab === 'inicio' && <Home />}
          {nav.tab === 'movimientos' && <Movements />}
          {nav.tab === 'tarjetas' && <Cards />}
          {nav.tab === 'deudas' && <Debts />}
          {nav.tab === 'plan' && <Plan />}
        </div>
        {detail && <div key={nav.stack.length} style={{ position: 'absolute', inset: 0 }}>{detail}</div>}
      </div>
      {!detail && (
        <nav className="tabbar" aria-label="Secciones">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab ${nav.tab === t.id ? 'active' : ''}`}
              data-testid={`tab-${t.id}`}
              aria-current={nav.tab === t.id ? 'page' : undefined}
              onClick={() => {
                tap();
                nav.setTab(t.id);
              }}
            >
              <t.Icon />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <NavProvider>
        <MonthProvider>
          <Router />
        </MonthProvider>
      </NavProvider>
    </StoreProvider>
  );
}
