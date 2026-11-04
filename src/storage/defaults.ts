import type { Preferences, Settings } from '../types';

export const DEFAULT_SETTINGS: Settings = {
  defaultCity: 'Jakarta',
  defaultBudget: 500_000,
  defaultTransportation: 'motor',
  useSampleVenues: true,
};

export const DEFAULT_PREFERENCES: Preferences = {
  vibe: 'romantis',
  activities: ['makan', 'kopi'],
  environment: 'mixed',
  durationHours: 3,
  startTime: '18:00',
};
