# Date Planner

Mobile-first date planning app (React + TypeScript + Vite).

## Status: Phase 1 — UI foundation

All screens are built and navigable using **clearly labeled sample data**.
No real venue information is included: every venue is a placeholder
(`src/data/sampleVenues.ts`), and the plan generator
(`src/lib/planGenerator.ts`) only assembles those samples.

State lives in memory only (`src/state/AppState.tsx`); refreshing the page
resets settings and saved plans. Map buttons are disabled until real venue
data exists.

| Route | Screen |
| --- | --- |
| `/` | Beranda (Home) |
| `/buat` | Buat Kencan (Create Date) |
| `/hasil` | Hasil rencana (draft result) |
| `/rencana/:id` | Saved plan result |
| `/venue/:id` | Detail venue |
| `/tersimpan` | Rencana tersimpan (Saved Dates) |
| `/pengaturan` | Pengaturan (Settings) |

## Scripts

```bash
npm install
npm run dev        # development server
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + production build
```
