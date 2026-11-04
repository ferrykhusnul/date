import { createDate, expect, test } from './fixtures';

test('real Jakarta venues: listed, sourced, and used for a plan', async ({ page, consoleErrors }) => {
  void consoleErrors;
  // Venue list shows the curated dataset without any seeding.
  await page.goto('/venue');
  await page.locator('.filter-panel summary').click();
  await page.locator('#vf-q').fill('Tebet Eco Park');
  const tile = page.locator('.venue-tile', { hasText: 'Tebet Eco Park' });
  await expect(tile).toBeVisible();
  await tile.getByRole('link').first().click();

  await expect(page.locator('h1')).toHaveText('Tebet Eco Park');
  await expect(page.getByRole('link', { name: /Enjoy Jakarta/ })).toHaveAttribute('href', 'https://enjoy.jakarta.go.id/article/tebet-eco-park');
  await expect(page.getByText('Harga perkiraan')).toBeVisible();
  await expect(page.getByText(/belum dicek langsung di Maps/)).toBeVisible();
  const mapsHref = await page.locator('a[href^="https://www.google.com/maps/search/?api=1&query="]').first().getAttribute('href');
  expect(decodeURIComponent(mapsHref!)).toContain('Tebet Eco Park');

  // A Jakarta plan is built from real venues (no sample badge).
  await createDate(page, { city: 'Jakarta', mood: 'Chill' });
  await expect(page.locator('.timeline-item').first()).toBeVisible();
  await expect(page.getByText('Contoh', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/venue sampel/i)).toHaveCount(0);
});
