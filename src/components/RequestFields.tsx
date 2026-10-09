import { NEEDS, type Need } from '../../shared/schema';
import { NEED_ICON, NEED_LABEL } from '../lib/labels';

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

export function PeopleCounter({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const set = (n: number) => onChange(Math.min(500, Math.max(1, n)));
  const btn = 'h-12 w-12 rounded-xl border border-slate-700 bg-slate-900 text-xl font-bold text-white';
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={btn} onClick={() => set(value - 1)} aria-label="ลดจำนวน">
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={500}
        value={value}
        onChange={(e) => set(Number(e.target.value) || 1)}
        className="h-12 w-20 rounded-xl border border-slate-700 bg-slate-950 text-center text-lg font-bold text-white"
        aria-label="จำนวนคน"
      />
      <button type="button" className={btn} onClick={() => set(value + 1)} aria-label="เพิ่มจำนวน">
        +
      </button>
      <span className="text-sm text-slate-400">คน</span>
    </div>
  );
}
