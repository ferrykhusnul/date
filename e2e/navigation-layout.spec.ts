import { createDate, expect, navLink, seedVenues, test } from './fixtures';

const ROUTES = ['/', '/buat', '/hasil', '/tersimpan', '/venue', '/venue/baru', '/venue/kafe-uji', '/venue/kafe-uji/ubah', '/pengaturan', '/cadangan', '/rencana/tidak-ada', '/venue/tidak-ada', '/tidak-ada'];

test('every navigation link and route works', async ({ page, consoleErrors }) => {
  void consoleErrors;
  await seedVenues(page);
  await page.goto('/');
  const targets: [string, RegExp, string][] = [
    ['Bikin', /\/buat$/, 'Mau date di mana?'],
    ['Tersimpan', /\/tersimpan$/, 'Our little plans'],
    ['Tempat', /\/venue$/, 'Tempat'],
    ['Setelan', /\/pengaturan$/, 'Setelan'],
    ['Beranda', /\/$/, 'A Day With Us'],
  ];
  for (const [label, url, heading] of targets) {
    await (await navLink(page, label)).click();
    await expect(page).toHaveURL(url);
    await expect(page.locator('h1')).toContainText(heading);
    await expect(await navLink(page, label)).toHaveAttribute('aria-current', 'page');
  }
  for (const path of ROUTES) {
    await page.goto(path);
    await expect(page.locator('h1, .empty-state h2').first(), path).toBeVisible();
  }
  await page.goto('/tidak-ada');
  await expect(page.getByText('Halaman nggak ketemu')).toBeVisible();
  await page.getByRole('link', { name: 'Ke beranda' }).click();
  await expect(page).toHaveURL(/\/$/);
  // Back links
  await page.goto('/venue/kafe-uji');
  await page.getByRole('button', { name: 'Kembali' }).click();
  await page.goto('/cadangan');
  await page.getByRole('button', { name: 'Kembali' }).click();
  await expect(page).toHaveURL(/\/pengaturan$/);
});

for (const width of [320, 360, 768, 1024, 1440]) {
  test(`no horizontal overflow at ${width}px`, async ({ page, consoleErrors }) => {
    void consoleErrors;
    test.skip(test.info().project.name !== 'desktop', 'viewport sweep runs once');
    await seedVenues(page);
    await page.setViewportSize({ width, height: 900 });
    // Create content so the result page has real items.
    await createDate(page, { transport: 'Transum', transit: 'MRT' });
    await page.getByRole('checkbox', { name: 'Atur lagi' }).check();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), '/hasil (editing)').toBeLessThanOrEqual(0);
    const alternatives = page.getByRole('button', { name: 'Opsi lainnya' });
    if (await alternatives.count()) {
      await alternatives.first().click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), '/hasil (opsi lainnya)').toBeLessThanOrEqual(0);
    }
    await page.getByRole('button', { name: 'Simpan date' }).click();
    for (const path of ROUTES) {
      await page.goto(path);
      await expect(page.locator('h1, .empty-state h2').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), path).toBeLessThanOrEqual(0);
    }
  });
}
