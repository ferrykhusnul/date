import { describe, expect, it } from 'vitest';
import { SAMPLE_VENUES } from '../data/sampleVenues';
import type { Venue } from '../types';
import { EMPTY_FILTER, citiesOf, filterVenues, plannableVenues } from './venueFilters';
import { parseStoredVenue, parseTransitAccess, validateVenue } from './venueValidation';

const make = (over: Partial<Venue>): Venue => ({
  id: over.id ?? 'v',
  name: 'Venue Uji',
  category: 'kafe',
  address: 'Jl. Uji 1',
  city: 'Jakarta',
  priceMin: 30_000,
  priceMax: 60_000,
  visitDurationMinutes: 60,
  vibes: ['santai'],
  activities: ['kopi'],
  environment: 'indoor',
  googleMapsUrl: 'https://maps.app.goo.gl/test',
  description: '',
  status: 'active',
  ...over,
});

const venues = [
  make({ id: 'a', city: 'Jakarta', category: 'kafe' }),
  make({ id: 'b', city: ' jakarta ', category: 'restoran', activities: ['makan'], vibes: ['romantis'] }),
  make({ id: 'c', city: 'Bandung', environment: 'outdoor', priceMin: 200_000, priceMax: 300_000 }),
  make({ id: 'd', city: 'Jakarta', status: 'inactive' }),
  ...SAMPLE_VENUES,
];

const ids = (vs: Venue[]) => vs.map((v) => v.id);

describe('filterVenues', () => {
  it('defaults to active, non-sample venues', () => {
    expect(ids(filterVenues(venues, EMPTY_FILTER))).toEqual(['a', 'b', 'c']);
  });
  it('filters by city case- and whitespace-insensitively', () => {
    expect(ids(filterVenues(venues, { ...EMPTY_FILTER, city: 'JAKARTA' }))).toEqual(['a', 'b']);
  });
  it('filters by category, activity, vibe, environment and price', () => {
    expect(ids(filterVenues(venues, { ...EMPTY_FILTER, category: 'restoran' }))).toEqual(['b']);
    expect(ids(filterVenues(venues, { ...EMPTY_FILTER, activity: 'makan' }))).toEqual(['b']);
    expect(ids(filterVenues(venues, { ...EMPTY_FILTER, vibe: 'romantis' }))).toEqual(['b']);
    expect(ids(filterVenues(venues, { ...EMPTY_FILTER, environment: 'outdoor' }))).toEqual(['c']);
    expect(ids(filterVenues(venues, { ...EMPTY_FILTER, maxPrice: 100_000 }))).toEqual(['a', 'b']);
  });
  it('supports status and sample toggles', () => {
    expect(ids(filterVenues(venues, { ...EMPTY_FILTER, status: 'inactive' }))).toEqual(['d']);
    expect(filterVenues(venues, { ...EMPTY_FILTER, includeSamples: true })).toHaveLength(3 + SAMPLE_VENUES.length);
  });
  it('lists distinct cities and plannable venues', () => {
    expect(citiesOf(venues.slice(0, 4))).toEqual(['Bandung', 'Jakarta']);
    expect(ids(plannableVenues(venues, 'jakarta'))).toEqual(['a', 'b']);
  });
});

describe('validateVenue', () => {
  it('accepts a complete venue', () => {
    expect(validateVenue(make({}))).toEqual({});
  });
  it('rejects bad prices, coordinates and links', () => {
    const e = validateVenue(make({ priceMin: 50_000, priceMax: 10_000, latitude: 100, googleMapsUrl: 'https://example.com' }));
    expect(Object.keys(e).sort()).toEqual(['googleMapsUrl', 'latitude', 'priceMax']);
  });
  it('requires both coordinates or neither', () => {
    expect(validateVenue(make({ latitude: -6.2 })).latitude).toBeDefined();
    expect(validateVenue(make({ latitude: -6.2, longitude: 106.8 }))).toEqual({});
  });
});

describe('parseStoredVenue', () => {
  it('drops unusable records and unknown metadata', () => {
    expect(parseStoredVenue(null)).toBeNull();
    expect(parseStoredVenue({ id: 1 })).toBeNull();
    const v = parseStoredVenue({ ...make({}), vibes: ['santai', 'hacker'], status: 'weird', isSample: true });
    expect(v?.vibes).toEqual(['santai']);
    expect(v?.status).toBe('active');
    expect(v?.isSample).toBeUndefined();
  });
});

describe('transit metadata', () => {
  it('is optional and validated when present', () => {
    expect(validateVenue(make({ transitAccess: undefined }))).toEqual({});
    const e = validateVenue(make({ transitAccess: [{ stationName: '', transitType: 'mrt', distanceMeters: -5, walkingMinutes: 90 }] }));
    expect(Object.keys(e.transitRows![0]).sort()).toEqual(['distanceMeters', 'stationName', 'walkingMinutes']);
  });

  it('drops malformed rows from storage and keeps legacy text as a note', () => {
    expect(parseTransitAccess([{ stationName: 'S', transitType: 'mrt' }, { stationName: 'X', transitType: 'bus' }, null])).toEqual([
      { stationName: 'S', transitType: 'mrt', distanceMeters: undefined, walkingMinutes: undefined, verifiedAt: undefined },
    ]);
    const legacy = parseStoredVenue({ ...make({}), transitAccess: 'Dekat halte' });
    expect(legacy?.transitAccess).toBeUndefined();
    expect(legacy?.transitNote).toBe('Dekat halte');
  });

  it('filters by transit availability, verification and type', () => {
    const vs = [
      make({ id: 't1', transitAccess: [{ stationName: 'S', transitType: 'mrt', verifiedAt: '2026-10-01' }] }),
      make({ id: 't2', transitAccess: [{ stationName: 'H', transitType: 'transjakarta' }] }),
      make({ id: 't3' }),
    ];
    expect(ids(filterVenues(vs, { ...EMPTY_FILTER, transit: 'any' }))).toEqual(['t1', 't2']);
    expect(ids(filterVenues(vs, { ...EMPTY_FILTER, transit: 'verified' }))).toEqual(['t1']);
    expect(ids(filterVenues(vs, { ...EMPTY_FILTER, transit: 'unknown' }))).toEqual(['t3']);
    expect(ids(filterVenues(vs, { ...EMPTY_FILTER, transit: 'transjakarta' }))).toEqual(['t2']);
    expect(ids(filterVenues(vs, { ...EMPTY_FILTER, query: 'H' }))).toContain('t2');
  });
});
