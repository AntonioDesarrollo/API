import { useState } from 'react';
import { useStore } from '@/lib/store';
import { AmountField, Button, Group, NumberField, Row, SelectField, Segmented } from '@/components/ui';
import { Avatar } from '@/components/ui';
import { MEMBER_COLORS, ROLE_LABELS, type ContributionMode, type ExpenseCategory, type Member, type Role, CATEGORIES } from '@/lib/types';
import { uid } from '@/lib/id';
import { money } from '@/lib/format';
import { contributions, householdIncomeEstimate } from '@/lib/finance';

const QUICK_FIXED: { name: string; category: ExpenseCategory; day: number }[] = [
  { name: 'Renta / hipoteca', category: 'renta', day: 1 },
  { name: 'Luz', category: 'servicios', day: 10 },
  { name: 'Agua', category: 'servicios', day: 10 },
  { name: 'Gas', category: 'servicios', day: 15 },
  { name: 'Internet', category: 'servicios', day: 5 },
  { name: 'Celular', category: 'servicios', day: 5 },
  { name: 'Súper (semanal x4)', category: 'super', day: 7 },
  { name: 'Transporte / gasolina', category: 'transporte', day: 7 },
  { name: 'Colegiaturas', category: 'educacion', day: 5 },
  { name: 'Streaming (Netflix, Spotify…)', category: 'suscripciones', day: 3 },
];

