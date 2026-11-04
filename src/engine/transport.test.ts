import { describe, expect, it } from 'vitest';
import { generateItinerary } from './generator';
import { setLegMode } from './itinerary';
import {
  MODE_PROFILE,
  buildLegs,
  defaultLegMode,
  isPublicTransport,
  proximityScore,
  rankScore,
  straightLineMeters,
  transitAccessScore,
  transportFit,
} from './transport';
import { OPTS, input, venue } from './testFixtures';
import type { Venue } from '../types';

// Fictional coordinates: A–B 0.008° latitude ≈ 890 m apart (walkable), A–FAR ≈ 11 km.
const A = { latitude: -6.2, longitude: 106.8 };
const B = { latitude: -6.208, longitude: 106.8 };
const FAR = { latitude: -6.3, longitude: 106.8 };

describe('transport basics', () => {
  it('classifies public transport modes', () => {
    expect(['transjakarta', 'mrt', 'lrt', 'krl', 'umum'].every((m) => isPublicTransport(m as never))).toBe(true);
    expect(['motor', 'mobil', 'jalan-kaki', 'campuran'].some((m) => isPublicTransport(m as never))).toBe(false);
  });

  it('never prices public transport and uses transit travelmode', () => {
    for (const m of ['transjakarta', 'mrt', 'lrt', 'krl', 'umum'] as const) {
      expect(MODE_PROFILE[m]).toMatchObject({ fareKnown: false, costMin: 0, costMax: 0, travelmode: 'transit' });
    }
    expect(MODE_PROFILE.motor.travelmode).toBe('two-wheeler');
    expect(MODE_PROFILE.mobil.travelmode).toBe('driving');
    expect(MODE_PROFILE['jalan-kaki'].travelmode).toBe('walking');
  });

  it('computes straight-line distance only when both venues have coordinates', () => {
    expect(straightLineMeters(A, B)).toBeGreaterThan(880);
    expect(straightLineMeters(A, B)).toBeLessThan(900);
    expect(straightLineMeters(A, {})).toBeUndefined();
    expect(straightLineMeters({ latitude: -6.2 }, B)).toBeUndefined();
    expect(straightLineMeters(undefined, B)).toBeUndefined();
  });

  it('does not treat unknown distance as near', () => {
    expect(proximityScore(undefined)).toBe(0.4);
    expect(proximityScore(500)).toBe(1);
    expect(proximityScore(undefined)).toBeLessThan(proximityScore(2_000));
    expect(proximityScore(20_000)).toBe(0.1);
  });

  it('suggests walking in mixed plans only for verified-close venues', () => {
    expect(defaultLegMode('campuran', venue({ id: 'a', ...A }), venue({ id: 'b', ...A }))).toBe('jalan-kaki');
    expect(defaultLegMode('campuran', venue({ id: 'a', ...A }), venue({ id: 'b', ...FAR }))).toBe('umum');
    expect(defaultLegMode('campuran', venue({ id: 'a' }), venue({ id: 'b' }))).toBe('umum'); // no coordinates
    expect(defaultLegMode('mrt')).toBe('mrt');
  });
});

describe('transit access scoring', () => {
  const mrtVerified = venue({ id: 'm', transitAccess: [{ stationName: 'Stasiun Uji', transitType: 'mrt', walkingMinutes: 5, verifiedAt: '2026-10-01' }] });
  const mrtUnverified = venue({ id: 'u', transitAccess: [{ stationName: 'Stasiun Uji', transitType: 'mrt' }] });
  const tjVerified = venue({ id: 't', transitAccess: [{ stationName: 'Halte Uji', transitType: 'transjakarta', verifiedAt: '2026-10-01' }] });
  const longWalk = venue({ id: 'l', transitAccess: [{ stationName: 'Stasiun Jauh', transitType: 'mrt', walkingMinutes: 25, verifiedAt: '2026-10-01' }] });
  const none = venue({ id: 'n' });

  it('ranks verified matching access highest and unknown access at zero', () => {
    expect(transitAccessScore(mrtVerified, 'mrt').score).toBe(1);
    expect(transitAccessScore(mrtUnverified, 'mrt').score).toBe(0.8);
    expect(transitAccessScore(tjVerified, 'mrt').score).toBe(0.6);
    expect(transitAccessScore(longWalk, 'mrt').score).toBe(0.8);
    expect(transitAccessScore(none, 'mrt')).toEqual({ score: 0, verified: false });
    expect(transitAccessScore(tjVerified, 'umum').score).toBe(1); // any type is fine
  });

  it('mentions walking time only when verified', () => {
    expect(transportFit(mrtVerified, 'mrt').reasons[0]).toContain('jalan kaki ±5 menit');
    expect(transportFit(mrtUnverified, 'mrt').reasons[0]).toContain('belum diverifikasi');
    expect(transportFit(mrtUnverified, 'mrt').reasons[0]).not.toMatch(/menit/);
    expect(transportFit(none, 'mrt').reasons).toEqual([]);
  });

  it('blends ranking 75/25 and leaves non-transit plans unchanged', () => {
    expect(rankScore(80, undefined)).toBe(80);
    expect(rankScore(80, 1)).toBe(85);
    expect(rankScore(80, 0)).toBe(60);
  });
});

