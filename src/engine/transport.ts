import type { LegMode, PlanLeg, TransitAccess, TransitType, Transportation, Venue } from '../types';
import { TRANSIT_TYPE_OPTIONS, labelOf } from '../lib/options';

/**
 * Transport rules. There is NO routing here: the app never computes transit
 * routes, travel times, route numbers or fares. Google Maps does the routing
 * when the user opens a link. The engine only:
 *  - reserves a fixed planning buffer between stops (labelled as such),
 *  - ranks venues by known transit access and, when both venues have
 *    coordinates, by straight-line distance.
 */

export interface ModeProfile {
  /** Minutes reserved in the timeline per move. A planning buffer, not a route estimate. */
  bufferMinutes: number;
  /** Rough cost per move for two (IDR) — only for modes where fareKnown. */
  costMin: number;
  costMax: number;
  /** False for public transport: fares are not estimated. */
  fareKnown: boolean;
  /** Google Maps URLs `travelmode`. */
  travelmode: 'transit' | 'driving' | 'walking' | 'two-wheeler';
}

export const MODE_PROFILE: Record<LegMode, ModeProfile> = {
  transjakarta: { bufferMinutes: 30, costMin: 0, costMax: 0, fareKnown: false, travelmode: 'transit' },
  mrt: { bufferMinutes: 30, costMin: 0, costMax: 0, fareKnown: false, travelmode: 'transit' },
  lrt: { bufferMinutes: 30, costMin: 0, costMax: 0, fareKnown: false, travelmode: 'transit' },
  krl: { bufferMinutes: 30, costMin: 0, costMax: 0, fareKnown: false, travelmode: 'transit' },
  umum: { bufferMinutes: 30, costMin: 0, costMax: 0, fareKnown: false, travelmode: 'transit' },
  // Fuel/parking allowances for two — rough, labelled as estimates in the UI.
  motor: { bufferMinutes: 20, costMin: 5_000, costMax: 15_000, fareKnown: true, travelmode: 'two-wheeler' },
  mobil: { bufferMinutes: 25, costMin: 10_000, costMax: 30_000, fareKnown: true, travelmode: 'driving' },
  'jalan-kaki': { bufferMinutes: 15, costMin: 0, costMax: 0, fareKnown: true, travelmode: 'walking' },
};

const PUBLIC: ReadonlySet<Transportation> = new Set(['transjakarta', 'mrt', 'lrt', 'krl', 'umum']);

export function isPublicTransport(mode: Transportation): boolean {
  return PUBLIC.has(mode);
}

/** The transit type a mode asks for, or null for "any public transport". */
export function wantedTransitType(mode: Transportation): TransitType | null {
  return mode === 'transjakarta' || mode === 'mrt' || mode === 'lrt' || mode === 'krl' ? mode : null;
}

