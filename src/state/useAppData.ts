import { useCallback, useMemo } from 'react';
import type { AppData } from '../storage/backup';
import { useAppState } from './AppState';
import { useVenues } from './VenueStore';

/** Everything a backup contains, plus a way to replace it all at once. */
export function useAppData() {
  const { savedPlans, settings, preferences, replaceData } = useAppState();
  const { localVenues, replaceLocal } = useVenues();

  const data: AppData = useMemo(
    () => ({ plans: savedPlans, settings, preferences, venues: localVenues }),
    [savedPlans, settings, preferences, localVenues],
  );

  /** Returns false if any part could not be written to storage. */
  const replaceAll = useCallback(
    (next: AppData) => {
      const venuesOk = replaceLocal(next.venues);
      const restOk = replaceData({ plans: next.plans, settings: next.settings, preferences: next.preferences });
      return venuesOk && restOk;
    },
    [replaceData, replaceLocal],
  );

  return { data, replaceAll };
}
