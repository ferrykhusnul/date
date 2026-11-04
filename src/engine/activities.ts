import type { Activity } from '../types';

/**
 * Realistic time allocation per activity (minutes) and its usual place in a
 * date's flow (lower phase = earlier). Used for deterministic ordering and
 * duration fitting.
 */
export interface ActivityProfile {
  min: number;
  typical: number;
  max: number;
  phase: number;
}

export const ACTIVITY_PROFILE: Record<Activity, ActivityProfile> = {
  alam: { min: 60, typical: 120, max: 180, phase: 0 },
  galeri: { min: 45, typical: 75, max: 120, phase: 1 },
  jalan: { min: 30, typical: 45, max: 90, phase: 2 },
  belanja: { min: 45, typical: 60, max: 120, phase: 3 },
  hiburan: { min: 60, typical: 90, max: 150, phase: 4 },
  kopi: { min: 45, typical: 60, max: 90, phase: 5 },
  nonton: { min: 120, typical: 150, max: 180, phase: 6 },
  makan: { min: 60, typical: 90, max: 120, phase: 7 },
};

/** Activities that pair naturally after the key activity, in preference order. */
export const COMPLEMENTS: Record<Activity, Activity[]> = {
  makan: ['kopi', 'jalan', 'nonton'],
  kopi: ['jalan', 'galeri', 'makan'],
  jalan: ['kopi', 'makan', 'belanja'],
  galeri: ['kopi', 'jalan', 'makan'],
  nonton: ['makan', 'kopi'],
  belanja: ['kopi', 'makan'],
  alam: ['makan', 'kopi'],
  hiburan: ['makan', 'kopi'],
};

/** Shortest slot the planner will create; shorter dates are rejected. */
export const MIN_SLOT_MINUTES = 30;

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}
