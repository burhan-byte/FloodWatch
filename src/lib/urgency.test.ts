import { describe, expect, it } from 'vitest';
import type { PublicCase } from '../../shared/schema';
import { sortCases, urgencyRank } from './urgency';

const base: PublicCase = {
  id: 'x',
  lat: 14,
  lng: 100,
  locationText: '',
  needs: ['food'],
  peopleCount: 1,
  hasElderly: false,
  hasChildren: false,
  hasBedridden: false,
  contactName: '',
  details: '',
  status: 'open',
  claimedBy: null,
  claimedAt: null,
  createdAt: '2026-10-09T00:00:00.000Z',
  updatedAt: '2026-10-09T00:00:00.000Z',
  resolvedAt: null,
};
const c = (over: Partial<PublicCase>): PublicCase => ({ ...base, ...over });

describe('urgency', () => {
  it('ranks evacuation with vulnerable people first, then medical, evacuation, others', () => {
    expect(urgencyRank(c({ needs: ['evacuate'], hasBedridden: true }))).toBe(0);
    expect(urgencyRank(c({ needs: ['medical', 'food'] }))).toBe(1);
    expect(urgencyRank(c({ needs: ['evacuate'] }))).toBe(2);
    expect(urgencyRank(c({ needs: ['animals'] }))).toBe(3);
  });

  it('sorts open before claimed, then by urgency, distance, and age', () => {
    const sorted = sortCases(
      [
        c({ id: 'claimed', status: 'claimed', needs: ['evacuate'], hasElderly: true }),
        c({ id: 'food-far', lat: 18 }),
        c({ id: 'food-near-new', lat: 14.01, createdAt: '2026-10-09T05:00:00.000Z' }),
        c({ id: 'food-near-old', lat: 14.01, createdAt: '2026-10-09T01:00:00.000Z' }),
        c({ id: 'medical', needs: ['medical'], lat: 18 }),
      ],
      { lat: 14, lng: 100 }
    );
    expect(sorted.map((x) => x.id)).toEqual(['medical', 'food-near-old', 'food-near-new', 'food-far', 'claimed']);
  });
});
