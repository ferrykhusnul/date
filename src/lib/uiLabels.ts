import type { IconName } from '../components/Icon';
import type { Activity, Environment, LegMode, Transportation, Vibe } from '../types';

/**
 * Casual, UI-only labels and icons. The engine keeps its own labels in
 * lib/options.ts (they appear in generated titles and stored plans), so only
 * presentation changes here.
 */

export interface UiChoice<T> {
  value: T;
  label: string;
  hint?: string;
  icon: IconName;
}

export const MOODS: UiChoice<Vibe>[] = [
  { value: 'santai', label: 'Chill', hint: 'Santai, nggak buru-buru', icon: 'moon' },
  { value: 'romantis', label: 'Romantic', hint: 'Manis & intim', icon: 'heart' },
  { value: 'kreatif', label: 'Fun', hint: 'Seru & kreatif', icon: 'sparkle' },
  { value: 'petualang', label: 'Adventure', hint: 'Coba hal baru', icon: 'compass' },
  { value: 'elegan', label: 'Aesthetic', hint: 'Cantik & classy', icon: 'flower' },
];

export const ACTIVITIES_UI: UiChoice<Activity>[] = [
  { value: 'kopi', label: 'Coffee', icon: 'coffee' },
  { value: 'makan', label: 'Kuliner', icon: 'utensils' },
  { value: 'alam', label: 'Nature', icon: 'leaf' },
  { value: 'hiburan', label: 'Games', icon: 'gamepad' },
  { value: 'jalan', label: 'Jalan-jalan', icon: 'walk' },
  { value: 'nonton', label: 'Movies', icon: 'film' },
  { value: 'galeri', label: 'Seni & kreatif', icon: 'palette' },
  { value: 'belanja', label: 'Belanja', icon: 'bag' },
];

export const ENVIRONMENTS_UI: UiChoice<Environment>[] = [
  { value: 'mixed', label: 'Bebas', icon: 'sparkle' },
  { value: 'indoor', label: 'Indoor', icon: 'building' },
  { value: 'outdoor', label: 'Outdoor', icon: 'sun' },
];

/** Main transport choices; "Transum" expands into the Jakarta transit modes. */
export type TransportGroup = 'transum' | 'motor' | 'mobil' | 'campuran' | 'jalan-kaki';

export const TRANSPORT_GROUPS: UiChoice<TransportGroup>[] = [
  { value: 'transum', label: 'Transum', hint: 'TJ, MRT, LRT, KRL', icon: 'train' },
  { value: 'motor', label: 'Motor', icon: 'motorbike' },
  { value: 'mobil', label: 'Mobil', icon: 'car' },
  { value: 'campuran', label: 'Mix', hint: 'Ganti-ganti', icon: 'shuffle' },
  { value: 'jalan-kaki', label: 'Jalan kaki', icon: 'walk' },
];

export const TRANSIT_MODES: { value: Transportation; label: string }[] = [
  { value: 'umum', label: 'Apa aja' },
  { value: 'transjakarta', label: 'TransJakarta' },
  { value: 'mrt', label: 'MRT' },
  { value: 'lrt', label: 'LRT' },
  { value: 'krl', label: 'KRL' },
];

const TRANSIT_VALUES = new Set<Transportation>(['umum', 'transjakarta', 'mrt', 'lrt', 'krl']);

export function transportGroupOf(t: Transportation): TransportGroup {
  return TRANSIT_VALUES.has(t) ? 'transum' : (t as TransportGroup);
}

export function transportLabel(t: Transportation | LegMode): string {
  if (t === 'umum') return 'Transum';
  const transit = TRANSIT_MODES.find((m) => m.value === t);
  if (transit) return transit.label;
  return TRANSPORT_GROUPS.find((g) => g.value === t)?.label ?? t;
}

export function transportIcon(t: Transportation | LegMode): IconName {
  if (t === 'transjakarta') return 'bus';
  return TRANSPORT_GROUPS.find((g) => g.value === transportGroupOf(t as Transportation))?.icon ?? 'navigation';
}

export const moodOf = (v: Vibe) => MOODS.find((m) => m.value === v) ?? MOODS[0];
export const activityUi = (a: Activity) => ACTIVITIES_UI.find((x) => x.value === a) ?? ACTIVITIES_UI[0];

export const BUDGET_PRESETS_UI = [
  { value: 100_000, label: 'Rp100k' },
  { value: 300_000, label: 'Rp300k' },
  { value: 500_000, label: 'Rp500k' },
  { value: 1_000_000, label: 'Rp1 juta' },
];

export const TIME_PRESETS: UiChoice<string>[] = [
  { value: '10:00', label: 'Pagi', hint: '10.00', icon: 'sun' },
  { value: '13:00', label: 'Siang', hint: '13.00', icon: 'sun' },
  { value: '16:00', label: 'Sore', hint: '16.00', icon: 'sunset' },
  { value: '19:00', label: 'Malam', hint: '19.00', icon: 'moon' },
];

/** Short rupiah for chips: 90.000 → "90rb", 1.250.000 → "1,25jt". */
export function shortIDR(n: number): string {
  if (n >= 1_000_000) return `Rp${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 2 })}jt`;
  if (n >= 1_000) return `Rp${Math.round(n / 1000)}rb`;
  return `Rp${n}`;
}

/** The casual labels as plain {value, label} options (same stored values as the engine). */
export const UI_MOOD_OPTIONS = MOODS.map(({ value, label }) => ({ value, label }));
export const UI_ACTIVITY_OPTIONS = ACTIVITIES_UI.map(({ value, label }) => ({ value, label }));
export const UI_ENVIRONMENT_OPTIONS = [
  { value: 'indoor' as Environment, label: 'Indoor' },
  { value: 'outdoor' as Environment, label: 'Outdoor' },
  { value: 'mixed' as Environment, label: 'Indoor & outdoor' },
];
export const activityLabel = (a: string) => ACTIVITIES_UI.find((x) => x.value === a)?.label ?? a;
export const moodLabel = (v: string) => MOODS.find((x) => x.value === v)?.label ?? v;
export const environmentLabel = (e: string) => UI_ENVIRONMENT_OPTIONS.find((x) => x.value === e)?.label ?? e;
