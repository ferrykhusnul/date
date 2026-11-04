import { describe, expect, it } from 'vitest';
import {
  WEIGHTS,
  activityScore,
  budgetScore,
  durationScore,
  environmentScore,
  scoreVenue,
  vibeScore,
} from './scoring';
import { venue } from './testFixtures';

describe('weights', () => {
  it('match the specification and sum to 100', () => {
    expect(WEIGHTS).toEqual({ vibe: 35, activity: 25, budget: 20, environment: 10, duration: 10 });
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe('component scores', () => {
  it('vibe: exact match, affinity, none', () => {
    expect(vibeScore(['romantis'], 'romantis')).toBe(1);
    expect(vibeScore(['elegan'], 'romantis')).toBe(0.6);
    expect(vibeScore(['santai', 'elegan'], 'romantis')).toBe(0.6); // best affinity wins
    expect(vibeScore([], 'romantis')).toBe(0);
  });

  it('activity: target, other requested, none', () => {
    expect(activityScore(['kopi'], ['kopi', 'makan'], 'kopi')).toBe(1);
    expect(activityScore(['makan'], ['kopi', 'makan'], 'kopi')).toBe(0.5);
    expect(activityScore(['nonton'], ['kopi'], 'kopi')).toBe(0);
    expect(activityScore(['kopi', 'makan'], ['kopi', 'makan'])).toBe(1);
    expect(activityScore(['kopi'], ['kopi', 'makan'])).toBeCloseTo(0.8);
    expect(activityScore(['kopi'], [])).toBe(0);
  });

  it('budget: within, partially within, over, unknown price', () => {
    // costs are for two: 30k–60k pp → 60k–120k
    const v = { priceMin: 30_000, priceMax: 60_000 };
    expect(budgetScore(v, 120_000)).toBe(1);
    expect(budgetScore(v, 90_000)).toBe(0.75); // halfway into the range
    expect(budgetScore(v, 60_000)).toBe(0.5);
    expect(budgetScore(v, 40_000)).toBeCloseTo(0.4 * (1 - 20_000 / 40_000));
    expect(budgetScore(v, 20_000)).toBe(0); // min is 3× budget
    expect(budgetScore(v, 0)).toBe(0);
    expect(budgetScore({ priceMin: 0, priceMax: 0 }, 0)).toBe(1); // free fits any budget
    expect(budgetScore({ priceMin: 0, priceMax: 0, priceUnknown: true }, 1_000_000)).toBe(0.5);
  });

  it('environment: any, exact, mixed venue, mismatch', () => {
    expect(environmentScore('outdoor', 'mixed')).toBe(1);
    expect(environmentScore('indoor', 'indoor')).toBe(1);
    expect(environmentScore('mixed', 'indoor')).toBe(0.75);
    expect(environmentScore('outdoor', 'indoor')).toBe(0);
  });

  it('duration: ratio of shorter to longer', () => {
    expect(durationScore(60, 60)).toBe(1);
    expect(durationScore(60, 120)).toBe(0.5);
    expect(durationScore(120, 60)).toBe(0.5);
    expect(durationScore(0, 60)).toBe(0);
  });
});

describe('scoreVenue', () => {
  const ctx = {
    vibe: 'romantis' as const,
    requestedActivities: ['kopi' as const],
    targetActivity: 'kopi' as const,
    environment: 'indoor' as const,
    perStopBudget: 200_000,
    slotMinutes: 60,
  };

  it('scores a perfect match 100', () => {
    const r = scoreVenue(venue({ id: 'p', vibes: ['romantis'] }), ctx);
    expect(r.breakdown.total).toBe(100);
    expect(r.reasons.length).toBeGreaterThan(0);
    expect(r.reasons.length).toBeLessThanOrEqual(3);
  });

  it('applies the weights exactly', () => {
    // vibe 0.6 (elegan), activity 0.5, budget 1, environment 0.75 (mixed), duration 0.5
    const v = venue({ id: 'w', vibes: ['elegan'], activities: ['makan'], environment: 'mixed', visitDurationMinutes: 120 });
    const r = scoreVenue(v, { ...ctx, requestedActivities: ['kopi', 'makan'] });
    expect(r.breakdown.total).toBe(Math.floor(0.6 * 35 + 0.5 * 25 + 1 * 20 + 0.75 * 10 + 0.5 * 10)); // 66
  });

  it('only scores 100 for a perfect match', () => {
    // Budget covers most but not all of the range: 99.x must not round up to 100.
    const r = scoreVenue(venue({ id: 'n', vibes: ['romantis'], priceMin: 100_000, priceMax: 200_000 }), { ...ctx, perStopBudget: 390_000 });
    expect(r.breakdown.budget).toBeLessThan(1);
    expect(r.breakdown.total).toBe(99);
  });

  it('stays within 0–100 and scores a total mismatch 0', () => {
    const v = venue({ id: 'z', vibes: [], activities: ['nonton'], environment: 'outdoor', visitDurationMinutes: 0, priceMin: 500_000, priceMax: 900_000 });
    const r = scoreVenue(v, { ...ctx, perStopBudget: 100_000 });
    expect(r.breakdown.total).toBe(0);
  });

  it('is deterministic', () => {
    const v = venue({ id: 'd', vibes: ['santai'] });
    expect(scoreVenue(v, ctx)).toEqual(scoreVenue(v, ctx));
  });

  it('explains unknown prices without inventing a number', () => {
    const r = scoreVenue(venue({ id: 'u', vibes: ['romantis'], priceUnknown: true }), ctx);
    expect(r.breakdown.budget).toBe(0.5);
    expect(r.reasons.join(' ')).not.toMatch(/Rp/);
  });
});
