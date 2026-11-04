import { describe, expect, it } from 'vitest';
import type { Activity, DateInput, Environment, Transportation, Venue, Vibe } from '../types';
import { computeBudget, transportCost } from './budget';
import { generateItinerary } from './generator';
import { usedMinutes } from './validation';
import { minutesToTime, timeToMinutes } from '../lib/format';
import { OPTS, venue } from './testFixtures';

/**
 * Sweeps the generator over a grid of inputs and checks invariants that
 * must hold for EVERY plan: no duplicate venues or activities, duration and
 * budget maths consistent, only eligible venues, deterministic output.
 */

const CATS: [string, Activity][] = [
  ['kafe', 'kopi'],
  ['restoran', 'makan'],
  ['taman', 'jalan'],
  ['galeri', 'galeri'],
  ['bioskop', 'nonton'],
  ['pusat-belanja', 'belanja'],
  ['wisata-alam', 'alam'],
  ['hiburan', 'hiburan'],
];
const VIBES: Vibe[] = ['romantis', 'santai', 'petualang', 'kreatif', 'elegan'];
const ENVS: Environment[] = ['indoor', 'outdoor', 'mixed'];

// 48 fictional venues with varied prices, durations, vibes, environments and data gaps.
const POOL: Venue[] = [];
CATS.forEach(([category, activity], ci) => {
  for (let k = 0; k < 6; k++) {
    const n = ci * 6 + k;
    POOL.push(
      venue({
        id: `v${n}`,
        name: `Venue ${String(n).padStart(2, '0')}`,
        category,
        activities: k === 5 ? [activity, CATS[(ci + 1) % CATS.length][1]] : [activity],
        vibes: [VIBES[n % 5], VIBES[(n + 2) % 5]],
        environment: ENVS[n % 3],
        priceMin: (n % 4) * 25_000,
        priceMax: (n % 4) * 25_000 + 50_000,
        priceUnknown: n % 11 === 0 ? true : undefined,
        visitDurationMinutes: n % 13 === 0 ? 0 : 30 + (n % 6) * 20,
        status: n % 9 === 0 ? 'inactive' : 'active',
        city: n % 7 === 0 ? 'Kota Lain' : 'Kota Uji',
        latitude: n % 2 ? -6.2 + n * 0.002 : undefined,
        longitude: n % 2 ? 106.8 : undefined,
        transitAccess: n % 3 === 0 ? [{ stationName: `S${n}`, transitType: (['mrt', 'krl', 'lrt', 'transjakarta'] as const)[n % 4], verifiedAt: n % 2 ? '2026-10-01' : undefined }] : undefined,
      }),
    );
  }
});
const byId = new Map(POOL.map((v) => [v.id, v]));

const ACTIVITY_SETS: Activity[][] = [['kopi'], ['makan', 'kopi'], ['galeri', 'jalan', 'makan'], ['nonton', 'belanja', 'hiburan', 'alam'], ['kopi', 'makan', 'jalan', 'galeri', 'nonton', 'belanja', 'alam', 'hiburan']];
const TRANSPORTS: Transportation[] = ['motor', 'mobil', 'jalan-kaki', 'mrt', 'umum', 'campuran'];

function* inputs(): Generator<DateInput> {
  let i = 0;
  for (const durationHours of [1, 2, 3, 4, 5, 6, 8])
    for (const budget of [50_000, 200_000, 600_000, 2_000_000])
      for (const activities of ACTIVITY_SETS)
        for (const transportation of TRANSPORTS) {
          i++;
          yield {
            city: i % 5 === 0 ? ' kota uji ' : 'Kota Uji', // city match is case/whitespace-insensitive
            date: '2026-12-01',
            startTime: ['09:00', '12:00', '15:30', '18:00', '21:00'][i % 5],
            durationHours,
            budget,
            vibe: VIBES[i % 5],
            activities,
            transportation,
            environment: ENVS[i % 3],
            notes: '',
          };
        }
}

