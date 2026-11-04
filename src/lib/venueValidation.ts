import type { TransitAccess, TransitType, Venue } from '../types';
import { ACTIVITY_OPTIONS, CATEGORY_OPTIONS, TRANSIT_TYPE_OPTIONS, VIBE_OPTIONS } from './options';
import { isGoogleMapsUrl } from './maps';

export type VenueErrors = Partial<Record<keyof Venue, string>> & {
  /** Per-row transit errors, keyed by row index. */
  transitRows?: Record<number, Partial<Record<keyof TransitAccess, string>>>;
};

export const MAX_TRANSIT_ROWS = 4;
export const MAX_STATION_DISTANCE = 5_000;
export const MAX_WALKING_MINUTES = 60;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TRANSIT_TYPES = TRANSIT_TYPE_OPTIONS.map((o) => o.value);

export function validateTransitAccess(a: TransitAccess, today?: string): Partial<Record<keyof TransitAccess, string>> {
  const e: Partial<Record<keyof TransitAccess, string>> = {};
  if (!a.stationName.trim()) e.stationName = 'Nama stasiun/halte wajib diisi.';
  if (!TRANSIT_TYPES.includes(a.transitType)) e.transitType = 'Pilih jenis transit.';
  if (a.distanceMeters !== undefined && (!Number.isInteger(a.distanceMeters) || a.distanceMeters < 0 || a.distanceMeters > MAX_STATION_DISTANCE))
    e.distanceMeters = `Jarak 0–${MAX_STATION_DISTANCE} meter.`;
  if (a.walkingMinutes !== undefined && (!Number.isInteger(a.walkingMinutes) || a.walkingMinutes < 0 || a.walkingMinutes > MAX_WALKING_MINUTES))
    e.walkingMinutes = `Waktu jalan 0–${MAX_WALKING_MINUTES} menit.`;
  if (a.verifiedAt && (!DATE_RE.test(a.verifiedAt) || (today !== undefined && a.verifiedAt > today)))
    e.verifiedAt = 'Tanggal verifikasi tidak valid.';
  return e;
}

const MAX_PRICE = 100_000_000;

export function validateVenue(v: Venue): VenueErrors {
  const e: VenueErrors = {};
  if (!v.name.trim()) e.name = 'Nama tempat wajib diisi.';
  if (!CATEGORY_OPTIONS.some((o) => o.value === v.category)) e.category = 'Pilih kategori.';
  if (!v.address.trim()) e.address = 'Alamat wajib diisi.';
  if (!v.city.trim()) e.city = 'Kota wajib diisi.';
  if (!v.priceUnknown) {
    if (v.priceMin < 0 || v.priceMin > MAX_PRICE) e.priceMin = 'Harga minimum tidak valid.';
    if (v.priceMax < v.priceMin) e.priceMax = 'Harga maksimum harus ≥ harga minimum.';
    else if (v.priceMax > MAX_PRICE) e.priceMax = 'Harga maksimum tidak valid.';
  }
  if (!Number.isInteger(v.visitDurationMinutes) || v.visitDurationMinutes < 15 || v.visitDurationMinutes > 720)
    e.visitDurationMinutes = 'Durasi kunjungan 15–720 menit.';
  if (v.activities.length === 0) e.activities = 'Pilih minimal satu aktivitas.';
  if (v.vibes.length === 0) e.vibes = 'Pilih minimal satu vibe.';

  const hasLat = v.latitude !== undefined;
  const hasLng = v.longitude !== undefined;
  if (hasLat !== hasLng) e.latitude = 'Isi lintang dan bujur bersamaan, atau kosongkan keduanya.';
  if (hasLat && (Number.isNaN(v.latitude) || v.latitude! < -90 || v.latitude! > 90))
    e.latitude = 'Lintang harus antara -90 dan 90.';
  if (hasLng && (Number.isNaN(v.longitude) || v.longitude! < -180 || v.longitude! > 180))
    e.longitude = 'Bujur harus antara -180 dan 180.';

  if (!v.isSample) {
    if (!v.googleMapsUrl.trim()) e.googleMapsUrl = 'Link Google Maps wajib diisi.';
    else if (!isGoogleMapsUrl(v.googleMapsUrl))
      e.googleMapsUrl = 'Pakai link Google Maps (google.com/maps/… atau maps.app.goo.gl/…).';
  }
  if (v.verifiedAt && !DATE_RE.test(v.verifiedAt)) e.verifiedAt = 'Format tanggal tidak valid.';
  const rows = v.transitAccess ?? [];
  if (rows.length > MAX_TRANSIT_ROWS) e.transitAccess = `Maksimal ${MAX_TRANSIT_ROWS} stasiun/halte.`;
  rows.forEach((row, i) => {
    const re = validateTransitAccess(row);
    if (Object.keys(re).length) (e.transitRows ??= {})[i] = re;
  });
  return e;
}

