import { useEffect, useState, type ReactNode } from 'react';
import { NEEDS, type Need } from '../../shared/schema';
import { NEED_ICON, NEED_LABEL } from '../lib/labels';

export const inputClass =
  'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base text-white placeholder-slate-500';

/** Accessibility attributes for an input rendered inside a `Field` with the same id */
export function fieldProps(id: string, error?: string) {
  return {
    id,
    'aria-invalid': !!error,
    'aria-describedby': error ? `${id}-err` : undefined,
  };
}

/**
 * A labelled form field. With `group`, the label names a `role="group"` wrapper (for toggle groups)
 * instead of pointing at a single input via `htmlFor`.
 */
export function Field({
  id,
  label,
  error,
  group,
  children,
}: {
  id: string;
  label: ReactNode;
  error?: string;
  group?: boolean;
  children: ReactNode;
}) {
  const labelClass = 'block text-sm font-semibold text-slate-200';
  const labelId = `${id}-label`;
  return (
    <div className="space-y-1.5">
      {group ? (
        <div id={labelId} className={labelClass}>
          {label}
        </div>
      ) : (
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
      )}
      {group ? (
        <div
          role="group"
          aria-labelledby={labelId}
          aria-describedby={error ? `${id}-err` : undefined}
          className="space-y-2"
        >
          {children}
        </div>
      ) : (
        children
      )}
      {error && (
        <p id={`${id}-err`} className="text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

const toggle = (active: boolean) =>
  `flex min-h-12 items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-sm font-medium transition-colors ${
    active ? 'border-cyan-400 bg-cyan-500/20 text-white' : 'border-slate-700 bg-slate-900 text-slate-300'
  }`;

export function NeedToggles({ value, onChange }: { value: Need[]; onChange: (v: Need[]) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {NEEDS.map((n) => {
        const active = value.includes(n);
        return (
          <button
            key={n}
            type="button"
            aria-pressed={active}
            className={toggle(active)}
            onClick={() => onChange(active ? value.filter((v) => v !== n) : [...value, n])}
          >
            <span className="text-xl">{NEED_ICON[n]}</span>
            {NEED_LABEL[n]}
          </button>
        );
      })}
    </div>
  );
}

export interface Vulnerable {
  hasElderly: boolean;
  hasChildren: boolean;
  hasBedridden: boolean;
}

const VULNERABLE: { key: keyof Vulnerable; label: string }[] = [
  { key: 'hasElderly', label: '👵 ผู้สูงอายุ' },
  { key: 'hasChildren', label: '👶 เด็กเล็ก' },
  { key: 'hasBedridden', label: '🛏️ ผู้ป่วยติดเตียง' },
];

export function VulnerableToggles({ value, onChange }: { value: Vulnerable; onChange: (v: Vulnerable) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {VULNERABLE.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          aria-pressed={value[key]}
          className={toggle(value[key])}
          onClick={() => onChange({ ...value, [key]: !value[key] })}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const MIN_PEOPLE = 1;
const MAX_PEOPLE = 500;
const clampPeople = (n: number) => Math.min(MAX_PEOPLE, Math.max(MIN_PEOPLE, Math.round(n)));

export function PeopleCounter({
  value,
  onChange,
  inputProps,
}: {
  value: number;
  onChange: (v: number) => void;
  inputProps?: ReturnType<typeof fieldProps>;
}) {
  // Local text so the field can be cleared and retyped; it is clamped on blur and on +/−
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  const commit = (n: number) => {
    const v = clampPeople(Number.isFinite(n) ? n : MIN_PEOPLE);
    setText(String(v));
    onChange(v);
  };
  const type = (raw: string) => {
    setText(raw);
    const n = Number(raw);
    if (raw.trim() !== '' && Number.isInteger(n) && n >= MIN_PEOPLE && n <= MAX_PEOPLE) onChange(n);
  };

  const btn = 'h-12 w-12 rounded-xl border border-slate-700 bg-slate-900 text-xl font-bold text-white';
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={btn} onClick={() => commit(value - 1)} aria-label="ลดจำนวน">
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={MIN_PEOPLE}
        max={MAX_PEOPLE}
        value={text}
        onChange={(e) => type(e.target.value)}
        onBlur={() => commit(Number(text) || MIN_PEOPLE)}
        className="h-12 w-20 rounded-xl border border-slate-700 bg-slate-950 text-center text-lg font-bold text-white"
        aria-label="จำนวนคน"
        {...inputProps}
      />
      <button type="button" className={btn} onClick={() => commit(value + 1)} aria-label="เพิ่มจำนวน">
        +
      </button>
      <span className="text-sm text-slate-400">คน</span>
    </div>
  );
}
