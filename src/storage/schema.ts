/**
 * Validation for everything read from storage or a backup file. Untrusted
 * input is rebuilt field by field; anything that cannot be trusted is
 * dropped and counted, never guessed.
 */

import type {
  Activity,
  Alternative,
  DateInput,
  DatePlan,
  Environment,
  IssueSeverity,
  ItineraryItem,
  LegMode,
  PlanIssue,
  Preferences,
  ScoreBreakdown,
  Settings,
  Transportation,
  Venue,
  Vibe,
} from '../types';
import { ACTIVITY_OPTIONS, ENVIRONMENT_OPTIONS, LEG_MODE_OPTIONS, TRANSPORT_OPTIONS, VIBE_OPTIONS } from '../lib/options';
import { parseStoredVenue } from '../lib/venueValidation';
import { DEFAULT_PREFERENCES, DEFAULT_SETTINGS } from './defaults';

type Rec = Record<string, unknown>;

const isRec = (x: unknown): x is Rec => Boolean(x) && typeof x === 'object' && !Array.isArray(x);
const isStr = (x: unknown): x is string => typeof x === 'string';
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isBool = (x: unknown): x is boolean => typeof x === 'boolean';
const strArr = (x: unknown): string[] => (Array.isArray(x) ? x.filter(isStr) : []);
const optStr = (x: unknown, max = 500): string | undefined => (isStr(x) && x.trim() ? x.slice(0, max) : undefined);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const isIsoDateTime = (x: unknown): x is string => isStr(x) && !Number.isNaN(Date.parse(x));

const VIBES = VIBE_OPTIONS.map((o) => o.value);
const ACTIVITIES = ACTIVITY_OPTIONS.map((o) => o.value);
const ENVIRONMENTS = ENVIRONMENT_OPTIONS.map((o) => o.value);
const TRANSPORTS = TRANSPORT_OPTIONS.map((o) => o.value);
const LEG_MODES = LEG_MODE_OPTIONS.map((o) => o.value);
const SEVERITIES: IssueSeverity[] = ['error', 'warning', 'info'];

/** Earlier versions offered online taxi; it maps to car. */
function parseTransportation(x: unknown): Transportation | null {
  if (x === 'taksi-online') return 'mobil';
  return TRANSPORTS.includes(x as Transportation) ? (x as Transportation) : null;
}

export interface Collection<T> {
  items: T[];
  /** Records that failed validation and were left out. */
  dropped: number;
}

/* ------------------------------------------------------------- plans */

function parseInput(x: unknown): DateInput | null {
  if (!isRec(x)) return null;
  const transportation = parseTransportation(x.transportation);
  if (
    !isStr(x.city) ||
    !isStr(x.date) ||
    !DATE_RE.test(x.date) ||
    !isStr(x.startTime) ||
    !TIME_RE.test(x.startTime) ||
    !isNum(x.durationHours) ||
    x.durationHours <= 0 ||
    x.durationHours > 24 ||
    !isNum(x.budget) ||
    x.budget < 0 ||
    !VIBES.includes(x.vibe as Vibe) ||
    !ENVIRONMENTS.includes(x.environment as Environment) ||
    !transportation
  )
    return null;
  return {
    city: x.city.slice(0, 80),
    date: x.date,
    startTime: x.startTime,
    durationHours: x.durationHours,
    budget: Math.round(x.budget),
    vibe: x.vibe as Vibe,
    activities: strArr(x.activities).filter((a): a is Activity => ACTIVITIES.includes(a as Activity)),
    transportation,
    environment: x.environment as Environment,
    notes: isStr(x.notes) ? x.notes.slice(0, 500) : '',
    startLocation: optStr(x.startLocation, 160),
    endLocation: optStr(x.endLocation, 160),
  };
}

