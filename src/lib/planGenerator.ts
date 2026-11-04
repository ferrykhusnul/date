import { SAMPLE_VENUES } from '../data/sampleVenues';
import type { Activity, DateInput, DatePlan, PlanStop, Transportation, Venue, VenueCategory } from '../types';
import { ACTIVITY_OPTIONS, VIBE_OPTIONS, labelOf } from './options';
import { minutesToTime, timeToMinutes } from './format';

/**
 * Phase 1 placeholder generator. Builds a plan from SAMPLE venues only so the
 * UI can be exercised end to end. Real venue search replaces this later.
 */

const ACTIVITY_CATEGORY: Record<Activity, VenueCategory> = {
  makan: 'restoran',
  kopi: 'kafe',
  jalan: 'taman',
  galeri: 'galeri',
  nonton: 'bioskop',
  belanja: 'pusat-belanja',
  alam: 'alam',
  hiburan: 'hiburan',
};

/** Rough per-leg transport estimate (IDR) used for sample plans. */
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

function stopCount(hours: number): number {
  if (hours <= 2) return 2;
  if (hours <= 4) return 3;
  return 4;
}

function pickVenue(activity: Activity, input: DateInput, used: Set<string>): Venue {
  const category = ACTIVITY_CATEGORY[activity];
  const inCategory = SAMPLE_VENUES.filter((v) => v.category === category);
  const matchesEnv = inCategory.filter(
    (v) => input.environment === 'campuran' || v.environment === input.environment,
  );
  const pool = [...matchesEnv, ...inCategory];
  return pool.find((v) => !used.has(v.id)) ?? pool[0] ?? SAMPLE_VENUES[0];
}

function partOfDay(startTime: string): string {
  const h = Math.floor(timeToMinutes(startTime) / 60);
  if (h < 11) return 'Pagi';
  if (h < 15) return 'Siang';
  if (h < 19) return 'Sore';
  return 'Malam';
}

export function generateSamplePlan(input: DateInput, existingId?: string): DatePlan {
  const count = stopCount(input.durationHours);
  const activities: Activity[] = input.activities.length ? input.activities : ['kopi'];
  const transit = TRANSIT_MINUTES[input.transportation];
  const totalMinutes = input.durationHours * 60;
  const perStop = Math.max(30, Math.floor((totalMinutes - transit * (count - 1)) / count / 15) * 15);

  const used = new Set<string>();
  let cursor = timeToMinutes(input.startTime);
  const stops: PlanStop[] = [];

  for (let i = 0; i < count; i++) {
    const activity = activities[i % activities.length];
    const venue = pickVenue(activity, input, used);
    used.add(venue.id);
    const perPerson = Math.round((venue.priceMin + venue.priceMax) / 2 / 1000) * 1000;
    stops.push({
      id: uid('stop'),
      venueId: venue.id,
      activity,
      startTime: minutesToTime(cursor),
      durationMinutes: perStop,
      estimatedCost: perPerson * 2,
    });
    cursor += perStop + transit;
  }

  const vibeLabel = labelOf(VIBE_OPTIONS, input.vibe);
  const city = input.city.trim() || 'Kota Anda';
  const activityLabels = activities
    .slice(0, 3)
    .map((a) => labelOf(ACTIVITY_OPTIONS, a).toLowerCase());

  return {
    id: existingId ?? uid('plan'),
    title: `${partOfDay(input.startTime)} ${vibeLabel} di ${city}`,
    concept: `Kencan bernuansa ${vibeLabel.toLowerCase()} selama ${input.durationHours} jam, dengan rangkaian ${activityLabels.join(', ')}. Rencana ini disusun dari data sampel untuk pratinjau tampilan.`,
    input,
    stops,
    transportCost: TRANSPORT_COST_PER_LEG[input.transportation] * (count - 1) * 2,
    createdAt: new Date().toISOString(),
    isSample: true,
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