export function Onboarding() {
  const { state, dispatch } = useStore();
  const [step, setStep] = useState(0);
  const [members, setMembers] = useState<Member[]>(() =>
    state.members.length
      ? state.members
      : [
          { id: uid('m'), name: '', age: 28, role: 'yo', color: MEMBER_COLORS[0], monthlyIncome: 0, contributionMode: 'proporcional' },
          { id: uid('m'), name: '', age: 28, role: 'pareja', color: MEMBER_COLORS[1], monthlyIncome: 0, contributionMode: 'proporcional' },
        ],
  );
  const [fixed, setFixed] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<ContributionMode>('proporcional');
  const [savingsPct, setSavingsPct] = useState(20);

  const validMembers = members.filter((m) => m.name.trim());
  const totalFixed = Object.values(fixed).reduce((a, b) => a + b, 0);
  const income = householdIncomeEstimate(validMembers);
  const steps = 4;

  function updateMember(id: string, patch: Partial<Member>) {
    setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }
  function addMember() {
    setMembers((ms) => [...ms, { id: uid('m'), name: '', age: 10, role: 'hijo', color: MEMBER_COLORS[ms.length % MEMBER_COLORS.length], monthlyIncome: 0, contributionMode: 'proporcional' }]);
  }

  function finish() {
    for (const m of validMembers) dispatch({ type: 'upsertMember', member: { ...m, name: m.name.trim(), contributionMode: m.monthlyIncome > 0 ? mode : 'proporcional' } });
    for (const q of QUICK_FIXED) {
      const amount = fixed[q.name];
      if (amount && amount > 0) {
        dispatch({ type: 'upsertFixed', fixed: { id: uid('f'), name: q.name, amount, category: q.category, dayOfMonth: q.day, payment: { type: 'debito' }, active: true } });
        const existing = state.budgets.find((b) => b.category === q.category)?.monthly ?? 0;
        dispatch({ type: 'setBudget', budget: { category: q.category, monthly: existing + amount } });
      }
    }
    const wants = Math.max(10, 100 - savingsPct - 50);
    dispatch({ type: 'setPlan', plan: { rule: savingsPct === 20 ? '50-30-20' : 'custom', needsPct: 50, wantsPct: wants, savingsPct } });
    if (!state.goals.some((g) => g.isEmergencyFund)) {
      dispatch({ type: 'upsertGoal', goal: { id: uid('g'), name: 'Fondo de emergencia', icon: '🛟', target: Math.max(1, totalFixed * 3), saved: 0, isEmergencyFund: true } });
    }
    dispatch({ type: 'setOnboarded', value: true });
  }

  return (
    <div className="onboarding">
      {step > 0 && (
        <div className="steps">
          {Array.from({ length: steps }).map((_, i) => (
            <span key={i} className={i < step ? 'done' : ''} />
          ))}
        </div>
      )}
      {step === 0 && (
        <div className="body">
          <div style={{ fontSize: 56 }}>💙</div>
          <h1 className="mt16">Finanzas del Hogar</h1>
          <p className="lead">Las cuentas de la casa, claras y en pareja. Ingresos, gastos, tarjetas, deudas y un plan para que el dinero rinda.</p>
          <div className="feature">
            <span className="feature-icon" style={{ background: 'color-mix(in srgb, var(--blue) 15%, transparent)' }}>👨‍👩‍👧</span>
            <div>
              <h3>Reparto justo</h3>
              <p>Cada quien aporta según lo que gana. La app te dice cuánto le toca a cada uno.</p>
            </div>
          </div>
          <div className="feature">
            <span className="feature-icon" style={{ background: 'color-mix(in srgb, var(--purple) 15%, transparent)' }}>💳</span>
            <div>
              <h3>Tarjetas con su diseño</h3>
              <p>Elige tu banco (Nu, BBVA, Banorte…) y la tarjeta toma sus colores. Límite, fecha de corte y meses sin intereses.</p>
            </div>
          </div>
          <div className="feature">
            <span className="feature-icon" style={{ background: 'color-mix(in srgb, var(--green) 15%, transparent)' }}>🎯</span>
            <div>
              <h3>Plan y ahorro</h3>
              <p>Regla 50/30/20, fondo de emergencia, metas y estrategia para salir de deudas.</p>
            </div>
          </div>
        </div>
      )}
      {step === 1 && (
        <div className="body">
          <h1>¿Quiénes son en casa?</h1>
          <p className="lead">Agrega a cada integrante con su edad e ingreso mensual (deja 0 si no tiene ingresos).</p>
          {members.map((m, i) => (
            <Group key={m.id} header={`Integrante ${i + 1}`} action={members.length > 1 ? { label: 'Quitar', onClick: () => setMembers((ms) => ms.filter((x) => x.id !== m.id)) } : undefined}>
              <div className="row">
                <Avatar member={{ name: m.name || '?', color: m.color }} />
                <div className="row-main">
                  <input
                    className="grow"
                    style={{ width: '100%', border: 0, background: 'transparent', fontSize: 17, outline: 'none', padding: '4px 0' }}
                    placeholder="Nombre"
                    value={m.name}
                    data-testid={`member-name-${i}`}
                    onChange={(e) => updateMember(m.id, { name: e.target.value })}
                  />
                </div>
                <div className="flex" style={{ gap: 4 }}>
                  {MEMBER_COLORS.slice(0, 5).map((c) => (
                    <button key={c} aria-label="color" onClick={() => updateMember(m.id, { color: c })} style={{ width: 18, height: 18, borderRadius: 9, background: c, outline: m.color === c ? '2px solid var(--label)' : 'none', outlineOffset: 2 }} />
                  ))}
                </div>
              </div>
              <SelectField label="Rol" value={m.role} onChange={(v) => updateMember(m.id, { role: v as Role })} options={(Object.keys(ROLE_LABELS) as Role[]).map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />
              <NumberField label="Edad" value={m.age} min={0} max={120} onChange={(v) => updateMember(m.id, { age: v })} suffix="años" testId={`member-age-${i}`} />
              <AmountField label="Ingreso mensual" value={m.monthlyIncome} onChange={(v) => updateMember(m.id, { monthlyIncome: v })} testId={`member-income-${i}`} />
            </Group>
          ))}
          <div className="mt16">
            <Button variant="tinted" block onClick={addMember}>
              + Agregar integrante
            </Button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="body">
          <h1>Gastos fijos del hogar</h1>
          <p className="lead">Lo que pagan cada mes sí o sí. Puedes dejar en blanco lo que no aplique y editarlo después.</p>
          <Group header="Cada mes" footer={`Total fijo: ${money(totalFixed)} al mes`}>
            {QUICK_FIXED.map((q) => (
              <AmountField key={q.name} label={`${CATEGORIES[q.category].emoji} ${q.name}`} value={fixed[q.name] ?? 0} onChange={(v) => setFixed((f) => ({ ...f, [q.name]: v }))} />
            ))}
          </Group>
        </div>
      )}
      {step === 3 && (
        <div className="body">
          <h1>¿Cómo se reparten?</h1>
          <p className="lead">Define cómo aportan al gasto común y cuánto quieren ahorrar.</p>
          <Group header="Aporte al gasto común">
            <div style={{ padding: 12 }}>
              <Segmented
                value={mode}
                onChange={(v) => setMode(v)}
                options={[
                  { value: 'proporcional', label: 'Según ingreso' },
                  { value: 'igual', label: 'Mitad y mitad' },
                ]}
              />
            </div>
            {contributions(validMembers.map((m) => ({ ...m, contributionMode: mode })), totalFixed).filter((c) => c.member.monthlyIncome > 0).map((c) => (
              <Row key={c.member.id} icon={<Avatar member={c.member} />} iconColor="transparent" label={c.member.name} sub={`${Math.round(c.share * 100)}% del gasto fijo`} value={money(c.amount)} valueClass="strong" />
            ))}
            {validMembers.filter((m) => m.monthlyIncome > 0).length === 0 && <Row label="Agrega ingresos para ver el reparto" />}
          </Group>
          <Group header="Meta de ahorro" footer={income > 0 ? `Equivale a ${money((income * savingsPct) / 100)} al mes entre todos.` : 'Porcentaje del ingreso familiar que irá a ahorro y metas.'}>
            <div style={{ padding: 12 }}>
              <Segmented
                value={String(savingsPct)}
                onChange={(v) => setSavingsPct(Number(v))}
                options={[
                  { value: '10', label: '10%' },
                  { value: '15', label: '15%' },
                  { value: '20', label: '20%' },
                  { value: '30', label: '30%' },
                ]}
              />
            </div>
          </Group>
          <Group header="Resumen">
            <Row label="Ingreso familiar" value={money(income)} valueClass="strong" />
            <Row label="Gastos fijos" value={money(totalFixed)} />
            <Row label="Ahorro sugerido" value={money((income * savingsPct) / 100)} valueClass="pos" />
            <Row label="Queda para variable" value={money(income - totalFixed - (income * savingsPct) / 100)} valueClass={income - totalFixed - (income * savingsPct) / 100 < 0 ? 'neg' : 'strong'} />
          </Group>
        </div>
      )}
      <div className="footer">
        {step === 0 && (
          <Button block onClick={() => setStep(1)} testId="onb-start">
            Empezar
          </Button>
        )}
        {step > 0 && step < steps - 1 && (
          <Button block onClick={() => setStep(step + 1)} disabled={step === 1 && validMembers.length === 0} testId="onb-next">
            Continuar
          </Button>
        )}
        {step === steps - 1 && (
          <Button block variant="success" onClick={finish} testId="onb-finish">
            Crear mi plan
          </Button>
        )}
        {step > 0 && (
          <Button block variant="plain" onClick={() => setStep(step - 1)}>
            Atrás
          </Button>
        )}
        {step === 0 && state.members.length > 0 && (
          <Button block variant="plain" onClick={() => dispatch({ type: 'setOnboarded', value: true })}>
            Omitir
          </Button>
        )}
      </div>
    </div>
  );
}
