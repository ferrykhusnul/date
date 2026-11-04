import { beforeEach, describe, expect, it } from 'vitest';
import { generateItinerary } from '../engine/generator';
import { recalculate } from '../engine/itinerary';
import { OPTS, POOL, input } from '../engine/testFixtures';
import { dismissAllStorageIssues } from './issues';
import { MIGRATIONS, migrateData, migrateLegacyKeys } from './migrations';
import { isLocked, loadCollection, persist } from './persisted';
import { parseDatePlan, parsePlans, parsePreferences, parseSettings } from './schema';
import {
  KEYS,
  LEGACY_KEYS,
  quarantinedKeys,
  readEnvelope,
  readRaw,
  resetStorageAvailabilityCache,
  safeJsonParse,
  storageAvailable,
  writeEnvelope,
  writeRaw,
} from './storage';
import { installMemoryStorage, type MemoryStorage } from './testStorage';
import { DEFAULT_SETTINGS } from './defaults';

let mem: MemoryStorage;
beforeEach(() => {
  mem = installMemoryStorage();
  resetStorageAvailabilityCache();
  dismissAllStorageIssues();
});

const plan = () => generateItinerary(input(), POOL, OPTS).plan!;
const get = (id: string) => POOL.find((v) => v.id === id);

describe('safe JSON and envelopes', () => {
  it('never throws on bad JSON', () => {
    expect(safeJsonParse('{"a":1}')).toEqual({ ok: true, value: { a: 1 } });
    expect(safeJsonParse('{oops').ok).toBe(false);
    expect(safeJsonParse('').ok).toBe(false);
  });

  it('round-trips a versioned envelope', () => {
    expect(writeEnvelope(KEYS.settings, DEFAULT_SETTINGS)).toEqual({ ok: true });
    const raw = JSON.parse(readRaw(KEYS.settings)!);
    expect(raw).toMatchObject({ app: 'date-planner', schemaVersion: 1, data: DEFAULT_SETTINGS });
    expect(readEnvelope(KEYS.settings)).toEqual({ status: 'ok', data: DEFAULT_SETTINGS, migratedFrom: undefined });
  });

  it('reports empty, corrupt, foreign and newer data without throwing', () => {
    expect(readEnvelope(KEYS.plans)).toEqual({ status: 'empty' });
    writeRaw(KEYS.plans, '{not json');
    expect(readEnvelope(KEYS.plans)).toMatchObject({ status: 'error', kind: 'corrupt' });
    writeRaw(KEYS.plans, JSON.stringify([1, 2, 3]));
    expect(readEnvelope(KEYS.plans)).toMatchObject({ status: 'error', kind: 'corrupt' });
    writeRaw(KEYS.plans, JSON.stringify({ app: 'date-planner', schemaVersion: 99, updatedAt: '', data: [] }));
    expect(readEnvelope(KEYS.plans)).toMatchObject({ status: 'error', kind: 'newer-version' });
  });

  it('reports a full or blocked storage on write', () => {
    mem.quotaBytes = 10;
    expect(writeEnvelope(KEYS.plans, [plan()])).toMatchObject({ ok: false, kind: 'quota' });
    mem.quotaBytes = Infinity;
    mem.blocked = true;
    resetStorageAvailabilityCache();
    expect(storageAvailable()).toBe(false);
    expect(writeEnvelope(KEYS.plans, [])).toMatchObject({ ok: false, kind: 'unknown' });
  });
});

describe('migrations', () => {
  it('upgrades step by step and fails safely on a missing step', () => {
    MIGRATIONS[1] = (d) => ({ upgraded: d });
    try {
      expect(migrateData('k', 1, 'x', 2)).toEqual({ ok: true, data: { upgraded: 'x' } });
      expect(migrateData('k', 1, 'x', 3)).toEqual({ ok: false, message: 'Tidak ada migrasi dari versi 2.' });
    } finally {
      delete MIGRATIONS[1];
    }
    expect(migrateData('k', 1, 'x')).toEqual({ ok: true, data: 'x' }); // current version: no-op
  });

  it('moves Phase 2–4 venues into the new key and removes the legacy key only after success', () => {
    writeRaw(LEGACY_KEYS.venuesV1, JSON.stringify([POOL[0]]));
    expect(migrateLegacyKeys()).toEqual({ migrated: [LEGACY_KEYS.venuesV1], failed: [] });
    expect(readRaw(LEGACY_KEYS.venuesV1)).toBeNull();
    expect(readEnvelope(KEYS.venues)).toMatchObject({ status: 'ok', data: [POOL[0]] });
  });

  it('normalises legacy free-text transit access into transitNote', () => {
    writeRaw(LEGACY_KEYS.venuesV1, JSON.stringify([{ ...POOL[0], transitAccess: 'Dekat halte' }]));
    migrateLegacyKeys();
    const r = readEnvelope(KEYS.venues);
    expect(r.status === 'ok' && (r.data as { transitNote?: string; transitAccess?: unknown }[])[0]).toMatchObject({ transitNote: 'Dekat halte' });
    expect(r.status === 'ok' && (r.data as { transitAccess?: unknown }[])[0].transitAccess).toBeUndefined();
  });

  it('keeps the legacy key when the move cannot be written or is unreadable', () => {
    writeRaw(LEGACY_KEYS.venuesV1, '{broken');
    expect(migrateLegacyKeys().failed).toEqual([LEGACY_KEYS.venuesV1]);
    expect(readRaw(LEGACY_KEYS.venuesV1)).toBe('{broken');
  });
});

