import { generateSamplePlan } from '../lib/planGenerator';
import type { DatePlan } from '../types';

/**
 * SAMPLE DATA — example saved plans users can load from the empty state to
 * preview the Saved Dates and Home screens. Built from sample venues only.
 */
export function buildSamplePlans(): DatePlan[] {
  const now = new Date().toISOString();
  return [
    generateSamplePlan({
      city: 'Bandung',
      date: '2026-11-14',
      startTime: '16:00',
      durationHours: 4,
      budget: 600_000,
      vibe: 'romantis',
      activities: ['kopi', 'jalan', 'makan'],
      transportation: 'motor',
      environment: 'campuran',
      notes: 'Contoh catatan: pilih tempat yang tidak terlalu ramai.',
    }),
    generateSamplePlan({
      city: 'Yogyakarta',
      date: '2026-11-22',
      startTime: '10:00',
      durationHours: 5,
      budget: 400_000,
      vibe: 'kreatif',
      activities: ['galeri', 'kopi', 'belanja'],
      transportation: 'jalan-kaki',
      environment: 'indoor',
      notes: '',
    }),
  ].map((p) => ({ ...p, savedAt: now }));
}
