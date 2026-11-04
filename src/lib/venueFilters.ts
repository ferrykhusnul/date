import type { Environment, TransitType, Venue, VenueStatus } from '../types';

export interface VenueFilter {
  query: string;
  city: string; // '' = all
  category: string; // '' = all
  activity: string; // '' = all
  vibe: string; // '' = all
  environment: Environment | '';
  status: VenueStatus | 'all';
  /** Maximum estimated price per person; 0 = no limit. */
  maxPrice: number;
  includeSamples: boolean;
  /** '' = all, 'any' = has transit data, 'verified', 'unknown', or a transit type. */
  transit: '' | 'any' | 'verified' | 'unknown' | TransitType;
}

export const EMPTY_FILTER: VenueFilter = {
  query: '',
  city: '',
  category: '',
  activity: '',
  vibe: '',
  environment: '',
  status: 'active',
  maxPrice: 0,
  includeSamples: false,
  transit: '',
};

export function normalizeCity(city: string): string {
  return city.trim().toLowerCase();
}

export function sameCity(a: string, b: string): boolean {
  return normalizeCity(a) === normalizeCity(b);
}

export function filterVenues(venues: Venue[], f: VenueFilter): Venue[] {
  const q = f.query.trim().toLowerCase();
  return venues.filter((v) => {
    if (v.isSample && !f.includeSamples) return false;
    if (f.status !== 'all' && v.status !== f.status) return false;
    if (f.city && !sameCity(v.city, f.city)) return false;
    if (f.category && v.category !== f.category) return false;
    if (f.activity && !v.activities.includes(f.activity)) return false;
    if (f.vibe && !v.vibes.includes(f.vibe)) return false;
    if (f.environment && v.environment !== f.environment) return false;
    if (f.maxPrice > 0 && (v.priceUnknown || v.priceMin > f.maxPrice)) return false;
    if (f.transit) {
      const list = v.transitAccess ?? [];
      if (f.transit === 'unknown' ? list.length > 0 : list.length === 0) return false;
      if (f.transit === 'verified' && !list.some((a) => a.verifiedAt)) return false;
      if (f.transit !== 'any' && f.transit !== 'verified' && f.transit !== 'unknown' && !list.some((a) => a.transitType === f.transit))
        return false;
    }
    if (q) {
      const hay = [v.name, v.address, v.district ?? '', v.city, v.description, ...(v.transitAccess ?? []).map((a) => a.stationName)]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/** Distinct city names, first-seen spelling kept, sorted. */
export function citiesOf(venues: Venue[]): string[] {
  const map = new Map<string, string>();
  for (const v of venues) {
    const key = normalizeCity(v.city);
    if (key && !map.has(key)) map.set(key, v.city.trim());
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, 'id'));
}

/** Active venues the planner may use for a city. */
export function plannableVenues(venues: Venue[], city: string): Venue[] {
  return venues.filter((v) => v.status === 'active' && !v.isSample && sameCity(v.city, city));
}
