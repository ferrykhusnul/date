import { describe, expect, it } from 'vitest';
import { budgetIssues, hasPrice, summarizeBudget, transportCost, venueCost } from './budget';
import { MODE_PROFILE } from './transport';
import type { LegMode } from '../types';

/** n legs using a mode's profile. */
const legs = (mode: LegMode, n: number) => Array.from({ length: n }, () => MODE_PROFILE[mode]);

const item = (min: number, max: number, estimate: number, priceKnown = true) => ({ costMin: min, costMax: max, costEstimate: estimate, priceKnown });

describe('venue pricing', () => {
  it('doubles per-person prices for two and rounds the midpoint to Rp 1.000', () => {
    expect(venueCost({ priceMin: 35_000, priceMax: 75_000 })).toEqual({ min: 70_000, max: 150_000, estimate: 110_000 });
    expect(venueCost({ priceMin: 12_300, priceMax: 12_900 })).toEqual({ min: 24_600, max: 25_800, estimate: 25_000 });
    expect(venueCost({ priceMin: 0, priceMax: 0 })).toEqual({ min: 0, max: 0, estimate: 0 });
  });

  it('never estimates missing or invalid prices', () => {
    expect(venueCost({ priceMin: 10_000, priceMax: 20_000, priceUnknown: true })).toBeNull();
    expect(hasPrice({ priceMin: Number.NaN, priceMax: 10 })).toBe(false);
    expect(hasPrice({ priceMin: 20, priceMax: 10 })).toBe(false);
    expect(hasPrice({ priceMin: -1, priceMax: 10 })).toBe(false);
  });
});

describe('transport', () => {
  it('sums rough allowances for priced legs', () => {
    expect(transportCost(legs('motor', 2))).toEqual({ min: 10_000, max: 30_000, estimate: 20_000, unpricedLegs: 0 });
    expect(transportCost(legs('jalan-kaki', 3))).toEqual({ min: 0, max: 0, estimate: 0, unpricedLegs: 0 });
    expect(transportCost([])).toEqual({ min: 0, max: 0, estimate: 0, unpricedLegs: 0 });
  });

  it('never estimates public transport fares', () => {
    for (const mode of ['transjakarta', 'mrt', 'lrt', 'krl', 'umum'] as const) {
      expect(transportCost(legs(mode, 2))).toEqual({ min: 0, max: 0, estimate: 0, unpricedLegs: 2 });
    }
    expect(transportCost([...legs('mrt', 1), ...legs('mobil', 1)])).toEqual({ min: 10_000, max: 30_000, estimate: 20_000, unpricedLegs: 1 });
  });
});

describe('summarizeBudget', () => {
  const t = legs('motor', 2); // 10k–30k, est 20k

  it('computes totals, remaining and utilisation', () => {
    const b = summarizeBudget(500_000, [item(60_000, 120_000, 90_000), item(200_000, 400_000, 300_000), item(0, 0, 0)], t);
    expect(b.itemsMin).toBe(260_000);
    expect(b.itemsMax).toBe(520_000);
    expect(b.itemsEstimate).toBe(390_000);
    expect(b.totalMin).toBe(270_000);
    expect(b.totalMax).toBe(550_000);
    expect(b.totalEstimate).toBe(410_000);
    expect(b.remaining).toBe(90_000);
    expect(b.utilization).toBe(82);
    expect(b.status).toBe('may-exceed'); // upper bound 550k > 500k
    expect(b.complete).toBe(true);
  });

  it('flags over budget with a negative remaining', () => {
    const b = summarizeBudget(300_000, [item(200_000, 400_000, 300_000)], t);
    expect(b.totalEstimate).toBe(320_000);
    expect(b.remaining).toBe(-20_000);
    expect(b.utilization).toBe(106.7);
    expect(b.status).toBe('over');
    expect(budgetIssues(b).map((i) => i.code)).toEqual(['OVER_BUDGET']);
  });

  it('is within budget when even the maximum fits', () => {
    const b = summarizeBudget(1_000_000, [item(60_000, 120_000, 90_000)], t);
    expect(b.status).toBe('within');
    expect(budgetIssues(b)).toEqual([]);
  });

  it('excludes unknown prices from totals and reports them', () => {
    const b = summarizeBudget(500_000, [item(60_000, 120_000, 90_000), item(0, 0, 0, false)], legs('jalan-kaki', 1));
    expect(b.totalEstimate).toBe(90_000);
    expect(b.unknownPriceCount).toBe(1);
    expect(b.complete).toBe(false);
    expect(budgetIssues(b).map((i) => i.code)).toContain('MISSING_PRICE');
  });

  it('reports public-transport legs as unpriced', () => {
    const b = summarizeBudget(500_000, [item(60_000, 120_000, 90_000)], legs('krl', 2));
    expect(b.transportEstimate).toBe(0);
    expect(b.unpricedLegs).toBe(2);
    expect(budgetIssues(b).map((i) => i.code)).toContain('TRANSIT_FARE_NOT_ESTIMATED');
  });

  it('handles a zero budget without dividing by zero', () => {
    const b = summarizeBudget(0, [item(0, 0, 0)], legs('jalan-kaki', 0));
    expect(b.utilization).toBeNull();
    expect(b.status).toBe('within');
  });
});
