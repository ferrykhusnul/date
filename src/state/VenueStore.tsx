import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { CURATED_VENUES } from '../data/venues';
import { SAMPLE_VENUES } from '../data/sampleVenues';
import { parseStoredVenue } from '../lib/venueValidation';
import type { Venue, VenueSource, VenueStatus } from '../types';

/**
 * Venue store.
 *
 * - Curated venues ship in code (`data/venues.ts`).
 * - Venues added or edited in the app are kept in this browser's
 *   localStorage. An edit to a curated venue is stored as a local override
 *   with the same id, so it can be reverted.
 * - Sample venues are read-only placeholders and never persisted.
 */

const STORAGE_KEY = 'date-planner.venues.v1';

function readLocal(): Venue[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseStoredVenue).filter((v): v is Venue => v !== null);
  } catch {
    return [];
  }
}

function writeLocal(venues: Venue[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(venues));
    return true;
  } catch {
    return false;
  }
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function newVenueId(name: string, city: string): string {
  return `${slug(`${name} ${city}`) || 'venue'}-${Math.random().toString(36).slice(2, 7)}`;
}

interface VenueStore {
  /** Curated + local venues (local overrides applied), then samples. */
  venues: Venue[];
  /** Curated + local only — no samples. */
  realVenues: Venue[];
  localVenues: Venue[];
  persistenceAvailable: boolean;
  getVenue: (id: string) => Venue | undefined;
  sourceOf: (id: string) => VenueSource | undefined;
  /** True when a curated venue has a local edit on top. */
  isOverridden: (id: string) => boolean;
  saveVenue: (venue: Venue) => void;
  setStatus: (id: string, status: VenueStatus) => void;
  /** Deletes a local venue, or reverts a curated venue's local edit. */
  removeLocal: (id: string) => void;
  clearLocal: () => void;
}

const VenueStoreContext = createContext<VenueStore | null>(null);

const curatedIds = new Set(CURATED_VENUES.map((v) => v.id));
const sampleIds = new Set(SAMPLE_VENUES.map((v) => v.id));

export function VenueStoreProvider({ children }: { children: ReactNode }) {
  const [localVenues, setLocalVenues] = useState<Venue[]>(readLocal);
  const [persistenceAvailable, setPersistenceAvailable] = useState(true);

  const latest = useRef(localVenues);
  latest.current = localVenues;

  const commit = useCallback((updater: (prev: Venue[]) => Venue[]) => {
    const next = updater(latest.current);
    latest.current = next;
    setPersistenceAvailable(writeLocal(next));
    setLocalVenues(next);
  }, []);

  const realVenues = useMemo(() => {
    const localById = new Map(localVenues.map((v) => [v.id, v]));
    const merged = CURATED_VENUES.map((v) => localById.get(v.id) ?? v);
    const added = localVenues.filter((v) => !curatedIds.has(v.id));
    return [...merged, ...added];
  }, [localVenues]);

  const venues = useMemo(() => [...realVenues, ...SAMPLE_VENUES], [realVenues]);

  const getVenue = useCallback((id: string) => venues.find((v) => v.id === id), [venues]);

  const sourceOf = useCallback(
    (id: string): VenueSource | undefined => {
      if (sampleIds.has(id)) return 'sample';
      if (curatedIds.has(id)) return 'curated';
      return localVenues.some((v) => v.id === id) ? 'local' : undefined;
    },
    [localVenues],
  );

  const isOverridden = useCallback(
    (id: string) => curatedIds.has(id) && localVenues.some((v) => v.id === id),
    [localVenues],
  );

  const saveVenue = useCallback(
    (venue: Venue) => {
      if (sampleIds.has(venue.id) || venue.isSample) return; // samples are read-only
      const clean: Venue = { ...venue, isSample: undefined };
      commit((prev) => {
        const i = prev.findIndex((v) => v.id === clean.id);
        if (i === -1) return [...prev, clean];
        const next = [...prev];
        next[i] = clean;
        return next;
      });
    },
    [commit],
  );

  const setStatus = useCallback(
    (id: string, status: VenueStatus) => {
      const current = realVenues.find((v) => v.id === id);
      if (current) saveVenue({ ...current, status });
    },
    [realVenues, saveVenue],
  );

  const removeLocal = useCallback(
    (id: string) => commit((prev) => prev.filter((v) => v.id !== id)),
    [commit],
  );

  const clearLocal = useCallback(() => commit(() => []), [commit]);

  const value = useMemo<VenueStore>(
    () => ({
      venues,
      realVenues,
      localVenues,
      persistenceAvailable,
      getVenue,
      sourceOf,
      isOverridden,
      saveVenue,
      setStatus,
      removeLocal,
      clearLocal,
    }),
    [venues, realVenues, localVenues, persistenceAvailable, getVenue, sourceOf, isOverridden, saveVenue, setStatus, removeLocal, clearLocal],
  );

  return <VenueStoreContext.Provider value={value}>{children}</VenueStoreContext.Provider>;
}

export function useVenues(): VenueStore {
  const ctx = useContext(VenueStoreContext);
  if (!ctx) throw new Error('useVenues must be used inside VenueStoreProvider');
  return ctx;
}
