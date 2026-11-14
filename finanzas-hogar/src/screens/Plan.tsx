import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { useNav } from '@/lib/nav';
import { useMonth } from '@/lib/month';
import { AmountField, Avatar, Button, DateField, Group, NavButton, NumberField, Progress, Ring, Row, Screen, Segmented, Sheet, StackBar, TextField, ToggleRow, useConfirm, useToast } from '@/components/ui';
import { money, pct } from '@/lib/format';
import { monthLabel } from '@/lib/dates';
import { budgetStatus, cardSummary, contributions, debtMonthlyTotal, debtToIncome, distribution, emergencyFundTarget, goalMonthlyNeeded, goalProgress, healthScore, householdIncomeEstimate, monthSummary, needsWants, totalFixedExpenses, expensesByCategory, totalIncome } from '@/lib/finance';
import { CATEGORIES, type BudgetRule, type ExpenseCategory, type SavingsGoal } from '@/lib/types';
import { PLAN_COLORS, CATEGORY_COLORS } from '@/lib/colors';
import { uid } from '@/lib/id';
import { success } from '@/lib/haptics';

const RULES: { value: BudgetRule; label: string; n: number; w: number; s: number }[] = [
  { value: '50-30-20', label: '50/30/20', n: 50, w: 30, s: 20 },
  { value: '60-20-20', label: '60/20/20', n: 60, w: 20, s: 20 },
  { value: '70-20-10', label: '70/20/10', n: 70, w: 20, s: 10 },
  { value: 'custom', label: 'Personal', n: 50, w: 30, s: 20 },
];

