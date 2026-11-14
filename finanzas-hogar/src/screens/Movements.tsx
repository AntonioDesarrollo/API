import { useCallback, useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { useMonth } from '@/lib/month';
import { useNav } from '@/lib/nav';
import { AmountField, Avatar, Button, DateField, EmptyState, Group, MonthPicker, NavButton, Row, Screen, Segmented, SelectField, Sheet, TextField, useConfirm, useToast } from '@/components/ui';
import { Plus } from '@/components/icons';
import { CATEGORIES, CATEGORY_ORDER, INCOME_SOURCE_LABELS, type Expense, type ExpenseCategory, type Income, type IncomeSource, type PaymentType } from '@/lib/types';
import { CATEGORY_COLORS } from '@/lib/colors';
import { money } from '@/lib/format';
import { longDate, monthLabel, todayISO } from '@/lib/dates';
import { uid } from '@/lib/id';
import { getIssuer } from '@/lib/cards';
import { success } from '@/lib/haptics';
import { inMonth, totalExpenses, totalIncome } from '@/lib/finance';

type Mode = 'gastos' | 'ingresos';

export function Movements() {
  const { state, dispatch } = useStore();
  const { month, step } = useMonth();
  const nav = useNav();
  const [mode, setMode] = useState<Mode>('gastos');
  const [editingExpense, setEditingExpense] = useState<Expense | null | 'new'>(null);
  const [editingIncome, setEditingIncome] = useState<Income | null | 'new'>(null);
  const { confirm, element: confirmEl } = useConfirm();
  const toast = useToast();

  const expenses = useMemo(() => inMonth(state.expenses, month).sort((a, b) => (a.date < b.date ? 1 : -1)), [state.expenses, month]);
  const incomes = useMemo(() => inMonth(state.incomes, month).sort((a, b) => (a.date < b.date ? 1 : -1)), [state.incomes, month]);
  const payments = useMemo(
    () => [
      ...inMonth(state.cardPayments, month).map((p) => ({ ...p, kind: 'tarjeta' as const })),
      ...inMonth(state.debtPayments, month).map((p) => ({ ...p, kind: 'deuda' as const })),
    ].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [state.cardPayments, state.debtPayments, month],
  );

  const groupedByDate = <T extends { date: string }>(items: T[]) => {
    const map = new Map<string, T[]>();
    for (const i of items) map.set(i.date, [...(map.get(i.date) ?? []), i]);
    return [...map.entries()];
  };

  const memberName = (id?: string) => state.members.find((m) => m.id === id);
  const payLabel = (e: Expense) => {
    if (e.payment.type === 'tarjeta') {
      const c = state.cards.find((x) => x.id === e.payment.cardId);
      return c ? c.nickname || getIssuer(c.issuer).name : 'Tarjeta';
    }
    return e.payment.type === 'debito' ? 'Débito' : 'Efectivo';
  };

  return (
    <Screen
      root
      tabbar
      large
      title="Movimientos"
      right={
        <NavButton ariaLabel="Agregar" onClick={() => (mode === 'gastos' ? setEditingExpense('new') : setEditingIncome('new'))}>
          <Plus size={24} />
        </NavButton>
      }
    >
      <MonthPicker value={month} label={monthLabel(month)} onChange={step} />
      <div className="mt12">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'gastos', label: `Gastos · ${money(totalExpenses(state.expenses, month), { compact: true })}` },
            { value: 'ingresos', label: `Ingresos · ${money(totalIncome(state.incomes, month), { compact: true })}` },
          ]}
        />
      </div>

      {mode === 'gastos' && (
        <>
          {expenses.length === 0 && payments.length === 0 && (
            <EmptyState emoji="🧾" title="Sin gastos este mes" text="Registra lo que gastan: comida, súper, servicios… y elige con qué pagaron." action={<Button onClick={() => setEditingExpense('new')}>Agregar gasto</Button>} />
          )}
          {groupedByDate(expenses).map(([date, items]) => (
            <Group key={date} header={longDate(date)}>
              {items.map((e) => (
                <Row
                  key={e.id}
                  icon={CATEGORIES[e.category].emoji}
                  iconColor={CATEGORY_COLORS[e.category]}
                  label={e.note || CATEGORIES[e.category].label}
                  sub={`${e.note ? CATEGORIES[e.category].label + ' · ' : ''}${payLabel(e)}${memberName(e.memberId) ? ' · ' + memberName(e.memberId)!.name : ''}`}
                  value={`−${money(e.amount)}`}
                  valueClass="strong"
                  onClick={() => setEditingExpense(e)}
                  testId="expense-row"
                />
              ))}
            </Group>
          ))}
          {payments.length > 0 && (
            <Group header="Pagos a tarjetas y deudas" footer="Estos pagos salen de tu efectivo pero no son gastos nuevos: el gasto se registró al comprar.">
              {payments.map((p) => {
                const title = p.kind === 'tarjeta' ? (() => { const c = state.cards.find((x) => x.id === p.cardId); return c ? `Pago ${c.nickname || getIssuer(c.issuer).name}` : 'Pago tarjeta'; })() : (() => { const d = state.debts.find((x) => x.id === p.debtId); return d ? `Pago ${d.name}` : 'Pago deuda'; })();
                return (
                  <Row
                    key={p.id}
                    icon={p.kind === 'tarjeta' ? '💳' : '🏦'}
                    iconColor="var(--indigo)"
                    label={title}
                    sub={longDate(p.date)}
                    value={`−${money(p.amount)}`}
                    onClick={() =>
                      confirm({
                        title: 'Eliminar pago',
                        message: 'Se revertirá el saldo correspondiente.',
                        destructive: true,
                        onConfirm: () => dispatch(p.kind === 'tarjeta' ? { type: 'removeCardPayment', id: p.id } : { type: 'removeDebtPayment', id: p.id }),
                      })
                    }
                  />
                );
              })}
            </Group>
          )}
        </>
      )}

      {mode === 'ingresos' && (
        <>
          {incomes.length === 0 && <EmptyState emoji="💵" title="Sin ingresos este mes" text="Registra la nómina de cada quincena y cualquier ingreso extra." action={<Button onClick={() => setEditingIncome('new')}>Agregar ingreso</Button>} />}
          {groupedByDate(incomes).map(([date, items]) => (
            <Group key={date} header={longDate(date)}>
              {items.map((i) => {
                const m = memberName(i.memberId);
                return <Row key={i.id} icon={<Avatar member={m} />} iconColor="transparent" label={i.note || INCOME_SOURCE_LABELS[i.source]} sub={`${m?.name ?? 'Sin asignar'}${i.note ? ' · ' + INCOME_SOURCE_LABELS[i.source] : ''}`} value={`+${money(i.amount)}`} valueClass="pos" onClick={() => setEditingIncome(i)} testId="income-row" />;
              })}
            </Group>
          ))}
          {state.members.length === 0 && (
            <Group>
              <Row label="Agrega integrantes para asignar ingresos" onClick={() => nav.push({ name: 'family' })} chevron />
            </Group>
          )}
        </>
      )}

      <ExpenseForm open={editingExpense !== null} expense={editingExpense === 'new' ? undefined : editingExpense ?? undefined} onClose={() => setEditingExpense(null)} onSaved={() => toast.show('Gasto guardado')} />
      <IncomeForm open={editingIncome !== null} income={editingIncome === 'new' ? undefined : editingIncome ?? undefined} onClose={() => setEditingIncome(null)} onSaved={() => toast.show('Ingreso guardado')} />
      {confirmEl}
      {toast.element}
    </Screen>
  );
}

