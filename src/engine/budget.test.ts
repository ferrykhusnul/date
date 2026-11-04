import { describe, expect, it } from 'vitest';
import { budgetIssues, hasPrice, summarizeBudget, transportCost, transportEstimate, venueCost } from './budget';

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
  it('counts legs between stops only', () => {
    expect(transportEstimate('motor', 3).legs).toBe(2);
    expect(transportEstimate('motor', 1).legs).toBe(0);
    expect(transportEstimate('motor', 0).legs).toBe(0);
    expect(transportCost(transportEstimate('motor', 3))).toEqual({ min: 10_000, max: 30_000, estimate: 20_000 });
    expect(transportCost(transportEstimate('jalan-kaki', 4))).toEqual({ min: 0, max: 0, estimate: 0 });
  });
});

describe('summarizeBudget', () => {
  const t = transportEstimate('motor', 3); // 10k–30k, est 20k

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
    const b = summarizeBudget(500_000, [item(60_000, 120_000, 90_000), item(0, 0, 0, false)], transportEstimate('jalan-kaki', 2));
    expect(b.totalEstimate).toBe(90_000);
    expect(b.unknownPriceCount).toBe(1);
    expect(b.complete).toBe(false);
    expect(budgetIssues(b).map((i) => i.code)).toContain('MISSING_PRICE');
  });

  it('handles a zero budget without dividing by zero', () => {
    const b = summarizeBudget(0, [item(0, 0, 0)], transportEstimate('jalan-kaki', 1));
    expect(b.utilization).toBeNull();
    expect(b.status).toBe('within');
  });
});
