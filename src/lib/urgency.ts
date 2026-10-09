import type { PublicCase, Status } from '../../shared/schema';
import { distanceKm, type LatLng } from './geo';

/** 0 = most urgent. */
export function urgencyRank(c: PublicCase): number {
  const vulnerable = c.hasElderly || c.hasChildren || c.hasBedridden;
  if (c.needs.includes('evacuate') && vulnerable) return 0;
  if (c.needs.includes('medical')) return 1;
  if (c.needs.includes('evacuate')) return 2;
  return 3;
}

const STATUS_ORDER: Record<Status, number> = { open: 0, claimed: 1, resolved: 2 };

export function sortCases(cases: PublicCase[], origin?: LatLng | null): PublicCase[] {
  return [...cases].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      urgencyRank(a) - urgencyRank(b) ||
      (origin ? distanceKm(origin, a) - distanceKm(origin, b) : 0) ||
      a.createdAt.localeCompare(b.createdAt)
  );
}