/** Straight-line distance in metres, or undefined unless BOTH venues have coordinates. */
export function straightLineMeters(
  a: Pick<Venue, 'latitude' | 'longitude'> | undefined,
  b: Pick<Venue, 'latitude' | 'longitude'> | undefined,
): number | undefined {
  if (!a || !b) return undefined;
  const { latitude: la1, longitude: lo1 } = a;
  const { latitude: la2, longitude: lo2 } = b;
  if (![la1, lo1, la2, lo2].every((n) => typeof n === 'number' && Number.isFinite(n))) return undefined;
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(la2! - la1!);
  const dLon = rad(lo2! - lo1!);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(la1!)) * Math.cos(rad(la2!)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** Within this straight-line distance a mixed plan suggests walking. */
export const WALKABLE_METERS = 1_000;

/** Default mode for one leg. Only mixed plans vary per leg. */
export function defaultLegMode(planMode: Transportation, from?: Venue, to?: Venue): LegMode {
  if (planMode !== 'campuran') return planMode;
  const d = straightLineMeters(from, to);
  return d !== undefined && d <= WALKABLE_METERS ? 'jalan-kaki' : 'umum';
}

export function legKey(fromItemId: string, toItemId: string): string {
  return `${fromItemId}>${toItemId}`;
}

export function buildLegs(
  items: { id: string; venueId?: string }[],
  planMode: Transportation,
  legModes: Record<string, LegMode>,
  getVenue: (id: string) => Venue | undefined,
): PlanLeg[] {
  const legs: PlanLeg[] = [];
  for (let i = 1; i < items.length; i++) {
    const from = items[i - 1];
    const to = items[i];
    const vFrom = from.venueId ? getVenue(from.venueId) : undefined;
    const vTo = to.venueId ? getVenue(to.venueId) : undefined;
    const key = legKey(from.id, to.id);
    const mode = (planMode === 'campuran' ? legModes[key] : undefined) ?? defaultLegMode(planMode, vFrom, vTo);
    const p = MODE_PROFILE[mode];
    legs.push({
      key,
      fromItemId: from.id,
      toItemId: to.id,
      mode,
      bufferMinutes: p.bufferMinutes,
      costMin: p.costMin,
      costMax: p.costMax,
      fareKnown: p.fareKnown,
      straightLineMeters: straightLineMeters(vFrom, vTo),
    });
  }
  return legs;
}

/* ---------------------------------------------------------- scoring */

/** Share of the ranking given to transport fit when public transport is chosen. */
export const TRANSPORT_RANK_WEIGHT = 0.25;

export interface AccessMatch {
  score: number;
  access?: TransitAccess;
  verified: boolean;
}

/**
 * How well a venue's KNOWN transit access fits the chosen mode (0–1).
 * Venues without transit data score 0: unknown access is never assumed.
 */
export function transitAccessScore(venue: Pick<Venue, 'transitAccess'>, mode: Transportation): AccessMatch {
  const list = venue.transitAccess ?? [];
  if (!list.length) return { score: 0, verified: false };
  const wanted = wantedTransitType(mode);
  let best: AccessMatch = { score: 0, verified: false };
  for (const a of list) {
    const verified = Boolean(a.verifiedAt);
    const typeOk = wanted === null || a.transitType === wanted;
    let s = typeOk ? (verified ? 1 : 0.8) : verified ? 0.6 : 0.5;
    // A verified long last-mile walk counts for less.
    if (verified && typeof a.walkingMinutes === 'number' && a.walkingMinutes > 15) s *= 0.8;
    if (s > best.score) best = { score: s, access: a, verified };
  }
  return best;
}

/** 0–1 from straight-line distance; unknown distance gets a cautious 0.4 (never treated as near). */
export function proximityScore(meters: number | undefined): number {
  if (meters === undefined) return 0.4;
  if (meters <= 1_000) return 1;
  if (meters <= 3_000) return 0.7;
  if (meters <= 7_000) return 0.4;
  return 0.1;
}

export interface TransportFit {
  score: number;
  reasons: string[];
  meters?: number;
}

export function transitTypeLabel(t: TransitType): string {
  return labelOf(TRANSIT_TYPE_OPTIONS, t);
}

/**
 * Transport compatibility for public-transport plans: 70% known transit
 * access, 30% proximity to the previous stop (when both have coordinates).
 */
export function transportFit(venue: Venue, mode: Transportation, previous?: Venue): TransportFit {
  const access = transitAccessScore(venue, mode);
  const meters = previous ? straightLineMeters(previous, venue) : undefined;
  const prox = previous ? proximityScore(meters) : 1;
  const reasons: string[] = [];
  if (access.access) {
    const a = access.access;
    const walk =
      access.verified && typeof a.walkingMinutes === 'number' ? `, jalan kaki ±${a.walkingMinutes} menit` : '';
    reasons.push(
      `Dekat ${a.stationName} (${transitTypeLabel(a.transitType)})${walk}${access.verified ? '' : ' — belum diverifikasi'}.`,
    );
  }
  if (meters !== undefined && meters <= 3_000)
    reasons.push(`Sekitar ${formatKm(meters)} dari tempat sebelumnya (garis lurus, dari koordinat).`);
  return { score: Math.round((access.score * 0.7 + prox * 0.3) * 100) / 100, reasons, meters };
}

export function formatKm(meters: number): string {
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} km`;
}

/** Ranking score: Phase 3 total blended with transport fit (public transport only). */
export function rankScore(total: number, transport: number | undefined): number {
  if (transport === undefined) return total;
  return Math.floor(total * (1 - TRANSPORT_RANK_WEIGHT) + transport * 100 * TRANSPORT_RANK_WEIGHT + 1e-9);
}
