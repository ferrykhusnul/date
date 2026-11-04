import type { DateInput, Venue } from '../types';

/** Fictional fixtures for engine tests — not real venues. */
export function venue(over: Partial<Venue> & { id: string }): Venue {
  return {
    name: `Venue ${over.id}`,
    category: 'kafe',
    address: 'Jl. Uji',
    city: 'Kota Uji',
    priceMin: 30_000,
    priceMax: 60_000,
    visitDurationMinutes: 60,
    vibes: ['santai'],
    activities: ['kopi'],
    environment: 'indoor',
    googleMapsUrl: 'https://maps.app.goo.gl/uji',
    description: '',
    status: 'active',
    ...over,
  };
}

export function input(over: Partial<DateInput> = {}): DateInput {
  return {
    city: 'Kota Uji',
    date: '2026-12-01',
    startTime: '16:00',
    durationHours: 4,
    budget: 600_000,
    vibe: 'romantis',
    activities: ['kopi', 'makan'],
    transportation: 'motor',
    environment: 'mixed',
    notes: '',
    ...over,
  };
}

export const OPTS = { planId: 'plan-test', createdAt: '2026-11-04T00:00:00.000Z' };

export const POOL: Venue[] = [
  venue({ id: 'kafe-a', name: 'Kafe A', category: 'kafe', activities: ['kopi'], vibes: ['romantis'], priceMin: 30_000, priceMax: 60_000, visitDurationMinutes: 60 }),
  venue({ id: 'kafe-b', name: 'Kafe B', category: 'kafe', activities: ['kopi'], vibes: ['santai'], priceMin: 20_000, priceMax: 40_000, environment: 'outdoor' }),
  venue({ id: 'resto-a', name: 'Resto A', category: 'restoran', activities: ['makan'], vibes: ['romantis', 'elegan'], priceMin: 100_000, priceMax: 200_000, visitDurationMinutes: 90 }),
  venue({ id: 'resto-b', name: 'Resto B', category: 'restoran', activities: ['makan'], vibes: ['santai'], priceMin: 40_000, priceMax: 80_000, visitDurationMinutes: 75, environment: 'outdoor' }),
  venue({ id: 'taman-a', name: 'Taman A', category: 'taman', activities: ['jalan', 'alam'], vibes: ['romantis', 'santai'], priceMin: 0, priceMax: 0, visitDurationMinutes: 45, environment: 'outdoor' }),
  venue({ id: 'galeri-a', name: 'Galeri A', category: 'galeri', activities: ['galeri'], vibes: ['kreatif'], priceMin: 25_000, priceMax: 50_000, visitDurationMinutes: 75 }),
  venue({ id: 'lain-kota', name: 'Kafe Kota Lain', city: 'Kota Lain', activities: ['kopi'], vibes: ['romantis'] }),
  venue({ id: 'nonaktif', name: 'Kafe Nonaktif', status: 'inactive', activities: ['kopi'], vibes: ['romantis'] }),
];