describe('generator with public transport', () => {
  const base = (over: Partial<Venue> & { id: string }) =>
    venue({ vibes: ['romantis'], activities: ['kopi'], priceMin: 30_000, priceMax: 50_000, ...over });

  it('prefers venues with verified transit access over otherwise identical ones', () => {
    const pool = [
      base({ id: 'a-tanpa', name: 'A Tanpa Transit' }),
      base({ id: 'b-transit', name: 'B Transit', transitAccess: [{ stationName: 'Halte Uji', transitType: 'transjakarta', verifiedAt: '2026-10-01' }] }),
    ];
    const byCar = generateItinerary(input({ activities: ['kopi'], durationHours: 1.5, transportation: 'mobil' }), pool, OPTS).plan!;
    const byTj = generateItinerary(input({ activities: ['kopi'], durationHours: 1.5, transportation: 'transjakarta' }), pool, OPTS).plan!;
    expect(byCar.items[0].venueId).toBe('a-tanpa'); // name tie-break without transit preference
    expect(byTj.items[0].venueId).toBe('b-transit');
    expect(byTj.items[0].score!.rank).toBeGreaterThan(byTj.items[0].alternatives[0].score);
  });

  it('prefers the requested transit type', () => {
    const pool = [
      base({ id: 'krl', name: 'A KRL', transitAccess: [{ stationName: 'Stasiun A', transitType: 'krl', verifiedAt: '2026-10-01' }] }),
      base({ id: 'mrt', name: 'B MRT', transitAccess: [{ stationName: 'Stasiun B', transitType: 'mrt', verifiedAt: '2026-10-01' }] }),
    ];
    expect(generateItinerary(input({ activities: ['kopi'], durationHours: 1.5, transportation: 'mrt' }), pool, OPTS).plan!.items[0].venueId).toBe('mrt');
    expect(generateItinerary(input({ activities: ['kopi'], durationHours: 1.5, transportation: 'krl' }), pool, OPTS).plan!.items[0].venueId).toBe('krl');
  });

  it('prefers a nearby next stop when coordinates exist, never assuming missing coordinates are near', () => {
    const pool = [
      base({ id: 'kafe', name: 'Kafe', category: 'kafe', ...A }),
      venue({ id: 'resto-jauh', name: 'A Resto Jauh', category: 'restoran', activities: ['makan'], vibes: ['romantis'], priceMin: 30_000, priceMax: 50_000, ...FAR }),
      venue({ id: 'resto-tanpa', name: 'B Resto Tanpa Koordinat', category: 'restoran', activities: ['makan'], vibes: ['romantis'], priceMin: 30_000, priceMax: 50_000 }),
      venue({ id: 'resto-dekat', name: 'C Resto Dekat', category: 'restoran', activities: ['makan'], vibes: ['romantis'], priceMin: 30_000, priceMax: 50_000, ...B }),
    ];
    const plan = generateItinerary(input({ startTime: '15:00', activities: ['kopi', 'makan'], durationHours: 3, transportation: 'umum' }), pool, OPTS).plan!;
    expect(plan.items.map((i) => i.venueId)).toEqual(['kafe', 'resto-dekat']);
    const alts = plan.items[1].alternatives.map((a) => a.venueId);
    expect(alts.indexOf('resto-tanpa')).toBeLessThan(alts.indexOf('resto-jauh')); // unknown ranks between near and far
  });

  it('limits transfers and reports missing transit data', () => {
    const pool = [
      base({ id: 'k1', name: 'K1', category: 'kafe' }),
      venue({ id: 'r1', category: 'restoran', activities: ['makan'], vibes: ['romantis'] }),
      venue({ id: 't1', category: 'taman', activities: ['jalan'], vibes: ['romantis'], priceMin: 0, priceMax: 0 }),
      venue({ id: 'g1', category: 'galeri', activities: ['galeri'], vibes: ['romantis'] }),
    ];
    const car = generateItinerary(input({ durationHours: 6, transportation: 'mobil' }), pool, OPTS);
    const pub = generateItinerary(input({ durationHours: 6, transportation: 'umum' }), pool, OPTS);
    expect(car.plan!.items.length).toBe(4);
    expect(pub.plan!.items.length).toBe(3);
    expect(pub.issues.map((i) => i.code)).toEqual(expect.arrayContaining(['FEWER_TRANSFERS', 'TRANSIT_UNKNOWN']));
    expect(pub.plan!.transport.legs.every((l) => l.mode === 'umum' && !l.fareKnown && l.bufferMinutes === 30)).toBe(true);
    pub.plan!.items.forEach((i) => expect(i.notes).toContain('Info akses transit belum diketahui — cek rute di Google Maps.'));
  });

  it('is deterministic with transit data', () => {
    const pool = [
      base({ id: 'x', transitAccess: [{ stationName: 'S', transitType: 'mrt' }], ...A }),
      base({ id: 'y', transitAccess: [{ stationName: 'S', transitType: 'mrt', verifiedAt: '2026-10-01' }] }),
    ];
    const i = input({ transportation: 'mrt', activities: ['kopi'], durationHours: 3 });
    expect(generateItinerary(i, pool, OPTS)).toEqual(generateItinerary(i, [...pool].reverse(), OPTS));
  });
});

