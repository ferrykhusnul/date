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

export interface WizardAnswers {
  city?: string;
  time?: string; // HH:mm (uses "Jam lain")
  hours?: number;
  mood?: string; // Chill | Romantic | Fun | Adventure | Aesthetic
  toggleActivities?: string[]; // card labels to toggle (defaults: Kuliner + Coffee)
  budget?: number; // custom amount
  transport?: 'Transum' | 'Motor' | 'Mobil' | 'Mix' | 'Jalan kaki';
  transit?: 'Apa aja' | 'TransJakarta' | 'MRT' | 'LRT' | 'KRL';
  start?: string;
  end?: string;
  notes?: string;
}

const card = (page: Page, text: string) => page.locator('label.choice-card', { hasText: text });

/** Walks the six-step "Bikin date" wizard and generates the plan. */
export async function createDate(page: Page, a: WizardAnswers = {}) {
  const next = () => page.getByRole('button', { name: /^Lanjut/ }).click();
  await page.goto('/buat');
  await expect(page.locator('h1')).toHaveText('Mau date di mana?');
  const city = a.city ?? 'Kota Uji';
  if (await card(page, city).count()) await card(page, city).first().click();
  else {
    await page.getByLabel('Kota lain').fill(city);
    await page.getByRole('button', { name: 'Pilih' }).click();
  }
  await next();

  await expect(page.locator('h1')).toHaveText('Kapan nih?');
  if (a.time) {
    await card(page, 'Jam lain').click();
    await page.getByLabel('Jam mulai').fill(a.time);
  }
  if (a.hours) await page.locator('label.chip', { hasText: `${a.hours} jam` }).click();
  await next();

  await expect(page.locator('h1')).toHaveText('Pengen vibes yang kayak apa?');
  if (a.mood) await card(page, a.mood).click();
  await next();

  await expect(page.locator('h1')).toHaveText('Mau ngapain?');
  for (const t of a.toggleActivities ?? []) await card(page, t).click();
  await next();

  await expect(page.locator('h1')).toHaveText('Budget date berapa?');
  if (a.budget) {
    await card(page, 'Custom').click();
    await page.getByLabel('Budget kamu').fill(String(a.budget));
  }
  await next();

  await expect(page.locator('h1')).toHaveText('Berangkat naik apa?');
  if (a.transport) await card(page, a.transport).click();
  if (a.transit) await page.locator('label.chip', { hasText: new RegExp(`^${a.transit}$`) }).click();
  if (a.start || a.end || a.notes) {
    await page.getByRole('button', { name: 'Tambahan (opsional)' }).click();
    if (a.start) await page.getByLabel('Berangkat dari').fill(a.start);
    if (a.end) await page.getByLabel('Pulang ke').fill(a.end);
    if (a.notes) await page.getByLabel('Catatan').fill(a.notes);
  }
  await page.getByRole('button', { name: /Cari ide/ }).click();
  await expect(page).toHaveURL(/\/hasil$/);
}
