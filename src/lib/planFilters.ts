import { planDisplayName } from '../state/AppState';
import type { DatePlan } from '../types';

export type PlanTimeFilter = 'all' | 'upcoming' | 'past';
export type PlanSort = 'created-desc' | 'created-asc' | 'date-asc' | 'date-desc' | 'name';

export interface PlanFilter {
  query: string;
  city: string;
  time: PlanTimeFilter;
  sort: PlanSort;
}

export const EMPTY_PLAN_FILTER: PlanFilter = { query: '', city: '', time: 'all', sort: 'created-desc' };

/** Text, city and date filters plus sorting. `today` is YYYY-MM-DD. */
export function filterPlans(plans: DatePlan[], f: PlanFilter, today: string): DatePlan[] {
  const q = f.query.trim().toLowerCase();
  const out = plans.filter((p) => {
    if (f.city && p.input.city.trim().toLowerCase() !== f.city.trim().toLowerCase()) return false;
    if (f.time === 'upcoming' && p.input.date < today) return false;
    if (f.time === 'past' && p.input.date >= today) return false;
    if (q) {
      const hay = [planDisplayName(p), p.title, p.input.city, p.input.notes, ...p.items.map((i) => i.title)].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const byName = (a: DatePlan, b: DatePlan) => planDisplayName(a).localeCompare(planDisplayName(b), 'id');
  const sorters: Record<PlanSort, (a: DatePlan, b: DatePlan) => number> = {
    'created-desc': (a, b) => b.createdAt.localeCompare(a.createdAt),
    'created-asc': (a, b) => a.createdAt.localeCompare(b.createdAt),
    'date-asc': (a, b) => (a.input.date + a.input.startTime).localeCompare(b.input.date + b.input.startTime),
    'date-desc': (a, b) => (b.input.date + b.input.startTime).localeCompare(a.input.date + a.input.startTime),
    name: byName,
  };
  return [...out].sort((a, b) => sorters[f.sort](a, b) || a.id.localeCompare(b.id));
}

export function planCities(plans: DatePlan[]): string[] {
  const m = new Map<string, string>();
  for (const p of plans) {
    const k = p.input.city.trim().toLowerCase();
    if (k && !m.has(k)) m.set(k, p.input.city.trim());
  }
  return [...m.values()].sort((a, b) => a.localeCompare(b, 'id'));
}
