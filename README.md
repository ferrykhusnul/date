# Date Planner

Mobile-first date planning app (React + TypeScript + Vite).

## Status: Phase 2 — venue dataset & Google Maps links

### Venues

- **Model:** `Venue` in `src/types.ts` (category, city/district, estimated
  price range, visit duration, vibes, activities, environment, optional
  coordinates, Google Maps listing URL, optional transit access,
  `verifiedAt`, `active`/`inactive` status).
- **Curated dataset:** `src/data/venues.ts`. It is **empty on purpose**: no
  verified venue data was available, and venue details are never invented.
- **Local venues:** added or edited in the app (`/venue/baru`,
  `/venue/:id/ubah`) and stored in this browser's `localStorage`. An edit to a
  curated venue is kept as a local override that can be reverted. Settings →
  "Ekspor JSON" downloads the records so reviewed venues can be copied into
  `src/data/venues.ts`.
- **Sample venues:** `src/data/sampleVenues.ts`, marked `isSample: true`,
  read-only, city "Kota Sampel". The planner uses them only when a city has
  no active real venue and the Settings toggle allows it; such plans are
  labeled "Venue sampel".
- **Filtering:** `src/lib/venueFilters.ts` (city, category, activity, vibe,
  environment, max starting price, status, text search).
- All prices are shown as estimates ("Perkiraan … /orang").

### Google Maps

`src/lib/maps.ts` builds links with the public Maps URLs scheme only. It uses
no API key, no Maps JavaScript API, no scraping, and no ratings or reviews:

- Search: `https://www.google.com/maps/search/?api=1&query=<name, address, district, city>`
- Directions: `https://www.google.com/maps/dir/?api=1&destination=<same>`
- Listing & reviews: the venue's own `googleMapsUrl`, accepted only if it is
  an https Google Maps link.

External links open in a new tab with `rel="noopener noreferrer"`.

### Other state

Plans, drafts and settings are still in memory only (reset on reload).

| Route | Screen |
| --- | --- |
| `/` | Beranda (Home) |
| `/buat` | Buat Kencan (Create Date) |
| `/hasil` | Hasil rencana (draft result) |
| `/rencana/:id` | Saved plan result |
| `/venue` | Venue list & filters |
| `/venue/baru` | Add venue |
| `/venue/:id` | Venue detail |
| `/venue/:id/ubah` | Edit venue |
| `/tersimpan` | Rencana tersimpan (Saved Dates) |
| `/pengaturan` | Pengaturan (Settings) |

## Scripts

```bash
npm install
npm run dev        # development server
npm run typecheck  # tsc --noEmit
npm test           # unit tests (Maps URLs, filters, validation, planner)
npm run build      # typecheck + production build
```