const isStr = (x: unknown): x is string => typeof x === 'string';
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const strArr = (x: unknown, allowed: string[]): string[] =>
  Array.isArray(x) ? x.filter((i): i is string => isStr(i) && allowed.includes(i)) : [];

/** Keeps only well-formed transit rows from untrusted data. */
export function parseTransitAccess(raw: unknown): TransitAccess[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const rows = raw
    .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === 'object')
    .map((r) => ({
      stationName: isStr(r.stationName) ? r.stationName.trim() : '',
      transitType: r.transitType as TransitType,
      distanceMeters: isNum(r.distanceMeters) ? Math.round(r.distanceMeters) : undefined,
      walkingMinutes: isNum(r.walkingMinutes) ? Math.round(r.walkingMinutes) : undefined,
      verifiedAt: isStr(r.verifiedAt) && r.verifiedAt ? r.verifiedAt : undefined,
    }))
    .filter((a) => Object.keys(validateTransitAccess(a)).length === 0)
    .slice(0, MAX_TRANSIT_ROWS);
  return rows.length ? rows : undefined;
}

/** Coerces untrusted stored data into a Venue, or null if it is unusable. */
export function parseStoredVenue(raw: unknown): Venue | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!isStr(r.id) || !isStr(r.name) || !isStr(r.address) || !isStr(r.city)) return null;
  const priceOk = isNum(r.priceMin) && isNum(r.priceMax) && r.priceMin >= 0 && r.priceMax >= r.priceMin;
  const venue: Venue = {
    id: r.id,
    name: r.name,
    category: isStr(r.category) ? r.category : 'lainnya',
    address: r.address,
    city: r.city,
    district: isStr(r.district) && r.district ? r.district : undefined,
    priceMin: priceOk ? (r.priceMin as number) : 0,
    priceMax: priceOk ? (r.priceMax as number) : 0,
    // Missing or invalid prices are flagged as unknown rather than read as free.
    priceUnknown: r.priceUnknown === true || !priceOk ? true : undefined,
    visitDurationMinutes: isNum(r.visitDurationMinutes) ? Math.round(r.visitDurationMinutes) : 0,
    vibes: strArr(r.vibes, VIBE_OPTIONS.map((o) => o.value)),
    activities: strArr(r.activities, ACTIVITY_OPTIONS.map((o) => o.value)),
    environment: r.environment === 'indoor' || r.environment === 'outdoor' ? r.environment : 'mixed',
    latitude: isNum(r.latitude) ? r.latitude : undefined,
    longitude: isNum(r.longitude) ? r.longitude : undefined,
    googleMapsUrl: isStr(r.googleMapsUrl) ? r.googleMapsUrl : '',
    description: isStr(r.description) ? r.description : '',
    verifiedAt: isStr(r.verifiedAt) && r.verifiedAt ? r.verifiedAt : undefined,
    status: r.status === 'inactive' ? 'inactive' : 'active',
    transitAccess: parseTransitAccess(r.transitAccess),
    // Phase 2 stored transit access as free text; keep it as a note.
    transitNote:
      isStr(r.transitNote) && r.transitNote
        ? r.transitNote
        : isStr(r.transitAccess) && r.transitAccess
          ? r.transitAccess
          : undefined,
  };
  return venue;
}
