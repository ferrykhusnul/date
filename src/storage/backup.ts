/**
 * Backup export/import. Everything happens in the browser: export builds a
 * JSON file for download, import reads a file the user picks. No data is
 * transmitted anywhere.
 */

import type { DatePlan, Preferences, Settings, Venue } from '../types';
import { migrateData } from './migrations';
import { parseDatePlan, parsePlans, parsePreferences, parseSettings, parseVenues } from './schema';
import { parseStoredVenue } from '../lib/venueValidation';
import { safeJsonParse } from './storage';
import { DEFAULT_PREFERENCES, DEFAULT_SETTINGS } from './defaults';
import { APP_ID, SCHEMA_VERSION } from './version';

export const BACKUP_KIND = 'backup';
/** Larger files are rejected before parsing. */
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

export interface AppData {
  plans: DatePlan[];
  settings: Settings;
  preferences: Preferences;
  /** Local venues only (added or edited on this device). */
  venues: Venue[];
}

export interface BackupFile {
  app: typeof APP_ID;
  kind: typeof BACKUP_KIND;
  schemaVersion: number;
  exportedAt: string;
  data: AppData;
}

export function buildBackup(data: AppData, now: Date = new Date()): BackupFile {
  return { app: APP_ID, kind: BACKUP_KIND, schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), data };
}

export function backupFileName(now: Date = new Date()): string {
  return `a-day-with-us-cadangan-${now.toISOString().slice(0, 10)}.json`;
}

export function serializeBackup(file: BackupFile): string {
  return JSON.stringify(file, null, 2) + '\n';
}

