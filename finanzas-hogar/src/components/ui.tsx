import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from './icons';
import { tap } from '@/lib/haptics';
import { useNav } from '@/lib/nav';
import { money, num, parseAmount } from '@/lib/format';
import type { Member } from '@/lib/types';

// ---------- Screen & NavBar ----------

interface ScreenProps {
  title: string;
  subtitle?: string;
  large?: boolean;
  back?: boolean | string;
  onBack?: () => void;
  right?: ReactNode;
  left?: ReactNode;
  root?: boolean;
  tabbar?: boolean;
  children: ReactNode;
  bodyClass?: string;
}

export function Screen({ title, subtitle, large, back, onBack, right, left, root, tabbar, children, bodyClass }: ScreenProps) {
  const nav = useNav();
  const [scrolled, setScrolled] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const handleBack = onBack ?? nav.pop;
  return (
    <div className={`screen ${root ? 'root' : ''} ${tabbar ? 'has-tabbar' : ''}`}>
      <div className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-row">
          <div className="nav-left">
            {back ? (
              <button
                className="nav-btn"
                onClick={() => {
                  tap();
                  handleBack();
                }}
                aria-label="Atrás"
              >
                <ChevronLeft size={24} />
                <span>{typeof back === 'string' ? back : 'Atrás'}</span>
              </button>
            ) : (
              left
            )}
          </div>
          <div className="navbar-title" style={{ opacity: large && !scrolled ? 0 : 1, transition: 'opacity 0.15s' }}>
            {title}
          </div>
          <div className="nav-right">{right}</div>
        </div>
        {large && !scrolled && (
          <div className="large-title">
            {title}
            {subtitle && <small>{subtitle}</small>}
          </div>
        )}
      </div>
      <div
        ref={bodyRef}
        className={`screen-body ${bodyClass ?? ''}`}
        onScroll={(e) => {
          const top = (e.target as HTMLDivElement).scrollTop;
          setScrolled(top > 24);
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function NavButton({ children, onClick, bold, ariaLabel }: { children: ReactNode; onClick: () => void; bold?: boolean; ariaLabel?: string }) {
  return (
    <button
      className={`nav-btn ${bold ? 'bold' : ''}`}
      aria-label={ariaLabel}
      onClick={() => {
        tap();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

// ---------- Groups / rows ----------

export function Group({ header, footer, children, action }: { header?: ReactNode; footer?: ReactNode; children: ReactNode; action?: { label: string; onClick: () => void } }) {
  return (
    <section className="group">
      {(header || action) && (
        <div className="group-header">
          <span>{header}</span>
          {action && (
            <button
              className="action"
              onClick={() => {
                tap();
                action.onClick();
              }}
            >
              {action.label}
            </button>
          )}
        </div>
      )}
      <div className="group-body">{children}</div>
      {footer && <div className="group-footer">{footer}</div>}
    </section>
  );
}

interface RowProps {
  icon?: ReactNode;
  iconColor?: string;
  label: ReactNode;
  sub?: ReactNode;
  value?: ReactNode;
  valueClass?: string;
  chevron?: boolean;
  onClick?: () => void;
  destructive?: boolean;
  right?: ReactNode;
  testId?: string;
}

export function Row({ icon, iconColor, label, sub, value, valueClass, chevron, onClick, destructive, right, testId }: RowProps) {
  const cls = `row ${icon ? 'with-icon' : ''} ${onClick ? 'tappable' : ''} ${destructive ? 'destructive' : ''}`;
  const content = (
    <>
      {icon && (
        <span className="row-icon" style={{ background: iconColor ?? 'var(--fill)' }}>
          {icon}
        </span>
      )}
      <div className="row-main">
        <div className="row-label">{label}</div>
        {sub && <div className="row-sub">{sub}</div>}
      </div>
      {value !== undefined && <div className={`row-value ${valueClass ?? ''}`}>{value}</div>}
      {right}
      {chevron && (
        <span className="row-chevron">
          <ChevronRight size={18} />
        </span>
      )}
    </>
  );
  if (onClick) {
    return (
      <button
        className={cls}
        data-testid={testId}
        onClick={() => {
          tap();
          onClick();
        }}
      >
        {content}
      </button>
    );
  }
  return (
    <div className={cls} data-testid={testId}>
      {content}
    </div>
  );
}

// ---------- Fields ----------

interface FieldBase {
  label: string;
  stacked?: boolean;
}

export function TextField({ label, value, onChange, placeholder, stacked, type = 'text', autoFocus, maxLength, testId }: FieldBase & { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; autoFocus?: boolean; maxLength?: number; testId?: string }) {
  return (
    <div className={`row-field ${stacked ? 'stacked' : ''}`}>
      <label>{label}</label>
      <div className="field-input">
        <input type={type} value={value} placeholder={placeholder} autoFocus={autoFocus} maxLength={maxLength} data-testid={testId} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

export function TextArea({ label, value, onChange, placeholder }: FieldBase & { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="row-field stacked">
      <label>{label}</label>
      <textarea rows={2} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/** Campo de dinero: el texto se formatea solo al perder el foco; mientras escribes no cambia. */
export function AmountField({ label, value, onChange, placeholder = '0.00', stacked, autoFocus, testId, allowZero }: FieldBase & { value: number; onChange: (v: number) => void; placeholder?: string; autoFocus?: boolean; testId?: string; allowZero?: boolean }) {
  const fmt = (v: number) => (v || allowZero ? num(v, 2) : '');
  const [text, setText] = useState(() => fmt(value));
  const focusRef = useRef(false);
  const lastValue = useRef(value);
  useEffect(() => {
    // Sincroniza cuando el valor cambia desde fuera (p. ej. chips de pago sugerido)
    if (!focusRef.current && value !== lastValue.current) setText(fmt(value));
    lastValue.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className={`row-field ${stacked ? 'stacked' : ''}`}>
      <label>{label}</label>
      <div className="field-input">
        <span className="prefix">$</span>
        <input
          type="text"
          inputMode="decimal"
          value={text}
          placeholder={placeholder}
          autoFocus={autoFocus}
          data-testid={testId}
          onFocus={() => {
            focusRef.current = true;
          }}
          onBlur={() => {
            focusRef.current = false;
            const n = parseAmount(text);
            lastValue.current = n;
            onChange(n);
            setText(fmt(n));
          }}
          onChange={(e) => {
            const t = e.target.value;
            setText(t);
            const n = parseAmount(t);
            lastValue.current = n;
            onChange(n);
          }}
        />
      </div>
    </div>
  );
}

export function NumberField({ label, value, onChange, min, max, suffix, stacked, testId }: FieldBase & { value: number; onChange: (v: number) => void; min?: number; max?: number; suffix?: string; testId?: string }) {
  return (
    <div className={`row-field ${stacked ? 'stacked' : ''}`}>
      <label>{label}</label>
      <div className="field-input">
        <input
          type="number"
          inputMode="numeric"
          value={Number.isFinite(value) ? value : ''}
          min={min}
          max={max}
          data-testid={testId}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange(Number.isFinite(n) ? n : 0);
          }}
        />
        {suffix && <span className="prefix">{suffix}</span>}
      </div>
    </div>
  );
}

export function SelectField<T extends string>({ label, value, onChange, options, testId }: FieldBase & { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; testId?: string }) {
  return (
    <div className="row-field">
      <label>{label}</label>
      <div className="field-input">
        <select value={value} data-testid={testId} onChange={(e) => onChange(e.target.value as T)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function DateField({ label, value, onChange, testId }: FieldBase & { value: string; onChange: (v: string) => void; testId?: string }) {
  return (
    <div className="row-field">
      <label>{label}</label>
      <div className="field-input">
        <input type="date" value={value} data-testid={testId} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

export function ToggleRow({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="row">
      <div className="row-main">
        <div className="row-label">{label}</div>
        {sub && <div className="row-sub">{sub}</div>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      className={`toggle ${checked ? 'on' : ''}`}
      onClick={() => {
        tap();
        onChange(!checked);
      }}
    />
  );
}

// ---------- Buttons ----------

export function Button({ children, onClick, variant = 'filled', block, small, disabled, type = 'button', testId, style }: { children: ReactNode; onClick?: () => void; variant?: 'filled' | 'tinted' | 'gray' | 'plain' | 'destructive' | 'success'; block?: boolean; small?: boolean; disabled?: boolean; type?: 'button' | 'submit'; testId?: string; style?: CSSProperties }) {
  return (
    <button
      type={type}
      className={`btn ${variant} ${block ? 'block' : ''} ${small ? 'small' : ''}`}
      disabled={disabled}
      data-testid={testId}
      style={style}
      onClick={() => {
        tap();
        onClick?.();
      }}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          className={o.value === value ? 'active' : ''}
          onClick={() => {
            tap();
            onChange(o.value);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chips<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button
          key={o.value}
          className={`chip ${o.value === value ? 'selected' : ''}`}
          onClick={() => {
            tap();
            onChange(o.value);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Sheet ----------

export function Sheet({ open, onClose, title, children, right, left }: { open: boolean; onClose: () => void; title: string; children: ReactNode; right?: ReactNode; left?: ReactNode }) {
  const nav = useNav();
  const [closing, setClosing] = useState(false);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setClosing(false);
    } else if (visible) {
      setClosing(true);
      const t = setTimeout(() => {
        setVisible(false);
        setClosing(false);
      }, 220);
      return () => clearTimeout(t);
    }
  }, [open, visible]);

  useEffect(() => {
    if (!open) return;
    return nav.registerBack(onClose);
  }, [open, onClose, nav]);

  if (!visible) return null;
  return (
    <>
      <div className={`sheet-backdrop ${closing ? 'closing' : ''}`} onClick={onClose} />
      <div className={`sheet ${closing ? 'closing' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <div className="nav-left">
            {left ?? (
              <button
                className="nav-btn"
                onClick={() => {
                  tap();
                  onClose();
                }}
              >
                Cancelar
              </button>
            )}
          </div>
          <div className="title">{title}</div>
          <div className="nav-right">{right}</div>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>
  );
}

// ---------- Alert ----------

export interface AlertAction {
  label: string;
  onClick?: () => void;
  style?: 'default' | 'bold' | 'destructive';
}

export function Alert({ open, title, message, actions, onClose }: { open: boolean; title: string; message?: string; actions: AlertAction[]; onClose: () => void }) {
  const nav = useNav();
  useEffect(() => {
    if (!open) return;
    return nav.registerBack(onClose);
  }, [open, onClose, nav]);
  if (!open) return null;
  return (
    <div className="alert-backdrop" onClick={onClose}>
      <div className="alert" role="alertdialog" onClick={(e) => e.stopPropagation()}>
        <div className="alert-content">
          <div className="alert-title">{title}</div>
          {message && <div className="alert-msg">{message}</div>}
        </div>
        <div className={`alert-actions ${actions.length > 2 ? 'vertical' : ''}`}>
          {actions.map((a) => (
            <button
              key={a.label}
              className={a.style ?? ''}
              onClick={() => {
                tap();
                a.onClick?.();
                onClose();
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Hook para confirmaciones rápidas */
export function useConfirm() {
  const [state, setState] = useState<{ title: string; message?: string; onConfirm: () => void; destructive?: boolean; confirmLabel?: string } | null>(null);
  const confirm = (opts: { title: string; message?: string; onConfirm: () => void; destructive?: boolean; confirmLabel?: string }) => setState(opts);
  const element = (
    <Alert
      open={Boolean(state)}
      title={state?.title ?? ''}
      message={state?.message}
      onClose={() => setState(null)}
      actions={[
        { label: 'Cancelar', style: 'bold' },
        { label: state?.confirmLabel ?? (state?.destructive ? 'Eliminar' : 'Aceptar'), style: state?.destructive ? 'destructive' : 'default', onClick: state?.onConfirm },
      ]}
    />
  );
  return { confirm, element };
}

// ---------- Progress ----------

export function Progress({ value, color, thick }: { value: number; color?: string; thick?: boolean }) {
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div className={`progress ${thick ? 'thick' : ''}`} role="progressbar" aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${v * 100}%`, background: color }} />
    </div>
  );
}

export function Ring({ value, size = 72, stroke = 8, color = 'var(--blue)', children, track }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode; track?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track ?? 'var(--fill)'} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.2,0.8,0.2,1)' }} />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

export function StackBar({ parts }: { parts: { value: number; color: string; label: string }[] }) {
  const total = parts.reduce((a, p) => a + Math.max(0, p.value), 0) || 1;
  return (
    <>
      <div className="stack-bar" role="img" aria-label={parts.map((p) => `${p.label}: ${money(p.value)}`).join(', ')}>
        {parts
          .filter((p) => p.value > 0)
          .map((p) => (
            <span key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
          ))}
      </div>
      <div className="legend">
        {parts.map((p) => (
          <span key={p.label}>
            <i className="dot" style={{ background: p.color }} />
            {p.label} · {money(p.value)}
          </span>
        ))}
      </div>
    </>
  );
}

// ---------- Misc ----------

export function EmptyState({ emoji, title, text, action }: { emoji: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="emoji">{emoji}</div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action && <div className="mt16">{action}</div>}
    </div>
  );
}

export function Avatar({ member, large }: { member?: Pick<Member, 'name' | 'color'>; large?: boolean }) {
  const initial = member?.name?.trim().charAt(0).toUpperCase() || '?';
  return (
    <span className={`avatar ${large ? 'large' : ''}`} style={{ background: member?.color ?? 'var(--gray)' }}>
      {initial}
    </span>
  );
}

export function Badge({ children, tone }: { children: ReactNode; tone?: 'green' | 'red' | 'orange' | 'blue' }) {
  return <span className={`badge ${tone ?? ''}`}>{children}</span>;
}

export function MonthPicker({ value, onChange, label }: { value: string; onChange: (m: string) => void; label: string }) {
  return (
    <div className="month-picker">
      <button aria-label="Mes anterior" onClick={() => { tap(); onChange('prev'); }}>
        <ChevronLeft size={22} />
      </button>
      <span className="label">{label}</span>
      <button aria-label="Mes siguiente" onClick={() => { tap(); onChange('next'); }}>
        <ChevronRight size={22} />
      </button>
      <span style={{ display: 'none' }}>{value}</span>
    </div>
  );
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="toast">{message}</div>;
}

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const show = (m: string) => {
    setMessage(m);
    setTimeout(() => setMessage(null), 1800);
  };
  return { show, element: <Toast message={message} /> };
}
