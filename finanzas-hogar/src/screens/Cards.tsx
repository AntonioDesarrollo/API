import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { useNav } from '@/lib/nav';
import { AmountField, Badge, Button, DateField, EmptyState, Group, NavButton, NumberField, Progress, Row, Screen, Segmented, SelectField, Sheet, TextField, ToggleRow, useConfirm, useToast } from '@/components/ui';
import { CardVisual } from '@/components/CardVisual';
import { Plus } from '@/components/icons';
import { cardSummary, installmentMonthlyPayment, installmentProgress } from '@/lib/finance';
import { getIssuer, ISSUERS, NETWORK_LABELS } from '@/lib/cards';
import { money, pct } from '@/lib/format';
import { relativeDays, shortDate, todayISO } from '@/lib/dates';
import type { CardNetwork, CreditCard, InstallmentPlan } from '@/lib/types';
import { uid } from '@/lib/id';
import { ExpenseForm } from './Movements';
import { success } from '@/lib/haptics';

export function Cards() {
  const { state } = useStore();
  const nav = useNav();
  const totalLimit = state.cards.reduce((a, c) => a + c.limit, 0);
  const totalUsed = state.cards.reduce((a, c) => a + c.used, 0);
  const summaries = useMemo(() => state.cards.map((c) => cardSummary(c, state.plans)), [state.cards, state.plans]);
  const totalDue = summaries.reduce((a, s) => a + s.payNoInterest, 0);

  return (
    <Screen
      root
      tabbar
      large
      title="Tarjetas"
      right={
        <NavButton ariaLabel="Agregar tarjeta" onClick={() => nav.push({ name: 'card-form' })}>
          <Plus size={24} />
        </NavButton>
      }
    >
      {state.cards.length === 0 ? (
        <EmptyState emoji="💳" title="Sin tarjetas" text="Agrega tus tarjetas de crédito. Elige el banco y la tarjeta tomará su diseño automáticamente." action={<Button onClick={() => nav.push({ name: 'card-form' })} testId="cards-add">Agregar tarjeta</Button>} />
      ) : (
        <>
          <Group header="Resumen">
            <Row label="Usado en total" value={money(totalUsed)} valueClass="strong" />
            <Row label="Línea total" value={money(totalLimit)} />
            <Row label="Disponible" value={money(totalLimit - totalUsed)} valueClass="pos" />
            <Row label="Para no generar intereses" sub="Suma de todas las tarjetas" value={money(totalDue)} valueClass="strong" />
          </Group>
          <div className="mt16 col" style={{ gap: 16 }}>
            {summaries.map((s) => {
              const holder = state.members.find((m) => m.id === s.card.holderMemberId);
              return (
                <div key={s.card.id}>
                  <CardVisual card={s.card} holder={holder} onClick={() => nav.push({ name: 'card', id: s.card.id })} />
                  <div className="flex between mt8" style={{ padding: '0 4px' }}>
                    <span className="small muted">
                      Disponible <b className="num" style={{ color: 'var(--label)' }}>{money(s.available)}</b>
                    </span>
                    <span className="small muted">
                      Corte {shortDate(s.nextCut)} · Pago {shortDate(s.nextPay)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Screen>
  );
}

export function CardDetail({ id }: { id: string }) {
  const { state, dispatch } = useStore();
  const nav = useNav();
  const card = state.cards.find((c) => c.id === id);
  const [sheet, setSheet] = useState<'plan' | 'pago' | 'gasto' | null>(null);
  const { confirm, element } = useConfirm();
  const toast = useToast();
  if (!card) {
    return (
      <Screen title="Tarjeta" back>
        <EmptyState emoji="🤷" title="Tarjeta no encontrada" />
      </Screen>
    );
  }
  const issuer = getIssuer(card.issuer);
  const s = cardSummary(card, state.plans);
  const plans = state.plans.filter((p) => p.cardId === card.id).map((p) => ({ plan: p, progress: installmentProgress(p) }));
  const holder = state.members.find((m) => m.id === card.holderMemberId);
  const utilColor = s.utilization > 0.7 ? 'var(--red)' : s.utilization > 0.3 ? 'var(--orange)' : 'var(--green)';
  const recentExpenses = state.expenses.filter((e) => e.payment.cardId === card.id).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);
  const recentPayments = state.cardPayments.filter((p) => p.cardId === card.id).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3);

  return (
    <Screen title={card.nickname || issuer.name} back="Tarjetas" right={<NavButton onClick={() => nav.push({ name: 'card-form', id: card.id })}>Editar</NavButton>}>
      <div className="mt16">
        <CardVisual card={card} holder={holder} />
      </div>

      <div className="card">
        <div className="flex between">
          <div>
            <div className="card-title">Usado</div>
            <div className="num bold" style={{ fontSize: 28 }}>
              {money(card.used)}
            </div>
            <div className="small muted">de {money(card.limit)}</div>
          </div>
          <div className="center">
            <div className="card-title">Disponible</div>
            <div className="num bold" style={{ fontSize: 22, color: 'var(--green)' }}>
              {money(s.available)}
            </div>
          </div>
        </div>
        <div className="mt12">
          <Progress value={s.utilization} color={utilColor} thick />
        </div>
        <div className="flex between mt8 small muted">
          <span>Uso de la línea: {pct(s.utilization * 100)}</span>
          <Badge tone={s.utilization > 0.7 ? 'red' : s.utilization > 0.3 ? 'orange' : 'green'}>{s.utilization > 0.7 ? 'Alto' : s.utilization > 0.3 ? 'Moderado' : 'Saludable'}</Badge>
        </div>
      </div>

      <div className="fab-row">
        <Button variant="gray" onClick={() => setSheet('gasto')} testId="card-add-expense">
          − Compra
        </Button>
        <Button variant="success" onClick={() => setSheet('pago')} testId="card-pay">
          Registrar pago
        </Button>
      </div>

      <Group header="Fechas y pagos" footer="El pago mínimo es una estimación (1.5% del saldo revolvente + intereses, mínimo 1.25% de la línea). Revisa tu estado de cuenta.">
        <Row icon="✂️" iconColor="var(--gray)" label="Fecha de corte" sub={relativeDays(s.daysToCut)} value={shortDate(s.nextCut)} />
        <Row icon="📅" iconColor={s.daysToPay <= 3 && card.used > 0 ? 'var(--orange)' : 'var(--gray)'} label="Fecha límite de pago" sub={relativeDays(s.daysToPay)} value={shortDate(s.nextPay)} />
        <Row icon="✅" iconColor="var(--green)" label="Pago para no generar intereses" sub={s.installmentsDue > 0 ? `Incluye ${money(s.installmentsDue)} de mensualidades` : 'Saldo total del periodo'} value={money(s.payNoInterest)} valueClass="strong" />
        <Row icon="⚠️" iconColor="var(--orange)" label="Pago mínimo (estimado)" sub={s.monthlyInterestIfMin > 0 ? `Generaría ~${money(s.monthlyInterestIfMin)} de interés con IVA` : 'Sin intereses'} value={money(s.minPayment)} />
        <Row icon="%" iconColor="var(--indigo)" label="Tasa anual" value={pct(card.annualRate)} />
      </Group>

      <Group header="Compras a meses" action={{ label: '+ Agregar', onClick: () => setSheet('plan') }} footer={plans.length ? `Saldo pendiente a meses: ${money(s.installmentsOutstanding)}. Este mes vencen ${money(s.installmentsDue)}.` : 'Registra compras a meses sin intereses (MSI) o con intereses para saber cuánto pagas cada mes.'}>
        {plans.length === 0 && <Row label="Sin compras a meses" />}
        {plans.map(({ plan, progress }) => (
          <div className="row" key={plan.id}>
            <div className="row-main">
              <div className="flex between">
                <span className="row-label">{plan.description}</span>
                <span className="row-value strong">{money(progress.monthly)}/mes</span>
              </div>
              <div className="row-sub">
                {progress.done ? 'Liquidado' : `${progress.paidMonths} de ${plan.months} pagados · faltan ${money(progress.remainingBalance)}`}
                {plan.interestFree ? ' · MSI' : ` · ${plan.annualRate}% anual`}
              </div>
              <div className="mt8">
                <Progress value={progress.paidMonths / plan.months} color={progress.done ? 'var(--green)' : 'var(--blue)'} />
              </div>
            </div>
            <button
              className="small"
              style={{ color: 'var(--red)', padding: 8 }}
              onClick={() =>
                confirm({
                  title: '¿Eliminar plan?',
                  message: 'No se modifica el saldo usado de la tarjeta.',
                  destructive: true,
                  onConfirm: () => dispatch({ type: 'removePlan', id: plan.id }),
                })
              }
            >
              Quitar
            </button>
          </div>
        ))}
      </Group>

      {(recentExpenses.length > 0 || recentPayments.length > 0) && (
        <Group header="Últimos movimientos">
          {recentPayments.map((p) => (
            <Row key={p.id} icon="💸" iconColor="var(--green)" label="Pago a la tarjeta" sub={shortDate(p.date)} value={`+${money(p.amount)}`} valueClass="pos" />
          ))}
          {recentExpenses.map((e) => (
            <Row key={e.id} icon="🛍️" iconColor="var(--gray)" label={e.note || 'Compra'} sub={shortDate(e.date)} value={`−${money(e.amount)}`} />
          ))}
        </Group>
      )}

      <div className="mt24">
        <Button
          variant="destructive"
          block
          onClick={() =>
            confirm({
              title: '¿Eliminar tarjeta?',
              message: 'Se eliminarán también sus planes a meses y pagos registrados.',
              destructive: true,
              onConfirm: () => {
                dispatch({ type: 'removeCard', id: card.id });
                nav.pop();
              },
            })
          }
        >
          Eliminar tarjeta
        </Button>
      </div>

      <PlanForm open={sheet === 'plan'} onClose={() => setSheet(null)} card={card} onSaved={() => toast.show('Plan agregado')} />
      <PayCardSheet open={sheet === 'pago'} onClose={() => setSheet(null)} card={card} suggested={s.payNoInterest} minimum={s.minPayment} onSaved={() => toast.show('Pago registrado')} />
      <ExpenseForm open={sheet === 'gasto'} onClose={() => setSheet(null)} defaultCardId={card.id} onSaved={() => toast.show('Compra registrada')} />
      {element}
      {toast.element}
    </Screen>
  );
}

function PlanForm({ open, onClose, card, onSaved }: { open: boolean; onClose: () => void; card: CreditCard; onSaved: () => void }) {
  return <PlanFormInner key={String(open)} open={open} onClose={onClose} card={card} onSaved={onSaved} />;
}

function PlanFormInner({ open, onClose, card, onSaved }: { open: boolean; onClose: () => void; card: CreditCard; onSaved: () => void }) {
  const { dispatch } = useStore();
  const [description, setDescription] = useState('');
  const [total, setTotal] = useState(0);
  const [months, setMonths] = useState(12);
  const [interestFree, setInterestFree] = useState(true);
  const [rate, setRate] = useState(card.annualRate);
  const [startDate, setStartDate] = useState(todayISO());
  const [addToUsed, setAddToUsed] = useState(true);
  const valid = description.trim() && total > 0 && months > 0;
  const monthly = installmentMonthlyPayment({ total, months, interestFree, annualRate: rate });

  const save = () => {
    if (!valid) return;
    const plan: InstallmentPlan = { id: uid('p'), cardId: card.id, description: description.trim(), total, months, interestFree, annualRate: interestFree ? undefined : rate, startDate };
    if (addToUsed) dispatch({ type: 'addPlan', plan });
    else {
      dispatch({ type: 'addPlan', plan: { ...plan } });
      // revertir el incremento del saldo cuando la compra ya estaba contemplada en "usado"
      dispatch({ type: 'upsertCard', card: { ...card } });
    }
    success();
    onSaved();
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Compra a meses" right={<NavButton bold onClick={save}><span style={{ opacity: valid ? 1 : 0.4 }}>Guardar</span></NavButton>}>
      <Group footer={total > 0 ? `Pagarás ${money(monthly)} al mes durante ${months} meses (total ${money(monthly * months)}).` : undefined}>
        <TextField label="Concepto" value={description} onChange={setDescription} placeholder="Ej. Pantalla, viaje…" autoFocus testId="plan-desc" />
        <AmountField label="Monto total" value={total} onChange={setTotal} testId="plan-total" />
        <div style={{ padding: 12 }}>
          <Segmented value={String(months)} onChange={(v) => setMonths(Number(v))} options={[3, 6, 9, 12, 18, 24].map((m) => ({ value: String(m), label: `${m}` }))} />
        </div>
        <NumberField label="Meses" value={months} min={1} max={120} onChange={setMonths} />
        <DateField label="Primera mensualidad" value={startDate} onChange={setStartDate} />
      </Group>
      <Group>
        <ToggleRow label="Sin intereses (MSI)" checked={interestFree} onChange={setInterestFree} />
        {!interestFree && <NumberField label="Tasa anual" value={rate} min={0} max={200} onChange={setRate} suffix="%" />}
        <ToggleRow label="Sumar al saldo usado" sub="Desactiva si la compra ya está contemplada en el saldo de la tarjeta" checked={addToUsed} onChange={setAddToUsed} />
      </Group>
    </Sheet>
  );
}

function PayCardSheet({ open, onClose, card, suggested, minimum, onSaved }: { open: boolean; onClose: () => void; card: CreditCard; suggested: number; minimum: number; onSaved: () => void }) {
  return <PayCardInner key={String(open)} open={open} onClose={onClose} card={card} suggested={suggested} minimum={minimum} onSaved={onSaved} />;
}

function PayCardInner({ open, onClose, card, suggested, minimum, onSaved }: { open: boolean; onClose: () => void; card: CreditCard; suggested: number; minimum: number; onSaved: () => void }) {
  const { state, dispatch } = useStore();
  const [amount, setAmount] = useState(suggested);
  const [date, setDate] = useState(todayISO());
  const [memberId, setMemberId] = useState(card.holderMemberId ?? state.members[0]?.id ?? '');
  const valid = amount > 0;
  const save = () => {
    if (!valid) return;
    dispatch({ type: 'payCard', payment: { id: uid('cp'), cardId: card.id, amount, date, memberId: memberId || undefined } });
    success();
    onSaved();
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Registrar pago" right={<NavButton bold onClick={save}><span style={{ opacity: valid ? 1 : 0.4 }}>Guardar</span></NavButton>}>
      <div className="chips mt12">
        <button className={`chip ${amount === suggested ? 'selected' : ''}`} onClick={() => setAmount(suggested)}>
          Sin intereses · {money(suggested)}
        </button>
        <button className={`chip ${amount === minimum ? 'selected' : ''}`} onClick={() => setAmount(minimum)}>
          Mínimo · {money(minimum)}
        </button>
        <button className={`chip ${amount === card.used ? 'selected' : ''}`} onClick={() => setAmount(card.used)}>
          Todo · {money(card.used)}
        </button>
      </div>
      <Group footer="El pago reduce el saldo usado de la tarjeta y se registra como salida de efectivo del mes.">
        <AmountField label="Monto" value={amount} onChange={setAmount} testId="pay-amount" />
        <DateField label="Fecha" value={date} onChange={setDate} />
        {state.members.length > 0 && <SelectField label="Quién paga" value={memberId} onChange={setMemberId} options={[{ value: '', label: 'Sin asignar' }, ...state.members.map((m) => ({ value: m.id, label: m.name }))]} />}
      </Group>
    </Sheet>
  );
}

export function CardForm({ id }: { id?: string }) {
  const { state, dispatch } = useStore();
  const nav = useNav();
  const existing = state.cards.find((c) => c.id === id);
  const [issuerKey, setIssuerKey] = useState(existing?.issuer ?? 'nu');
  const issuer = getIssuer(issuerKey);
  const [nickname, setNickname] = useState(existing?.nickname ?? '');
  const [last4, setLast4] = useState(existing?.last4 ?? '');
  const [network, setNetwork] = useState<CardNetwork>(existing?.network ?? issuer.network);
  const [limit, setLimit] = useState(existing?.limit ?? 0);
  const [used, setUsed] = useState(existing?.used ?? 0);
  const [cutDay, setCutDay] = useState(existing?.cutDay ?? 15);
  const [payDay, setPayDay] = useState(existing?.payDay ?? 5);
  const [rate, setRate] = useState(existing?.annualRate ?? issuer.typicalRate);
  const [holder, setHolder] = useState(existing?.holderMemberId ?? state.members[0]?.id ?? '');
  const [customColor, setCustomColor] = useState(existing?.customColor ?? '#4b5563');
  const [filter, setFilter] = useState('');

  const preview: CreditCard = { id: existing?.id ?? 'preview', issuer: issuerKey, nickname, last4, network, limit, used, cutDay, payDay, annualRate: rate, holderMemberId: holder || undefined, customColor: issuerKey === 'otro' ? customColor : undefined };
  const valid = limit > 0 && cutDay >= 1 && cutDay <= 31 && payDay >= 1 && payDay <= 31;

  const pickIssuer = (key: string) => {
    const iss = getIssuer(key);
    setIssuerKey(key);
    if (!existing) {
      setNetwork(iss.network);
      setRate(iss.typicalRate);
    }
  };

  const save = () => {
    if (!valid) return;
    dispatch({ type: 'upsertCard', card: { ...preview, id: existing?.id ?? uid('c'), nickname: nickname.trim() || undefined, last4: last4.trim() || undefined } });
    success();
    nav.pop();
  };

  const visibleIssuers = ISSUERS.filter((i) => i.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <Screen title={existing ? 'Editar tarjeta' : 'Nueva tarjeta'} back right={<NavButton bold onClick={save}><span style={{ opacity: valid ? 1 : 0.4 }} data-testid="card-save">Guardar</span></NavButton>}>
      <div className="mt16">
        <CardVisual card={preview} holder={state.members.find((m) => m.id === holder)} />
      </div>

      <Group header="Banco o emisor" footer="Al elegir el banco, la tarjeta toma automáticamente sus colores, red y tasa típica.">
        <div className="row-field">
          <label>Buscar</label>
          <div className="field-input">
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Nu, BBVA, Banorte…" />
          </div>
        </div>
        <div style={{ padding: '0 12px 12px' }}>
          <div className="issuer-grid">
            {visibleIssuers.map((i) => (
              <button key={i.key} className={i.key === issuerKey ? 'selected' : ''} onClick={() => pickIssuer(i.key)} data-testid={`issuer-${i.key}`}>
                <CardVisual card={{ ...preview, issuer: i.key, customColor: i.key === 'otro' ? customColor : undefined }} size="mini" />
                <div className="issuer-name">{i.name}</div>
              </button>
            ))}
          </div>
        </div>
        {issuerKey === 'otro' && (
          <div className="row-field">
            <label>Color</label>
            <div className="field-input">
              <input type="color" value={customColor} onChange={(e) => setCustomColor(e.target.value)} style={{ width: 44, height: 32, padding: 0, border: 0, background: 'transparent' }} />
            </div>
          </div>
        )}
      </Group>

      <Group header="Datos">
        <TextField label="Apodo" value={nickname} onChange={setNickname} placeholder={`Ej. ${issuer.name} ${state.members[0]?.name ?? 'Antonio'}`} testId="card-nickname" />
        <TextField label="Últimos 4" value={last4} onChange={(v) => setLast4(v.replace(/\D/g, '').slice(0, 4))} placeholder="1234" maxLength={4} type="tel" />
        <SelectField label="Red" value={network} onChange={setNetwork} options={(Object.keys(NETWORK_LABELS) as CardNetwork[]).map((n) => ({ value: n, label: NETWORK_LABELS[n] }))} />
        {state.members.length > 0 && <SelectField label="Titular" value={holder} onChange={setHolder} options={[{ value: '', label: 'Sin asignar' }, ...state.members.map((m) => ({ value: m.id, label: m.name }))]} />}
      </Group>

      <Group header="Línea de crédito">
        <AmountField label="Límite" value={limit} onChange={setLimit} testId="card-limit" />
        <AmountField label="Usado hoy" value={used} onChange={setUsed} allowZero testId="card-used" />
        <NumberField label="Tasa anual" value={rate} min={0} max={200} onChange={setRate} suffix="%" />
      </Group>

      <Group header="Fechas" footer="Día del mes en que corta tu tarjeta y día límite para pagar sin intereses.">
        <NumberField label="Día de corte" value={cutDay} min={1} max={31} onChange={setCutDay} testId="card-cut" />
        <NumberField label="Día límite de pago" value={payDay} min={1} max={31} onChange={setPayDay} testId="card-payday" />
      </Group>
      <div className="mt24">
        <Button block onClick={save} disabled={!valid} testId="card-save-btn">
          {existing ? 'Guardar cambios' : 'Agregar tarjeta'}
        </Button>
      </div>
    </Screen>
  );
}