// ---------- Formularios ----------

export function ExpenseForm({ open, onClose, expense, defaultCardId, onSaved }: { open: boolean; onClose: () => void; expense?: Expense; defaultCardId?: string; onSaved?: () => void }) {
  const { state, dispatch } = useStore();
  const key = `${open}-${expense?.id ?? 'new'}-${defaultCardId ?? ''}`;
  return <ExpenseFormInner key={key} open={open} onClose={onClose} expense={expense} defaultCardId={defaultCardId} onSaved={onSaved} state={state} dispatch={dispatch} />;
}

function ExpenseFormInner({ open, onClose, expense, defaultCardId, onSaved, state, dispatch }: { open: boolean; onClose: () => void; expense?: Expense; defaultCardId?: string; onSaved?: () => void; state: ReturnType<typeof useStore>['state']; dispatch: ReturnType<typeof useStore>['dispatch'] }) {
  const [amount, setAmount] = useState(expense?.amount ?? 0);
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? 'comida');
  const [date, setDate] = useState(expense?.date ?? todayISO());
  const [memberId, setMemberId] = useState(expense?.memberId ?? state.members[0]?.id ?? '');
  const [payType, setPayType] = useState<PaymentType>(expense?.payment.type ?? (defaultCardId ? 'tarjeta' : 'debito'));
  const [cardId, setCardId] = useState(expense?.payment.cardId ?? defaultCardId ?? state.cards[0]?.id ?? '');
  const [note, setNote] = useState(expense?.note ?? '');
  const { confirm, element } = useConfirm();

  const valid = amount > 0 && date && (payType !== 'tarjeta' || cardId);

  const save = useCallback(() => {
    if (!valid) return;
    const e: Expense = {
      id: expense?.id ?? uid('e'),
      amount,
      category,
      date,
      memberId: memberId || undefined,
      payment: payType === 'tarjeta' ? { type: 'tarjeta', cardId } : { type: payType },
      note: note.trim() || undefined,
      fixedId: expense?.fixedId,
    };
    if (expense) dispatch({ type: 'updateExpense', expense: e, previous: expense });
    else dispatch({ type: 'addExpense', expense: e });
    success();
    onSaved?.();
    onClose();
  }, [valid, expense, amount, category, date, memberId, payType, cardId, note, dispatch, onSaved, onClose]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={expense ? 'Editar gasto' : 'Nuevo gasto'}
      right={
        <NavButton bold onClick={save} ariaLabel="Guardar">
          <span style={{ opacity: valid ? 1 : 0.4 }}>Guardar</span>
        </NavButton>
      }
    >
      <Group>
        <AmountField label="Monto" value={amount} onChange={setAmount} autoFocus={!expense} testId="expense-amount" />
        <SelectField label="Categoría" value={category} onChange={setCategory} options={CATEGORY_ORDER.map((c) => ({ value: c, label: `${CATEGORIES[c].emoji} ${CATEGORIES[c].label}` }))} testId="expense-category" />
        <DateField label="Fecha" value={date} onChange={setDate} />
        <TextField label="Nota" value={note} onChange={setNote} placeholder="Opcional" />
      </Group>
      <Group header="¿Con qué pagaron?">
        <div style={{ padding: 12 }}>
          <Segmented
            value={payType}
            onChange={setPayType}
            options={[
              { value: 'efectivo', label: 'Efectivo' },
              { value: 'debito', label: 'Débito' },
              { value: 'tarjeta', label: 'Tarjeta de crédito' },
            ]}
          />
        </div>
        {payType === 'tarjeta' &&
          (state.cards.length ? (
            <SelectField label="Tarjeta" value={cardId} onChange={setCardId} options={state.cards.map((c) => ({ value: c.id, label: `${getIssuer(c.issuer).name}${c.nickname ? ' · ' + c.nickname : ''}${c.last4 ? ' •' + c.last4 : ''}` }))} testId="expense-card" />
          ) : (
            <Row label="No tienes tarjetas registradas" sub="Agrega una en la pestaña Tarjetas" />
          ))}
        {state.members.length > 0 && <SelectField label="Quién pagó" value={memberId} onChange={setMemberId} options={[{ value: '', label: 'Sin asignar' }, ...state.members.map((m) => ({ value: m.id, label: m.name }))]} />}
      </Group>
      {expense && (
        <div className="mt24">
          <Button variant="destructive" block onClick={() => confirm({ title: '¿Eliminar gasto?', message: 'Si se pagó con tarjeta, se descontará de su saldo.', destructive: true, onConfirm: () => { dispatch({ type: 'removeExpense', id: expense.id }); onClose(); } })}>
            Eliminar gasto
          </Button>
        </div>
      )}
      {element}
    </Sheet>
  );
}

