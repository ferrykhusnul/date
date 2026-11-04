/**
 * Migration strategy
 * ------------------
 * Stored envelopes and backup files carry `schemaVersion`. When the stored
 * shape changes:
 *   1. bump SCHEMA_VERSION in storage.ts;
 *   2. add MIGRATIONS[oldVersion] that turns data of version N into N + 1.
 * Data is migrated step by step on read and re-validated afterwards, so a
 * broken step can never write unvalidated data. Data from a NEWER version
 * is never migrated or overwritten.
 *
 * Derived plan fields (timeline, legs, notes) are recomputed on load, so
 * changes to those rules need no migration.
 */

import { readRaw, removeKey, safeJsonParse, writeEnvelope, KEYS, LEGACY_KEYS } from './storage';
import { SCHEMA_VERSION } from './version';
import { parseVenues } from './schema';

type Step = (data: unknown, key: string) => unknown;

/** MIGRATIONS[n] upgrades data from version n to n + 1. None needed yet. */
export const MIGRATIONS: Record<number, Step> = {};

export function migrateData(
  key: string,
  fromVersion: number,
  data: unknown,
  target: number = SCHEMA_VERSION,
): { ok: true; data: unknown } | { ok: false; message: string } {
  let d = data;
  for (let v = fromVersion; v < target; v++) {
    const step = MIGRATIONS[v];
    if (!step) return { ok: false, message: `Tidak ada migrasi dari versi ${v}.` };
    try {
      d = step(d, key);
    } catch {
      return { ok: false, message: `Migrasi dari versi ${v} gagal.` };
    }
  }
  return { ok: true, data: d };
}

export interface LegacyMigrationReport {
  migrated: string[];
  failed: string[];
}

/**
 * One-off move of data written by Phase 2–4 (raw arrays without envelopes)
 * into the current keys. The legacy key is removed only after the new value
 * was written successfully, and never when the new key already exists.
 */
export function migrateLegacyKeys(): LegacyMigrationReport {
  const report: LegacyMigrationReport = { migrated: [], failed: [] };
  const legacy = readRaw(LEGACY_KEYS.venuesV1);
  if (legacy === null) return report;
  if (readRaw(KEYS.venues) !== null) return report; // already migrated; keep legacy copy untouched
  const parsed = safeJsonParse(legacy);
  if (!parsed.ok || !Array.isArray(parsed.value)) {
    report.failed.push(LEGACY_KEYS.venuesV1);
    return report;
  }
  // Normalise on the way in (e.g. free-text transit access becomes `transitNote`).
  if (writeEnvelope(KEYS.venues, parseVenues(parsed.value).items).ok) {
    removeKey(LEGACY_KEYS.venuesV1);
    report.migrated.push(LEGACY_KEYS.venuesV1);
  } else {
    report.failed.push(LEGACY_KEYS.venuesV1);
  }
  return report;
}
