import type { Activity, Alternative, DateInput, DatePlan, ItineraryItem, PlanIssue, Venue } from '../types';
import { formatDuration, formatIDR, timeToMinutes } from '../lib/format';
import { ACTIVITY_OPTIONS, ENVIRONMENT_OPTIONS, labelOf } from '../lib/options';
import { sameCity } from '../lib/venueFilters';
import { ACTIVITY_PROFILE, COMPLEMENTS, MIN_SLOT_MINUTES, clamp, roundTo } from './activities';
import { transportCost, venueCost } from './budget';
import { MODE_PROFILE, defaultLegMode, isPublicTransport } from './transport';
import { recalculate } from './itinerary';
import { scoreVenue, type ScoreResult } from './scoring';
import { MIN_DURATION_MINUTES, venueGaps } from './validation';

/**
 * Deterministic itinerary generator: the same input and venue list always
 * produce the same plan. No randomness, clocks, network or AI — ties are
 * broken by estimated cost, then name, then id.
 *
 * Route order is NOT optimised: stops follow the activity flow, and travel
 * time between stops is a flat per-leg estimate for the chosen transport.
 */

export interface GenerateOptions {
  planId: string;
  createdAt: string;
  /** Skip the city filter (used for the sample-venue fallback). */
  ignoreCity?: boolean;
  usesSampleVenues?: boolean;
}

export interface GenerationResult {
  plan: DatePlan | null;
  issues: PlanIssue[];
}

interface Candidate {
  venue: Venue;
  result: ScoreResult;
}

const actLabel = (a: Activity) => labelOf(ACTIVITY_OPTIONS, a).toLowerCase();

/** Public-transport plans keep transfers low: at most 3 stops, 2 for dates up to 3 hours. */
export function maxStopsFor(totalMinutes: number, transit: number, publicTransport = false): number {
  const byLength = totalMinutes <= 90 ? 1 : totalMinutes <= 150 ? 2 : totalMinutes <= 240 ? 3 : 4;
  let n = publicTransport ? Math.min(byLength, totalMinutes <= 180 ? 2 : 3) : byLength;
  while (n > 1 && n * MIN_SLOT_MINUTES + (n - 1) * transit > totalMinutes) n--;
  return n;
}

function isMealTime(startTime: string): boolean {
  const m = timeToMinutes(startTime);
  return (m >= 11 * 60 && m <= 13 * 60 + 30) || (m >= 17 * 60 + 30 && m <= 20 * 60);
}

/** Orders activities by their natural place in a date; a meal comes first at meal time. */
export function orderActivities(acts: Activity[], startTime: string): Activity[] {
  const mealFirst = isMealTime(startTime);
  return [...acts].sort((a, b) => {
    if (mealFirst && (a === 'makan') !== (b === 'makan')) return a === 'makan' ? -1 : 1;
    return ACTIVITY_PROFILE[a].phase - ACTIVITY_PROFILE[b].phase;
  });
}

/**
 * Chooses which activities fill the slots: requested ones that have venues,
 * then complements of those, then any other available activity. Never
 * repeats an activity.
 */
export function selectActivities(requested: Activity[], available: Set<Activity>, slots: number, startTime: string): Activity[] {
  const seq: Activity[] = [];
  const add = (a: Activity) => {
    if (seq.length < slots && available.has(a) && !seq.includes(a)) seq.push(a);
  };
  for (const a of orderActivities([...new Set(requested)], startTime)) add(a);
  for (const a of [...seq]) for (const c of COMPLEMENTS[a]) add(c);
  for (const a of orderActivities([...available], startTime)) add(a);
  return orderActivities(seq, startTime);
}

function compareCandidates(a: Candidate, b: Candidate): number {
  if (b.result.breakdown.rank !== a.result.breakdown.rank) return b.result.breakdown.rank - a.result.breakdown.rank;
  if (b.result.breakdown.total !== a.result.breakdown.total) return b.result.breakdown.total - a.result.breakdown.total;
  const ca = venueCost(a.venue)?.estimate ?? Number.POSITIVE_INFINITY;
  const cb = venueCost(b.venue)?.estimate ?? Number.POSITIVE_INFINITY;
  if (ca !== cb) return ca - cb;
  if (a.venue.name !== b.venue.name) return a.venue.name < b.venue.name ? -1 : 1;
  return a.venue.id < b.venue.id ? -1 : a.venue.id > b.venue.id ? 1 : 0;
}

