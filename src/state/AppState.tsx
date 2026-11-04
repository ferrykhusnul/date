import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { buildSamplePlans } from '../data/samplePlans';
import { recalculate, type VenueLookup } from '../engine/itinerary';
import { DEFAULT_PREFERENCES, DEFAULT_SETTINGS } from '../storage/defaults';
import { loadCollection, loadValue, persist } from '../storage/persisted';
import { parseDatePlan, parsePlans, parsePreferences, parseSettings } from '../storage/schema';
import { KEYS, removeKey } from '../storage/storage';
import type { DateInput, DatePlan, Preferences, Settings } from '../types';
import { useVenues } from './VenueStore';

/**
 * Plans, the current draft, settings and preferences — all persisted to
 * localStorage through src/storage. Nothing leaves the device.
 */

export { DEFAULT_PREFERENCES, DEFAULT_SETTINGS };

export function planDisplayName(plan: Pick<DatePlan, 'name' | 'title'>): string {
  return plan.name?.trim() || plan.title;
}

export function newPlanId(): string {
  return `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

interface AppState {
  settings: Settings;
  updateSettings: (next: Settings) => void;
  preferences: Preferences;
  updatePreferences: (next: Preferences) => void;
  draft: DatePlan | null;
  setDraft: (plan: DatePlan | null) => void;
  /** Form values to restore when editing an itinerary (not persisted). */
  formSeed: DateInput | null;
  setFormSeed: (input: DateInput | null) => void;
  savedPlans: DatePlan[];
  savePlan: (plan: DatePlan) => DatePlan;
  /** Replaces a saved plan in place (used by inline itinerary edits). */
  updateSavedPlan: (plan: DatePlan) => void;
  renamePlan: (id: string, name: string) => void;
  duplicatePlan: (id: string) => DatePlan | null;
  deletePlan: (id: string) => void;
  loadSamplePlans: () => void;
  clearSavedPlans: () => void;
  getSavedPlan: (id: string) => DatePlan | undefined;
  /** Replaces plans, settings and preferences at once (backup import / restore). */
  replaceData: (data: { plans: DatePlan[]; settings: Settings; preferences: Preferences }) => boolean;
}

const AppStateContext = createContext<AppState | null>(null);

const load = {
  plans: (get: VenueLookup) => loadCollection(KEYS.plans, parsePlans, 'Rencana tersimpan').map((p) => recalculate(p, get)),
  draft: (get: VenueLookup) => {
    const items = loadCollection(KEYS.draft, (x) => {
      const p = x === null ? null : parseDatePlan(x);
      return { items: p ? [p] : [], dropped: x !== null && !p ? 1 : 0 };
    }, 'Draf rencana');
    return items[0] ? recalculate(items[0], get) : null;
  },
  settings: () => loadValue(KEYS.settings, parseSettings, 'Pengaturan', DEFAULT_SETTINGS),
  preferences: () => loadValue(KEYS.preferences, parsePreferences, 'Preferensi', DEFAULT_PREFERENCES),
};

/**
 * State backed by one storage key: loads once, writes on change (skipping
 * the initial value and changes that came from another tab).
 */
function usePersistedState<T>(key: (typeof KEYS)[keyof typeof KEYS], label: string, init: () => T, reload: () => T) {
  const [value, setValue] = useState<T>(init);
  const skipWrite = useRef(true);

  useEffect(() => {
    if (skipWrite.current) {
      skipWrite.current = false;
      return;
    }
    if (value === null) removeKey(key);
    else persist(key, value, label);
  }, [key, label, value]);

  // Keep tabs in sync: another tab wrote this key.
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      skipWrite.current = true;
      setValue(reloadRef.current());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  return [value, setValue] as const;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { getVenue } = useVenues();
  const getVenueRef = useRef(getVenue);
  getVenueRef.current = getVenue;
  const lookup: VenueLookup = (id) => getVenueRef.current(id);

  const [settings, setSettings] = usePersistedState(KEYS.settings, 'Pengaturan', load.settings, load.settings);
  const [preferences, setPreferences] = usePersistedState(KEYS.preferences, 'Preferensi', load.preferences, load.preferences);
  const [savedPlans, setSavedPlans] = usePersistedState(KEYS.plans, 'Rencana tersimpan', () => load.plans(lookup), () => load.plans(lookup));
  const [draft, setDraft] = usePersistedState<DatePlan | null>(KEYS.draft, 'Draf rencana', () => load.draft(lookup), () => load.draft(lookup));
  const [formSeed, setFormSeed] = useState<DateInput | null>(null);

  const savePlan = useCallback(
    (plan: DatePlan) => {
      const saved: DatePlan = { ...plan, savedAt: new Date().toISOString() };
      setSavedPlans((prev) => [saved, ...prev.filter((p) => p.id !== plan.id)]);
      return saved;
    },
    [setSavedPlans],
  );

  const updateSavedPlan = useCallback(
    (plan: DatePlan) => setSavedPlans((prev) => prev.map((p) => (p.id === plan.id ? plan : p))),
    [setSavedPlans],
  );

  const renamePlan = useCallback(
    (id: string, name: string) => {
      const clean = name.trim().slice(0, 80);
      const apply = (p: DatePlan) => (p.id === id ? { ...p, name: clean || undefined, editedAt: new Date().toISOString() } : p);
      setSavedPlans((prev) => prev.map(apply));
      setDraft((d) => (d ? apply(d) : d));
    },
    [setSavedPlans, setDraft],
  );

  const duplicatePlan = useCallback(
    (id: string) => {
      const source = savedPlans.find((p) => p.id === id);
      if (!source) return null;
      const now = new Date().toISOString();
      const copy: DatePlan = {
        ...structuredClone(source),
        id: newPlanId(),
        name: `${planDisplayName(source)} (salinan)`.slice(0, 80),
        createdAt: now,
        savedAt: now,
        editedAt: undefined,
      };
      setSavedPlans((prev) => {
        const i = prev.findIndex((p) => p.id === id);
        const next = [...prev];
        next.splice(i + 1, 0, copy);
        return next;
      });
      return copy;
    },
    [savedPlans, setSavedPlans],
  );

  const deletePlan = useCallback((id: string) => setSavedPlans((prev) => prev.filter((p) => p.id !== id)), [setSavedPlans]);

  const loadSamplePlans = useCallback(() => setSavedPlans((prev) => [...prev, ...buildSamplePlans()]), [setSavedPlans]);

  const clearSavedPlans = useCallback(() => setSavedPlans([]), [setSavedPlans]);

  const getSavedPlan = useCallback((id: string) => savedPlans.find((p) => p.id === id), [savedPlans]);

  const replaceData = useCallback(
    (data: { plans: DatePlan[]; settings: Settings; preferences: Preferences }) => {
      // Write synchronously so a failure is known before the UI reports success.
      const ok =
        persist(KEYS.plans, data.plans, 'Rencana tersimpan') &&
        persist(KEYS.settings, data.settings, 'Pengaturan') &&
        persist(KEYS.preferences, data.preferences, 'Preferensi');
      setSavedPlans(data.plans.map((p) => recalculate(p, lookup)));
      setSettings(data.settings);
      setPreferences(data.preferences);
      return ok;
    },
    // `lookup` only reads a ref, so it is safe to leave out of the dependencies.
    [setSavedPlans, setSettings, setPreferences],
  );

  const value = useMemo<AppState>(
    () => ({
      settings,
      updateSettings: setSettings,
      preferences,
      updatePreferences: setPreferences,
      draft,
      setDraft,
      formSeed,
      setFormSeed,
      savedPlans,
      savePlan,
      updateSavedPlan,
      renamePlan,
      duplicatePlan,
      deletePlan,
      loadSamplePlans,
      clearSavedPlans,
      getSavedPlan,
      replaceData,
    }),
    [settings, setSettings, preferences, setPreferences, draft, setDraft, formSeed, savedPlans, savePlan, updateSavedPlan, renamePlan, duplicatePlan, deletePlan, loadSamplePlans, clearSavedPlans, getSavedPlan, replaceData],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}
