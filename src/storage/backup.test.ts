import { describe, expect, it } from 'vitest';
import { generateItinerary } from '../engine/generator';
import { OPTS, POOL, input } from '../engine/testFixtures';
import { buildBackup, parseBackup, planImport, serializeBackup, type AppData } from './backup';
import { DEFAULT_PREFERENCES, DEFAULT_SETTINGS } from './defaults';

const p1 = generateItinerary(input(), POOL, { ...OPTS, planId: 'p1' }).plan!;
const p2 = generateItinerary(input({ vibe: 'santai' }), POOL, { ...OPTS, planId: 'p2' }).plan!;
const data = (over: Partial<AppData> = {}): AppData => ({
  plans: [p1],
  venues: [POOL[0]],
  settings: DEFAULT_SETTINGS,
  preferences: DEFAULT_PREFERENCES,
  ...over,
});
const text = (d: AppData) => serializeBackup(buildBackup(d, new Date('2026-11-04T08:00:00Z')));

describe('export', () => {
  it('creates valid JSON with app id, kind, schema version and all sections', () => {
    const json = JSON.parse(text(data()));
    expect(json).toMatchObject({ app: 'date-planner', kind: 'backup', schemaVersion: 1, exportedAt: '2026-11-04T08:00:00.000Z' });
    expect(Object.keys(json.data).sort()).toEqual(['plans', 'preferences', 'settings', 'venues']);
  });

  it('round-trips through import parsing', () => {
    const r = parseBackup(text(data({ plans: [p1, p2] })));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.backup.plans).toHaveLength(2);
    expect(r.backup.plans[0].items).toEqual(p1.items);
    expect(r.backup.venues).toEqual([POOL[0]]);
    expect(r.backup.settings).toEqual(DEFAULT_SETTINGS);
    expect(r.warnings).toEqual([]);
  });
});

describe('import validation', () => {
  const reject = (t: string) => {
    const r = parseBackup(t);
    expect(r.ok).toBe(false);
    return r.ok ? '' : r.error;
  };

  it('rejects malformed input safely', () => {
    expect(reject('{not json')).toMatch(/bukan JSON/);
    expect(reject('')).toMatch(/kosong/);
    expect(reject('[]')).toMatch(/bukan cadangan/);
    expect(reject(JSON.stringify({ app: 'lain', kind: 'backup', schemaVersion: 1, data: {} }))).toMatch(/bukan cadangan/);
    expect(reject(JSON.stringify({ app: 'date-planner', kind: 'backup', schemaVersion: 'satu', data: {} }))).toMatch(/Versi skema/);
    expect(reject(JSON.stringify({ app: 'date-planner', kind: 'backup', schemaVersion: 9, data: {} }))).toMatch(/lebih baru/);
    expect(reject(JSON.stringify({ app: 'date-planner', kind: 'backup', schemaVersion: 1 }))).toMatch(/bagian data/);
    expect(reject(JSON.stringify({ app: 'date-planner', kind: 'backup', schemaVersion: 1, data: { plans: 'x' } }))).toMatch(/rusak/);
    expect(reject(JSON.stringify({ app: 'date-planner', kind: 'backup', schemaVersion: 1, data: { plans: [] } }))).toMatch(/tidak berisi data/);
    expect(reject('x'.repeat(5 * 1024 * 1024 + 1))).toMatch(/terlalu besar/);
  });

  it('skips invalid records with warnings', () => {
    const json = JSON.parse(text(data()));
    json.data.plans.push({ id: 'rusak' });
    json.data.venues.push({ name: 'tanpa id' });
    const r = parseBackup(JSON.stringify(json));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.backup.plans).toHaveLength(1);
      expect(r.warnings).toEqual(['1 rencana tidak valid dan akan dilewati.', '1 venue tidak valid dan akan dilewati.']);
    }
  });
});

describe('planImport', () => {
  const parsed = (d: AppData) => {
    const r = parseBackup(text(d));
    if (!r.ok) throw new Error(r.error);
    return r.backup;
  };
  const changedP1 = { ...p1, name: 'Versi cadangan' };

  it('merge adds new records and keeps local ones on conflict by default', () => {
    const local = data({ plans: [p1], venues: [] });
    const r = planImport(local, parsed(data({ plans: [changedP1, p2], venues: [POOL[1]] })), { mode: 'merge', conflict: 'keep-local', includeSettings: false });
    expect(r.next.plans.map((p) => [p.id, p.name])).toEqual([['p1', undefined], ['p2', undefined]]);
    expect(r.plans).toEqual({ added: 1, replaced: 0, keptLocal: 1, identical: 0, removed: 0 });
    expect(r.venues.added).toBe(1);
    expect(r.destructive).toBe(false);
  });

  it('merge can prefer the backup on conflict, which is destructive', () => {
    const r = planImport(data(), parsed(data({ plans: [changedP1] })), { mode: 'merge', conflict: 'use-backup', includeSettings: false });
    expect(r.next.plans[0].name).toBe('Versi cadangan');
    expect(r.plans.replaced).toBe(1);
    expect(r.destructive).toBe(true);
  });

  it('identical records are neither added nor counted as conflicts', () => {
    const r = planImport(data(), parsed(data()), { mode: 'merge', conflict: 'use-backup', includeSettings: true });
    expect(r.plans).toEqual({ added: 0, replaced: 0, keptLocal: 0, identical: 1, removed: 0 });
    expect(r.destructive).toBe(false);
  });

  it('replace swaps everything and reports what would be removed', () => {
    const local = data({ plans: [p1, p2] });
    const r = planImport(local, parsed(data({ plans: [changedP1], venues: [], settings: { ...DEFAULT_SETTINGS, defaultCity: 'Bandung' } })), {
      mode: 'replace',
      conflict: 'keep-local',
      includeSettings: false,
    });
    expect(r.next.plans).toHaveLength(1);
    expect(r.plans).toEqual({ added: 0, replaced: 1, keptLocal: 0, identical: 0, removed: 1 });
    expect(r.venues.removed).toBe(1);
    expect(r.next.settings.defaultCity).toBe('Bandung');
    expect(r.settingsChanged).toBe(true);
    expect(r.destructive).toBe(true);
  });

  it('replacing default settings is not destructive, replacing customised ones is', () => {
    const b = parsed(data({ plans: [], venues: [POOL[0]], settings: { ...DEFAULT_SETTINGS, defaultCity: 'Bandung' } }));
    const empty = data({ plans: [], venues: [] });
    const opts = { mode: 'merge' as const, conflict: 'keep-local' as const, includeSettings: true };
    expect(planImport(empty, b, opts).destructive).toBe(false);
    expect(planImport({ ...empty, settings: { ...DEFAULT_SETTINGS, defaultCity: 'Medan' } }, b, opts).destructive).toBe(true);
  });

  it('merge only takes settings when asked', () => {
    const b = parsed(data({ settings: { ...DEFAULT_SETTINGS, defaultCity: 'Bandung' } }));
    expect(planImport(data(), b, { mode: 'merge', conflict: 'keep-local', includeSettings: false }).next.settings.defaultCity).toBe('Jakarta');
    expect(planImport(data(), b, { mode: 'merge', conflict: 'keep-local', includeSettings: true }).next.settings.defaultCity).toBe('Bandung');
  });
});
