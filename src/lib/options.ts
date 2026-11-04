import type { Activity, Environment, Transportation, VenueStatus, Vibe } from '../types';

export interface Option<T extends string | number> {
  value: T;
  label: string;
  hint?: string;
}

/** City suggestions for the input's autocomplete. Users may type any city. */
export const CITY_SUGGESTIONS = [
  'Jakarta',
  'Bandung',
  'Yogyakarta',
  'Surabaya',
  'Semarang',
  'Malang',
  'Denpasar',
  'Medan',
  'Makassar',
];

export const DURATION_OPTIONS: Option<number>[] = [
  { value: 2, label: '2 jam' },
  { value: 3, label: '3 jam' },
  { value: 4, label: '4 jam' },
  { value: 5, label: '5 jam' },
  { value: 6, label: '6 jam' },
];

export const BUDGET_PRESETS = [250_000, 500_000, 1_000_000, 2_000_000];

export const VIBE_OPTIONS: Option<Vibe>[] = [
  { value: 'romantis', label: 'Romantis', hint: 'Hangat & intim' },
  { value: 'santai', label: 'Santai', hint: 'Tanpa terburu-buru' },
  { value: 'petualang', label: 'Petualang', hint: 'Coba hal baru' },
  { value: 'kreatif', label: 'Kreatif', hint: 'Seni & budaya' },
  { value: 'elegan', label: 'Elegan', hint: 'Istimewa & rapi' },
];

export const ACTIVITY_OPTIONS: Option<Activity>[] = [
  { value: 'makan', label: 'Makan' },
  { value: 'kopi', label: 'Ngopi' },
  { value: 'jalan', label: 'Jalan-jalan' },
  { value: 'galeri', label: 'Museum & Galeri' },
  { value: 'nonton', label: 'Nonton' },
  { value: 'belanja', label: 'Belanja' },
  { value: 'alam', label: 'Alam Terbuka' },
  { value: 'hiburan', label: 'Hiburan' },
];

export const TRANSPORT_OPTIONS: Option<Transportation>[] = [
  { value: 'jalan-kaki', label: 'Jalan kaki' },
  { value: 'motor', label: 'Motor' },
  { value: 'mobil', label: 'Mobil pribadi' },
  { value: 'umum', label: 'Transportasi umum' },
  { value: 'taksi-online', label: 'Taksi online' },
];

export const ENVIRONMENT_OPTIONS: Option<Environment>[] = [
  { value: 'indoor', label: 'Dalam ruangan' },
  { value: 'outdoor', label: 'Luar ruangan' },
  { value: 'mixed', label: 'Campuran' },
];

export const CATEGORY_OPTIONS: Option<string>[] = [
  { value: 'restoran', label: 'Restoran' },
  { value: 'kafe', label: 'Kafe' },
  { value: 'bar', label: 'Bar & Lounge' },
  { value: 'taman', label: 'Taman Kota' },
  { value: 'museum', label: 'Museum' },
  { value: 'galeri', label: 'Galeri Seni' },
  { value: 'bioskop', label: 'Bioskop' },
  { value: 'pusat-belanja', label: 'Pusat Belanja' },
  { value: 'pasar', label: 'Pasar & Bazar' },
  { value: 'wisata-alam', label: 'Wisata Alam' },
  { value: 'hiburan', label: 'Hiburan' },
  { value: 'toko-buku', label: 'Toko Buku' },
  { value: 'lainnya', label: 'Lainnya' },
];

export const STATUS_OPTIONS: Option<VenueStatus>[] = [
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Nonaktif' },
];

export function categoryLabel(value: string): string {
  return CATEGORY_OPTIONS.find((o) => o.value === value)?.label ?? value;
}


export function labelOf<T extends string | number>(options: Option<T>[], value: T): string {
  return options.find((o) => o.value === value)?.label ?? String(value);
}