describe('mixed transportation', () => {
  const pool = [
    venue({ id: 'k', name: 'Kafe', category: 'kafe', activities: ['kopi'], vibes: ['romantis'], ...A }),
    venue({ id: 'r', name: 'Resto', category: 'restoran', activities: ['makan'], vibes: ['romantis'], ...B }),
    venue({ id: 't', name: 'Taman', category: 'taman', activities: ['jalan'], vibes: ['romantis'], priceMin: 0, priceMax: 0, ...FAR }),
  ];
  const get = (id: string) => pool.find((v) => v.id === id);

  it('picks a default mode per leg and lets the user change each leg', () => {
    const plan = generateItinerary(input({ startTime: '15:00', durationHours: 4, transportation: 'campuran', activities: ['kopi', 'makan', 'jalan'] }), pool, OPTS).plan!;
    expect(plan.transport.legs.map((l) => l.mode)).toEqual(['umum', 'jalan-kaki']); // taman→kafe ≈ 10 km, kafe→resto ≈ 890 m
    const leg = plan.transport.legs[0];
    const changed = setLegMode(plan, leg.key, 'motor', get);
    expect(changed.transport.legs[0]).toMatchObject({ mode: 'motor', bufferMinutes: 20, fareKnown: true });
    expect(changed.items[1].startTime).not.toBe(plan.items[1].startTime); // buffer 30 → 20 shifts the timeline
  });

  it('ignores per-leg changes when the plan is not mixed', () => {
    const plan = generateItinerary(input({ transportation: 'mrt' }), pool, OPTS).plan!;
    expect(setLegMode(plan, plan.transport.legs[0].key, 'motor', get)).toBe(plan);
  });

  it('builds legs with stable keys', () => {
    const legs = buildLegs([{ id: 'a', venueId: 'k' }, { id: 'b', venueId: 'r' }], 'campuran', { 'a>b': 'mobil' }, get);
    expect(legs).toHaveLength(1);
    expect(legs[0]).toMatchObject({ key: 'a>b', mode: 'mobil' });
    expect(buildLegs([{ id: 'a' }], 'motor', {}, get)).toEqual([]);
  });
});
