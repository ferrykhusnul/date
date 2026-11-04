import type { Activity, Alternative, DatePlan, ItineraryItem, LegMode, Venue, Vibe } from '../types';
import { formatDuration, minutesToTime, timeToMinutes } from '../lib/format';
import { VIBE_OPTIONS, labelOf } from '../lib/options';
import { clamp, roundTo } from './activities';
import { computeBudget, venueCost } from './budget';
import { isBudgetReason, scoreVenue, type ScoreContext } from './scoring';
import { buildLegs, isPublicTransport, transitTypeLabel } from './transport';
import { usedMinutes } from './validation';

/**
 * Timeline, notes and concept are DERIVED from the item list, so every edit
 * goes through `recalculate` and the plan stays consistent immediately.
 */

export type VenueLookup = (id: string) => Venue | undefined;

const VIBE_OPENING: Record<Vibe, string> = {
  romantis: 'Kencan hangat dan intim',
  santai: 'Kencan santai tanpa terburu-buru',
  petualang: 'Kencan penuh hal baru',
  kreatif: 'Kencan untuk memanjakan rasa ingin tahu',
  elegan: 'Kencan yang rapi dan istimewa',
};

const ACTIVITY_PHRASE: Record<Activity, string> = {
  makan: 'makan bersama',
  kopi: 'ngopi sambil mengobrol',
  jalan: 'jalan-jalan santai',
  galeri: 'menjelajah museum atau galeri',
  nonton: 'menonton bersama',
  belanja: 'berburu barang menarik',
  alam: 'menikmati alam terbuka',
  hiburan: 'bersenang-senang',
};

function partOfDay(startTime: string): string {
  const h = Math.floor(timeToMinutes(startTime) / 60);
  if (h < 11) return 'Pagi';
  if (h < 15) return 'Siang';
  if (h < 19) return 'Sore';
  return 'Malam';
}

export function buildTitle(plan: Pick<DatePlan, 'input'>): string {
  const city = plan.input.city.trim() || 'Kota Anda';
  return `${partOfDay(plan.input.startTime)} ${labelOf(VIBE_OPTIONS, plan.input.vibe)} di ${city}`;
}

/** Concept sentence generated only from the selected activities. */
export function buildConcept(plan: Pick<DatePlan, 'input' | 'items' | 'transport' | 'usesSampleVenues'>): string {
  const city = plan.input.city.trim() || 'Kota Anda';
  if (!plan.items.length) return `${VIBE_OPENING[plan.input.vibe]} di ${city}. Belum ada aktivitas di itinerary.`;
  const steps = plan.items.map((i) => (i.activity ? ACTIVITY_PHRASE[i.activity] : `"${i.title}"`));
  const flow =
    steps.length === 1 ? steps[0] : `${steps.slice(0, -1).join(', ')}, lalu ${steps[steps.length - 1]}`;
  const first = flow.charAt(0).toUpperCase() + flow.slice(1);
  return (
    `${VIBE_OPENING[plan.input.vibe]} di ${city}. ${first} — sekitar ${formatDuration(usedMinutes(plan))} untuk berdua.` +
    (plan.usesSampleVenues ? ' Disusun dari venue sampel, bukan tempat nyata.' : '')
  );
}

function itemNotes(item: ItineraryItem, plan: DatePlan, venue: Venue | undefined): string[] {
  const notes: string[] = [];
  if (item.kind === 'custom') {
    if (item.userNote) notes.push(item.userNote);
    notes.push('Aktivitas tambahan darimu — biaya sesuai yang kamu isi.');
  } else if (!venue) {
    notes.push('Venue ini sudah tidak ada di dataset.');
  } else {
    if (venue.isSample) notes.push('Venue sampel — bukan tempat nyata.');
    if (venue.status === 'inactive') notes.push('Venue ini sekarang berstatus nonaktif.');
    if (!item.priceKnown) notes.push('Harga belum ada di dataset — cek langsung sebelum berangkat.');
    if (venue.visitDurationMinutes > 0 && item.durationMinutes < venue.visitDurationMinutes * 0.75)
      notes.push(`Waktunya lebih singkat dari kunjungan biasa (${formatDuration(venue.visitDurationMinutes)}).`);
    if (venue.environment === 'outdoor') notes.push('Luar ruangan — siapkan rencana cadangan jika hujan.');
    if (isPublicTransport(plan.input.transportation) || plan.input.transportation === 'campuran') {
      const access = venue.transitAccess ?? [];
      if (!access.length) notes.push('Info akses transit belum diketahui — cek rute di Google Maps.');
      for (const a of access) {
        const walk =
          a.verifiedAt && typeof a.walkingMinutes === 'number'
            ? ` · jalan kaki ±${a.walkingMinutes} menit (terverifikasi)`
            : a.verifiedAt
              ? ''
              : ' · belum diverifikasi';
        notes.push(`Akses: ${a.stationName} (${transitTypeLabel(a.transitType)})${walk}`);
      }
    }
    if (venue.transitNote) notes.push(`Catatan transit: ${venue.transitNote}`);
  }
  if (item.costEdited && item.kind === 'venue') notes.push('Biaya disesuaikan manual.');
  if (timeToMinutes(item.endTime) >= 22 * 60 || timeToMinutes(item.endTime) < timeToMinutes(item.startTime))
    notes.push('Selesai larut malam — jam buka belum ada di dataset, cek terlebih dahulu.');
  return notes;
}

