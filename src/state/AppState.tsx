import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { buildSamplePlans } from '../data/samplePlans';
import type { DateInput, DatePlan, Settings } from '../types';

/**
 * Plans, drafts and settings live in memory only: refreshing the page resets
 * them. (Venues are persisted separately — see VenueStore.)
 */

export const DEFAULT_SETTINGS: Settings = {
  defaultCity: 'Jakarta',
  defaultBudget: 500_000,
  defaultTransportation: 'motor',
  useSampleVenues: true,
};

interface AppState {
  settings: Settings;
  updateSettings: (next: Settings) => void;
  draft: DatePlan | null;
  setDraft: (plan: DatePlan | null) => void;
  /** Form values to restore when editing an itinerary. */
  formSeed: DateInput | null;
  setFormSeed: (input: DateInput | null) => void;
  savedPlans: DatePlan[];
  savePlan: (plan: DatePlan) => DatePlan;
  deletePlan: (id: string) => void;
  loadSamplePlans: () => void;
  clearSavedPlans: () => void;
  getSavedPlan: (id: string) => DatePlan | undefined;
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [draft, setDraft] = useState<DatePlan | null>(null);
  const [formSeed, setFormSeed] = useState<DateInput | null>(null);
  const [savedPlans, setSavedPlans] = useState<DatePlan[]>([]);

  const savePlan = useCallback((plan: DatePlan) => {
    const saved: DatePlan = { ...plan, savedAt: new Date().toISOString() };
    setSavedPlans((prev) => [saved, ...prev.filter((p) => p.id !== plan.id)]);
    return saved;
  }, []);

  const deletePlan = useCallback((id: string) => {
    setSavedPlans((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const loadSamplePlans = useCallback(() => {
    setSavedPlans((prev) => [...prev, ...buildSamplePlans()]);
  }, []);

  const clearSavedPlans = useCallback(() => setSavedPlans([]), []);

  const getSavedPlan = useCallback(
    (id: string) => savedPlans.find((p) => p.id === id),
    [savedPlans],
  );

  const value = useMemo<AppState>(
    () => ({
      settings,
      updateSettings: setSettings,
      draft,
      setDraft,
      formSeed,
      setFormSeed,
      savedPlans,
      savePlan,
      deletePlan,
      loadSamplePlans,
      clearSavedPlans,
      getSavedPlan,
    }),
    [settings, draft, formSeed, savedPlans, savePlan, deletePlan, loadSamplePlans, clearSavedPlans, getSavedPlan],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}