/** Fits venue visit lengths into the available minutes (multiples of 15). */
export function allocateDurations(bases: { min: number; base: number; max: number }[], available: number): number[] {
  if (!bases.length) return [];
  const durations = bases.map((b) => b.base);
  let sum = durations.reduce((s, d) => s + d, 0);

  if (sum > available) {
    const f = available / sum;
    for (let i = 0; i < durations.length; i++)
      durations[i] = Math.max(MIN_SLOT_MINUTES, Math.floor((bases[i].base * f) / 15) * 15);
    sum = durations.reduce((s, d) => s + d, 0);
    // Trim the longest items until everything fits.
    while (sum > available) {
      let idx = -1;
      for (let i = 0; i < durations.length; i++)
        if (durations[i] > MIN_SLOT_MINUTES && (idx === -1 || durations[i] > durations[idx])) idx = i;
      if (idx === -1) break;
      durations[idx] -= 15;
      sum -= 15;
    }
  } else if (sum < available) {
    // Extend items toward their realistic maximum; leftover time stays free.
    const extra = available - sum;
    const caps = bases.map((b, i) => Math.max(0, b.max - durations[i]));
    const capSum = caps.reduce((s, c) => s + c, 0);
    if (capSum > 0) {
      for (let i = 0; i < durations.length; i++) {
        durations[i] += Math.min(caps[i], Math.floor((extra * caps[i]) / capSum / 15) * 15);
      }
    }
  }
  return durations;
}