function parseScore(x: unknown): ScoreBreakdown | undefined {
  if (!isRec(x)) return undefined;
  const keys = ['vibe', 'activity', 'budget', 'environment', 'duration', 'total'] as const;
  if (!keys.every((k) => isNum(x[k]))) return undefined;
  const total = x.total as number;
  return {
    vibe: x.vibe as number,
    activity: x.activity as number,
    budget: x.budget as number,
    environment: x.environment as number,
    duration: x.duration as number,
    total,
    transport: isNum(x.transport) ? x.transport : undefined,
    rank: isNum(x.rank) ? x.rank : total,
  };
}

function parseAlternatives(x: unknown): Alternative[] {
  if (!Array.isArray(x)) return [];
  return x
    .filter(isRec)
    .filter((a) => isStr(a.venueId) && isStr(a.venueName) && isNum(a.score))
    .slice(0, 5)
    .map((a) => ({ venueId: a.venueId as string, venueName: a.venueName as string, score: a.score as number, reason: isStr(a.reason) ? a.reason : '' }));
}

function parseItem(x: unknown): ItineraryItem | null {
  if (!isRec(x)) return null;
  const kind = x.kind === 'venue' || x.kind === 'custom' ? x.kind : null;
  const money = [x.costMin, x.costMax, x.costEstimate];
  if (
    !kind ||
    !isStr(x.id) ||
    !x.id ||
    !isStr(x.title) ||
    (kind === 'venue' && !isStr(x.venueId)) ||
    !isNum(x.durationMinutes) ||
    x.durationMinutes < 1 ||
    x.durationMinutes > 24 * 60 ||
    !money.every((m) => isNum(m) && m >= 0) ||
    !isBool(x.priceKnown)
  )
    return null;
  const activity = x.activity === null || x.activity === undefined ? null : ACTIVITIES.includes(x.activity as Activity) ? (x.activity as Activity) : null;
  return {
    id: x.id,
    kind,
    venueId: kind === 'venue' ? (x.venueId as string) : undefined,
    title: x.title.slice(0, 120),
    activity,
    startTime: isStr(x.startTime) && TIME_RE.test(x.startTime) ? x.startTime : '00:00',
    endTime: isStr(x.endTime) && TIME_RE.test(x.endTime) ? x.endTime : '00:00',
    durationMinutes: Math.round(x.durationMinutes),
    costMin: x.costMin as number,
    costMax: x.costMax as number,
    costEstimate: x.costEstimate as number,
    priceKnown: x.priceKnown,
    costEdited: x.costEdited === true,
    notes: strArr(x.notes),
    reasons: strArr(x.reasons),
    score: parseScore(x.score),
    alternatives: parseAlternatives(x.alternatives),
    userNote: optStr(x.userNote, 140),
  };
}

function parseIssues(x: unknown): PlanIssue[] {
  if (!Array.isArray(x)) return [];
  return x
    .filter(isRec)
    .filter((i) => isStr(i.code) && isStr(i.message) && SEVERITIES.includes(i.severity as IssueSeverity))
    .map((i) => ({ code: i.code as PlanIssue['code'], severity: i.severity as IssueSeverity, message: i.message as string }));
}

function parseLegModes(x: unknown): Record<string, LegMode> {
  if (!isRec(x)) return {};
  return Object.fromEntries(Object.entries(x).filter(([k, v]) => k.includes('>') && LEG_MODES.includes(v as LegMode))) as Record<string, LegMode>;
}

/**
 * Validates a stored plan. Derived fields (timeline, legs, notes, title,
 * concept) are rebuilt by `recalculate` after loading, so only the source
 * data has to be trustworthy here.
 */
export function parseDatePlan(x: unknown): DatePlan | null {
  if (!isRec(x) || !isStr(x.id) || !x.id || !isIsoDateTime(x.createdAt)) return null;
  const input = parseInput(x.input);
  if (!input || !Array.isArray(x.items)) return null;
  const items = x.items.map(parseItem);
  if (items.some((i) => i === null)) return null; // a plan with a broken item is not partially restored
  const ids = new Set(items.map((i) => i!.id));
  if (ids.size !== items.length) return null;
  return {
    id: x.id.slice(0, 80),
    name: optStr(x.name, 80),
    title: isStr(x.title) ? x.title : '',
    concept: isStr(x.concept) ? x.concept : '',
    input,
    items: items as ItineraryItem[],
    transport: { mode: input.transportation, legs: [], legModes: parseLegModes(isRec(x.transport) ? x.transport.legModes : undefined) },
    generationIssues: parseIssues(x.generationIssues),
    createdAt: x.createdAt,
    savedAt: isIsoDateTime(x.savedAt) ? x.savedAt : undefined,
    editedAt: isIsoDateTime(x.editedAt) ? x.editedAt : undefined,
    usesSampleVenues: x.usesSampleVenues === true,
  };
}

