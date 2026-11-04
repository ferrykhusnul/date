import type { Activity, Environment, ScoreBreakdown, Venue, Vibe } from '../types';
import { formatDuration, formatIDR } from '../lib/format';
import { ACTIVITY_OPTIONS, ENVIRONMENT_OPTIONS, VIBE_OPTIONS, labelOf } from '../lib/options';
import { venueCost } from './budget';

/**
 * Deterministic venue scoring. Each component is a 0–1 compatibility value;
 * the total is the weighted sum normalised to 0–100.
 */

export const WEIGHTS = {
  vibe: 35,
  activity: 25,
  budget: 20,
  environment: 10,
  duration: 10,
} as const;

/** Partial compatibility between different vibes (symmetric, 0–1). */
const VIBE_AFFINITY: Record<Vibe, Partial<Record<Vibe, number>>> = {
  romantis: { elegan: 0.6, santai: 0.5, kreatif: 0.3, petualang: 0.2 },
  santai: { romantis: 0.5, kreatif: 0.4, petualang: 0.3, elegan: 0.2 },
  petualang: { kreatif: 0.4, santai: 0.3, romantis: 0.2, elegan: 0.1 },
  kreatif: { petualang: 0.4, santai: 0.4, elegan: 0.3, romantis: 0.3 },
  elegan: { romantis: 0.6, kreatif: 0.3, santai: 0.2, petualang: 0.1 },
};

export interface ScoreContext {
  vibe: Vibe;
  /** Activities the user asked for. */
  requestedActivities: Activity[];
  /** The activity of the slot being filled, if any. */
  targetActivity?: Activity;
  environment: Environment;
  /** Budget available for this stop, for two people (IDR). */
  perStopBudget: number;
  /** Planned minutes for this stop. */
  slotMinutes: number;
}

export interface ScoreResult {
  breakdown: ScoreBreakdown;
  reasons: string[];
}

export function vibeScore(venueVibes: string[], vibe: Vibe): number {
  if (venueVibes.includes(vibe)) return 1;
  let best = 0;
  for (const v of venueVibes) best = Math.max(best, VIBE_AFFINITY[vibe][v as Vibe] ?? 0);
  return best;
}

export function activityScore(venueActivities: string[], requested: Activity[], target?: Activity): number {
  if (target) {
    if (venueActivities.includes(target)) return 1;
    return requested.some((a) => venueActivities.includes(a)) ? 0.5 : 0;
  }
  if (!requested.length) return 0;
  const matched = requested.filter((a) => venueActivities.includes(a)).length;
  return matched > 0 ? Math.min(1, 0.6 + 0.4 * (matched / requested.length)) : 0;
}

/**
 * 1 when the whole range fits the per-stop budget, sliding down as the range
 * exceeds it. Unknown prices score a neutral 0.5 (never assumed cheap).
 */
export function budgetScore(venue: Pick<Venue, 'priceMin' | 'priceMax' | 'priceUnknown'>, perStopBudget: number): number {
  const cost = venueCost(venue);
  if (!cost) return 0.5;
  if (cost.max <= perStopBudget) return 1;
  if (perStopBudget <= 0) return 0;
  if (cost.min <= perStopBudget) {
    // Budget falls inside the range: 0.5–1 depending on how much of it fits.
    const span = cost.max - cost.min || 1;
    return 0.5 + 0.5 * ((perStopBudget - cost.min) / span);
  }
  // Even the minimum is over budget: decays to 0 at twice the budget.
  return Math.max(0, 0.4 * (1 - (cost.min - perStopBudget) / perStopBudget));
}

export function environmentScore(venueEnv: Environment, wanted: Environment): number {
  if (wanted === 'mixed' || venueEnv === wanted) return 1;
  return venueEnv === 'mixed' ? 0.75 : 0;
}