export function generateItinerary(input: DateInput, venues: Venue[], opts: GenerateOptions): GenerationResult {
  const issues: PlanIssue[] = [];
  const totalMinutes = Math.round(input.durationHours * 60);
  const usesPublic = isPublicTransport(input.transportation);
  // Conservative planning buffer per move (mixed plans assume public transport until legs are known).
  const legProfile = MODE_PROFILE[defaultLegMode(input.transportation)];
  const rate = { minutes: legProfile.bufferMinutes };
  const requested = [...new Set(input.activities)];

  // Duration too short.
  if (!(totalMinutes >= MIN_DURATION_MINUTES)) {
    issues.push({
      code: 'DURATION_TOO_SHORT',
      severity: 'error',
      message: `Durasi ${formatDuration(Math.max(0, totalMinutes))} terlalu singkat. Minimal ${formatDuration(MIN_DURATION_MINUTES)} agar ada waktu untuk satu tempat.`,
    });
    return { plan: null, issues };
  }

  // 1–2. Active venues in the city.
  const active = venues.filter((v) => v.status === 'active');
  const cityPool = opts.ignoreCity ? active : active.filter((v) => sameCity(v.city, input.city));
  if (!cityPool.length) {
    issues.push({
      code: 'NO_VENUES',
      severity: 'error',
      message: `Belum ada venue aktif di ${input.city.trim() || 'kota ini'}. Tambahkan venue terlebih dahulu.`,
    });
    return { plan: null, issues };
  }

  // Incomplete dataset (missing price is reported per item later).
  const incomplete = cityPool.filter((v) => venueGaps(v).some((g) => g !== 'harga'));
  if (incomplete.length) {
    const gaps = [...new Set(incomplete.flatMap((v) => venueGaps(v).filter((g) => g !== 'harga')))];
    issues.push({
      code: 'INCOMPLETE_DATASET',
      severity: 'info',
      message: `${incomplete.length} venue belum lengkap datanya (${gaps.join(', ')}) sehingga skornya lebih rendah.`,
    });
  }

  // 3. Environment.
  let pool = cityPool.filter(
    (v) => input.environment === 'mixed' || v.environment === input.environment || v.environment === 'mixed',
  );
  if (!pool.length) {
    issues.push({
      code: 'ENVIRONMENT_RELAXED',
      severity: 'warning',
      message: `Tidak ada venue ${labelOf(ENVIRONMENT_OPTIONS, input.environment).toLowerCase()} yang aktif, jadi semua lingkungan dipertimbangkan.`,
    });
    pool = cityPool;
  }

  // Slot count from duration, limited by venue supply.
  const wantedStops = maxStopsFor(totalMinutes, rate.minutes, usesPublic);
  if (usesPublic && wantedStops < maxStopsFor(totalMinutes, rate.minutes)) {
    issues.push({
      code: 'FEWER_TRANSFERS',
      severity: 'info',
      message: `Dengan transportasi umum, rencana dibatasi ${wantedStops} tempat agar tidak terlalu sering berpindah.`,
    });
  }
  if (pool.length < wantedStops) {
    issues.push({
      code: 'INSUFFICIENT_VENUES',
      severity: 'warning',
      message: `Hanya ada ${pool.length} venue yang cocok, jadi rencana berisi ${pool.length} tempat (idealnya ${wantedStops}).`,
    });
  }
  const slots = Math.min(wantedStops, pool.length);

  // 5. Complementary activities.
  const available = new Set<Activity>(pool.flatMap((v) => v.activities as Activity[]).filter((a) => a in ACTIVITY_PROFILE));
  const missing = requested.filter((a) => !available.has(a));
  if (missing.length && missing.length < requested.length) {
    issues.push({
      code: 'ACTIVITY_UNAVAILABLE',
      severity: 'warning',
      message: `Belum ada venue untuk aktivitas ${missing.map(actLabel).join(', ')} di kota ini.`,
    });
  } else if (requested.length && missing.length === requested.length) {
    issues.push({
      code: 'NO_COMPATIBLE_ACTIVITY',
      severity: 'warning',
      message: 'Tidak ada venue yang menyediakan aktivitas pilihanmu. Rencana memakai venue dengan skor tertinggi yang tersedia.',
    });
  }
  const sequence = selectActivities(requested, available, slots, input.startTime);
  // Never repeat an activity just to fill a slot: fewer, longer stops instead.
  const slotCount = sequence.length ? Math.min(slots, sequence.length) : slots;
  const slotActivities: (Activity | undefined)[] = Array.from({ length: slotCount }, (_, i) => sequence[i]);

  // Budget available for venues after transport.
  const transportEst = transportCost(Array.from({ length: Math.max(0, slotCount - 1) }, () => legProfile)).estimate;
  const venueBudget = input.budget - transportEst;
  if (venueBudget <= 0) {
    issues.push({
      code: 'BUDGET_TOO_LOW',
      severity: 'warning',
      message: `Anggaran ${formatIDR(input.budget)} habis untuk perkiraan transportasi (${formatIDR(transportEst)}). Hanya tempat gratis yang masuk anggaran.`,
    });
  }

  const transitTotal = (slotCount - 1) * rate.minutes;
  const typicalSum = slotActivities.reduce((s, a) => s + (a ? ACTIVITY_PROFILE[a].typical : 60), 0);
  const fit = Math.min(1, (totalMinutes - transitTotal) / typicalSum);

  // 4, 6, 7, 9. Score, pick without duplicates or repeated categories, within budget.
  const used = new Set<string>();
  const picks: { venue: Venue; activity: Activity | null; result: ScoreResult; ranked: Candidate[] }[] = [];
  let remaining = Math.max(0, venueBudget);
  let budgetTooLowReported = venueBudget <= 0;

  slotActivities.forEach((target, i) => {
    const perStop = remaining / (slotCount - i);
    const slotMinutes = (target ? ACTIVITY_PROFILE[target].typical : 60) * fit;
    const unused = pool.filter((v) => !used.has(v.id));
    if (!unused.length) return;
    const offering = target ? unused.filter((v) => v.activities.includes(target)) : [];
    const candidates = (offering.length ? offering : unused)
      .map((venue) => ({
        venue,
        result: scoreVenue(venue, {
          vibe: input.vibe,
          requestedActivities: requested,
          targetActivity: target,
          environment: input.environment,
          perStopBudget: perStop,
          slotMinutes,
          transportation: input.transportation,
          previous: picks[picks.length - 1]?.venue,
        }),
      }))
      .sort(compareCandidates);

    const prev = picks[picks.length - 1]?.venue.category;
    const fitsBudget = (c: Candidate) => {
      const cost = venueCost(c.venue);
      return !cost || cost.min <= remaining;
    };
    let chosen =
      candidates.find((c) => c.venue.category !== prev && fitsBudget(c)) ?? candidates.find(fitsBudget);

    if (!chosen) {
      if (picks.length === 0) {
        // Nothing fits: take the cheapest option so the user still gets a plan, and say so.
        chosen = [...candidates].sort(
          (a, b) => (venueCost(a.venue)?.min ?? Infinity) - (venueCost(b.venue)?.min ?? Infinity) || compareCandidates(a, b),
        )[0];
        if (!budgetTooLowReported) {
          issues.push({
            code: 'BUDGET_TOO_LOW',
            severity: 'warning',
            message: `Anggaran terlalu kecil: tempat termurah yang cocok pun diperkirakan di atas ${formatIDR(Math.max(0, venueBudget))}.`,
          });
          budgetTooLowReported = true;
        }
      } else {
        issues.push({
          code: 'SLOT_SKIPPED_BUDGET',
          severity: 'info',
          message: `Slot ${target ? actLabel(target) : 'tambahan'} dilewati karena sisa anggaran tidak cukup.`,
        });
        return;
      }
    }

    used.add(chosen.venue.id);
    const cost = venueCost(chosen.venue);
    if (cost) remaining = Math.max(0, remaining - cost.estimate);
    const activity: Activity | null =
      target && chosen.venue.activities.includes(target)
        ? target
        : ((requested.find((a) => chosen!.venue.activities.includes(a)) ?? chosen.venue.activities[0] ?? null) as Activity | null);
    picks.push({ venue: chosen.venue, activity, result: chosen.result, ranked: candidates });
  });

  // 8. Respect total duration.
  const transit = rate.minutes;
  const availableMinutes = totalMinutes - Math.max(0, picks.length - 1) * transit;
  const durations = allocateDurations(
    picks.map(({ venue, activity }) => {
      const p = activity ? ACTIVITY_PROFILE[activity] : { min: MIN_SLOT_MINUTES, typical: 60, max: 120 };
      const visit = venue.visitDurationMinutes > 0 ? venue.visitDurationMinutes : p.typical;
      return { min: p.min, base: clamp(roundTo(visit, 15), p.min, p.max), max: p.max };
    }),
    availableMinutes,
  );

  // 10. Alternatives: next-best venues for the same slot that are not already in the plan.
  const chosenIds = new Set(picks.map((p) => p.venue.id));
  const items: ItineraryItem[] = picks.map((p, i) => {
    const cost = venueCost(p.venue);
    const alternatives: Alternative[] = p.ranked
      .filter((c) => !chosenIds.has(c.venue.id))
      .slice(0, 3)
      .map((c) => ({
        venueId: c.venue.id,
        venueName: c.venue.name,
        score: c.result.breakdown.rank,
        reason: c.result.reasons[0] ?? `Skor ${c.result.breakdown.rank}/100.`,
      }));
    return {
      id: `item-${i + 1}-${p.venue.id}`,
      kind: 'venue',
      venueId: p.venue.id,
      title: p.venue.name,
      activity: p.activity,
      startTime: input.startTime,
      endTime: input.startTime,
      durationMinutes: durations[i],
      costMin: cost?.min ?? 0,
      costMax: cost?.max ?? 0,
      costEstimate: cost?.estimate ?? 0,
      priceKnown: cost !== null,
      costEdited: false,
      notes: [],
      reasons: p.result.reasons,
      score: p.result.breakdown,
      alternatives,
    };
  });

  if (usesPublic || input.transportation === 'campuran') {
    const unknown = picks.filter((p) => !p.venue.transitAccess?.length).length;
    if (unknown > 0) {
      issues.push({
        code: 'TRANSIT_UNKNOWN',
        severity: 'info',
        message: `${unknown} tempat belum punya data akses transit. Gunakan tombol rute untuk mengecek di Google Maps.`,
      });
    }
  }

  if (opts.usesSampleVenues) {
    issues.push({
      code: 'SAMPLE_VENUES',
      severity: 'info',
      message: `Belum ada venue nyata di ${input.city.trim()}, jadi rencana ini memakai venue sampel — bukan rekomendasi tempat nyata.`,
    });
  }

  const byId = new Map(venues.map((v) => [v.id, v]));
  const plan = recalculate(
    {
      id: opts.planId,
      title: '',
      concept: '',
      input,
      items,
      transport: { mode: input.transportation, legs: [], legModes: {} },
      generationIssues: issues,
      createdAt: opts.createdAt,
      usesSampleVenues: Boolean(opts.usesSampleVenues),
    },
    (id) => byId.get(id),
  );
  return { plan, issues };
}