describe('generator invariants', () => {
  const all = [...inputs()];

  it(`hold for ${all.length} input combinations`, () => {
    let plans = 0;
    for (const input of all) {
      const { plan } = generateItinerary(input, POOL, OPTS);
      expect(plan, JSON.stringify(input)).not.toBeNull();
      if (!plan) continue;
      plans++;
      const ctx = JSON.stringify({ d: input.durationHours, b: input.budget, a: input.activities, t: input.transportation });

      // Only active venues in the requested city; never duplicated.
      const ids = plan.items.map((i) => i.venueId!);
      expect(new Set(ids).size, ctx).toBe(ids.length);
      for (const id of ids) {
        const v = byId.get(id)!;
        expect(v.status, ctx).toBe('active');
        expect(v.city, ctx).toBe('Kota Uji');
      }
      // No activity repeated.
      const acts = plan.items.map((i) => i.activity).filter(Boolean);
      expect(new Set(acts).size, ctx).toBe(acts.length);
      expect(plan.items.length, ctx).toBeGreaterThan(0);
      expect(plan.items.length, ctx).toBeLessThanOrEqual(4);

      // Duration: fits, 15-minute steps, at least 30 min, continuous timeline.
      expect(usedMinutes(plan), ctx).toBeLessThanOrEqual(input.durationHours * 60);
      let cursor = timeToMinutes(input.startTime);
      plan.items.forEach((item, idx) => {
        expect(item.durationMinutes % 15, ctx).toBe(0);
        expect(item.durationMinutes, ctx).toBeGreaterThanOrEqual(30);
        expect(item.startTime, ctx).toBe(minutesToTime(cursor));
        expect(item.endTime, ctx).toBe(minutesToTime(cursor + item.durationMinutes));
        cursor += item.durationMinutes + (plan.transport.legs[idx]?.bufferMinutes ?? 0);
      });
      expect(plan.transport.legs.length, ctx).toBe(Math.max(0, plan.items.length - 1));

      // Costs: ranges consistent; unknown prices never counted.
      for (const item of plan.items) {
        const v = byId.get(item.venueId!)!;
        if (v.priceUnknown) {
          expect(item, ctx).toMatchObject({ priceKnown: false, costMin: 0, costMax: 0, costEstimate: 0 });
        } else {
          expect(item.costMin, ctx).toBe(v.priceMin * 2);
          expect(item.costMax, ctx).toBe(v.priceMax * 2);
          expect(item.costEstimate, ctx).toBeGreaterThanOrEqual(item.costMin);
          expect(item.costEstimate, ctx).toBeLessThanOrEqual(item.costMax);
        }
      }

      // Budget summary equals an independent recomputation.
      const b = computeBudget(plan);
      const known = plan.items.filter((i) => i.priceKnown);
      const t = transportCost(plan.transport.legs);
      expect(b.totalMin, ctx).toBe(known.reduce((s, i) => s + i.costMin, 0) + t.min);
      expect(b.totalMax, ctx).toBe(known.reduce((s, i) => s + i.costMax, 0) + t.max);
      expect(b.totalEstimate, ctx).toBe(known.reduce((s, i) => s + i.costEstimate, 0) + t.estimate);
      expect(b.remaining, ctx).toBe(input.budget - b.totalEstimate);
      expect(b.utilization, ctx).toBeCloseTo((b.totalEstimate / input.budget) * 100, 1);
      expect(b.totalMin <= b.totalEstimate && b.totalEstimate <= b.totalMax, ctx).toBe(true);
      expect(b.unknownPriceCount, ctx).toBe(plan.items.length - known.length);
      // Public transport fares are never priced.
      for (const leg of plan.transport.legs) {
        if (['transjakarta', 'mrt', 'lrt', 'krl', 'umum'].includes(leg.mode)) expect(leg, ctx).toMatchObject({ fareKnown: false, costMin: 0, costMax: 0 });
      }

      // Scores stay in range.
      for (const item of plan.items) {
        expect(item.score!.total, ctx).toBeGreaterThanOrEqual(0);
        expect(item.score!.total, ctx).toBeLessThanOrEqual(100);
        expect(item.score!.rank, ctx).toBeGreaterThanOrEqual(0);
        expect(item.score!.rank, ctx).toBeLessThanOrEqual(100);
        item.alternatives.forEach((a) => expect(ids.includes(a.venueId), ctx).toBe(false));
      }
    }
    expect(plans).toBe(all.length);
  });

  it('is deterministic regardless of venue order', () => {
    const reversed = [...POOL].reverse();
    let n = 0;
    for (const input of all) {
      if (n++ % 7) continue; // a spread-out subset keeps the test fast
      expect(generateItinerary(input, reversed, OPTS)).toEqual(generateItinerary(input, POOL, OPTS));
    }
  });
});
