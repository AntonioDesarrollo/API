import { useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { useStore } from '@/lib/store';
import { useNav } from '@/lib/nav';
import { AmountField, Avatar, Button, EmptyState, Group, NavButton, NumberField, Row, Screen, SelectField, Sheet, TextField, ToggleRow, useConfirm, useToast, Segmented } from '@/components/ui';
import { Plus } from '@/components/icons';
import { CATEGORIES, CATEGORY_ORDER, MEMBER_COLORS, ROLE_LABELS, type ContributionMode, type ExpenseCategory, type FixedExpense, type Member, type PaymentType, type Role, type Settings as SettingsT } from '@/lib/types';
import { CATEGORY_COLORS } from '@/lib/colors';
import { money, pct } from '@/lib/format';
import { uid } from '@/lib/id';
import { serialize } from '@/lib/storage';
import { getIssuer } from '@/lib/cards';
import { success } from '@/lib/haptics';
import { useMonth } from '@/lib/month';
import { budgetStatus, expensesByCategory, totalFixedExpenses } from '@/lib/finance';
import { shiftMonth } from '@/lib/dates';

export function SettingsScreen() {
  const { state, dispatch, resetAll } = useStore();
  const nav = useNav();
  const { confirm, element } = useConfirm();
  return (
    <Screen title="Ajustes" back="Inicio">
      <Group header="Hogar">
        <Row icon="👨‍👩‍👧" iconColor="var(--blue)" label="Familia" sub={`${state.members.length} integrante${state.members.length === 1 ? '' : 's'}`} onClick={() => nav.push({ name: 'family' })} chevron />
        <Row icon="📅" iconColor="var(--indigo)" label="Gastos fijos" sub={money(totalFixedExpenses(state.fixedExpenses)) + ' al mes'} onClick={() => nav.push({ name: 'fixed' })} chevron />
        <Row icon="🎯" iconColor="var(--orange)" label="Presupuestos" sub={`${state.budgets.length} categorías`} onClick={() => nav.push({ name: 'budgets' })} chevron />
      </Group>
      <Group header="Apariencia">
        <div style={{ padding: 12 }}>
          <Segmented
            value={state.settings.theme}
            onChange={(v) => dispatch({ type: 'setSettings', settings: { theme: v } })}
            options={[
              { value: 'auto', label: 'Automático' },
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Oscuro' },
            ]}
          />
        </div>
        <ToggleRow label="Vibración al tocar" checked={state.settings.haptics} onChange={(v) => dispatch({ type: 'setSettings', settings: { haptics: v } })} />
        <SelectField
          label="Moneda"
          value={state.settings.currency}
          onChange={(v) => {
            const locale: Record<SettingsT['currency'], string> = { MXN: 'es-MX', USD: 'en-US', EUR: 'es-ES', COP: 'es-CO', ARS: 'es-AR', PEN: 'es-PE', CLP: 'es-CL' };
            dispatch({ type: 'setSettings', settings: { currency: v, locale: locale[v] } });
          }}
          options={(['MXN', 'USD', 'EUR', 'COP', 'ARS', 'PEN', 'CLP'] as SettingsT['currency'][]).map((c) => ({ value: c, label: c }))}
        />
      </Group>
      <Group header="Datos">
        <Row icon="💾" iconColor="var(--green)" label="Respaldar y restaurar" sub="Exporta un archivo JSON o impórtalo en otro teléfono" onClick={() => nav.push({ name: 'backup' })} chevron />
        <Row icon="🧭" iconColor="var(--teal)" label="Volver a ver la bienvenida" onClick={() => dispatch({ type: 'setOnboarded', value: false })} chevron />
        <Row
          icon="🗑️"
          iconColor="var(--red)"
          label="Borrar todos los datos"
          destructive
          onClick={() =>
            confirm({
              title: '¿Borrar todo?',
              message: 'Se eliminarán integrantes, movimientos, tarjetas, deudas y metas. Esta acción no se puede deshacer.',
              destructive: true,
              confirmLabel: 'Borrar todo',
              onConfirm: () => {
                resetAll();
                nav.reset();
              },
            })
          }
        />
      </Group>
      <Group header="Acerca de" footer="Tus datos se guardan solo en este dispositivo. Nada se envía a internet.">
        <Row label="Finanzas del Hogar" value="v1.0.0" />
      </Group>
      {element}
    </Screen>
  );
}

export function Family() {
  const { state } = useStore();
  const nav = useNav();
  const total = state.members.reduce((a, m) => a + m.monthlyIncome, 0);
  return (
    <Screen title="Familia" back right={<NavButton ariaLabel="Agregar integrante" onClick={() => nav.push({ name: 'member-form' })}><Plus size={24} /></NavButton>}>
      {state.members.length === 0 ? (
        <EmptyState emoji="👨‍👩‍👧" title="Sin integrantes" text="Agrega a quienes viven en casa, con edad e ingreso, para repartir el gasto común." action={<Button onClick={() => nav.push({ name: 'member-form' })}>Agregar integrante</Button>} />
      ) : (
        <Group header="Integrantes" footer={`Ingreso familiar estimado: ${money(total)} al mes.`}>
          {state.members.map((m) => (
            <Row key={m.id} icon={<Avatar member={m} />} iconColor="transparent" label={m.name} sub={`${ROLE_LABELS[m.role]} · ${m.age} años${m.monthlyIncome > 0 ? ` · aporta ${m.contributionMode === 'proporcional' ? 'según ingreso' : m.contributionMode === 'igual' ? 'en partes iguales' : m.contributionMode === 'porcentaje' ? pct(m.contributionValue ?? 0) : money(m.contributionValue ?? 0)}` : ''}`} value={m.monthlyIncome > 0 ? money(m.monthlyIncome) : '—'} onClick={() => nav.push({ name: 'member-form', id: m.id })} chevron />
          ))}
        </Group>
      )}
    </Screen>
  );
}

export function MemberForm({ id }: { id?: string }) {
  const { state, dispatch } = useStore();
  const nav = useNav();
  const existing = state.members.find((m) => m.id === id);
  const [name, setName] = useState(existing?.name ?? '');
  const [age, setAge] = useState(existing?.age ?? 30);
  const [role, setRole] = useState<Role>(existing?.role ?? (state.members.length === 0 ? 'yo' : state.members.length === 1 ? 'pareja' : 'hijo'));
  const [color, setColor] = useState(existing?.color ?? MEMBER_COLORS[state.members.length % MEMBER_COLORS.length]);
  const [income, setIncome] = useState(existing?.monthlyIncome ?? 0);
  const [mode, setMode] = useState<ContributionMode>(existing?.contributionMode ?? 'proporcional');
  const [value, setValue] = useState(existing?.contributionValue ?? 0);
  const { confirm, element } = useConfirm();
  const valid = name.trim().length > 0;

  const save = () => {
    if (!valid) return;
    const m: Member = { id: existing?.id ?? uid('m'), name: name.trim(), age, role, color, monthlyIncome: income, contributionMode: mode, contributionValue: mode === 'fijo' || mode === 'porcentaje' ? value : undefined };
    dispatch({ type: 'upsertMember', member: m });
    success();
    nav.pop();
  };

  return (
    <Screen title={existing ? 'Editar integrante' : 'Nuevo integrante'} back right={<NavButton bold onClick={save}><span style={{ opacity: valid ? 1 : 0.4 }}>Guardar</span></NavButton>}>
      <div className="center mt24">
        <Avatar member={{ name: name || '?', color }} large />
        <div className="flex mt12" style={{ justifyContent: 'center' }}>
          {MEMBER_COLORS.map((c) => (
            <button key={c} aria-label="color" onClick={() => setColor(c)} style={{ width: 26, height: 26, borderRadius: 13, background: c, outline: color === c ? '2px solid var(--label)' : 'none', outlineOffset: 2 }} />
          ))}
        </div>
      </div>
      <Group header="Datos">
        <TextField label="Nombre" value={name} onChange={setName} placeholder="Nombre" autoFocus={!existing} testId="member-name" />
        <SelectField label="Rol" value={role} onChange={setRole} options={(Object.keys(ROLE_LABELS) as Role[]).map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />
        <NumberField label="Edad" value={age} min={0} max={120} suffix="años" onChange={setAge} />
      </Group>
      <Group header="Ingreso y aporte" footer={mode === 'proporcional' ? 'Aporta al gasto común el mismo porcentaje de su ingreso que los demás.' : mode === 'igual' ? 'Aporta la misma cantidad que los demás con ingresos.' : mode === 'porcentaje' ? 'Aporta un porcentaje fijo del gasto común.' : 'Aporta una cantidad fija al mes.'}>
        <AmountField label="Ingreso mensual" value={income} onChange={setIncome} allowZero testId="member-income" />
        <SelectField
          label="Aporta"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'proporcional', label: 'Según su ingreso' },
            { value: 'igual', label: 'En partes iguales' },
            { value: 'porcentaje', label: '% del gasto común' },
            { value: 'fijo', label: 'Monto fijo' },
          ]}
        />
        {mode === 'porcentaje' && <NumberField label="Porcentaje" value={value} min={0} max={100} suffix="%" onChange={setValue} />}
        {mode === 'fijo' && <AmountField label="Monto fijo" value={value} onChange={setValue} />}
      </Group>
      <div className="mt24 col" style={{ gap: 10 }}>
        <Button block onClick={save} disabled={!valid} testId="member-save">
          {existing ? 'Guardar cambios' : 'Agregar'}
        </Button>
        {existing && (
          <Button variant="destructive" block onClick={() => confirm({ title: `¿Eliminar a ${existing.name}?`, message: 'Sus movimientos quedarán sin asignar.', destructive: true, onConfirm: () => { dispatch({ type: 'removeMember', id: existing.id }); nav.pop(); } })}>
            Eliminar integrante
          </Button>
        )}
      </div>
      {element}
    </Screen>
  );
}