/** Re-derives timeline, transport legs, notes, title and concept. */
export function recalculate(plan: DatePlan, getVenue: VenueLookup): DatePlan {
  const legs = buildLegs(plan.items, plan.input.transportation, plan.transport?.legModes ?? {}, getVenue);
  // Keep only overrides that still match a pair of consecutive stops.
  const keys = new Set(legs.map((l) => l.key));
  const legModes = Object.fromEntries(Object.entries(plan.transport?.legModes ?? {}).filter(([k]) => keys.has(k)));
  let cursor = timeToMinutes(plan.input.startTime);
  const timed = plan.items.map((item, i) => {
    const start = cursor;
    const end = start + item.durationMinutes;
    cursor = end + (legs[i]?.bufferMinutes ?? 0);
    return { ...item, startTime: minutesToTime(start), endTime: minutesToTime(end) };
  });
  const next: DatePlan = { ...plan, transport: { mode: plan.input.transportation, legs, legModes }, items: timed };
  next.items = timed.map((i) => ({ ...i, notes: itemNotes(i, next, i.venueId ? getVenue(i.venueId) : undefined) }));
  next.title = buildTitle(next);
  next.concept = buildConcept(next);
  return next;
}

export function planEndTime(plan: Pick<DatePlan, 'items' | 'input'>): string {
  return plan.items.length ? plan.items[plan.items.length - 1].endTime : plan.input.startTime;
}

/* ---------------------------------------------------------------- edits */

export const DURATION_STEP = 15;
export const MIN_ITEM_MINUTES = 15;
export const MAX_ITEM_MINUTES = 360;
export const MAX_ITEM_COST = 100_000_000;

function mapItem(plan: DatePlan, id: string, fn: (i: ItineraryItem) => ItineraryItem): DatePlan {
  return { ...plan, items: plan.items.map((i) => (i.id === id ? fn(i) : i)) };
}

export function removeItem(plan: DatePlan, id: string, getVenue: VenueLookup): DatePlan {
  return recalculate({ ...plan, items: plan.items.filter((i) => i.id !== id) }, getVenue);
}

/** Moves an item from one index to another. */
export function moveItem(plan: DatePlan, from: number, to: number, getVenue: VenueLookup): DatePlan {
  if (from === to || from < 0 || to < 0 || from >= plan.items.length || to >= plan.items.length) return plan;
  const items = [...plan.items];
  const [moved] = items.splice(from, 1);
  items.splice(to, 0, moved);
  return recalculate({ ...plan, items }, getVenue);
}

export function setDuration(plan: DatePlan, id: string, minutes: number, getVenue: VenueLookup): DatePlan {
  const m = clamp(roundTo(Number.isFinite(minutes) ? minutes : MIN_ITEM_MINUTES, DURATION_STEP), MIN_ITEM_MINUTES, MAX_ITEM_MINUTES);
  return recalculate(mapItem(plan, id, (i) => ({ ...i, durationMinutes: m })), getVenue);
}

/** A manual cost is a known figure: it replaces the range and counts in totals. */
export function setCost(plan: DatePlan, id: string, amount: number, getVenue: VenueLookup): DatePlan {
  const c = clamp(Math.round(Number.isFinite(amount) ? amount : 0), 0, MAX_ITEM_COST);
  return recalculate(
    mapItem(plan, id, (i) => ({
      ...i,
      costMin: c,
      costMax: c,
      costEstimate: c,
      priceKnown: true,
      costEdited: true,
      reasons: i.reasons.filter((r) => !isBudgetReason(r)),
    })),
    getVenue,
  );
}