export function IncomeForm({ open, onClose, income, onSaved }: { open: boolean; onClose: () => void; income?: Income; onSaved?: () => void }) {
  const { state, dispatch } = useStore();
  return <IncomeFormInner key={`${open}-${income?.id ?? 'new'}`} open={open} onClose={onClose} income={income} onSaved={onSaved} state={state} dispatch={dispatch} />;
}

function IncomeFormInner({ open, onClose, income, onSaved, state, dispatch }: { open: boolean; onClose: () => void; income?: Income; onSaved?: () => void; state: ReturnType<typeof useStore>['state']; dispatch: ReturnType<typeof useStore>['dispatch'] }) {
  const [amount, setAmount] = useState(income?.amount ?? 0);
  const [memberId, setMemberId] = useState(income?.memberId ?? state.members[0]?.id ?? '');
  const [source, setSource] = useState<IncomeSource>(income?.source ?? 'nomina');
  const [date, setDate] = useState(income?.date ?? todayISO());
  const [note, setNote] = useState(income?.note ?? '');
  const { confirm, element } = useConfirm();
  const valid = amount > 0 && memberId;

  const save = () => {
    if (!valid) return;
    const i: Income = { id: income?.id ?? uid('i'), amount, memberId, source, date, note: note.trim() || undefined };
    dispatch(income ? { type: 'updateIncome', income: i } : { type: 'addIncome', income: i });
    success();
    onSaved?.();
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={income ? 'Editar ingreso' : 'Nuevo ingreso'}
      right={
        <NavButton bold onClick={save} ariaLabel="Guardar">
          <span style={{ opacity: valid ? 1 : 0.4 }}>Guardar</span>
        </NavButton>
      }
    >
      <Group footer={state.members.length === 0 ? 'Primero agrega integrantes en Ajustes → Familia.' : undefined}>
        <AmountField label="Monto" value={amount} onChange={setAmount} autoFocus={!income} testId="income-amount" />
        <SelectField label="De quién" value={memberId} onChange={setMemberId} options={state.members.map((m) => ({ value: m.id, label: m.name }))} testId="income-member" />
        <SelectField label="Tipo" value={source} onChange={setSource} options={(Object.keys(INCOME_SOURCE_LABELS) as IncomeSource[]).map((s) => ({ value: s, label: INCOME_SOURCE_LABELS[s] }))} />
        <DateField label="Fecha" value={date} onChange={setDate} />
        <TextField label="Nota" value={note} onChange={setNote} placeholder="Ej. 1ra quincena" />
      </Group>
      {income && (
        <div className="mt24">
          <Button variant="destructive" block onClick={() => confirm({ title: '¿Eliminar ingreso?', destructive: true, onConfirm: () => { dispatch({ type: 'removeIncome', id: income.id }); onClose(); } })}>
            Eliminar ingreso
          </Button>
        </div>
      )}
      {element}
    </Sheet>
  );
}
