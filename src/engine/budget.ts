import type { DatePlan, ItineraryItem, PlanIssue, TransportEstimate, Transportation, Venue } from '../types';
import { formatIDR } from '../lib/format';
import { roundTo } from './activities';

/**
 * Budget maths. All amounts are IDR for two people. Every number here is an
 * ESTIMATE derived from curated price ranges; unknown prices are never
 * guessed — they are excluded from totals and reported.
 */

export const PEOPLE = 2;

/** Rough per-leg cost range for two people moving between venues (IDR). */
export const TRANSPORT_RATES: Record<Transportation, { min: number; max: number; minutes: number }> = {
  'jalan-kaki': { min: 0, max: 0, minutes: 15 },
  motor: { min: 5_000, max: 15_000, minutes: 15 },
  mobil: { min: 10_000, max: 30_000, minutes: 20 },
  umum: { min: 7_000, max: 20_000, minutes: 25 },
  'taksi-online': { min: 25_000, max: 60_000, minutes: 20 },
};

export function hasPrice(v: Pick<Venue, 'priceMin' | 'priceMax' | 'priceUnknown'>): boolean {
  return (
    !v.priceUnknown &&
    Number.isFinite(v.priceMin) &&
    Number.isFinite(v.priceMax) &&
    v.priceMin >= 0 &&
    v.priceMax >= v.priceMin
  );
}

export interface CostRange {
  min: number;
  max: number;
  estimate: number;
}

/** Cost range for two people at a venue, or null when the price is unknown. */
export function venueCost(v: Pick<Venue, 'priceMin' | 'priceMax' | 'priceUnknown'>): CostRange | null {
  if (!hasPrice(v)) return null;
  const min = v.priceMin * PEOPLE;
  const max = v.priceMax * PEOPLE;
  return { min, max, estimate: roundTo((min + max) / 2, 1000) };
}

export function transportEstimate(mode: Transportation, stops: number): TransportEstimate {
  const r = TRANSPORT_RATES[mode];
  return { mode, legs: Math.max(0, stops - 1), minutesPerLeg: r.minutes, perLegMin: r.min, perLegMax: r.max };
}

export function transportCost(t: TransportEstimate): CostRange {
  const min = t.perLegMin * t.legs;
  const max = t.perLegMax * t.legs;
  return { min, max, estimate: roundTo((min + max) / 2, 1000) };
}

export type BudgetStatus = 'within' | 'may-exceed' | 'over';

export interface BudgetSummary {
  budget: number;
  itemsMin: number;
  itemsMax: number;
  itemsEstimate: number;
  transportMin: number;
  transportMax: number;
  transportEstimate: number;
  totalMin: number;
  totalMax: number;
  totalEstimate: number;
  /** budget − totalEstimate (negative when over). */
  remaining: number;
  /** totalEstimate / budget × 100, one decimal; null when budget is 0. */
  utilization: number | null;
  status: BudgetStatus;
  /** Items whose price is unknown and therefore excluded from totals. */
  unknownPriceCount: number;
  /** False when any item's price is unknown. */
  complete: boolean;
}

export function summarizeBudget(
  budget: number,
  items: Pick<ItineraryItem, 'costMin' | 'costMax' | 'costEstimate' | 'priceKnown'>[],
  transport: TransportEstimate,
): BudgetSummary {
  const known = items.filter((i) => i.priceKnown);
  const itemsMin = known.reduce((s, i) => s + i.costMin, 0);
  const itemsMax = known.reduce((s, i) => s + i.costMax, 0);
  const itemsEstimate = known.reduce((s, i) => s + i.costEstimate, 0);
  const t = transportCost(transport);
  const totalMin = itemsMin + t.min;
  const totalMax = itemsMax + t.max;
  const totalEstimate = itemsEstimate + t.estimate;
  const status: BudgetStatus =
    totalEstimate > budget || totalMin > budget ? 'over' : totalMax > budget ? 'may-exceed' : 'within';
  return {
    budget,
    itemsMin,
    itemsMax,
    itemsEstimate,
    transportMin: t.min,
    transportMax: t.max,
    transportEstimate: t.estimate,
    totalMin,
    totalMax,
    totalEstimate,
    remaining: budget - totalEstimate,
    utilization: budget > 0 ? Math.round((totalEstimate / budget) * 1000) / 10 : null,
    status,
    unknownPriceCount: items.length - known.length,
    complete: known.length === items.length,
  };
}

export function computeBudget(plan: Pick<DatePlan, 'input' | 'items' | 'transport'>): BudgetSummary {
  return summarizeBudget(plan.input.budget, plan.items, plan.transport);
}

export function budgetIssues(b: BudgetSummary): PlanIssue[] {
  const issues: PlanIssue[] = [];
  if (b.status === 'over') {
    issues.push({
      code: 'OVER_BUDGET',
      severity: 'warning',
      message: `Perkiraan total ${formatIDR(b.totalEstimate)} melebihi anggaran ${formatIDR(b.budget)} sebesar ${formatIDR(b.totalEstimate - b.budget)}.`,
    });
  } else if (b.status === 'may-exceed') {
    issues.push({
      code: 'MAY_EXCEED_BUDGET',
      severity: 'info',
      message: `Jika harga ada di batas atas, total bisa mencapai ${formatIDR(b.totalMax)} — di atas anggaran.`,
    });
  }
  if (b.unknownPriceCount > 0) {
    issues.push({
      code: 'MISSING_PRICE',
      severity: 'warning',
      message: `${b.unknownPriceCount} tempat belum punya data harga dan tidak dihitung dalam total. Total sebenarnya bisa lebih tinggi.`,
    });
  }
  return issues;
}
