import { describe, expect, it } from 'vitest';
import { generateItinerary } from '../engine/generator';
import { buildSearchUrl, isGoogleMapsUrl } from '../lib/maps';
import { plannableVenues } from '../lib/venueFilters';
import { parseStoredVenue, validateVenue } from '../lib/venueValidation';
import type { Activity, DateInput, Environment, Transportation, Vibe } from '../types';
import { CURATED_VENUES, DATASET_CHECKED_AT } from './venues';

const AREAS = ['Jakarta Pusat', 'Jakarta Selatan', 'Jakarta Barat', 'Jakarta Utara', 'Jakarta Timur'];
const areaOf = (district = '') => AREAS.find((a) => district.endsWith(a));

describe('curated Jakarta venue dataset', () => {
  it('has unique ids and no sample/placeholder records', () => {
    const ids = CURATED_VENUES.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(CURATED_VENUES.every((v) => !v.isSample)).toBe(true);
    expect(CURATED_VENUES.every((v) => !/sampel|contoh|dummy|lorem/i.test(`${v.name} ${v.address}`))).toBe(true);
  });

  it('passes the same validation as venues added in the app', () => {
    for (const v of CURATED_VENUES) expect([v.id, validateVenue(v)]).toEqual([v.id, {}]);
  });

  it('every record is in Jakarta with a known area', () => {
    for (const v of CURATED_VENUES) {
      expect(v.city).toBe('Jakarta');
      expect([v.id, areaOf(v.district)]).not.toEqual([v.id, undefined]);
    }
    const areas = new Set(CURATED_VENUES.map((v) => areaOf(v.district)));
    expect(areas.size).toBe(5);
  });

  it('uses public Google Maps search URLs built from name and address', () => {
    for (const v of CURATED_VENUES) {
      expect(v.googleMapsUrl).toBe(buildSearchUrl(v));
      expect(v.googleMapsUrl.startsWith('https://www.google.com/maps/search/?api=1&query=')).toBe(true);
      expect(isGoogleMapsUrl(v.googleMapsUrl)).toBe(true);
    }
  });

  it('labels price confidence honestly', () => {
    for (const v of CURATED_VENUES) {
      expect(v.priceConfidence).toBeDefined();
      if (v.priceUnknown) expect(v.priceConfidence).toBe('unknown');
      else {
        expect(v.priceConfidence).not.toBe('unknown');
        expect(v.priceType).toBeDefined();
      }
      if (v.priceType === 'free') expect(v.priceMax).toBe(0);
    }
  });

  it('does not claim checks that were not made', () => {
    for (const v of CURATED_VENUES) {
      expect(v.verifiedAt).toBeUndefined(); // nobody has checked the Maps listings in person yet
      expect(v.lastCheckedAt).toBe(DATASET_CHECKED_AT);
      expect(v.latitude).toBeUndefined(); // no coordinates were sourced, so none are stored
      if (v.sourceUrl) expect(v.sourceUrl.startsWith('https://')).toBe(true);
      if (v.status === 'inactive') expect(v.needsVerification).toBe(true);
      for (const t of v.transitAccess ?? []) {
        const hasMeasure = t.distanceMeters !== undefined || t.walkingMinutes !== undefined;
        expect(Boolean(t.verifiedAt)).toBe(hasMeasure);
      }
    }
  });

  it('keeps the extra metadata through a local edit round-trip', () => {
    const v = CURATED_VENUES.find((x) => x.priceNote && x.transitAccess?.length)!;
    const back = parseStoredVenue(JSON.parse(JSON.stringify(v)));
    expect(back).toMatchObject({
      priceType: v.priceType,
      priceConfidence: v.priceConfidence,
      priceNote: v.priceNote,
      sourceUrl: v.sourceUrl,
      lastCheckedAt: v.lastCheckedAt,
    });
  });

  it('has enough active venues to plan with', () => {
    expect(plannableVenues(CURATED_VENUES, 'Jakarta').length).toBeGreaterThanOrEqual(70);
    expect(plannableVenues(CURATED_VENUES, 'jakarta ').length).toBeGreaterThanOrEqual(70);
  });
});

describe('planning with the real dataset', () => {
  const base: DateInput = {
    city: 'Jakarta',
    date: '2026-12-05',
    startTime: '15:00',
    durationHours: 4,
    budget: 500_000,
    vibe: 'romantis',
    activities: ['kopi', 'jalan', 'makan'],
    transportation: 'mrt',
    environment: 'mixed',
    notes: '',
  };
  const moods: Vibe[] = ['romantis', 'santai', 'petualang', 'kreatif', 'elegan'];
  const combos: [Activity[], Environment, Transportation][] = [
    [['kopi', 'jalan', 'makan'], 'mixed', 'mrt'],
    [['galeri', 'kopi'], 'indoor', 'transjakarta'],
    [['alam', 'jalan'], 'outdoor', 'motor'],
    [['hiburan', 'makan'], 'indoor', 'mobil'],
  ];

  for (const vibe of moods) {
    for (const [activities, environment, transportation] of combos) {
      it(`builds a plan for ${vibe} / ${activities.join('+')} / ${environment}`, () => {
        const { plan } = generateItinerary({ ...base, vibe, activities, environment, transportation }, CURATED_VENUES, {
          planId: 'p',
          createdAt: '2026-11-04T00:00:00.000Z',
        });
        expect(plan).not.toBeNull();
        const venueItems = plan!.items.filter((i) => i.venueId);
        expect(venueItems.length).toBeGreaterThan(0);
        for (const item of venueItems) {
          const v = CURATED_VENUES.find((x) => x.id === item.venueId)!;
          expect(v.status).toBe('active');
          if (environment !== 'mixed') expect([environment, 'mixed']).toContain(v.environment);
        }
      });
    }
  }

  it('respects a tight budget', () => {
    const { plan } = generateItinerary({ ...base, budget: 100_000, vibe: 'santai', activities: ['jalan', 'kopi'] }, CURATED_VENUES, {
      planId: 'p',
      createdAt: '2026-11-04T00:00:00.000Z',
    });
    expect(plan).not.toBeNull();
    const total = plan!.items.reduce((s, i) => s + i.costEstimate, 0);
    expect(total).toBeLessThanOrEqual(100_000);
  });
});
