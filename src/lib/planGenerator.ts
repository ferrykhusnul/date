import type { Activity, DateInput, DatePlan, PlanStop, Transportation, Venue } from '../types';
import { ACTIVITY_OPTIONS, VIBE_OPTIONS, labelOf } from './options';
import { minutesToTime, timeToMinutes } from './format';

/**
 * Rule-based plan builder. Picks venues from the pool it is given using their
 * activity, vibe, environment and price metadata. All costs are ESTIMATES.
 */

/** Rough per-leg transport estimate (IDR, for two). */
const TRANSPORT_COST_PER_LEG: Record<Transportation, number> = {
  'jalan-kaki': 0,
  motor: 10_000,
  mobil: 20_000,
  umum: 10_000,
  'taksi-online': 35_000,
};

const TRANSIT_MINUTES: Record<Transportation, number> = {
  'jalan-kaki': 15,
  motor: 15,
  mobil: 20,
  umum: 25,
  'taksi-online': 20,
};

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function targetStops(hours: number): number {
  if (hours <= 2) return 2;
  if (hours <= 4) return 3;
  return 4;
}

const midPrice = (v: Venue) => (v.priceMin + v.priceMax) / 2;

function score(v: Venue, input: DateInput, perStopBudget: number): number {
  let s = 0;
  if (v.vibes.includes(input.vibe)) s += 3;
  if (input.environment === 'mixed' || v.environment === input.environment || v.environment === 'mixed') s += 2;
  if (midPrice(v) * 2 <= perStopBudget) s += 2;
  else if (v.priceMin * 2 <= perStopBudget) s += 1;
  if (input.transportation === 'umum' && v.transitAccess) s += 1;
  return s;
}

function pick(pool: Venue[], used: Set<string>, input: DateInput, perStopBudget: number, activity?: Activity) {
  const candidates = pool.filter((v) => !used.has(v.id) && (!activity || v.activities.includes(activity)));
  if (!candidates.length) return undefined;
  return candidates
    .map((v) => ({ v, s: score(v, input, perStopBudget) }))
    .sort((a, b) => b.s - a.s || midPrice(a.v) - midPrice(b.v) || a.v.name.localeCompare(b.v.name))[0].v;
}

function partOfDay(startTime: string): string {
  const h = Math.floor(timeToMinutes(startTime) / 60);
  if (h < 11) return 'Pagi';
  if (h < 15) return 'Siang';
  if (h < 19) return 'Sore';
  return 'Malam';
}

/**
 * Builds a plan from `pool` (already limited to active venues the planner
 * may use). Returns null when the pool has no venue at all.
 */
export function generatePlan(
  input: DateInput,
  pool: Venue[],
  opts: { usesSampleVenues: boolean; existingId?: string },
): DatePlan | null {
  if (!pool.length) return null;

  const count = Math.min(targetStops(input.durationHours), pool.length);
  const activities: Activity[] = input.activities.length ? input.activities : ['kopi'];
  const transit = TRANSIT_MINUTES[input.transportation];
  const transportCost = TRANSPORT_COST_PER_LEG[input.transportation] * (count - 1) * 2;
  const perStopBudget = Math.max(0, input.budget - transportCost) / count;

  const used = new Set<string>();
  const chosen: { venue: Venue; activity: Activity }[] = [];
  for (let i = 0; i < count; i++) {
    const wanted = activities[i % activities.length];
    const byActivity = pick(pool, used, input, perStopBudget, wanted);
    const venue = byActivity ?? pick(pool, used, input, perStopBudget);
    if (!venue) break;
    used.add(venue.id);
    const activity = byActivity
      ? wanted
      : ((activities.find((a) => venue.activities.includes(a)) ?? venue.activities[0] ?? wanted) as Activity);
    chosen.push({ venue, activity });
  }

  // Fit each venue's typical visit length into the requested duration.
  const available = input.durationHours * 60 - transit * (chosen.length - 1);
  const natural = chosen.reduce((sum, c) => sum + c.venue.visitDurationMinutes, 0) || 1;
  const factor = Math.min(1.5, available / natural);

  let cursor = timeToMinutes(input.startTime);
  const stops: PlanStop[] = chosen.map(({ venue, activity }) => {
    const minutes = Math.max(30, Math.round((venue.visitDurationMinutes * factor) / 15) * 15);
    const stop: PlanStop = {
      id: uid('stop'),
      venueId: venue.id,
      venueName: venue.name,
      activity,
      startTime: minutesToTime(cursor),
      durationMinutes: minutes,
      estimatedCost: Math.round(midPrice(venue) / 1000) * 1000 * 2,
    };
    cursor += minutes + transit;
    return stop;
  });

  const vibeLabel = labelOf(VIBE_OPTIONS, input.vibe);
  const city = input.city.trim() || 'Kota Anda';
  const activityLabels = [...new Set(stops.map((s) => labelOf(ACTIVITY_OPTIONS, s.activity).toLowerCase()))];

  return {
    id: opts.existingId ?? uid('plan'),
    title: `${partOfDay(input.startTime)} ${vibeLabel} di ${city}`,
    concept:
      `Kencan bernuansa ${vibeLabel.toLowerCase()} selama ${input.durationHours} jam, dengan rangkaian ${activityLabels.join(', ')}.` +
      (opts.usesSampleVenues ? ' Disusun dari venue sampel — bukan tempat nyata.' : ''),
    input,
    stops,
    transportCost,
    createdAt: new Date().toISOString(),
    usesSampleVenues: opts.usesSampleVenues,
  };
}

export function planTotal(plan: DatePlan): number {
  return plan.stops.reduce((sum, s) => sum + s.estimatedCost, 0) + plan.transportCost;
}

export function planEndTime(plan: DatePlan): string {
  const last = plan.stops[plan.stops.length - 1];
  if (!last) return plan.input.startTime;
  return minutesToTime(timeToMinutes(last.startTime) + last.durationMinutes);
}