/** Triggers a download of `text` as a JSON file (local only). */
export function downloadJson(text: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ParsedBackup {
  exportedAt: string | null;
  schemaVersion: number;
  plans: DatePlan[];
  venues: Venue[];
  /** Null when the file has no settings section. */
  settings: Settings | null;
  preferences: Preferences | null;
}

export type BackupParseResult =
  | { ok: true; backup: ParsedBackup; warnings: string[] }
  | { ok: false; error: string };

const isRec = (x: unknown): x is Record<string, unknown> => Boolean(x) && typeof x === 'object' && !Array.isArray(x);

/** Strictly validates a backup file's text. Malformed files are rejected whole. */
export function parseBackup(text: string): BackupParseResult {
  if (new Blob([text]).size > MAX_BACKUP_BYTES)
    return { ok: false, error: 'File terlalu besar untuk cadangan A Day With Us (maksimal 5 MB).' };
  if (!text.trim()) return { ok: false, error: 'File kosong.' };
  const parsed = safeJsonParse(text);
  if (!parsed.ok) return { ok: false, error: 'File ini bukan JSON yang valid.' };
  const root = parsed.value;
  if (!isRec(root) || root.app !== APP_ID || root.kind !== BACKUP_KIND)
    return { ok: false, error: 'File ini bukan cadangan A Day With Us.' };
  if (!Number.isInteger(root.schemaVersion) || (root.schemaVersion as number) < 1)
    return { ok: false, error: 'Versi skema cadangan tidak valid.' };
  const version = root.schemaVersion as number;
  if (version > SCHEMA_VERSION)
    return { ok: false, error: `Cadangan dibuat oleh versi aplikasi yang lebih baru (skema ${version}). Perbarui aplikasi terlebih dahulu.` };
  if (!isRec(root.data)) return { ok: false, error: 'Cadangan tidak berisi bagian data.' };

  const migrated = migrateData('backup', version, root.data);
  if (!migrated.ok || !isRec(migrated.data)) return { ok: false, error: 'Cadangan tidak bisa dimigrasikan ke versi ini.' };
  const d = migrated.data;

  for (const k of ['plans', 'venues'] as const) {
    if (k in d && !Array.isArray(d[k])) return { ok: false, error: `Bagian "${k}" pada cadangan rusak.` };
  }
  for (const k of ['settings', 'preferences'] as const) {
    if (k in d && !isRec(d[k])) return { ok: false, error: `Bagian "${k}" pada cadangan rusak.` };
  }

  const plans = parsePlans(d.plans);
  const venues = parseVenues(d.venues);
  const settings = 'settings' in d ? parseSettings(d.settings) : null;
  const preferences = 'preferences' in d ? parsePreferences(d.preferences) : null;

  if (!plans.items.length && !venues.items.length && !settings && !preferences)
    return { ok: false, error: 'Cadangan tidak berisi data yang bisa dipulihkan.' };

  const warnings: string[] = [];
  if (plans.dropped) warnings.push(`${plans.dropped} rencana tidak valid dan akan dilewati.`);
  if (venues.dropped) warnings.push(`${venues.dropped} venue tidak valid dan akan dilewati.`);
  if (settings?.fixedFields.length) warnings.push(`Pengaturan tidak valid diganti nilai bawaan: ${settings.fixedFields.join(', ')}.`);
  if (preferences?.fixedFields.length) warnings.push(`Preferensi tidak valid diganti nilai bawaan: ${preferences.fixedFields.join(', ')}.`);
  if (version < SCHEMA_VERSION) warnings.push(`Cadangan dari skema versi ${version} dimigrasikan ke versi ${SCHEMA_VERSION}.`);

  return {
    ok: true,
    backup: {
      exportedAt: typeof root.exportedAt === 'string' && !Number.isNaN(Date.parse(root.exportedAt)) ? root.exportedAt : null,
      schemaVersion: version,
      plans: plans.items,
      venues: venues.items,
      settings: settings?.value ?? null,
      preferences: preferences?.value ?? null,
    },
    warnings,
  };
}

/* --------------------------------------------------------- applying */

export type ImportMode = 'merge' | 'replace';
export type ConflictPolicy = 'keep-local' | 'use-backup';

export interface ImportOptions {
  mode: ImportMode;
  /** Merge only: what to do when an id exists on both sides with different content. */
  conflict: ConflictPolicy;
  /** Merge only: also take settings & preferences from the backup. */
  includeSettings: boolean;
}

export interface SectionSummary {
  added: number;
  replaced: number;
  keptLocal: number;
  identical: number;
  removed: number;
}

export interface ImportPlan {
  next: AppData;
  plans: SectionSummary;
  venues: SectionSummary;
  settingsChanged: boolean;
  preferencesChanged: boolean;
  /** True when anything currently stored would be lost or changed. */
  destructive: boolean;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Both sides pass through the same validator so derived fields don't cause false conflicts. */
const canonical = {
  plan: (p: DatePlan) => JSON.stringify(parseDatePlan(JSON.parse(JSON.stringify(p)))),
  venue: (v: Venue) => JSON.stringify(parseStoredVenue(JSON.parse(JSON.stringify(v)))),
};

function mergeById<T extends { id: string }>(
  local: T[],
  incoming: T[],
  opts: ImportOptions,
  key: (x: T) => string,
): { items: T[]; summary: SectionSummary } {
  const equal = (a: T, b: T) => key(a) === key(b);
  const summary: SectionSummary = { added: 0, replaced: 0, keptLocal: 0, identical: 0, removed: 0 };
  if (opts.mode === 'replace') {
    for (const l of local) {
      const match = incoming.find((i) => i.id === l.id);
      if (!match) summary.removed++;
      else if (equal(match, l)) summary.identical++;
      else summary.replaced++;
    }
    summary.added = incoming.filter((i) => !local.some((l) => l.id === i.id)).length;
    return { items: [...incoming], summary };
  }
  const byId = new Map(local.map((l) => [l.id, l]));
  const items = [...local];
  for (const inc of incoming) {
    const existing = byId.get(inc.id);
    if (!existing) {
      items.push(inc);
      summary.added++;
    } else if (equal(existing, inc)) {
      summary.identical++;
    } else if (opts.conflict === 'use-backup') {
      items[items.indexOf(existing)] = inc;
      summary.replaced++;
    } else {
      summary.keptLocal++;
    }
  }
  return { items, summary };
}

/** Pure: computes the result of an import without touching storage. */
export function planImport(current: AppData, backup: ParsedBackup, opts: ImportOptions): ImportPlan {
  const plans = mergeById(current.plans, backup.plans, opts, canonical.plan);
  const venues = mergeById(current.venues, backup.venues, opts, canonical.venue);
  const takeSettings = opts.mode === 'replace' || opts.includeSettings;
  const settings = takeSettings && backup.settings ? backup.settings : current.settings;
  const preferences = takeSettings && backup.preferences ? backup.preferences : current.preferences;
  const settingsChanged = !same(settings, current.settings);
  const preferencesChanged = !same(preferences, current.preferences);
  // Overwriting untouched defaults loses nothing; overwriting customised values does.
  const destructive =
    plans.summary.replaced + plans.summary.removed + venues.summary.replaced + venues.summary.removed > 0 ||
    (settingsChanged && !same(current.settings, DEFAULT_SETTINGS)) ||
    (preferencesChanged && !same(current.preferences, DEFAULT_PREFERENCES));
  return {
    next: { plans: plans.items, venues: venues.items, settings, preferences },
    plans: plans.summary,
    venues: venues.summary,
    settingsChanged,
    preferencesChanged,
    destructive,
  };
}
