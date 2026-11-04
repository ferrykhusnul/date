# Date Planner

Mobile-first date planning app (React + TypeScript + Vite).

## Status: Phase 6 — PWA & offline

Date Planner is an installable Progressive Web App (Android/Chrome
"Instal aplikasi"), built with `vite-plugin-pwa` (Workbox `generateSW`).

- **Manifest** (`vite.config.ts`): name/short name "Date Planner",
  `display: standalone`, theme and background `#f6f1ea`, `lang: id`,
  192/512 icons plus a 512 maskable icon. Icons are rendered from SVG by
  `scripts/generate-icons.mjs` (Playwright) and committed in `public/`.
- **Service worker:** precaches the app shell only (HTML, JS, CSS, icons,
  manifest — 11 files) and serves `index.html` for client-side routes, so
  deep links such as `/rencana/:id` open offline. There are **no runtime
  caching rules**: Google Maps and any third-party content (e.g. venue
  images) are never cached.
- **Offline:** plans, venues, settings and backups live in localStorage,
  and the generator and budget run entirely in the browser, so they keep
  working offline. An offline banner appears and Google Maps links are
  marked as needing internet.
- **Updates:** registered with `registerType: 'prompt'`; a new version is
  applied only when the user taps "Muat ulang". A "ready offline" notice
  shows on first install.
- **Install button:** Settings → "Aplikasi & offline" uses the browser's
  install prompt when offered, otherwise shows manual instructions.

The service worker is only active in production builds
(`npm run build && npm run preview`), not in `npm run dev`.

## Phase 5 — local storage, saved plans & backup

The app works fully offline-first with no backend, account or external
transmission. All data lives in this browser's `localStorage`.

**Storage layer (`src/storage/`)**

| Module | Responsibility |
| --- | --- |
| `storage.ts` | Single access point to localStorage: versioned envelopes (`{ app, schemaVersion, updatedAt, data }`), safe JSON parsing, quota/blocked detection, quarantine of unreadable values |
| `schema.ts` | Field-by-field validation of plans, venues, settings and preferences; invalid records are dropped and counted, never guessed |
| `migrations.ts` | Step-by-step schema migrations (`MIGRATIONS[n]` upgrades n → n+1) and the one-off move of the Phase 2–4 venue key |
| `persisted.ts` | Load/save helpers that report problems and copy unreadable data aside before writing over it |
| `backup.ts` | Export file format, strict import validation, and pure merge/replace planning for the preview |
| `snapshot.ts` | Automatic safety copy taken before every import/restore so it can be undone |
| `issues.ts` | App-wide storage warnings shown in a banner |

Persisted keys: `date-planner.plans`, `.draft`, `.settings`, `.preferences`,
`.venues`, plus `.pre-import-snapshot`. Data from a newer schema version is
never modified. Derived plan fields (timeline, legs, notes) are rebuilt on
load. Other open tabs stay in sync via the `storage` event.

**Saved plans:** save, edit inline (auto-saved), rename, duplicate, delete
with confirmation, open, search, filter by city and date, sort, and show
creation date.

**Backup (`/cadangan`):** export everything to JSON. Import validates the
file, shows a preview of exactly what will be added, replaced, kept or
removed, offers merge (with a conflict policy) or replace, requires explicit
acknowledgement for anything that changes existing data, and takes an
automatic snapshot first ("Pulihkan data ini" undoes the import).
Malformed, foreign, oversized or newer-version files are rejected without
touching stored data.

## Phase 4 — Jakarta public transport

Transport options: TransJakarta, MRT Jakarta, LRT Jakarta, KRL Commuter Line,
any public transport, motorcycle, car, walking, and mixed modes.

- **Venue transit metadata** (optional): `transitAccess: TransitAccess[]`
  (station name, type, distance, walking minutes, `verifiedAt`). Walking
  distance and time are shown only when verified; venues without data are
  labelled "transit belum diketahui". The earlier free-text field is kept as
  `transitNote`.
- **Ranking:** when public transport is chosen, venues are ranked by
  75% of the Phase 3 compatibility score + 25% transport fit
  (`src/engine/transport.ts`). Transport fit is 70% known transit access
  (verified, matching type ranks highest; unknown access counts as 0) and
  30% proximity to the previous stop. Proximity uses straight-line distance
  only when both venues have coordinates; missing coordinates are never
  treated as nearby. Public-transport plans are limited to 3 stops (2 for
  dates up to 3 hours).
- **Mixed transport:** each move between stops can use a different mode
  (walking by default only when coordinates show ≤ 1 km).
- **Google Maps routes** (`buildRouteUrl` in `src/lib/maps.ts`, built with
  URLSearchParams): venue → venue, start location → first venue, last venue
  → final destination, and station → venue walking routes. Transit legs use
  `travelmode=transit`.
- **No fake transit data:** the app computes no routes, travel times, line
  numbers, live arrivals or fares. The timeline reserves a fixed planning
  buffer per move, labelled "bukan estimasi rute". Public-transport fares are
  excluded from totals and labelled as not estimated.

## Phase 3 — deterministic planning engine

Plans are generated by a rule-based engine in `src/engine/`. It uses no AI,
no LLM and no external API, and the same input with the same venues always
gives the same plan.

| Module | Responsibility |
| --- | --- |
| `scoring.ts` | Venue score 0–100: vibe 35%, activity 25%, budget 20%, environment 10%, duration 10%, plus template-based reasons |
| `generator.ts` | Filters active venues by city and environment, scores them, picks complementary activities without duplicate venues or back-to-back categories, fits duration and budget, and lists alternatives |
| `budget.ts` | Total min/max/estimate, remaining budget, utilisation, over-budget status (IDR, for two). Unknown prices are excluded and reported, never guessed |
| `validation.ts` | Create-form validation and plan checks (over budget/duration, past midnight, inactive or missing venues, empty plan) |
| `itinerary.ts` | Timeline, notes and concept recalculation, plus edit operations: remove, reorder, replace venue, adjust duration/cost, add a free-form activity |
| `activities.ts` | Realistic time ranges and flow order per activity |

Edge cases (no venues, too few venues, budget too low, duration too short,
missing prices, no compatible activity, incomplete data) produce explicit
issues instead of invented data. Stop order follows the activity flow; routes
are not optimised.

## Phase 2 — venue dataset & Google Maps links

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
npm test           # unit tests (engine, storage/backup/migrations, Maps URLs, filters)
npm run build      # typecheck + production build (includes the service worker)
npm run preview    # serve the build locally to try offline/installation
node scripts/generate-icons.mjs  # re-render app icons (needs Playwright)
```
