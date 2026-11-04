import { generateItinerary, type GenerationResult } from '../engine/generator';
import type { DateInput, Settings, Venue } from '../types';
import { plannableVenues } from './venueFilters';

/**
 * Thin wrapper the UI uses to call the (unchanged) generator with the real
 * venues for the chosen city. Sample venues are no longer used for new plans;
 * `settings.useSampleVenues` is kept in storage for compatibility only.
 */
export function planFromInput(
  input: DateInput,
  opts: {
    realVenues: Venue[];
    settings: Pick<Settings, 'useSampleVenues'>;
    planId: string;
    /** Venue ids to leave out (used by "Coba ide lain"). */
    exclude?: Set<string>;
  },
): GenerationResult & { usesSampleVenues: boolean } {
  const usesSampleVenues = false;
  const base = plannableVenues(opts.realVenues, input.city).length ? opts.realVenues : [];
  const venues = opts.exclude?.size ? base.filter((v) => !opts.exclude!.has(v.id)) : base;
  const result = generateItinerary(input, venues, {
    planId: opts.planId,
    createdAt: new Date().toISOString(),
    ignoreCity: usesSampleVenues,
    usesSampleVenues,
  });
  return { ...result, usesSampleVenues };
}
