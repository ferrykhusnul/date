import { generateItinerary } from '../engine/generator';
import type { DateInput, DatePlan } from '../types';
import { SAMPLE_CITY, SAMPLE_VENUES } from './sampleVenues';

/**
 * SAMPLE DATA — example saved plans users can load from the empty state to
 * preview the Saved Dates and Home screens. Built from sample venues only.
 */
const INPUTS: DateInput[] = [
  {
    city: SAMPLE_CITY,
    date: '2026-11-14',
    startTime: '16:00',
    durationHours: 4,
    budget: 600_000,
    vibe: 'romantis',
    activities: ['kopi', 'jalan', 'makan'],
    transportation: 'motor',
    environment: 'mixed',
    notes: 'Contoh catatan: pilih tempat yang tidak terlalu ramai.',
  },
  {
    city: SAMPLE_CITY,
    date: '2026-11-22',
    startTime: '10:00',
    durationHours: 5,
    budget: 400_000,
    vibe: 'kreatif',
    activities: ['galeri', 'kopi', 'belanja'],
    transportation: 'jalan-kaki',
    environment: 'indoor',
    notes: '',
  },
];

export function buildSamplePlans(): DatePlan[] {
  const now = new Date().toISOString();
  return INPUTS.map((input, i) =>
    generateItinerary(input, SAMPLE_VENUES, {
      planId: `contoh-${i + 1}-${Date.now().toString(36)}`,
      createdAt: now,
      ignoreCity: true,
      usesSampleVenues: true,
    }).plan,
  )
    .filter((p): p is DatePlan => p !== null)
    .map((p) => ({ ...p, savedAt: now }));
}