/** Mixed transportation only: choose how to travel between two stops. */
export function setLegMode(plan: DatePlan, key: string, mode: LegMode, getVenue: VenueLookup): DatePlan {
  if (plan.input.transportation !== 'campuran' || !plan.transport.legs.some((l) => l.key === key)) return plan;
  return recalculate({ ...plan, transport: { ...plan.transport, legModes: { ...plan.transport.legModes, [key]: mode } } }, getVenue);
}

export function scoreContextFor(
  plan: DatePlan,
  item: Pick<ItineraryItem, 'id' | 'activity' | 'durationMinutes'>,
  getVenue?: VenueLookup,
): ScoreContext {
  const transportEst = computeBudget(plan).transportEstimate;
  const n = Math.max(1, plan.items.length);
  return {
    vibe: plan.input.vibe,
    requestedActivities: plan.input.activities,
    targetActivity: item.activity ?? undefined,
    environment: plan.input.environment,
    perStopBudget: Math.max(0, plan.input.budget - transportEst) / n,
    slotMinutes: item.durationMinutes,
    transportation: plan.input.transportation,
    previous: previousVenue(plan, item.id, getVenue),
  };
}

function previousVenue(plan: DatePlan, itemId: string, getVenue?: VenueLookup): Venue | undefined {
  if (!getVenue) return undefined;
  const idx = plan.items.findIndex((i) => i.id === itemId);
  for (let i = idx - 1; i >= 0; i--) {
    const id = plan.items[i].venueId;
    if (id) return getVenue(id);
  }
  return undefined;
}

export function replaceVenue(plan: DatePlan, id: string, venue: Venue, getVenue: VenueLookup): DatePlan {
  const current = plan.items.find((i) => i.id === id);
  if (!current) return plan;
  const activity: Activity | null =
    current.activity && venue.activities.includes(current.activity)
      ? current.activity
      : ((plan.input.activities.find((a) => venue.activities.includes(a)) ?? venue.activities[0] ?? current.activity ?? null) as Activity | null);
  const scored = scoreVenue(venue, scoreContextFor(plan, { id, activity, durationMinutes: current.durationMinutes }, getVenue));
  const cost = venueCost(venue);
  const previous: Alternative[] =
    current.kind === 'venue' && current.venueId && current.score
      ? [{ venueId: current.venueId, venueName: current.title, score: current.score.rank, reason: 'Pilihan sebelumnya.' }]
      : [];
  const alternatives = [...previous, ...current.alternatives].filter((a) => a.venueId !== venue.id).slice(0, 3);
  return recalculate(
    mapItem(plan, id, (i) => ({
      ...i,
      kind: 'venue',
      venueId: venue.id,
      title: venue.name,
      activity,
      costMin: cost?.min ?? 0,
      costMax: cost?.max ?? 0,
      costEstimate: cost?.estimate ?? 0,
      priceKnown: cost !== null,
      costEdited: false,
      score: scored.breakdown,
      reasons: scored.reasons,
      alternatives,
      userNote: undefined,
    })),
    getVenue,
  );
}

export interface CustomActivityInput {
  title: string;
  durationMinutes: number;
  cost: number;
  note?: string;
  activity?: Activity | null;
}

export function addCustomItem(plan: DatePlan, input: CustomActivityInput, getVenue: VenueLookup): DatePlan {
  const n = plan.items.reduce((max, i) => {
    const m = /^custom-(\d+)$/.exec(i.id);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);
  const cost = clamp(Math.round(input.cost || 0), 0, MAX_ITEM_COST);
  const item: ItineraryItem = {
    id: `custom-${n + 1}`,
    kind: 'custom',
    title: input.title.trim() || 'Aktivitas bebas',
    activity: input.activity ?? null,
    startTime: plan.input.startTime,
    endTime: plan.input.startTime,
    durationMinutes: clamp(roundTo(input.durationMinutes || 60, DURATION_STEP), MIN_ITEM_MINUTES, MAX_ITEM_MINUTES),
    costMin: cost,
    costMax: cost,
    costEstimate: cost,
    priceKnown: true,
    costEdited: false,
    notes: [],
    reasons: [],
    alternatives: [],
    userNote: input.note?.trim() || undefined,
  };
  return recalculate({ ...plan, items: [...plan.items, item] }, getVenue);
}