export function FixedExpenses() {
  const { state, dispatch } = useStore();
  const [editing, setEditing] = useState<FixedExpense | 'new' | null>(null);
  const { confirm, element } = useConfirm();
  const active = state.fixedExpenses.filter((f) => f.active);
  const inactive = state.fixedExpenses.filter((f) => !f.active);
  const payLabel = (p: { type: PaymentType; cardId?: string }) => (p.type === 'tarjeta' ? (() => { const c = state.cards.find((x) => x.id === p.cardId); return c ? c.nickname || getIssuer(c.issuer).name : 'Tarjeta'; })() : p.type === 'debito' ? 'Débito' : 'Efectivo');

  return (
    <Screen title="Gastos fijos" back right={<NavButton ariaLabel="Agregar" onClick={() => setEditing('new')}><Plus size={24} /></NavButton>}>
      {state.fixedExpenses.length === 0 && <EmptyState emoji="📅" title="Sin gastos fijos" text="Renta, luz, internet, colegiaturas, Netflix… Lo que se paga cada mes. Desde Inicio podrás registrarlos con un toque." action={<Button onClick={() => setEditing('new')}>Agregar gasto fijo</Button>} />}
      {active.length > 0 && (
        <Group header="Cada mes" footer={`Total: ${money(totalFixedExpenses(state.fixedExpenses))} al mes`}>
          {active
            .sort((a, b) => a.dayOfMonth - b.dayOfMonth)
            .map((f) => (
              <Row key={f.id} icon={CATEGORIES[f.category].emoji} iconColor={CATEGORY_COLORS[f.category]} label={f.name} sub={`Día ${f.dayOfMonth} · ${payLabel(f.payment)}`} value={money(f.amount)} valueClass="strong" onClick={() => setEditing(f)} chevron />
            ))}
        </Group>
      )}
      {inactive.length > 0 && (
        <Group header="Pausados">
          {inactive.map((f) => (
            <Row key={f.id} icon={CATEGORIES[f.category].emoji} iconColor="var(--gray)" label={f.name} value={money(f.amount)} onClick={() => setEditing(f)} chevron />
          ))}
        </Group>
      )}
      {editing !== null && (
        <FixedForm
          key={editing === 'new' ? 'new' : editing.id}
          fixed={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onDelete={(f) => confirm({ title: `¿Eliminar ${f.name}?`, destructive: true, onConfirm: () => { dispatch({ type: 'removeFixed', id: f.id }); setEditing(null); } })}
        />
      )}
      {element}
    </Screen>
  );
}

function FixedForm({ fixed, onClose, onDelete }: { fixed?: FixedExpense; onClose: () => void; onDelete: (f: FixedExpense) => void }) {
  const { state, dispatch } = useStore();
  const [name, setName] = useState(fixed?.name ?? '');
  const [amount, setAmount] = useState(fixed?.amount ?? 0);
  const [category, setCategory] = useState<ExpenseCategory>(fixed?.category ?? 'servicios');
  const [day, setDay] = useState(fixed?.dayOfMonth ?? 1);
  const [payType, setPayType] = useState<PaymentType>(fixed?.payment.type ?? 'debito');
  const [cardId, setCardId] = useState(fixed?.payment.cardId ?? state.cards[0]?.id ?? '');
  const [memberId, setMemberId] = useState(fixed?.memberId ?? '');
  const [active, setActive] = useState(fixed?.active ?? true);
  const valid = name.trim() && amount > 0 && day >= 1 && day <= 31 && (payType !== 'tarjeta' || cardId);
  const save = () => {
    if (!valid) return;
    dispatch({ type: 'upsertFixed', fixed: { id: fixed?.id ?? uid('f'), name: name.trim(), amount, category, dayOfMonth: day, payment: payType === 'tarjeta' ? { type: 'tarjeta', cardId } : { type: payType }, memberId: memberId || undefined, active } });
    success();
    onClose();
  };
  return (
    <SheetLazy open onClose={onClose} title={fixed ? 'Editar gasto fijo' : 'Nuevo gasto fijo'} save={save} valid={Boolean(valid)}>
      <Group>
        <TextField label="Nombre" value={name} onChange={setName} placeholder="Ej. Internet" autoFocus={!fixed} testId="fixed-name" />
        <AmountField label="Monto" value={amount} onChange={setAmount} testId="fixed-amount" />
        <SelectField label="Categoría" value={category} onChange={setCategory} options={CATEGORY_ORDER.map((c) => ({ value: c, label: `${CATEGORIES[c].emoji} ${CATEGORIES[c].label}` }))} />
        <NumberField label="Día del mes" value={day} min={1} max={31} onChange={setDay} />
      </Group>
      <Group header="Se paga con">
        <div style={{ padding: 12 }}>
          <Segmented value={payType} onChange={setPayType} options={[{ value: 'efectivo', label: 'Efectivo' }, { value: 'debito', label: 'Débito' }, { value: 'tarjeta', label: 'Tarjeta' }]} />
        </div>
        {payType === 'tarjeta' && state.cards.length > 0 && <SelectField label="Tarjeta" value={cardId} onChange={setCardId} options={state.cards.map((c) => ({ value: c.id, label: c.nickname || getIssuer(c.issuer).name }))} />}
        {state.members.length > 0 && <SelectField label="Quién lo paga" value={memberId} onChange={setMemberId} options={[{ value: '', label: 'Compartido' }, ...state.members.map((m) => ({ value: m.id, label: m.name }))]} />}
        <ToggleRow label="Activo" sub="Desactívalo para pausarlo sin borrarlo" checked={active} onChange={setActive} />
      </Group>
      {fixed && (
        <div className="mt24">
          <Button variant="destructive" block onClick={() => onDelete(fixed)}>
            Eliminar
          </Button>
        </div>
      )}
    </SheetLazy>
  );
}

function SheetLazy({ open, onClose, title, save, valid, children }: { open: boolean; onClose: () => void; title: string; save: () => void; valid: boolean; children: React.ReactNode }) {
  return (
    <Sheet open={open} onClose={onClose} title={title} right={<NavButton bold onClick={save}><span style={{ opacity: valid ? 1 : 0.4 }}>Guardar</span></NavButton>}>
      {children}
    </Sheet>
  );
}

export function Budgets() {
  const { state, dispatch } = useStore();
  const { month } = useMonth();
  const status = budgetStatus(state.budgets, state.expenses, month);
  const spent = expensesByCategory(state.expenses, month);
  const prev = expensesByCategory(state.expenses, shiftMonth(month, -1));
  const total = state.budgets.reduce((a, b) => a + b.monthly, 0);
  return (
    <Screen title="Presupuestos" back>
      <Group header="Tope mensual por categoría" footer={`Total presupuestado: ${money(total)}. Como referencia se muestra lo gastado este mes y el anterior.`}>
        {CATEGORY_ORDER.map((c) => {
          const b = state.budgets.find((x) => x.category === c);
          const st = status.find((s) => s.category === c);
          return (
            <div className="row-field" key={c} style={{ alignItems: 'flex-start' }}>
              <label style={{ minWidth: 0, flex: 1 }}>
                <span className="flex" style={{ gap: 8 }}>
                  <span className="row-icon" style={{ background: CATEGORY_COLORS[c], width: 28, height: 28, fontSize: 15 }}>{CATEGORIES[c].emoji}</span>
                  <span className="col" style={{ minWidth: 0 }}>
                    <span className="ellipsis" style={{ fontSize: 15 }}>{CATEGORIES[c].label}</span>
                    <span className={`tiny ${st?.status === 'excedido' ? 'neg' : 'muted'}`}>
                      Este mes {money(spent[c] ?? 0)} · anterior {money(prev[c] ?? 0)}
                    </span>
                  </span>
                </span>
              </label>
              <div className="field-input" style={{ flex: '0 0 120px' }}>
                <span className="prefix">$</span>
                <input type="text" inputMode="decimal" placeholder="0" value={b?.monthly ? String(b.monthly) : ''} data-testid={`budget-${c}`} onChange={(e) => dispatch({ type: 'setBudget', budget: { category: c, monthly: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 } })} />
              </div>
            </div>
          );
        })}
      </Group>
    </Screen>
  );
}

export function Backup() {
  const { state, importJSON } = useStore();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const { confirm, element } = useConfirm();
  const [pending, setPending] = useState<string | null>(null);

  const exportData = async () => {
    const json = serialize(state);
    const name = `finanzas-hogar-${new Date().toISOString().slice(0, 10)}.json`;
    try {
      if (Capacitor.isNativePlatform()) {
        const res = await Filesystem.writeFile({ path: name, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 });
        await Share.share({ title: 'Respaldo Finanzas del Hogar', url: res.uri, dialogTitle: 'Guardar respaldo' });
      } else {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      }
      toast.show('Respaldo listo');
    } catch (err) {
      console.error(err);
      toast.show('No se pudo exportar');
    }
  };

  const onFile = async (file: File) => {
    const text = await file.text();
    setPending(text);
    confirm({
      title: 'Restaurar respaldo',
      message: 'Se reemplazarán todos los datos actuales por los del archivo.',
      confirmLabel: 'Restaurar',
      destructive: true,
      onConfirm: () => {
        if (importJSON(text)) toast.show('Datos restaurados');
        else toast.show('Archivo inválido');
        setPending(null);
      },
    });
  };

  return (
    <Screen title="Respaldo" back>
      <Group header="Exportar" footer="Genera un archivo JSON con toda tu información. Guárdalo en Drive, mándatelo por correo o compártelo con tu pareja.">
        <Row icon="📤" iconColor="var(--blue)" label="Exportar respaldo" sub={`${state.expenses.length} gastos · ${state.incomes.length} ingresos · ${state.cards.length} tarjetas`} onClick={exportData} chevron />
      </Group>
      <Group header="Restaurar" footer="Selecciona un archivo exportado previamente desde esta app.">
        <Row icon="📥" iconColor="var(--green)" label="Importar respaldo" sub={pending ? 'Archivo cargado' : 'Elegir archivo .json'} onClick={() => fileRef.current?.click()} chevron />
        <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
      </Group>
      {element}
      {toast.element}
    </Screen>
  );
}
