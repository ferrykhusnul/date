import { SAMPLE_VENUES } from '../data/sampleVenues';
import { generateItinerary, type GenerationResult } from '../engine/generator';
import type { DateInput, Settings, Venue } from '../types';
import { plannableVenues } from './venueFilters';

/**
 * Thin wrapper the UI uses to call the (unchanged) generator: decides between
 * real venues for the city and the sample fallback, exactly as before.
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
  const cityPool = plannableVenues(opts.realVenues, input.city);
  const usesSampleVenues = cityPool.length === 0;
  const base = usesSampleVenues ? (opts.settings.useSampleVenues ? SAMPLE_VENUES : []) : opts.realVenues;
  const venues = opts.exclude?.size ? base.filter((v) => !opts.exclude!.has(v.id)) : base;
  const result = generateItinerary(input, venues, {
    planId: opts.planId,
    createdAt: new Date().toISOString(),
    ignoreCity: usesSampleVenues,
    usesSampleVenues,
  });
  return { ...result, usesSampleVenues };
}
