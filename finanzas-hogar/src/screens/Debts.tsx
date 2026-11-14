import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useNav } from '@/lib/nav';
import { AmountField, Badge, Button, DateField, EmptyState, Group, NavButton, NumberField, Progress, Row, Screen, Segmented, SelectField, Sheet, TextArea, TextField, useConfirm, useToast } from '@/components/ui';
import { Plus } from '@/components/icons';
import { amortize, cardSummary, debtMonthlyTotal, debtsOrdered, householdIncomeEstimate, debtToIncome } from '@/lib/finance';
import { money, pct } from '@/lib/format';
import { nextOccurrence, relativeDays, shortDate, todayISO, daysBetween } from '@/lib/dates';
import { DEBT_KIND_LABELS, type Debt, type DebtKind } from '@/lib/types';
import { uid } from '@/lib/id';
import { success } from '@/lib/haptics';
import { getIssuer } from '@/lib/cards';

const KIND_EMOJI: Record<DebtKind, string> = { personal: '🏦', auto: '🚗', hipoteca: '🏠', familiar: '👨‍👩‍👧', estudiantil: '🎓', nomina: '💼', otro: '📄' };

export function Debts() {
  const { state, dispatch } = useStore();
  const nav = useNav();
  const live = state.debts.filter((d) => d.balance > 0);
  const paid = state.debts.filter((d) => d.balance <= 0);
  const totalBalance = live.reduce((a, d) => a + d.balance, 0);
  const monthly = debtMonthlyTotal(state.debts);
  const cardMin = state.cards.reduce((a, c) => a + cardSummary(c, state.plans).minPayment, 0);
  const cardUsed = state.cards.reduce((a, c) => a + c.used, 0);
  const income = householdIncomeEstimate(state.members);
  const dti = debtToIncome(monthly + cardMin, income);
  const ordered = debtsOrdered(state.debts, state.plan.debtStrategy);

  return (
    <Screen
      root
      tabbar
      large
      title="Deudas"
      right={
        <NavButton ariaLabel="Agregar deuda" onClick={() => nav.push({ name: 'debt-form' })}>
          <Plus size={24} />
        </NavButton>
      }
    >
      {state.debts.length === 0 && state.cards.length === 0 ? (
        <EmptyState emoji="🧮" title="Sin deudas registradas" text="Registra préstamos personales, crédito de auto, hipoteca o lo que le deben a alguien. Te diremos cuándo terminas de pagar y cuánto te cuesta en intereses." action={<Button onClick={() => nav.push({ name: 'debt-form' })} testId="debts-add">Agregar deuda</Button>} />
      ) : (
        <>
          <div className="card">
            <div className="card-title">Deuda total</div>
            <div className="num bold" style={{ fontSize: 32 }} data-testid="debt-total">
              {money(totalBalance + cardUsed)}
            </div>
            <div className="small muted">
              {money(totalBalance)} en préstamos + {money(cardUsed)} en tarjetas
            </div>
            <div className="hero-grid" style={{ marginTop: 12 }}>
              <div className="stat" style={{ background: 'var(--fill-2)' }}>
                <div className="stat-label muted">Pago mensual</div>
                <div className="stat-value num">{money(monthly + cardMin, { compact: true })}</div>
              </div>
              <div className="stat" style={{ background: 'var(--fill-2)' }}>
                <div className="stat-label muted">Deuda / ingreso</div>
                <div className={`stat-value num ${dti > 0.4 ? 'neg' : dti > 0.2 ? 'warn' : 'pos'}`}>{pct(dti * 100)}</div>
              </div>
              <div className="stat" style={{ background: 'var(--fill-2)' }}>
                <div className="stat-label muted">Préstamos</div>
                <div className="stat-value num">{live.length}</div>
              </div>
            </div>
            <div className="small muted mt12">{dti > 0.4 ? 'Más del 40% del ingreso se va a deudas: zona de riesgo. Prioriza liquidar.' : dti > 0.2 ? 'Entre 20% y 40%: manejable, pero evita nuevas deudas.' : 'Menos del 20% del ingreso va a deudas. Vas bien.'}</div>
          </div>

          {live.length > 0 && (
            <Group
              header="Orden sugerido para liquidar"
              footer={state.plan.debtStrategy === 'avalancha' ? 'Avalancha: primero la de mayor tasa. Es la que menos intereses te cobra en total.' : 'Bola de nieve: primero la más pequeña. Motiva ver deudas desaparecer rápido.'}
            >
              <div style={{ padding: 12 }}>
                <Segmented
                  value={state.plan.debtStrategy}
                  onChange={(v) => dispatch({ type: 'setPlan', plan: { debtStrategy: v } })}
                  options={[
                    { value: 'avalancha', label: 'Avalancha (menos interés)' },
                    { value: 'bola-de-nieve', label: 'Bola de nieve (más rápido)' },
                  ]}
                />
              </div>
              {ordered.map((d, i) => {
                const a = amortize(d.balance, d.annualRate, d.monthlyPayment);
                return (
                  <Row
                    key={d.id}
                    icon={<span style={{ fontWeight: 700 }}>{i + 1}</span>}
                    iconColor={i === 0 ? 'var(--red)' : 'var(--gray)'}
                    label={d.name}
                    sub={`${pct(d.annualRate)} anual · ${a.coversInterest ? `${a.months} meses` : 'no se liquida'}`}
                    value={money(d.balance)}
                    valueClass="strong"
                    onClick={() => nav.push({ name: 'debt', id: d.id })}
                    chevron
                  />
                );
              })}
            </Group>
          )}

          {live.length > 0 && (
            <Group header="Préstamos activos">
              {live.map((d) => {
                const progress = d.principal > 0 ? 1 - d.balance / d.principal : 0;
                const next = nextOccurrence(d.payDay);
                return (
                  <div className="row tappable" key={d.id} onClick={() => nav.push({ name: 'debt', id: d.id })} role="button">
                    <span className="row-icon" style={{ background: 'var(--indigo)' }}>
                      {KIND_EMOJI[d.kind]}
                    </span>
                    <div className="row-main">
                      <div className="flex between">
                        <span className="row-label">{d.name}</span>
                        <span className="row-value strong">{money(d.balance)}</span>
                      </div>
                      <div className="row-sub">
                        {money(d.monthlyPayment)}/mes · próximo {shortDate(next)} ({relativeDays(daysBetween(new Date(), next))})
                      </div>
                      <div className="mt8">
                        <Progress value={progress} color="var(--indigo)" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </Group>
          )}

          {state.cards.length > 0 && (
            <Group header="Tarjetas de crédito" footer="El saldo de tarjetas también es deuda. Pagar el total cada mes evita intereses.">
              {state.cards
                .filter((c) => c.used > 0)
                .map((c) => (
                  <Row key={c.id} icon={<span style={{ fontSize: 10, fontWeight: 800 }}>{getIssuer(c.issuer).logo.slice(0, 4)}</span>} iconColor={getIssuer(c.issuer).bg} label={c.nickname || getIssuer(c.issuer).name} sub={`${pct(c.annualRate)} anual`} value={money(c.used)} onClick={() => nav.push({ name: 'card', id: c.id })} chevron />
                ))}
              {state.cards.every((c) => c.used <= 0) && <Row label="Todas tus tarjetas están en ceros 🎉" />}
            </Group>
          )}

          {paid.length > 0 && (
            <Group header="Liquidadas">
              {paid.map((d) => (
                <Row key={d.id} icon="🎉" iconColor="var(--green)" label={d.name} sub={DEBT_KIND_LABELS[d.kind]} value={<Badge tone="green">Pagada</Badge>} onClick={() => nav.push({ name: 'debt', id: d.id })} chevron />
              ))}
            </Group>
          )}
        </>
      )}
    </Screen>
  );
}

export function DebtDetail({ id }: { id: string }) {
  const { state, dispatch } = useStore();
  const nav = useNav();
  const debt = state.debts.find((d) => d.id === id);
  const [paySheet, setPaySheet] = useState(false);
  const { confirm, element } = useConfirm();
  const toast = useToast();
  if (!debt) {
    return (
      <Screen title="Deuda" back>
        <EmptyState emoji="🤷" title="Deuda no encontrada" />
      </Screen>
    );
  }
  const a = amortize(debt.balance, debt.annualRate, debt.monthlyPayment);
  const extra = amortize(debt.balance, debt.annualRate, debt.monthlyPayment * 1.25);
  const payments = state.debtPayments.filter((p) => p.debtId === debt.id).sort((x, y) => (x.date < y.date ? 1 : -1));
  const progress = debt.principal > 0 ? 1 - debt.balance / debt.principal : 0;
  const member = state.members.find((m) => m.id === debt.memberId);

  return (
    <Screen title={debt.name} back="Deudas" right={<NavButton onClick={() => nav.push({ name: 'debt-form', id: debt.id })}>Editar</NavButton>}>
      <div className="card">
        <div className="card-title">
          {KIND_EMOJI[debt.kind]} {DEBT_KIND_LABELS[debt.kind]}
          {member ? ` · ${member.name}` : ''}
        </div>
        <div className="num bold" style={{ fontSize: 32 }}>
          {money(debt.balance)}
        </div>
        <div className="small muted">
          de {money(debt.principal)} originales · {pct(progress * 100)} pagado
        </div>
        <div className="mt12">
          <Progress value={progress} color="var(--indigo)" thick />
        </div>
      </div>

      {debt.balance > 0 && (
        <div className="fab-row">
          <Button variant="success" onClick={() => setPaySheet(true)} testId="debt-pay">
            Registrar pago
          </Button>
          <Button variant="gray" onClick={() => nav.push({ name: 'debt-form', id: debt.id })}>
            Ajustar plan
          </Button>
        </div>
      )}

      <Group header="Proyección" footer={a.coversInterest ? `Si pagas ${money(debt.monthlyPayment * 1.25)} al mes (25% más) terminarías en ${extra.months} meses y ahorrarías ${money(a.totalInterest - extra.totalInterest)} en intereses.` : 'El pago mensual no alcanza a cubrir los intereses. Aumenta el pago para que la deuda baje.'}>
        <Row label="Pago mensual" value={money(debt.monthlyPayment)} valueClass="strong" />
        <Row label="Tasa anual" value={pct(debt.annualRate)} />
        <Row label="Interés del próximo mes" value={money(a.firstInterest)} valueClass="neg" />
        <Row label="Meses para liquidar" value={a.coversInterest ? `${a.months}` : '∞'} valueClass={a.coversInterest ? 'strong' : 'neg'} />
        <Row label="Intereses totales restantes" value={a.coversInterest ? money(a.totalInterest) : '—'} />
        <Row label="Día de pago" value={`Día ${debt.payDay}`} />
      </Group>

      {debt.note && (
        <Group header="Notas">
          <Row label={debt.note} />
        </Group>
      )}

      <Group header={`Pagos registrados (${payments.length})`}>
        {payments.length === 0 && <Row label="Aún no registras pagos" />}
        {payments.map((p) => (
          <Row
            key={p.id}
            icon="💸"
            iconColor="var(--green)"
            label={money(p.amount)}
            sub={shortDate(p.date)}
            onClick={() => confirm({ title: 'Eliminar pago', message: 'El saldo de la deuda volverá a subir.', destructive: true, onConfirm: () => dispatch({ type: 'removeDebtPayment', id: p.id }) })}
          />
        ))}
      </Group>

      <div className="mt24">
        <Button variant="destructive" block onClick={() => confirm({ title: '¿Eliminar deuda?', message: 'Se borrará junto con su historial de pagos.', destructive: true, onConfirm: () => { dispatch({ type: 'removeDebt', id: debt.id }); nav.pop(); } })}>
          Eliminar deuda
        </Button>
      </div>

      <PayDebtSheet open={paySheet} onClose={() => setPaySheet(false)} debt={debt} onSaved={() => toast.show('Pago registrado')} />
      {element}
      {toast.element}
    </Screen>
  );
}

function PayDebtSheet({ open, onClose, debt, onSaved }: { open: boolean; onClose: () => void; debt: Debt; onSaved: () => void }) {
  return <PayDebtInner key={String(open)} open={open} onClose={onClose} debt={debt} onSaved={onSaved} />;
}
function PayDebtInner({ open, onClose, debt, onSaved }: { open: boolean; onClose: () => void; debt: Debt; onSaved: () => void }) {
  const { state, dispatch } = useStore();
  const [amount, setAmount] = useState(Math.min(debt.monthlyPayment, debt.balance));
  const [date, setDate] = useState(todayISO());
  const [memberId, setMemberId] = useState(debt.memberId ?? state.members[0]?.id ?? '');
  const valid = amount > 0;
  const save = () => {
    if (!valid) return;
    dispatch({ type: 'payDebt', payment: { id: uid('dp'), debtId: debt.id, amount, date, memberId: memberId || undefined } });
    success();
    onSaved();
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Registrar pago" right={<NavButton bold onClick={save}><span style={{ opacity: valid ? 1 : 0.4 }}>Guardar</span></NavButton>}>
      <Group footer="El pago reduce el saldo de la deuda y cuenta como salida de efectivo del mes.">
        <AmountField label="Monto" value={amount} onChange={setAmount} testId="debt-pay-amount" />
        <DateField label="Fecha" value={date} onChange={setDate} />
        {state.members.length > 0 && <SelectField label="Quién paga" value={memberId} onChange={setMemberId} options={[{ value: '', label: 'Sin asignar' }, ...state.members.map((m) => ({ value: m.id, label: m.name }))]} />}
      </Group>
    </Sheet>
  );
}

export function DebtForm({ id }: { id?: string }) {
  const { state, dispatch } = useStore();
  const nav = useNav();
  const existing = state.debts.find((d) => d.id === id);
  const [name, setName] = useState(existing?.name ?? '');
  const [kind, setKind] = useState<DebtKind>(existing?.kind ?? 'personal');
  const [principal, setPrincipal] = useState(existing?.principal ?? 0);
  const [balance, setBalance] = useState(existing?.balance ?? 0);
  const [rate, setRate] = useState(existing?.annualRate ?? 0);
  const [monthly, setMonthly] = useState(existing?.monthlyPayment ?? 0);
  const [payDay, setPayDay] = useState(existing?.payDay ?? 1);
  const [memberId, setMemberId] = useState(existing?.memberId ?? state.members[0]?.id ?? '');
  const [startDate, setStartDate] = useState(existing?.startDate ?? todayISO());
  const [note, setNote] = useState(existing?.note ?? '');
  const [touchedBalance, setTouchedBalance] = useState(Boolean(existing));

  const effBalance = touchedBalance ? balance : principal;
  const valid = name.trim() && principal > 0 && monthly > 0 && payDay >= 1 && payDay <= 31;
  const a = amortize(effBalance, rate, monthly);

  const save = () => {
    if (!valid) return;
    dispatch({ type: 'upsertDebt', debt: { id: existing?.id ?? uid('d'), name: name.trim(), kind, principal, balance: effBalance, annualRate: rate, monthlyPayment: monthly, payDay, memberId: memberId || undefined, startDate, note: note.trim() || undefined } });
    success();
    nav.pop();
  };

  return (
    <Screen title={existing ? 'Editar deuda' : 'Nueva deuda'} back right={<NavButton bold onClick={save}><span style={{ opacity: valid ? 1 : 0.4 }}>Guardar</span></NavButton>}>
      <Group header="Descripción">
        <TextField label="Nombre" value={name} onChange={setName} placeholder="Ej. Préstamo auto, Le debo a mamá" autoFocus={!existing} testId="debt-name" />
        <SelectField label="Tipo" value={kind} onChange={setKind} options={(Object.keys(DEBT_KIND_LABELS) as DebtKind[]).map((k) => ({ value: k, label: `${KIND_EMOJI[k]} ${DEBT_KIND_LABELS[k]}` }))} />
        {state.members.length > 0 && <SelectField label="De quién" value={memberId} onChange={setMemberId} options={[{ value: '', label: 'Compartida' }, ...state.members.map((m) => ({ value: m.id, label: m.name }))]} />}
      </Group>
      <Group header="Montos" footer={principal > 0 && monthly > 0 ? (a.coversInterest ? `Se liquida en ${a.months} meses pagando ${money(a.totalInterest)} de intereses.` : 'Con este pago mensual los intereses no se cubren: la deuda crecería.') : 'Si es préstamo familiar sin intereses, deja la tasa en 0.'}>
        <AmountField label="Monto original" value={principal} onChange={(v) => { setPrincipal(v); if (!touchedBalance) setBalance(v); }} testId="debt-principal" />
        <AmountField label="Saldo actual" value={effBalance} onChange={(v) => { setBalance(v); setTouchedBalance(true); }} allowZero testId="debt-balance" />
        <NumberField label="Tasa anual" value={rate} min={0} max={300} onChange={setRate} suffix="%" />
        <AmountField label="Pago mensual" value={monthly} onChange={setMonthly} testId="debt-monthly" />
      </Group>
      <Group header="Fechas">
        <NumberField label="Día de pago" value={payDay} min={1} max={31} onChange={setPayDay} />
        <DateField label="Inicio" value={startDate} onChange={setStartDate} />
      </Group>
      <Group>
        <TextArea label="Notas" value={note} onChange={setNote} placeholder="Opcional" />
      </Group>
      <div className="mt24">
        <Button block onClick={save} disabled={!valid} testId="debt-save">
          {existing ? 'Guardar cambios' : 'Agregar deuda'}
        </Button>
      </div>
    </Screen>
  );
}