export function parsePlans(x: unknown): Collection<DatePlan> {
  if (!Array.isArray(x)) return { items: [], dropped: x === undefined ? 0 : 1 };
  const seen = new Set<string>();
  const items: DatePlan[] = [];
  let dropped = 0;
  for (const raw of x) {
    const p = parseDatePlan(raw);
    if (!p || seen.has(p.id)) dropped++;
    else {
      seen.add(p.id);
      items.push(p);
    }
  }
  return { items, dropped };
}

/* ---------------------------------------------------- venues/settings */

export function parseVenues(x: unknown): Collection<Venue> {
  if (!Array.isArray(x)) return { items: [], dropped: x === undefined ? 0 : 1 };
  const seen = new Set<string>();
  const items: Venue[] = [];
  let dropped = 0;
  for (const raw of x) {
    const v = parseStoredVenue(raw);
    if (!v || v.isSample || seen.has(v.id)) dropped++;
    else {
      seen.add(v.id);
      items.push(v);
    }
  }
  return { items, dropped };
}

/** Field-by-field: invalid fields fall back to defaults and are reported. */
export function parseSettings(x: unknown): { value: Settings; fixedFields: string[] } {
  const fixed: string[] = [];
  const r = isRec(x) ? x : {};
  if (!isRec(x)) fixed.push('semua');
  const pick = <K extends keyof Settings>(k: K, ok: boolean, v: Settings[K]): Settings[K] => {
    if (ok) return v;
    if (isRec(x) && k in x) fixed.push(k);
    return DEFAULT_SETTINGS[k];
  };
  const transport = parseTransportation(r.defaultTransportation);
  return {
    value: {
      defaultCity: pick('defaultCity', isStr(r.defaultCity) && r.defaultCity.trim().length > 0, (r.defaultCity as string)?.slice(0, 80)),
      defaultBudget: pick('defaultBudget', isNum(r.defaultBudget) && r.defaultBudget >= 0, Math.round(r.defaultBudget as number)),
      defaultTransportation: pick('defaultTransportation', transport !== null, transport!),
      useSampleVenues: pick('useSampleVenues', isBool(r.useSampleVenues), r.useSampleVenues as boolean),
    },
    fixedFields: isRec(x) ? fixed : [],
  };
}

export function parsePreferences(x: unknown): { value: Preferences; fixedFields: string[] } {
  const fixed: string[] = [];
  const r = isRec(x) ? x : {};
  const pick = <K extends keyof Preferences>(k: K, ok: boolean, v: Preferences[K]): Preferences[K] => {
    if (ok) return v;
    if (isRec(x) && k in x) fixed.push(k);
    return DEFAULT_PREFERENCES[k];
  };
  const acts = strArr(r.activities).filter((a): a is Activity => ACTIVITIES.includes(a as Activity));
  return {
    value: {
      vibe: pick('vibe', VIBES.includes(r.vibe as Vibe), r.vibe as Vibe),
      activities: pick('activities', acts.length > 0, acts),
      environment: pick('environment', ENVIRONMENTS.includes(r.environment as Environment), r.environment as Environment),
      durationHours: pick('durationHours', isNum(r.durationHours) && r.durationHours >= 1 && r.durationHours <= 12, r.durationHours as number),
      startTime: pick('startTime', isStr(r.startTime) && TIME_RE.test(r.startTime), r.startTime as string),
    },
    fixedFields: fixed,
  };
}
