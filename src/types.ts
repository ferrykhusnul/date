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
  /**
   * True when the price is not known. priceMin/priceMax are then ignored and
   * the venue's cost is never estimated or counted as a number.
   */
  priceUnknown?: boolean;
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

export type IssueSeverity = 'error' | 'warning' | 'info';

export type IssueCode =
  | 'NO_VENUES'
  | 'ENVIRONMENT_RELAXED'
  | 'INSUFFICIENT_VENUES'
  | 'ACTIVITY_UNAVAILABLE'
  | 'NO_COMPATIBLE_ACTIVITY'
  | 'BUDGET_TOO_LOW'
  | 'SLOT_SKIPPED_BUDGET'
  | 'DURATION_TOO_SHORT'
  | 'MISSING_PRICE'
  | 'INCOMPLETE_DATASET'
  | 'OVER_BUDGET'
  | 'MAY_EXCEED_BUDGET'
  | 'OVER_DURATION'
  | 'PAST_MIDNIGHT'
  | 'EMPTY_ITINERARY'
  | 'INACTIVE_VENUE'
  | 'MISSING_VENUE'
  | 'UNUSED_TIME'
  | 'SAMPLE_VENUES';

export interface PlanIssue {
  code: IssueCode;
  severity: IssueSeverity;
  message: string;
}

/** Weighted score breakdown; each component is 0–1, total is 0–100. */
export interface ScoreBreakdown {
  vibe: number;
  activity: number;
  budget: number;
  environment: number;
  duration: number;
  total: number;
}

export interface Alternative {
  venueId: string;
  venueName: string;
  score: number;
  reason: string;
}

export interface ItineraryItem {
  id: string;
  kind: 'venue' | 'custom';
  /** Set for kind 'venue'. */
  venueId?: string;
  /** Venue name snapshot, or the title of a free-form activity. */
  title: string;
  activity: Activity | null;
  /** Derived by the timeline; HH:mm. */
  startTime: string;
  endTime: string;
  durationMinutes: number;
  /** Estimated cost range for two people (IDR). 0/0 when price is unknown. */
  costMin: number;
  costMax: number;
  /** The single estimate used for totals (IDR, for two). */
  costEstimate: number;
  /** False when the venue has no price data: the item adds nothing to totals. */
  priceKnown: boolean;
  costEdited: boolean;
  /** Deterministic notes, regenerated whenever the plan changes. */
  notes: string[];
  /** Why this venue was selected (deterministic templates). */
  reasons: string[];
  score?: ScoreBreakdown;
  alternatives: Alternative[];
  /** Free text supplied by the user for a custom activity. */
  userNote?: string;
}

export interface TransportEstimate {
  mode: Transportation;
  legs: number;
  minutesPerLeg: number;
  /** Per-leg cost range for two people (IDR). */
  perLegMin: number;
  perLegMax: number;
}

export interface DatePlan {
  id: string;
  title: string;
  concept: string;
  input: DateInput;
  items: ItineraryItem[];
  transport: TransportEstimate;
  /** Issues found while generating (edit-time checks come from validatePlan). */
  generationIssues: PlanIssue[];
  createdAt: string; // ISO
  savedAt?: string; // ISO
  editedAt?: string; // ISO
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
