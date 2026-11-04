import type { Venue } from '../types';

/**
 * CURATED VENUE DATASET
 *
 * Only add venues whose details a person has checked against the venue's own
 * Google Maps listing or official channels. Set `verifiedAt` to the date of
 * that check. Prices are estimates per person in IDR.
 *
 * This list is intentionally EMPTY: no verified venue dataset (for Jakarta or
 * any other city) was available when Phase 2 was built, and venue details
 * must not be invented. Add venues through the in-app venue manager
 * ("Venue" → "Tambah venue"), then use "Ekspor JSON" in Settings to copy
 * reviewed records into this file.
 */
export const CURATED_VENUES: Venue[] = [];
