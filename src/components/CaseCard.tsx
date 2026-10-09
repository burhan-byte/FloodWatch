import { Link } from 'wouter';
import type { PublicCase } from '../../shared/schema';
import { timeAgo } from '../lib/format';
import { distanceKm, type LatLng } from '../lib/geo';
import { NEED_ICON, NEED_LABEL, STATUS_COLOR, STATUS_LABEL } from '../lib/labels';

export function VulnerableBadges({ c }: { c: PublicCase }) {
  const badges = [c.hasElderly && 'ผู้สูงอายุ', c.hasChildren && 'เด็ก', c.hasBedridden && 'ผู้ป่วยติดเตียง'].filter(Boolean);
  if (badges.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {badges.map((b) => (
        <span key={b as string} className="rounded bg-red-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-red-300">
          {b}
        </span>
      ))}
    </span>
  );
}

export function CaseCard({ c, origin }: { c: PublicCase; origin?: LatLng | null }) {
  return (
    <Link
      href={`/r/${c.id}`}
      className="block rounded-xl border border-slate-800 bg-slate-900 p-3 transition-colors hover:border-slate-600"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold text-white">
          {c.needs.map((n) => `${NEED_ICON[n]} ${NEED_LABEL[n]}`).join(' · ')}
        </div>
        <span
          className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold"
          style={{ color: STATUS_COLOR[c.status], background: `${STATUS_COLOR[c.status]}22` }}
        >
          {STATUS_LABEL[c.status]}
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
        <span>👥 {c.peopleCount} คน</span>
        <VulnerableBadges c={c} />
      </div>
      {c.locationText && <p className="mt-1 line-clamp-1 text-xs text-slate-300">📍 {c.locationText}</p>}
      <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
        <span>{timeAgo(c.createdAt)}</span>
        {origin && <span>ห่าง {distanceKm(origin, c).toFixed(1)} กม.</span>}
      </div>
    </Link>
  );
}
