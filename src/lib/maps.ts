import type { TransitAccess, Venue } from '../types';

/**
 * Google Maps URL helpers. Uses the public "Maps URLs" scheme only
 * (https://developers.google.com/maps/documentation/urls/get-started):
 * no API key, no Maps JavaScript API, no scraping, no ratings or reviews.
 */

const SEARCH_BASE = 'https://www.google.com/maps/search/?api=1&query=';
const DIRECTIONS_BASE = 'https://www.google.com/maps/dir/?api=1&destination=';

type Locatable = Pick<Venue, 'name' | 'address' | 'city' | 'district'>;

/** "Name, Address, District, City" with duplicates and blanks removed. */
export function mapsQuery(venue: Locatable): string {
  const parts = [venue.name, venue.address, venue.district, venue.city]
    .map((p) => (p ?? '').trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const unique = parts.filter((p) => {
    const key = p.toLowerCase();
    // Skip a part already contained in the address (e.g. city written in it).
    if (seen.has(key) || (p !== venue.address && venue.address.toLowerCase().includes(key))) {
      return false;
    }
    seen.add(key);
    return true;
  });
  return unique.join(', ');
}

export function buildSearchUrl(venue: Locatable): string {
  return SEARCH_BASE + encodeURIComponent(mapsQuery(venue));
}

export function buildDirectionsUrl(venue: Locatable): string {
  return DIRECTIONS_BASE + encodeURIComponent(mapsQuery(venue));
}

const GOOGLE_HOSTS = /^(www\.|maps\.)?google\.(com|co\.id)$/;

/**
 * Accepts https links to a Google Maps listing: google.com/maps/…,
 * google.co.id/maps/…, maps.google.com/…, maps.app.goo.gl/… or goo.gl/maps/….
 */
export function isGoogleMapsUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  if (host === 'maps.app.goo.gl') return url.pathname.length > 1;
  if (host === 'goo.gl') return url.pathname.startsWith('/maps');
  if (host.startsWith('maps.') && GOOGLE_HOSTS.test(host)) return true;
  if (GOOGLE_HOSTS.test(host)) return url.pathname === '/maps' || url.pathname.startsWith('/maps/');
  return false;
}

/**
 * The venue's own Google Maps listing (where people read reviews on Google),
 * or null when the record has no valid listing URL (e.g. sample records).
 */
export function listingUrl(venue: Pick<Venue, 'googleMapsUrl'>): string | null {
  return isGoogleMapsUrl(venue.googleMapsUrl) ? venue.googleMapsUrl.trim() : null;
}

/* ------------------------------------------------------------ routes */

export type TravelMode = 'transit' | 'driving' | 'walking' | 'two-wheeler';

/**
 * Google Maps directions link between two free-text places. Built with
 * URLSearchParams; Google Maps does all routing, timing and fares.
 */
export function buildRouteUrl(origin: string, destination: string, travelmode: TravelMode = 'transit'): string {
  const params = new URLSearchParams({ api: '1', origin, destination, travelmode });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

const STATION_PREFIX: Record<TransitAccess['transitType'], string> = {
  transjakarta: 'Halte TransJakarta',
  mrt: 'Stasiun MRT',
  lrt: 'Stasiun LRT',
  krl: 'Stasiun KRL',
};

/** Search text for a station, e.g. "Stasiun MRT Dukuh Atas, Jakarta". */
export function stationQuery(access: Pick<TransitAccess, 'stationName' | 'transitType'>, city: string): string {
  const name = access.stationName.trim();
  const prefixed = /^(stasiun|halte|station|stop)\b/i.test(name) ? name : `${STATION_PREFIX[access.transitType]} ${name}`;
  return [prefixed, city.trim()].filter(Boolean).join(', ');
}
