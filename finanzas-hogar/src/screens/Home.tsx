import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { useNav } from '@/lib/nav';
import { useMonth } from '@/lib/month';
import { Avatar, Button, Group, MonthPicker, NavButton, Progress, Ring, Row, Screen } from '@/components/ui';
import { Gear } from '@/components/icons';
import { money, pct } from '@/lib/format';
import { monthLabel, relativeDays, shortDate, todayISO } from '@/lib/dates';
import { alerts, budgetStatus, cardSummary, debtMonthlyTotal, debtToIncome, expensesByCategory, healthScore, householdIncomeEstimate, monthSummary, upcomingPayments, goalProgress } from '@/lib/finance';
import { CATEGORIES, type ExpenseCategory } from '@/lib/types';
import { CATEGORY_COLORS } from '@/lib/colors';
import { ExpenseForm, IncomeForm } from './Movements';
import { getIssuer } from '@/lib/cards';

export function Home() {
  const { state, dispatch } = useStore();
  const nav = useNav();
  const { month, step, isCurrent } = useMonth();
  const [sheet, setSheet] = useState<'gasto' | 'ingreso' | null>(null);

  const summary = useMemo(() => monthSummary(state, month), [state, month]);
  const byCat = useMemo(() => expensesByCategory(state.expenses, month), [state.expenses, month]);
  const topCats = (Object.entries(byCat) as [ExpenseCategory, number][]).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCat = topCats[0]?.[1] ?? 1;
  const upcoming = useMemo(() => upcomingPayments(state, new Date(), 15), [state]);
  const alertList = useMemo(() => alerts(state, month), [state, month]);
  const budgets = useMemo(() => budgetStatus(state.budgets, state.expenses, month), [state.budgets, state.expenses, month]);
  const cardSummaries = useMemo(() => state.cards.map((c) => cardSummary(c, state.plans)), [state.cards, state.plans]);
  const totalLimit = state.cards.reduce((a, c) => a + c.limit, 0);
  const totalUsed = state.cards.reduce((a, c) => a + c.used, 0);
  const avgUtil = totalLimit > 0 ? totalUsed / totalLimit : 0;
  const incomeEst = householdIncomeEstimate(state.members) || summary.income;
  const monthlyDebt = debtMonthlyTotal(state.debts) + cardSummaries.reduce((a, s) => a + s.minPayment, 0);
  const emergency = state.goals.find((g) => g.isEmergencyFund);
  const health = healthScore({
    savingsRate: summary.savingsRate,
    avgUtilization: avgUtil,
    dti: debtToIncome(monthlyDebt, incomeEst),
    budgetsExceeded: budgets.filter((b) => b.status === 'excedido').length,
    budgetsTotal: budgets.length,
    emergencyProgress: emergency ? goalProgress(emergency) : 0,
  });
  const pendingFixed = state.fixedExpenses.filter((f) => f.active && !state.expenses.some((e) => e.fixedId === f.id && e.date.startsWith(month)));
  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  })();
  const me = state.members.find((m) => m.role === 'yo') ?? state.members[0];
  const healthColor = health.score >= 80 ? 'var(--green)' : health.score >= 60 ? 'var(--blue)' : health.score >= 40 ? 'var(--orange)' : 'var(--red)';

  return (
    <Screen
      root
      tabbar
      large
      title="Inicio"
      subtitle={`${greeting}${me ? `, ${me.name}` : ''}`}
      right={
        <NavButton onClick={() => nav.push({ name: 'settings' })} ariaLabel="Ajustes">
          <Gear size={22} />
        </NavButton>
      }
    >
      <MonthPicker value={month} label={monthLabel(month)} onChange={step} />

      <div className="card hero">
        <div className="card-title" style={{ color: 'rgba(255,255,255,0.8)' }}>
          {isCurrent ? 'Disponible este mes' : `Balance de ${monthLabel(month, false)}`}
        </div>
        <div className="hero-amount num" data-testid="home-balance">
          {money(summary.balance)}
        </div>
        <div className="muted small">Ingresos menos todo lo que ya salió (gastos, pagos a tarjetas y deudas)</div>
        <div className="hero-grid">
          <div className="stat">
            <div className="stat-label">Ingresos</div>
            <div className="stat-value num">{money(summary.income, { compact: true })}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Gastos</div>
            <div className="stat-value num">{money(summary.expenses, { compact: true })}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Ahorro real</div>
            <div className="stat-value num">{pct(summary.savingsRate * 100)}</div>
          </div>
        </div>
      </div>

      <div className="fab-row">
        <Button variant="gray" onClick={() => setSheet('gasto')} testId="home-add-expense">
          − Gasto
        </Button>
        <Button variant="gray" onClick={() => setSheet('ingreso')} testId="home-add-income">
          + Ingreso
        </Button>
      </div>

      {alertList.length > 0 && (
        <div className="mt16">
          {alertList.slice(0, 4).map((a) => (
            <div key={a.id} className={`notice ${a.level}`}>
              <span className="notice-icon">{a.level === 'danger' ? '!' : a.level === 'warning' ? '⚠' : 'i'}</span>
              <div>
                <div className="notice-title">{a.title}</div>
                <div className="notice-detail">{a.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingFixed.length > 0 && isCurrent && (
        <Group header="Gastos fijos pendientes" footer="Al registrarlos se descuentan del mes y, si van a tarjeta, se suman a su saldo." action={{ label: 'Registrar todos', onClick: () => dispatch({ type: 'registerFixed', fixedIds: pendingFixed.map((f) => f.id), date: todayISO() }) }}>
          {pendingFixed.slice(0, 5).map((f) => (
            <Row key={f.id} icon={CATEGORIES[f.category].emoji} iconColor={CATEGORY_COLORS[f.category]} label={f.name} sub={`Día ${f.dayOfMonth}`} value={money(f.amount)} onClick={() => dispatch({ type: 'registerFixed', fixedIds: [f.id], date: todayISO() })} right={<span className="badge blue">Registrar</span>} />
          ))}
          {pendingFixed.length > 5 && <Row label={`${pendingFixed.length - 5} más…`} onClick={() => nav.push({ name: 'fixed' })} chevron />}
        </Group>
      )}

      <Group header="Salud financiera" action={{ label: 'Detalle', onClick: () => nav.push({ name: 'health' }) }}>
        <div className="row">
          <Ring value={health.score / 100} size={64} stroke={7} color={healthColor}>
            <span className="bold" style={{ fontSize: 17 }}>
              {health.score}
            </span>
          </Ring>
          <div className="row-main">
            <div className="row-label bold">{health.label}</div>
            <div className="row-sub">
              Ahorro {pct(summary.savingsRate * 100)} · Crédito {pct(avgUtil * 100)} · Deuda {pct(debtToIncome(monthlyDebt, incomeEst) * 100)}
            </div>
          </div>
        </div>
      </Group>

      {upcoming.length > 0 && (
        <Group header="Próximos 15 días">
          {upcoming.slice(0, 6).map((u) => (
            <Row
              key={u.id}
              icon={u.kind === 'corte' ? '✂️' : u.kind === 'pago-tarjeta' ? '💳' : u.kind === 'deuda' ? '🏦' : '📅'}
              iconColor={u.days <= 3 ? 'var(--orange)' : 'var(--fill)'}
              label={u.title}
              sub={`${shortDate(u.date)} · ${relativeDays(u.days)}`}
              value={u.amount > 0 ? money(u.amount) : ''}
              valueClass={u.days <= 3 ? 'strong' : ''}
              onClick={u.kind === 'deuda' ? () => nav.push({ name: 'debt', id: u.refId }) : u.kind === 'gasto-fijo' ? () => nav.push({ name: 'fixed' }) : () => nav.push({ name: 'card', id: u.refId })}
              chevron
            />
          ))}
        </Group>
      )}

      {topCats.length > 0 ? (
        <Group header="En qué se fue el dinero" action={{ label: 'Ver todo', onClick: () => nav.setTab('movimientos') }}>
          <div style={{ padding: '14px 16px' }} className="bars">
            {topCats.map(([cat, amt]) => (
              <div className="bar-row" key={cat}>
                <span style={{ fontSize: 20 }}>{CATEGORIES[cat].emoji}</span>
                <div className="bar-label">
                  <span className="ellipsis">{CATEGORIES[cat].label}</span>
                  <div className="bar-track">
                    <span style={{ width: `${(amt / maxCat) * 100}%`, background: CATEGORY_COLORS[cat] }} />
                  </div>
                </div>
                <span className="bar-value">{money(amt)}</span>
              </div>
            ))}
          </div>
        </Group>
      ) : (
        <Group header="En qué se fue el dinero">
          <Row label="Aún no hay gastos este mes" sub="Registra el primero con el botón − Gasto" />
        </Group>
      )}

      {budgets.length > 0 && (
        <Group header="Presupuestos" action={{ label: 'Editar', onClick: () => nav.push({ name: 'budgets' }) }}>
          {budgets
            .sort((a, b) => b.ratio - a.ratio)
            .slice(0, 4)
            .map((b) => (
              <div className="row with-icon" key={b.category}>
                <span className="row-icon" style={{ background: CATEGORY_COLORS[b.category] }}>
                  {CATEGORIES[b.category].emoji}
                </span>
                <div className="row-main">
                  <div className="flex between">
                    <span className="row-label">{CATEGORIES[b.category].label}</span>
                    <span className={`small num ${b.status === 'excedido' ? 'neg' : b.status === 'alerta' ? 'warn' : 'muted'}`}>
                      {money(b.spent)} / {money(b.budget)}
                    </span>
                  </div>
                  <div className="mt8">
                    <Progress value={b.ratio} color={b.status === 'excedido' ? 'var(--red)' : b.status === 'alerta' ? 'var(--orange)' : 'var(--green)'} />
                  </div>
                </div>
              </div>
            ))}
        </Group>
      )}

      {state.cards.length > 0 && (
        <Group header="Tarjetas" action={{ label: 'Ver', onClick: () => nav.setTab('tarjetas') }}>
          <div className="row">
            <Ring value={avgUtil} size={56} stroke={6} color={avgUtil > 0.7 ? 'var(--red)' : avgUtil > 0.3 ? 'var(--orange)' : 'var(--green)'}>
              <span className="bold small">{pct(avgUtil * 100)}</span>
            </Ring>
            <div className="row-main">
              <div className="row-label">
                {money(totalUsed)} <span className="muted">de {money(totalLimit)}</span>
              </div>
              <div className="row-sub">
                {state.cards.length} tarjeta{state.cards.length > 1 ? 's' : ''} · uso total de tus líneas
              </div>
            </div>
          </div>
          {cardSummaries
            .filter((s) => s.card.used > 0)
            .sort((a, b) => a.daysToPay - b.daysToPay)
            .slice(0, 3)
            .map((s) => (
              <Row key={s.card.id} icon={<span style={{ fontSize: 11, fontWeight: 800 }}>{getIssuer(s.card.issuer).logo.slice(0, 4)}</span>} iconColor={getIssuer(s.card.issuer).bg} label={s.card.nickname || getIssuer(s.card.issuer).name} sub={`Pagar antes del ${shortDate(s.nextPay)}`} value={money(s.payNoInterest)} onClick={() => nav.push({ name: 'card', id: s.card.id })} chevron />
            ))}
        </Group>
      )}

      {state.members.length > 0 && (
        <Group header="Quién pagó qué">
          {state.members.map((m) => {
            const spent = state.expenses.filter((e) => e.memberId === m.id && e.date.startsWith(month)).reduce((a, e) => a + e.amount, 0);
            const inc = state.incomes.filter((i) => i.memberId === m.id && i.date.startsWith(month)).reduce((a, i) => a + i.amount, 0);
            return <Row key={m.id} icon={<Avatar member={m} />} iconColor="transparent" label={m.name} sub={`Ingresó ${money(inc)}`} value={`−${money(spent)}`} />;
          })}
        </Group>
      )}

      <ExpenseForm open={sheet === 'gasto'} onClose={() => setSheet(null)} />
      <IncomeForm open={sheet === 'ingreso'} onClose={() => setSheet(null)} />
    </Screen>
  );
}
