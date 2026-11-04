import type { Venue } from '../types';

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
