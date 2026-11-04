import type { AppData } from './backup';
import { DEFAULT_PREFERENCES, DEFAULT_SETTINGS } from './defaults';
import { parsePlans, parsePreferences, parseSettings, parseVenues } from './schema';
import { KEYS, readEnvelope, removeKey, writeEnvelope, type WriteResult } from './storage';

/**
 * Automatic safety copy taken right before an import or restore, so the
 * previous data can be brought back. Only the most recent one is kept.
 */

export interface Snapshot {
  takenAt: string;
  reason: 'import' | 'restore';
  data: AppData;
}

export function saveSnapshot(data: AppData, reason: Snapshot['reason']): WriteResult {
  return writeEnvelope(KEYS.preImportSnapshot, { takenAt: new Date().toISOString(), reason, data });
}

export function readSnapshot(): Snapshot | null {
  const r = readEnvelope(KEYS.preImportSnapshot);
  if (r.status !== 'ok' || !r.data || typeof r.data !== 'object') return null;
  const s = r.data as Record<string, unknown>;
  const d = (s.data ?? {}) as Record<string, unknown>;
  if (typeof s.takenAt !== 'string') return null;
  return {
    takenAt: s.takenAt,
    reason: s.reason === 'restore' ? 'restore' : 'import',
    data: {
      plans: parsePlans(d.plans).items,
      venues: parseVenues(d.venues).items,
      settings: d.settings ? parseSettings(d.settings).value : DEFAULT_SETTINGS,
      preferences: d.preferences ? parsePreferences(d.preferences).value : DEFAULT_PREFERENCES,
    },
  };
}

export function clearSnapshot(): void {
  removeKey(KEYS.preImportSnapshot);
}