describe('loading with validation', () => {
  it('quarantines unreadable data once and starts empty', () => {
    writeRaw(KEYS.plans, '{broken');
    expect(loadCollection(KEYS.plans, parsePlans, 'Rencana')).toEqual([]);
    expect(quarantinedKeys()).toHaveLength(1);
    expect(readRaw(quarantinedKeys()[0])).toBe('{broken');
    expect(readRaw(KEYS.plans)).toBeNull();
    loadCollection(KEYS.plans, parsePlans, 'Rencana');
    expect(quarantinedKeys()).toHaveLength(1);
  });

  it('drops invalid records, keeps valid ones and copies the original aside once', () => {
    const good = plan();
    writeEnvelope(KEYS.plans, [good, { id: 'rusak' }, 42]);
    const loaded = loadCollection(KEYS.plans, parsePlans, 'Rencana');
    expect(loaded.map((p) => p.id)).toEqual([good.id]);
    expect(quarantinedKeys()).toHaveLength(1);
    loadCollection(KEYS.plans, parsePlans, 'Rencana');
    expect(quarantinedKeys()).toHaveLength(1); // cleaned data was written back
  });

  it('never writes over data from a newer version', () => {
    const newer = JSON.stringify({ app: 'date-planner', schemaVersion: 2, updatedAt: '', data: ['future'] });
    writeRaw(KEYS.plans, newer);
    expect(loadCollection(KEYS.plans, parsePlans, 'Rencana')).toEqual([]);
    expect(isLocked(KEYS.plans)).toBe(true);
    expect(persist(KEYS.plans, [], 'Rencana')).toBe(false);
    expect(readRaw(KEYS.plans)).toBe(newer);
  });
});

describe('schema validation', () => {
  it('restores a saved plan exactly after recalculation', () => {
    const p = { ...plan(), name: 'Kencan ulang tahun', savedAt: '2026-11-04T10:00:00.000Z' };
    const restored = parseDatePlan(JSON.parse(JSON.stringify(p)))!;
    expect(recalculate(restored, get)).toEqual(p);
  });

  it('rejects plans with broken or duplicate items and bad inputs', () => {
    const p = plan();
    expect(parseDatePlan({ ...p, items: [...p.items, { id: 'x' }] })).toBeNull();
    expect(parseDatePlan({ ...p, items: [p.items[0], p.items[0]] })).toBeNull();
    expect(parseDatePlan({ ...p, input: { ...p.input, date: '04/11/2026' } })).toBeNull();
    expect(parseDatePlan({ ...p, input: { ...p.input, budget: -1 } })).toBeNull();
    expect(parseDatePlan({ ...p, createdAt: 'kemarin' })).toBeNull();
    expect(parseDatePlan(null)).toBeNull();
    expect(parsePlans([p, p]).dropped).toBe(1); // duplicate ids
  });

  it('migrates the removed online-taxi option to car', () => {
    const p = plan();
    expect(parseDatePlan({ ...p, input: { ...p.input, transportation: 'taksi-online' } })!.input.transportation).toBe('mobil');
    expect(parseSettings({ ...DEFAULT_SETTINGS, defaultTransportation: 'taksi-online' }).value.defaultTransportation).toBe('mobil');
  });

  it('repairs invalid settings and preferences field by field', () => {
    const s = parseSettings({ defaultCity: '', defaultBudget: 250_000, defaultTransportation: 'roket', useSampleVenues: 'ya' });
    expect(s.value).toEqual({ ...DEFAULT_SETTINGS, defaultBudget: 250_000 });
    expect(s.fixedFields.sort()).toEqual(['defaultCity', 'defaultTransportation', 'useSampleVenues']);
    const pr = parsePreferences({ vibe: 'santai', activities: ['kopi', 'terbang'], startTime: '25:00' });
    expect(pr.value).toMatchObject({ vibe: 'santai', activities: ['kopi'], startTime: '18:00' });
    expect(pr.fixedFields).toEqual(['startTime']);
  });
});