export function Plan() {
  const { state, dispatch } = useStore();
  const nav = useNav();
  const { month } = useMonth();
  const [basis, setBasis] = useState<'estimado' | 'real'>('estimado');
  const [goalSheet, setGoalSheet] = useState<SavingsGoal | 'new' | null>(null);
  const toast = useToast();

  const estIncome = householdIncomeEstimate(state.members);
  const realIncome = totalIncome(state.incomes, month);
  const income = basis === 'estimado' ? estIncome : realIncome;
  const dist = distribution(income, state.plan);
  const fixed = totalFixedExpenses(state.fixedExpenses);
  const debtsMonthly = debtMonthlyTotal(state.debts);
  const cardsDue = state.cards.reduce((a, c) => a + cardSummary(c, state.plans).installmentsDue, 0);
  // Gasto común a repartir: fijos + presupuestos variables (sin duplicar categorías cubiertas por fijos) + deudas compartidas
  const fixedCats = new Set(state.fixedExpenses.filter((f) => f.active).map((f) => f.category));
  const variableBudgets = state.budgets.filter((b) => !fixedCats.has(b.category)).reduce((a, b) => a + b.monthly, 0);
  const sharedDebts = state.debts.filter((d) => d.balance > 0 && !d.memberId).reduce((a, d) => a + d.monthlyPayment, 0);
  const common = fixed + variableBudgets + sharedDebts;
  const lines = useMemo(() => contributions(state.members, common), [state.members, common]);
  const summary = monthSummary(state, month);
  const nw = needsWants(state.expenses, month);
  const emergency = state.goals.find((g) => g.isEmergencyFund);
  const essentials = fixed > 0 ? fixed + variableBudgets : dist.needs;
  const emergencyTarget = emergencyFundTarget(essentials, state.plan.emergencyMonths);
  const savingsLeft = Math.max(0, dist.savings - debtsMonthly - cardsDue);
  const byCat = expensesByCategory(state.expenses, month);
  const catList = (Object.entries(byCat) as [ExpenseCategory, number][]).sort((a, b) => b[1] - a[1]);
  const totalCat = catList.reduce((a, [, v]) => a + v, 0);
  const remainingAfterPlan = income - fixed - variableBudgets - debtsMonthly - cardsDue - savingsLeft;

  const goals = state.goals.filter((g) => !g.isEmergencyFund);
  const goalsMonthly = goals.reduce((a, g) => a + (goalMonthlyNeeded(g) ?? 0), 0);

  return (
    <Screen root tabbar large title="Plan" subtitle="A dónde va cada peso">
      {state.members.length === 0 && (
        <Group>
          <Row label="Agrega a tu familia para armar el plan" sub="Integrantes, edades e ingresos" onClick={() => nav.push({ name: 'family' })} chevron />
        </Group>
      )}

      <div className="mt12">
        <Segmented
          value={basis}
          onChange={setBasis}
          options={[
            { value: 'estimado', label: `Ingreso estimado · ${money(estIncome, { compact: true })}` },
            { value: 'real', label: `Real ${monthLabel(month, false)} · ${money(realIncome, { compact: true })}` },
          ]}
        />
      </div>

      <Group header="Regla de distribución" footer={state.plan.rule === 'custom' ? 'Ajusta los porcentajes; se normalizan para sumar 100%.' : `Necesidades ${dist.needsPct.toFixed(0)}% · Deseos ${dist.wantsPct.toFixed(0)}% · Ahorro y deudas ${dist.savingsPct.toFixed(0)}%`}>
        <div style={{ padding: 12 }}>
          <Segmented
            value={state.plan.rule}
            onChange={(v) => {
              const r = RULES.find((x) => x.value === v)!;
              dispatch({ type: 'setPlan', plan: v === 'custom' ? { rule: v } : { rule: v, needsPct: r.n, wantsPct: r.w, savingsPct: r.s } });
            }}
            options={RULES.map((r) => ({ value: r.value, label: r.label }))}
          />
        </div>
        {state.plan.rule === 'custom' && (
          <>
            <NumberField label="Necesidades" value={state.plan.needsPct} min={0} max={100} suffix="%" onChange={(v) => dispatch({ type: 'setPlan', plan: { needsPct: v } })} />
            <NumberField label="Deseos" value={state.plan.wantsPct} min={0} max={100} suffix="%" onChange={(v) => dispatch({ type: 'setPlan', plan: { wantsPct: v } })} />
            <NumberField label="Ahorro y deudas" value={state.plan.savingsPct} min={0} max={100} suffix="%" onChange={(v) => dispatch({ type: 'setPlan', plan: { savingsPct: v } })} />
          </>
        )}
        <div style={{ padding: '4px 16px 16px' }}>
          <StackBar
            parts={[
              { label: 'Necesidades', value: dist.needs, color: PLAN_COLORS.needs },
              { label: 'Deseos', value: dist.wants, color: PLAN_COLORS.wants },
              { label: 'Ahorro y deudas', value: dist.savings, color: PLAN_COLORS.savings },
            ]}
          />
        </div>
      </Group>

      <Group header="Plan vs realidad del mes" footer="Compara lo planeado con lo que de verdad gastaron, por tipo de gasto.">
        <PlanRow label="Necesidades" plan={dist.needs} real={nw.needs} color={PLAN_COLORS.needs} />
        <PlanRow label="Deseos" plan={dist.wants} real={nw.wants} color={PLAN_COLORS.wants} />
        <PlanRow label="Ahorro y deudas" plan={dist.savings} real={summary.cardPayments + summary.debtPayments + Math.max(0, summary.balance)} color={PLAN_COLORS.savings} hint="pagos a deudas + lo que sobró" moreIsBetter />
      </Group>

      <Group header="A dónde va cada peso" footer={remainingAfterPlan < 0 ? `Falta ${money(-remainingAfterPlan)}: el ingreso no alcanza para fijos, presupuestos, deudas y ahorro. Ajusta presupuestos o la meta de ahorro.` : `Quedan ${money(remainingAfterPlan)} libres al mes después de todo lo planeado.`}>
        <Row icon="🏠" iconColor={PLAN_COLORS.needs} label="Gastos fijos" sub={`${state.fixedExpenses.filter((f) => f.active).length} conceptos`} value={money(fixed)} onClick={() => nav.push({ name: 'fixed' })} chevron />
        <Row icon="🛒" iconColor={PLAN_COLORS.wants} label="Presupuestos variables" sub="Comida, súper, salidas…" value={money(variableBudgets)} onClick={() => nav.push({ name: 'budgets' })} chevron />
        <Row icon="🏦" iconColor={PLAN_COLORS.debts} label="Deudas y meses sin intereses" sub="Mensualidades comprometidas" value={money(debtsMonthly + cardsDue)} onClick={() => nav.setTab('deudas')} chevron />
        <Row icon="🐷" iconColor={PLAN_COLORS.savings} label="Ahorro" sub={`${dist.savingsPct.toFixed(0)}% del ingreso menos deudas`} value={money(savingsLeft)} valueClass="pos" />
        <Row label="Ingreso" value={money(income)} valueClass="strong" />
      </Group>

      {state.members.length > 0 && (
        <Group header="Cuánto aporta cada quien" footer={`Gasto común a repartir: ${money(common)} (fijos + presupuestos + deudas compartidas). ${state.members.some((m) => m.contributionMode === 'proporcional') ? 'Reparto proporcional al ingreso: el mismo porcentaje del sueldo para todos.' : ''}`} action={{ label: 'Editar', onClick: () => nav.push({ name: 'family' }) }}>
          {lines.map((l) => (
            <div className="row with-icon" key={l.member.id}>
              <Avatar member={l.member} />
              <div className="row-main">
                <div className="flex between">
                  <span className="row-label">{l.member.name}</span>
                  <span className="row-value strong">{money(l.amount)}</span>
                </div>
                <div className="row-sub">
                  {l.income > 0 ? `Gana ${money(l.income)} · aporta ${pct((l.income > 0 ? l.amount / l.income : 0) * 100)} de su ingreso · le quedan ${money(l.remaining)}` : `${l.member.age} años · sin ingresos`}
                </div>
                {l.income > 0 && (
                  <div className="mt8">
                    <Progress value={l.amount / l.income} color={l.member.color} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </Group>
      )}

      <Group header="Fondo de emergencia" footer={`Meta: ${state.plan.emergencyMonths} meses de gastos esenciales (${money(essentials)}/mes). Es tu colchón si alguien pierde el ingreso.`}>
        <div style={{ padding: 12 }}>
          <Segmented value={String(state.plan.emergencyMonths)} onChange={(v) => dispatch({ type: 'setPlan', plan: { emergencyMonths: Number(v) as 3 | 6 | 9 | 12 } })} options={[3, 6, 9, 12].map((m) => ({ value: String(m), label: `${m} meses` }))} />
        </div>
        <div className="row">
          <Ring value={emergency ? Math.min(1, emergency.saved / emergencyTarget) : 0} size={64} stroke={7} color="var(--teal)">
            <span className="bold small">{pct(emergency ? Math.min(100, (emergency.saved / emergencyTarget) * 100) : 0)}</span>
          </Ring>
          <div className="row-main">
            <div className="row-label bold">{money(emergency?.saved ?? 0)} <span className="muted" style={{ fontWeight: 400 }}>de {money(emergencyTarget)}</span></div>
            <div className="row-sub">{emergency && emergency.saved >= emergencyTarget ? '¡Fondo completo! Ahora sí, a las metas.' : `Faltan ${money(emergencyTarget - (emergency?.saved ?? 0))}${savingsLeft > 0 ? ` · ~${Math.ceil((emergencyTarget - (emergency?.saved ?? 0)) / savingsLeft)} meses ahorrando ${money(savingsLeft)}` : ''}`}</div>
          </div>
          <Button
            small
            variant="tinted"
            onClick={() => {
              const g: SavingsGoal = emergency ?? { id: uid('g'), name: 'Fondo de emergencia', icon: '🛟', target: emergencyTarget, saved: 0, isEmergencyFund: true };
              setGoalSheet({ ...g, target: emergencyTarget });
            }}
          >
            Abonar
          </Button>
        </div>
      </Group>

      <Group header="Metas de ahorro" action={{ label: '+ Nueva', onClick: () => setGoalSheet('new') }} footer={goals.length ? `Para cumplir todas a tiempo necesitas ahorrar ${money(goalsMonthly)} al mes.` : 'Viaje, enganche, colegiaturas, un coche… define cuánto y para cuándo.'}>
        {goals.length === 0 && <Row label="Sin metas aún" />}
        {goals.map((g) => {
          const need = goalMonthlyNeeded(g);
          return (
            <div className="row tappable with-icon" key={g.id} onClick={() => setGoalSheet(g)} role="button">
              <span className="row-icon" style={{ background: 'var(--fill)', fontSize: 20 }}>
                {g.icon}
              </span>
              <div className="row-main">
                <div className="flex between">
                  <span className="row-label">{g.name}</span>
                  <span className="row-value strong">{money(g.saved)} <span className="muted">/ {money(g.target)}</span></span>
                </div>
                <div className="row-sub">{g.saved >= g.target ? '¡Meta cumplida! 🎉' : need !== null ? `${money(need)}/mes para llegar el ${g.deadline}` : `Faltan ${money(g.target - g.saved)}`}</div>
                <div className="mt8">
                  <Progress value={goalProgress(g)} color={g.saved >= g.target ? 'var(--green)' : 'var(--purple)'} />
                </div>
              </div>
            </div>
          );
        })}
      </Group>

      {catList.length > 0 && (
        <Group header={`Gasto por categoría · ${monthLabel(month, false)}`} footer="Porcentaje de todo lo gastado en el mes.">
          <div style={{ padding: '14px 16px' }} className="bars">
            {catList.map(([cat, amt]) => (
              <div className="bar-row" key={cat}>
                <span style={{ fontSize: 20 }}>{CATEGORIES[cat].emoji}</span>
                <div className="bar-label">
                  <span className="ellipsis small">
                    {CATEGORIES[cat].label} · {pct((amt / totalCat) * 100)}
                  </span>
                  <div className="bar-track">
                    <span style={{ width: `${(amt / (catList[0]?.[1] || 1)) * 100}%`, background: CATEGORY_COLORS[cat] }} />
                  </div>
                </div>
                <span className="bar-value">{money(amt)}</span>
              </div>
            ))}
          </div>
        </Group>
      )}

      <Group header="Consejos para este hogar">
        {tips({ dti: debtToIncome(debtsMonthly + state.cards.reduce((a, c) => a + cardSummary(c, state.plans).minPayment, 0), income), savingsRate: summary.savingsRate, emergencyOk: Boolean(emergency && emergency.saved >= emergencyTarget), cardsHigh: state.cards.some((c) => c.limit > 0 && c.used / c.limit > 0.3), budgetsCount: state.budgets.length, wantsOver: nw.wants > dist.wants && dist.wants > 0, membersNoIncome: state.members.filter((m) => m.monthlyIncome === 0 && m.age >= 18).length }).map((t) => (
          <Row key={t.title} icon={t.emoji} iconColor="var(--fill)" label={t.title} sub={t.detail} />
        ))}
      </Group>

      <GoalSheet open={goalSheet !== null} goal={goalSheet === 'new' ? undefined : goalSheet ?? undefined} onClose={() => setGoalSheet(null)} onSaved={() => toast.show('Meta guardada')} />
      {toast.element}
    </Screen>
  );
}

function PlanRow({ label, plan, real, color, hint, moreIsBetter }: { label: string; plan: number; real: number; color: string; hint?: string; moreIsBetter?: boolean }) {
  const ratio = plan > 0 ? real / plan : 0;
  const over = ratio > 1 && !moreIsBetter;
  const reached = ratio >= 1 && moreIsBetter;
  return (
    <div className="row">
      <div className="row-main">
        <div className="flex between">
          <span className="row-label">{label}</span>
          <span className={`small num ${over ? 'neg' : reached ? 'pos' : 'muted'}`}>
            {money(real)} / {money(plan)}
          </span>
        </div>
        {hint && <div className="row-sub">{hint}</div>}
        <div className="mt8">
          <Progress value={ratio} color={over ? 'var(--red)' : reached ? 'var(--green)' : color} />
        </div>
      </div>
    </div>
  );
}

function tips(i: { dti: number; savingsRate: number; emergencyOk: boolean; cardsHigh: boolean; budgetsCount: number; wantsOver: boolean; membersNoIncome: number }) {
  const out: { emoji: string; title: string; detail: string }[] = [];
  if (!i.emergencyOk) out.push({ emoji: '🛟', title: 'Primero el fondo de emergencia', detail: 'Antes de metas grandes, junta al menos 3 meses de gastos. Evita que un imprevisto termine en la tarjeta.' });
  if (i.dti > 0.35) out.push({ emoji: '🧯', title: 'Reduce deuda antes de ahorrar más', detail: 'Más del 35% del ingreso se va a deudas. Usa la estrategia avalancha y evita nuevos meses sin intereses.' });
  if (i.cardsHigh) out.push({ emoji: '💳', title: 'Baja el uso de tus tarjetas', detail: 'Mantener menos del 30% de la línea mejora tu historial y evita que el pago mínimo te persiga.' });
  if (i.budgetsCount === 0) out.push({ emoji: '🎯', title: 'Define presupuestos por categoría', detail: 'Comida, súper y salidas son donde más se escapa el dinero. Un tope mensual ayuda a notarlo a tiempo.' });
  if (i.wantsOver) out.push({ emoji: '🍿', title: 'Los deseos superan el plan', detail: 'Este mes gastaron más en deseos de lo planeado. Revisen juntos qué recortar la próxima quincena.' });
  if (i.savingsRate < 0.1) out.push({ emoji: '💡', title: 'Págate primero', detail: 'El día que cae la nómina, pasa el ahorro a otra cuenta antes de gastar. Lo que no se ve, no se gasta.' });
  out.push({ emoji: '🗓️', title: 'Revisión mensual en pareja', detail: 'Dediquen 20 minutos cada quincena a revisar esta pantalla juntos. Las finanzas compartidas funcionan cuando ambos ven los mismos números.' });
  return out.slice(0, 4);
}

function GoalSheet({ open, goal, onClose, onSaved }: { open: boolean; goal?: SavingsGoal; onClose: () => void; onSaved: () => void }) {
  return <GoalSheetInner key={`${open}-${goal?.id ?? 'new'}`} open={open} goal={goal} onClose={onClose} onSaved={onSaved} />;
}

const GOAL_ICONS = ['🎯', '✈️', '🏠', '🚗', '🎓', '💍', '👶', '🛟', '🎁', '💻', '🏖️', '🐶'];

function GoalSheetInner({ open, goal, onClose, onSaved }: { open: boolean; goal?: SavingsGoal; onClose: () => void; onSaved: () => void }) {
  const { dispatch } = useStore();
  const [name, setName] = useState(goal?.name ?? '');
  const [icon, setIcon] = useState(goal?.icon ?? '🎯');
  const [target, setTarget] = useState(goal?.target ?? 0);
  const [saved, setSaved] = useState(goal?.saved ?? 0);
  const [deadline, setDeadline] = useState(goal?.deadline ?? '');
  const [hasDeadline, setHasDeadline] = useState(Boolean(goal?.deadline));
  const [deposit, setDeposit] = useState(0);
  const { confirm, element } = useConfirm();
  const valid = name.trim() && target > 0;
  const isNew = !goal || !goal.id;

  const save = () => {
    if (!valid) return;
    dispatch({ type: 'upsertGoal', goal: { id: goal?.id ?? uid('g'), name: name.trim(), icon, target, saved: saved + deposit, deadline: hasDeadline && deadline ? deadline : undefined, isEmergencyFund: goal?.isEmergencyFund } });
    success();
    onSaved();
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={isNew ? 'Nueva meta' : goal?.isEmergencyFund ? 'Fondo de emergencia' : 'Editar meta'} right={<NavButton bold onClick={save}><span style={{ opacity: valid ? 1 : 0.4 }}>Guardar</span></NavButton>}>
      {!goal?.isEmergencyFund && (
        <div className="chips mt12">
          {GOAL_ICONS.map((ic) => (
            <button key={ic} className={`chip ${ic === icon ? 'selected' : ''}`} onClick={() => setIcon(ic)} style={{ fontSize: 18, padding: '6px 10px' }}>
              {ic}
            </button>
          ))}
        </div>
      )}
      <Group>
        <TextField label="Nombre" value={name} onChange={setName} placeholder="Ej. Viaje a Cancún" autoFocus={isNew} testId="goal-name" />
        <AmountField label="Meta" value={target} onChange={setTarget} testId="goal-target" />
        <AmountField label="Ahorrado" value={saved} onChange={setSaved} allowZero />
        {!isNew && <AmountField label="Abonar ahora" value={deposit} onChange={setDeposit} testId="goal-deposit" />}
      </Group>
      {!goal?.isEmergencyFund && (
        <Group>
          <ToggleRow label="Tiene fecha límite" checked={hasDeadline} onChange={setHasDeadline} />
          {hasDeadline && <DateField label="Para cuándo" value={deadline} onChange={setDeadline} />}
        </Group>
      )}
      {!isNew && !goal?.isEmergencyFund && (
        <div className="mt24">
          <Button variant="destructive" block onClick={() => confirm({ title: '¿Eliminar meta?', destructive: true, onConfirm: () => { dispatch({ type: 'removeGoal', id: goal!.id }); onClose(); } })}>
            Eliminar meta
          </Button>
        </div>
      )}
      {element}
    </Sheet>
  );
}

export function Health() {
  const { state } = useStore();
  const { month } = useMonth();
  const summary = monthSummary(state, month);
  const totalLimit = state.cards.reduce((a, c) => a + c.limit, 0);
  const totalUsed = state.cards.reduce((a, c) => a + c.used, 0);
  const income = householdIncomeEstimate(state.members) || summary.income;
  const monthlyDebt = debtMonthlyTotal(state.debts) + state.cards.reduce((a, c) => a + cardSummary(c, state.plans).minPayment, 0);
  const budgets = budgetStatus(state.budgets, state.expenses, month);
  const emergency = state.goals.find((g) => g.isEmergencyFund);
  const h = healthScore({
    savingsRate: summary.savingsRate,
    avgUtilization: totalLimit ? totalUsed / totalLimit : 0,
    dti: debtToIncome(monthlyDebt, income),
    budgetsExceeded: budgets.filter((b) => b.status === 'excedido').length,
    budgetsTotal: budgets.length,
    emergencyProgress: emergency ? goalProgress(emergency) : 0,
  });
  const color = h.score >= 80 ? 'var(--green)' : h.score >= 60 ? 'var(--blue)' : h.score >= 40 ? 'var(--orange)' : 'var(--red)';
  return (
    <Screen title="Salud financiera" back>
      <div className="card center">
        <Ring value={h.score / 100} size={140} stroke={12} color={color}>
          <div>
            <div className="bold" style={{ fontSize: 40 }}>
              {h.score}
            </div>
            <div className="small muted">de 100</div>
          </div>
        </Ring>
        <div className="bold mt12" style={{ fontSize: 20 }}>
          {h.label}
        </div>
        <div className="small muted">Calculado con los datos de {monthLabel(month)}</div>
      </div>
      <Group header="Cómo se calcula" footer="El puntaje combina ahorro, uso de crédito, carga de deuda, cumplimiento de presupuestos y fondo de emergencia.">
        {h.factors.map((f) => (
          <div className="row" key={f.name}>
            <div className="row-main">
              <div className="flex between">
                <span className="row-label">{f.name}</span>
                <span className="row-value strong">
                  {f.points}/{f.max}
                </span>
              </div>
              <div className="row-sub">{f.detail}</div>
              <div className="mt8">
                <Progress value={f.points / f.max} color={color} />
              </div>
            </div>
          </div>
        ))}
      </Group>
    </Screen>
  );
}
