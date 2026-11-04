/**
 * Centralised localStorage access. Every value is wrapped in a versioned
 * envelope, every read is parsed safely and every failure is reported
 * instead of thrown. Nothing here talks to a network.
 */

import { migrateData } from './migrations';
import { APP_ID, SCHEMA_VERSION } from './version';

export { APP_ID, SCHEMA_VERSION };

export const KEYS = {
  plans: 'date-planner.plans',
  draft: 'date-planner.draft',
  settings: 'date-planner.settings',
  preferences: 'date-planner.preferences',
  venues: 'date-planner.venues',
  preImportSnapshot: 'date-planner.pre-import-snapshot',
} as const;

export type StorageKey = (typeof KEYS)[keyof typeof KEYS];

/** Keys written by earlier versions (raw values, no envelope). */
export const LEGACY_KEYS = {
  venuesV1: 'date-planner.venues.v1',
} as const;

export interface Envelope<T> {
  app: typeof APP_ID;
  schemaVersion: number;
  updatedAt: string;
  data: T;
}

export type StorageErrorKind = 'unavailable' | 'quota' | 'corrupt' | 'newer-version' | 'unknown';

export type ReadResult =
  | { status: 'empty' }
  | { status: 'ok'; data: unknown; migratedFrom?: number }
  | { status: 'error'; kind: StorageErrorKind; message: string };

export type WriteResult = { ok: true } | { ok: false; kind: StorageErrorKind; message: string };

export type ParseResult = { ok: true; value: unknown } | { ok: false; message: string };

/** JSON.parse that never throws. */
export function safeJsonParse(text: string): ParseResult {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'JSON tidak valid' };
  }
}

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null; // e.g. blocked by browser privacy settings
  }
}

let availableCache: boolean | null = null;

/** Test helper: forget the cached availability check. */
export function resetStorageAvailabilityCache(): void {
  availableCache = null;
}

/** True when localStorage can actually be written (false in some private modes). */
export function storageAvailable(): boolean {
  if (availableCache !== null) return availableCache;
  const s = storage();
  if (!s) return (availableCache = false);
  try {
    const probe = `${APP_ID}.__probe__`;
    s.setItem(probe, '1');
    s.removeItem(probe);
    return (availableCache = true);
  } catch {
    return (availableCache = false);
  }
}

function isQuotaError(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014)
  );
}

export function readRaw(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeRaw(key: string, value: string): WriteResult {
  const s = storage();
  if (!s) return { ok: false, kind: 'unavailable', message: 'Penyimpanan peramban tidak tersedia.' };
  try {
    s.setItem(key, value);
    return { ok: true };
  } catch (e) {
    if (isQuotaError(e)) return { ok: false, kind: 'quota', message: 'Penyimpanan peramban penuh.' };
    return { ok: false, kind: 'unknown', message: 'Gagal menyimpan ke peramban.' };
  }
}

export function removeKey(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function isEnvelope(v: unknown): v is Envelope<unknown> {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return o.app === APP_ID && Number.isInteger(o.schemaVersion) && (o.schemaVersion as number) >= 1 && 'data' in o;
}

/** Reads, verifies and migrates an envelope. Never throws. */
export function readEnvelope(key: StorageKey): ReadResult {
  const raw = readRaw(key);
  if (raw === null) return { status: 'empty' };
  const parsed = safeJsonParse(raw);
  if (!parsed.ok) return { status: 'error', kind: 'corrupt', message: 'Data tersimpan bukan JSON yang valid.' };
  if (!isEnvelope(parsed.value)) return { status: 'error', kind: 'corrupt', message: 'Format data tersimpan tidak dikenali.' };
  const env = parsed.value;
  if (env.schemaVersion > SCHEMA_VERSION) {
    return {
      status: 'error',
      kind: 'newer-version',
      message: 'Data dibuat oleh versi aplikasi yang lebih baru dan tidak diubah agar tidak rusak.',
    };
  }
  const migrated = migrateData(key, env.schemaVersion, env.data);
  if (!migrated.ok) return { status: 'error', kind: 'corrupt', message: migrated.message };
  return { status: 'ok', data: migrated.data, migratedFrom: env.schemaVersion < SCHEMA_VERSION ? env.schemaVersion : undefined };
}

export function writeEnvelope<T>(key: StorageKey, data: T): WriteResult {
  const env: Envelope<T> = { app: APP_ID, schemaVersion: SCHEMA_VERSION, updatedAt: new Date().toISOString(), data };
  return writeRaw(key, JSON.stringify(env));
}

/**
 * Keeps an unreadable value under a separate key before the app writes over
 * it, so nothing is lost silently. Returns the quarantine key, if saved.
 */
export function quarantine(key: string): string | null {
  const raw = readRaw(key);
  if (raw === null) return null;
  const target = `${key}.rusak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  return writeRaw(target, raw).ok ? target : null;
}

/** Copies made by `quarantine`, newest last. */
export function quarantinedKeys(): string[] {
  return ownKeys().filter((k) => k.includes('.rusak-'));
}

/** Keys this app owns in localStorage (including quarantined copies). */
export function ownKeys(): string[] {
  const s = storage();
  if (!s) return [];
  const keys: string[] = [];
  try {
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k && k.startsWith(`${APP_ID}.`)) keys.push(k);
    }
  } catch {
    /* ignore */
  }
  return keys.sort();
}

/** Approximate bytes used by this app (localStorage stores UTF-16). */
export function usageBytes(): number {
  return ownKeys().reduce((sum, k) => sum + (k.length + (readRaw(k)?.length ?? 0)) * 2, 0);
}
