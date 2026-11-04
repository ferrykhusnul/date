export type Vibe = 'romantis' | 'santai' | 'petualang' | 'kreatif' | 'elegan';
export type Activity =
  | 'makan'
  | 'kopi'
  | 'jalan'
  | 'galeri'
  | 'nonton'
  | 'belanja'
  | 'alam'
  | 'hiburan';
export type Transportation = 'jalan-kaki' | 'motor' | 'mobil' | 'umum' | 'taksi-online';
export type Environment = 'indoor' | 'outdoor' | 'campuran';

export type VenueCategory =
  | 'restoran'
  | 'kafe'
  | 'taman'
  | 'galeri'
  | 'bioskop'
  | 'pusat-belanja'
  | 'alam'
  | 'hiburan';

/** A venue record. In Phase 1 every venue is placeholder sample data. */
export interface Venue {
  id: string;
  name: string;
  address: string;
  category: VenueCategory;
  description: string;
  /** Estimated price range per person, in IDR. */
  priceMin: number;
  priceMax: number;
  environment: Exclude<Environment, 'campuran'>;
  isSample: true;
}

export interface DateInput {
  city: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationHours: number;
  budget: number; // IDR, for two people
  vibe: Vibe;
  activities: Activity[];
  transportation: Transportation;
  environment: Environment;
  notes: string;
}

export interface PlanStop {
  id: string;
  venueId: string;
  activity: Activity;
  startTime: string; // HH:mm
  durationMinutes: number;
  /** Estimated cost for two people, in IDR. */
  estimatedCost: number;
}

export interface DatePlan {
  id: string;
  title: string;
  concept: string;
  input: DateInput;
  stops: PlanStop[];
  /** Estimated transport cost for the whole date, in IDR. */
  transportCost: number;
  createdAt: string; // ISO
  savedAt?: string; // ISO
  isSample: true;
}

export interface Settings {
  defaultCity: string;
  defaultBudget: number;
  defaultTransportation: Transportation;
}
