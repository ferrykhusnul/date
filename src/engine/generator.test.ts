import { describe, expect, it } from 'vitest';
import { computeBudget } from './budget';
import { allocateDurations, generateItinerary, selectActivities } from './generator';
import { addCustomItem, moveItem, removeItem, replaceVenue, setCost, setDuration } from './itinerary';
import { OPTS, POOL, input, venue } from './testFixtures';
import { usedMinutes, validateDateInput, validatePlan } from './validation';
import type { Venue } from '../types';

const lookup = (vs: Venue[]) => (id: string) => vs.find((v) => v.id === id);
const codes = (r: { issues: { code: string }[] }) => r.issues.map((i) => i.code);

describe('generateItinerary', () => {
  it('is deterministic for the same input', () => {
    const a = generateItinerary(input(), POOL, OPTS);
    const b = generateItinerary(input(), [...POOL].reverse(), OPTS);
    expect(a).toEqual(b);
  });

  it('uses only active venues in the city, without duplicates', () => {
    const { plan } = generateItinerary(input({ durationHours: 6 }), POOL, OPTS);
    const ids = plan!.items.map((i) => i.venueId);
    expect(ids).not.toContain('lain-kota');
    expect(ids).not.toContain('nonaktif');
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('picks the requested activities in a natural order with complements', () => {
    const { plan } = generateItinerary(input({ startTime: '15:00', durationHours: 4 }), POOL, OPTS);
    expect(plan!.items.map((i) => i.activity)).toEqual(['jalan', 'kopi', 'makan']);
    expect(plan!.items.map((i) => i.venueId)).toEqual(['taman-a', 'kafe-a', 'resto-a']);
  });

  it('puts the meal first at dinner time', () => {
    const { plan } = generateItinerary(input({ startTime: '18:00', durationHours: 3 }), POOL, OPTS);
    expect(plan!.items[0].activity).toBe('makan');
  });

  it('avoids consecutive venues of the same category', () => {
    const { plan } = generateItinerary(input({ durationHours: 6 }), POOL, OPTS);
    const cats = plan!.items.map((i) => POOL.find((v) => v.id === i.venueId)!.category);
    for (let i = 1; i < cats.length; i++) expect(cats[i]).not.toBe(cats[i - 1]);
  });

  it('respects the total duration and builds a continuous timeline', () => {
    for (const hours of [2, 3, 4, 5, 6]) {
      const { plan } = generateItinerary(input({ durationHours: hours }), POOL, OPTS);
      expect(usedMinutes(plan!)).toBeLessThanOrEqual(hours * 60);
      plan!.items.forEach((it) => expect(it.durationMinutes % 15).toBe(0));
    }
    const { plan } = generateItinerary(input({ startTime: '16:00', durationHours: 4 }), POOL, OPTS);
    expect(plan!.items[0].startTime).toBe('16:00');
    expect(plan!.items[1].startTime).toBe(addMinutes(plan!.items[0].endTime, plan!.transport.minutesPerLeg));
  });

  it('respects the budget when possible', () => {
    const { plan } = generateItinerary(input({ budget: 250_000, durationHours: 4 }), POOL, OPTS);
    expect(computeBudget(plan!).totalMin).toBeLessThanOrEqual(250_000);
    expect(plan!.items.map((i) => i.venueId)).not.toContain('resto-a'); // 200k–400k for two
  });

  it('includes alternatives that are not already in the plan', () => {
    const { plan } = generateItinerary(input(), POOL, OPTS);
    const inPlan = new Set(plan!.items.map((i) => i.venueId));
    const kopi = plan!.items.find((i) => i.activity === 'kopi')!;
    expect(kopi.alternatives.map((a) => a.venueId)).toContain('kafe-b');
    plan!.items.forEach((i) => i.alternatives.forEach((a) => expect(inPlan.has(a.venueId)).toBe(false)));
  });

  it('explains selections and builds a concept from the activities', () => {
    const { plan } = generateItinerary(input({ startTime: '15:00' }), POOL, OPTS);
    plan!.items.forEach((i) => expect(i.reasons.length).toBeGreaterThan(0));
    expect(plan!.concept.toLowerCase()).toContain('jalan-jalan santai, ngopi sambil mengobrol, lalu makan bersama');
    expect(plan!.title).toBe('Sore Romantis di Kota Uji');
  });

  it('filters by environment and relaxes it with a warning when nothing matches', () => {
    const { plan } = generateItinerary(input({ environment: 'outdoor' }), POOL, OPTS);
    plan!.items.forEach((i) => expect(POOL.find((v) => v.id === i.venueId)!.environment).not.toBe('indoor'));
    const onlyIndoor = POOL.filter((v) => v.environment === 'indoor');
    expect(codes(generateItinerary(input({ environment: 'outdoor' }), onlyIndoor, OPTS))).toContain('ENVIRONMENT_RELAXED');
  });
});

describe('edge cases', () => {
  it('no venues available', () => {
    const r = generateItinerary(input({ city: 'Kota Kosong' }), POOL, OPTS);
    expect(r.plan).toBeNull();
    expect(codes(r)).toEqual(['NO_VENUES']);
  });

  it('insufficient venues', () => {
    const r = generateItinerary(input({ durationHours: 6 }), POOL.slice(0, 2), OPTS);
    expect(r.plan!.items).toHaveLength(2);
    expect(codes(r)).toContain('INSUFFICIENT_VENUES');
  });

  it('budget too low', () => {
    const pricey = [venue({ id: 'mahal', priceMin: 500_000, priceMax: 900_000 })];
    const r = generateItinerary(input({ budget: 100_000 }), pricey, OPTS);
    expect(codes(r)).toContain('BUDGET_TOO_LOW');
    expect(r.plan!.items).toHaveLength(1);
    expect(validatePlan(r.plan!, lookup(pricey)).map((i) => i.code)).toContain('OVER_BUDGET');
  });

  it('duration too short', () => {
    const r = generateItinerary(input({ durationHours: 0.5 }), POOL, OPTS);
    expect(r.plan).toBeNull();
    expect(codes(r)).toEqual(['DURATION_TOO_SHORT']);
    expect(validateDateInput(input({ durationHours: 0.5 }), '2026-11-01').durationHours).toBeDefined();
  });

  it('missing price information is excluded, not guessed', () => {
    const vs = [venue({ id: 'tanpa-harga', priceUnknown: true, priceMin: 0, priceMax: 0, vibes: ['romantis'] })];
    const { plan } = generateItinerary(input({ durationHours: 2 }), vs, OPTS);
    const it = plan!.items[0];
    expect(it.priceKnown).toBe(false);
    expect(it.costEstimate).toBe(0);
    expect(it.notes.join(' ')).toMatch(/Harga belum ada/);
    expect(validatePlan(plan!, lookup(vs)).map((i) => i.code)).toContain('MISSING_PRICE');
  });

  it('no compatible activity', () => {
    const r = generateItinerary(input({ activities: ['nonton'] }), POOL, OPTS);
    expect(codes(r)).toContain('NO_COMPATIBLE_ACTIVITY');
    expect(r.plan!.items.length).toBeGreaterThan(0);
  });

  it('some requested activities unavailable', () => {
    expect(codes(generateItinerary(input({ activities: ['kopi', 'nonton'] }), POOL, OPTS))).toContain('ACTIVITY_UNAVAILABLE');
  });

  it('incomplete dataset', () => {
    const vs = [...POOL, venue({ id: 'kosong', vibes: [], activities: [], visitDurationMinutes: 0 })];
    const r = generateItinerary(input(), vs, OPTS);
    expect(codes(r)).toContain('INCOMPLETE_DATASET');
    expect(r.plan!.items.map((i) => i.venueId)).not.toContain('kosong');
  });
});

describe('helpers', () => {
  it('selectActivities never repeats and adds complements', () => {
    const all = new Set(['kopi', 'makan', 'jalan', 'galeri'] as const);
    expect(selectActivities(['makan'], all, 3, '15:00')).toEqual(['jalan', 'kopi', 'makan']);
    expect(selectActivities(['kopi', 'kopi'], all, 1, '15:00')).toEqual(['kopi']);
  });

  it('allocateDurations shrinks, extends and fits exactly', () => {
    // 150 min of visits into 120 min: scaled by 0.8 and floored to 15-minute steps.
    expect(allocateDurations([{ min: 60, base: 90, max: 120 }, { min: 45, base: 60, max: 90 }], 120)).toEqual([60, 45]);
    // Already fits exactly.
    expect(allocateDurations([{ min: 60, base: 90, max: 120 }], 90)).toEqual([90]);
    // Never below the 30-minute floor, trimming the longest first.
    expect(allocateDurations([{ min: 30, base: 60, max: 90 }, { min: 30, base: 60, max: 90 }], 60)).toEqual([30, 30]);
    const shrunk = allocateDurations([{ min: 60, base: 90, max: 120 }, { min: 45, base: 60, max: 90 }], 120);
    expect(shrunk.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(120);
    const grown = allocateDurations([{ min: 60, base: 90, max: 120 }, { min: 45, base: 60, max: 90 }], 300);
    expect(grown).toEqual([120, 90]); // capped at realistic maximums
  });
});

describe('manual editing', () => {
  const get = lookup(POOL);
  const base = () => generateItinerary(input({ startTime: '15:00', durationHours: 4 }), POOL, OPTS).plan!;

  it('removes an activity and recalculates timeline and budget', () => {
    const p = base();
    const before = computeBudget(p).totalEstimate;
    const removed = p.items[1];
    const q = removeItem(p, removed.id, get);
    expect(q.items).toHaveLength(2);
    expect(q.items[1].startTime).toBe(addMinutes(q.items[0].endTime, q.transport.minutesPerLeg));
    expect(q.transport.legs).toBe(1);
    expect(computeBudget(q).totalEstimate).toBe(before - removed.costEstimate - 10_000); // one motor leg fewer
  });

  it('reorders items', () => {
    const p = base();
    const q = moveItem(p, 2, 0, get);
    expect(q.items.map((i) => i.id)).toEqual([p.items[2].id, p.items[0].id, p.items[1].id]);
    expect(q.items[0].startTime).toBe('15:00');
    expect(moveItem(p, 0, 9, get)).toBe(p);
  });

  it('adjusts duration in 15-minute steps within bounds', () => {
    const p = base();
    const id = p.items[0].id;
    expect(setDuration(p, id, 100, get).items[0].durationMinutes).toBe(105);
    expect(setDuration(p, id, 1, get).items[0].durationMinutes).toBe(15);
    expect(setDuration(p, id, 9999, get).items[0].durationMinutes).toBe(360);
    const longer = setDuration(p, id, p.items[0].durationMinutes + 60, get);
    expect(longer.items[1].startTime).toBe(addMinutes(p.items[1].startTime, 60));
  });

  it('adjusts the estimated cost', () => {
    const p = base();
    const q = setCost(p, p.items[2].id, 123_000, get);
    expect(q.items[2]).toMatchObject({ costMin: 123_000, costMax: 123_000, costEstimate: 123_000, costEdited: true });
    expect(computeBudget(q).itemsEstimate).toBe(computeBudget(p).itemsEstimate - p.items[2].costEstimate + 123_000);
    // Price-based selection reasons no longer apply once the cost is set by hand.
    expect(q.items[2].reasons.some((r) => /anggaran|biaya|Gratis|Harga/.test(r))).toBe(false);
    expect(q.items[2].notes).toContain('Biaya disesuaikan manual.');
  });

  it('replaces a venue and keeps the old one as an alternative', () => {
    const p = base();
    const kopi = p.items.find((i) => i.activity === 'kopi')!;
    const q = replaceVenue(p, kopi.id, POOL.find((v) => v.id === 'kafe-b')!, get);
    const it = q.items.find((i) => i.id === kopi.id)!;
    expect(it.venueId).toBe('kafe-b');
    expect(it.costEstimate).toBe(60_000);
    expect(it.alternatives[0].venueId).toBe('kafe-a');
  });

  it('adds a free-form activity with deterministic ids', () => {
    const p = base();
    const q = addCustomItem(p, { title: 'Foto di photobox', durationMinutes: 30, cost: 50_000, note: 'Bawa uang tunai' }, get);
    const r = addCustomItem(q, { title: 'Pulang', durationMinutes: 15, cost: 0 }, get);
    expect(r.items.slice(-2).map((i) => i.id)).toEqual(['custom-1', 'custom-2']);
    expect(q.items.at(-1)!.notes[0]).toBe('Bawa uang tunai');
    expect(computeBudget(q).itemsEstimate).toBe(computeBudget(p).itemsEstimate + 50_000);
    expect(q.concept).toContain('"Foto di photobox"');
  });

  it('flags plans that run over the requested duration after editing', () => {
    const p = base();
    const q = setDuration(p, p.items[0].id, 360, get);
    expect(validatePlan(q, get).map((i) => i.code)).toContain('OVER_DURATION');
    expect(validatePlan({ ...p, items: [] }, get).map((i) => i.code)).toEqual(['EMPTY_ITINERARY']);
  });
});

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const t = (h * 60 + m + minutes) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}