export function durationScore(visitMinutes: number, slotMinutes: number): number {
  if (!(visitMinutes > 0) || !(slotMinutes > 0)) return 0;
  return Math.min(visitMinutes, slotMinutes) / Math.max(visitMinutes, slotMinutes);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function scoreVenue(venue: Venue, ctx: ScoreContext): ScoreResult {
  const parts = {
    vibe: vibeScore(venue.vibes, ctx.vibe),
    activity: activityScore(venue.activities, ctx.requestedActivities, ctx.targetActivity),
    budget: budgetScore(venue, ctx.perStopBudget),
    environment: environmentScore(venue.environment, ctx.environment),
    duration: durationScore(venue.visitDurationMinutes, ctx.slotMinutes),
  };
  const total =
    parts.vibe * WEIGHTS.vibe +
    parts.activity * WEIGHTS.activity +
    parts.budget * WEIGHTS.budget +
    parts.environment * WEIGHTS.environment +
    parts.duration * WEIGHTS.duration;

  return {
    breakdown: {
      vibe: round2(parts.vibe),
      activity: round2(parts.activity),
      budget: round2(parts.budget),
      environment: round2(parts.environment),
      duration: round2(parts.duration),
      // Floored so 100 is reserved for a perfect match on every factor.
      total: Math.floor(total + 1e-9),
    },
    reasons: explain(venue, ctx, parts),
  };
}

/** Opening words of the budget-related reason templates. */
const BUDGET_REASON_PREFIXES = ['Harga belum diketahui', 'Gratis,', 'Perkiraan biayanya', 'Sebagian rentang harganya'];

/** True for reasons that describe the venue's price (stale once a cost is set manually). */
export function isBudgetReason(text: string): boolean {
  return BUDGET_REASON_PREFIXES.some((p) => text.startsWith(p));
}

/** Deterministic, template-based explanation of the strongest factors. */
function explain(venue: Venue, ctx: ScoreContext, p: Omit<ScoreBreakdown, 'total'>): string[] {
  const vibe = labelOf(VIBE_OPTIONS, ctx.vibe).toLowerCase();
  const r: { weight: number; text: string }[] = [];

  if (p.vibe === 1) r.push({ weight: WEIGHTS.vibe, text: `Suasananya cocok untuk kencan ${vibe}.` });
  else if (p.vibe >= 0.5) r.push({ weight: WEIGHTS.vibe * p.vibe, text: `Suasananya mendekati nuansa ${vibe}.` });

  const act = ctx.targetActivity ?? ctx.requestedActivities.find((a) => venue.activities.includes(a));
  if (act && venue.activities.includes(act))
    r.push({ weight: WEIGHTS.activity, text: `Menyediakan aktivitas ${labelOf(ACTIVITY_OPTIONS, act).toLowerCase()} yang kamu pilih.` });

  const cost = venueCost(venue);
  if (!cost) r.push({ weight: 1, text: 'Harga belum diketahui, jadi kecocokan anggaran belum bisa dinilai.' });
  else if (cost.max === 0) r.push({ weight: WEIGHTS.budget, text: 'Gratis, jadi tidak membebani anggaran.' });
  else if (p.budget === 1)
    r.push({ weight: WEIGHTS.budget, text: `Perkiraan biayanya (${formatIDR(cost.min)}–${formatIDR(cost.max)} berdua) masuk anggaran per tempat.` });
  else if (p.budget >= 0.5)
    r.push({ weight: WEIGHTS.budget * p.budget, text: 'Sebagian rentang harganya masih masuk anggaran per tempat.' });

  if (ctx.environment !== 'mixed' && p.environment === 1)
    r.push({ weight: WEIGHTS.environment, text: `Sesuai preferensi ${labelOf(ENVIRONMENT_OPTIONS, ctx.environment).toLowerCase()}.` });

  if (p.duration >= 0.8)
    r.push({ weight: WEIGHTS.duration * p.duration, text: `Lama kunjungan biasanya (${formatDuration(venue.visitDurationMinutes)}) pas dengan slot waktunya.` });

  return r
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((x) => x.text);
}
