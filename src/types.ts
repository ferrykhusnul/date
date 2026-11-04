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
export type Environment = 'indoor' | 'outdoor' | 'mixed';
export type VenueStatus = 'active' | 'inactive';

/**
 * A curated venue record.
 *
 * `category`, `vibes` and `activities` hold the string keys defined in
 * `lib/options.ts` (CATEGORY_OPTIONS, VIBE_OPTIONS, ACTIVITY_OPTIONS).
 * Prices are ESTIMATES per person in IDR and must always be shown as such.
 */
export interface Venue {
  id: string;
  name: string;
  category: string;
  address: string;
  city: string;
  district?: string;
  priceMin: number;
  priceMax: number;
  visitDurationMinutes: number;
  vibes: string[];
  activities: string[];
  environment: Environment;
  latitude?: number;
  longitude?: number;
  /** Link to the venue's own Google Maps listing. Empty for sample records. */
  googleMapsUrl: string;
  description: string;
  /** ISO date (YYYY-MM-DD) when the details were last checked by a person. */
  verifiedAt?: string;
  status: VenueStatus;
  /** Optional free-text public transport access note, e.g. nearest station. */
  transitAccess?: string;
  /** True for placeholder records that do not describe a real place. */
  isSample?: boolean;
}

/** Where a venue record comes from. */
export type VenueSource = 'curated' | 'local' | 'sample';

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
  /** Snapshot so a plan stays readable if the venue is later edited or removed. */
  venueName: string;
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
  /** True when the plan was assembled from sample (non-real) venues. */
  usesSampleVenues: boolean;
}

export interface Settings {
  defaultCity: string;
  defaultBudget: number;
  defaultTransportation: Transportation;
  /** Fall back to sample venues when no real venue exists for a city. */
  useSampleVenues: boolean;
}
