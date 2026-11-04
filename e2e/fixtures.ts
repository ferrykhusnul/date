import { test as base, expect, type Page } from '@playwright/test';

/** Fictional venues used by the browser tests. Not real places. */
const venue = (id: string, name: string, category: string, activities: string[], extra: Record<string, unknown> = {}) => ({
  id,
  name,
  category,
  address: `Jl. Uji Coba ${id}`,
  city: 'Kota Uji',
  priceMin: 30_000,
  priceMax: 60_000,
  visitDurationMinutes: 60,
  vibes: ['romantis'],
  activities,
  environment: 'indoor',
  googleMapsUrl: `https://maps.app.goo.gl/uji${id}`,
  description: 'Venue uji (fiktif).',
  status: 'active',
  ...extra,
});

export const TEST_VENUES = [
  venue('kafe-uji', 'Kafe Uji', 'kafe', ['kopi'], {
    latitude: -6.2,
    longitude: 106.8,
    transitAccess: [{ stationName: 'Stasiun Uji Satu', transitType: 'mrt', distanceMeters: 250, walkingMinutes: 4, verifiedAt: '2026-10-20' }],
  }),
  venue('kafe-dua', 'Kafe Uji Dua', 'kafe', ['kopi'], { priceMin: 70_000, priceMax: 100_000 }),
  venue('resto-uji', 'Resto Uji', 'restoran', ['makan'], { priceMin: 80_000, priceMax: 150_000, visitDurationMinutes: 90, latitude: -6.205, longitude: 106.8 }),
  venue('taman-uji', 'Taman Uji', 'taman', ['jalan'], { priceMin: 0, priceMax: 0, visitDurationMinutes: 45, environment: 'outdoor' }),
];

/** Writes venues into storage in the app's envelope format before the first load. */
export async function seedVenues(page: Page) {
  await page.addInitScript((venues) => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    sessionStorage.setItem('e2e-seeded', '1');
    localStorage.setItem(
      'date-planner.venues',
      JSON.stringify({ app: 'date-planner', schemaVersion: 1, updatedAt: new Date().toISOString(), data: venues }),
    );
  }, TEST_VENUES);
}

/** Fails the test on uncaught errors or console errors from the app. */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(m.text())) errors.push(m.text());
    });
    await use(errors);
    expect(errors, 'console errors').toEqual([]);
  },
});

export { expect };

/** Selector for the bottom nav (mobile) or sidebar (desktop). */
export async function navLink(page: Page, label: string) {
  const mobile = (page.viewportSize()?.width ?? 1000) < 900;
  return page.locator(mobile ? '.bottom-nav' : '.sidebar').getByRole('link', { name: label, exact: true });
}
