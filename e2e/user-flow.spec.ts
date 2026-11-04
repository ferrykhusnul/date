import { readFileSync } from 'node:fs';
import { expect, navLink, seedVenues, test } from './fixtures';

/**
 * The full journey from the Phase 7 brief, in order:
 * create → preferences → generate → open venue → open Maps → edit → save →
 * reload → open saved → duplicate → export → import → delete.
 */
test('complete user flow', async ({ page, context, consoleErrors }, testInfo) => {
  void consoleErrors;
  await seedVenues(page);
  page.on('dialog', (d) => d.accept());
  // Google Maps is never contacted by the test: popups get a local stub page.
  await context.route(/^https:\/\/(www\.)?google\.com\/maps.*/, (r) => r.fulfill({ contentType: 'text/html', body: '<title>maps stub</title>' }));
  await context.route(/^https:\/\/maps\.app\.goo\.gl\/.*/, (r) => r.fulfill({ contentType: 'text/html', body: '<title>listing stub</title>' }));

  // 1. Create date
  await page.goto('/');
  await page.getByRole('link', { name: 'Buat Rencana Kencan' }).click();
  await expect(page).toHaveURL(/\/buat$/);

  // 2. Fill preferences
  await page.getByLabel('Kota').fill('Kota Uji');
  await page.getByLabel('Jam mulai').fill('15:00');
  await page.locator('label.chip', { hasText: '4 jam' }).click();
  await page.getByLabel('Total anggaran (untuk berdua)').fill('600000');
  await expect(page.getByLabel('Total anggaran (untuk berdua)')).toHaveValue('600.000');
  await page.locator('label.chip', { hasText: 'Jalan-jalan' }).click();
  await page.locator('label.chip', { hasText: 'Motor' }).click();
  await page.getByLabel(/Catatan/).fill('Catatan uji e2e');

  // 3. Generate itinerary
  await page.getByRole('button', { name: 'Susun rencana' }).click();
  await expect(page).toHaveURL(/\/hasil$/);
  const names = page.locator('.timeline-item .venue-card-name');
  await expect(names).toHaveText(['Taman Uji', 'Kafe Uji', 'Resto Uji']);
  // Budget: 0 + 90.000 + 230.000 venues + 2 motor moves (5–15k each → 20.000)
  await expect(page.locator('.cost-total strong')).toHaveText('Rp 340.000');
  await expect(page.locator('.budget-figures div').nth(1).locator('dd')).toHaveText('Rp 260.000');
  await expect(page.locator('.budget-figures div').nth(2).locator('dd')).toHaveText('56,7%');

  // 4. Open venue
  await names.nth(1).click();
  await expect(page).toHaveURL(/\/venue\/kafe-uji$/);
  await expect(page.locator('h1')).toHaveText('Kafe Uji');
  await expect(page.getByText('250 m · ±4 menit jalan kaki')).toBeVisible();

  // 5. Open Maps (new tab with correctly encoded URL; external links are isolated)
  const search = page.getByRole('link', { name: /^Cari di Maps: Kafe Uji/ });
  await expect(search).toHaveAttribute('target', '_blank');
  await expect(search).toHaveAttribute('rel', /noopener/);
  const [popup] = await Promise.all([context.waitForEvent('page'), search.click()]);
  const popupUrl = new URL(popup.url());
  expect(popupUrl.origin + popupUrl.pathname).toBe('https://www.google.com/maps/search/');
  expect(popupUrl.searchParams.get('api')).toBe('1');
  expect(popupUrl.searchParams.get('query')).toBe('Kafe Uji, Jl. Uji Coba kafe-uji, Kota Uji');
  expect(await popup.evaluate(() => window.opener)).toBeNull();
  await popup.close();
  const directions = new URL((await page.getByRole('link', { name: /^Petunjuk arah: Kafe Uji/ }).getAttribute('href'))!);
  expect(directions.pathname).toBe('/maps/dir/');
  expect(directions.searchParams.get('destination')).toBe('Kafe Uji, Jl. Uji Coba kafe-uji, Kota Uji');
  await page.goBack();
  await expect(page).toHaveURL(/\/hasil$/);

  // 6. Edit itinerary (duration, cost, add free-form activity)
  await page.getByLabel('Mode ubah').check();
  const first = page.locator('.timeline-item').first();
  await first.getByRole('button', { name: 'Tambah 15 menit' }).click();
  await expect(first.locator('.stepper output')).toHaveText('1 jam');
  await first.getByLabel('Perkiraan biaya berdua').fill('20000');
  await expect(page.locator('.cost-total strong')).toHaveText('Rp 360.000');
  await page.getByRole('button', { name: 'Tambah aktivitas bebas' }).click();
  await page.getByLabel('Nama aktivitas').fill('Photobox');
  await page.getByLabel('Biaya berdua', { exact: true }).fill('40000');
  await page.locator('.custom-form').getByRole('button', { name: 'Tambahkan' }).click();
  await expect(names).toHaveText(['Taman Uji', 'Kafe Uji', 'Resto Uji', 'Photobox']);
  await expect(page.locator('.cost-total strong')).toHaveText('Rp 410.000'); // +40.000 + one more motor move (10.000)

  // 7. Save date
  await page.getByRole('button', { name: 'Simpan rencana' }).click();
  await expect(page).toHaveURL(/\/rencana\//);
  const savedUrl = page.url();

  // 8. Reload app
  await page.reload();

  // 9. Open saved date (via the list)
  await (await navLink(page, 'Tersimpan')).click();
  await expect(page.locator('.plan-card')).toHaveCount(1);
  await page.locator('.plan-card-link').first().click();
  await expect(page).toHaveURL(savedUrl);
  await expect(names).toHaveText(['Taman Uji', 'Kafe Uji', 'Resto Uji', 'Photobox']);
  await expect(page.locator('.cost-total strong')).toHaveText('Rp 410.000');

  // 10. Duplicate date
  await page.getByRole('button', { name: 'Duplikat rencana' }).click();
  await expect(page.locator('h1')).toContainText('(salinan)');
  await (await navLink(page, 'Tersimpan')).click();
  await expect(page.locator('.plan-card')).toHaveCount(2);

  // 11. Export backup
  await page.goto('/cadangan');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Unduh cadangan' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^date-planner-cadangan-\d{4}-\d{2}-\d{2}\.json$/);
  const backupPath = testInfo.outputPath('backup.json');
  await download.saveAs(backupPath);
  const backup = JSON.parse(readFileSync(backupPath, 'utf8'));
  expect(backup).toMatchObject({ app: 'date-planner', kind: 'backup', schemaVersion: 1 });
  expect(backup.data.plans).toHaveLength(2);
  expect(backup.data.venues).toHaveLength(4);

  // 12. Import backup (into a wiped device)
  await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('date-planner')).forEach((k) => localStorage.removeItem(k)));
  await page.reload();
  await page.locator('#backup-file').setInputFiles(backupPath);
  await expect(page.locator('.import-summary')).toContainText('2 rencana baru ditambahkan');
  await expect(page.locator('.import-summary')).toContainText('4 venue baru ditambahkan');
  await page.getByRole('button', { name: 'Gabungkan data' }).click();
  await expect(page.getByText(/Impor selesai/)).toBeVisible();
  await page.reload();
  await (await navLink(page, 'Tersimpan')).click();
  await expect(page.locator('.plan-card')).toHaveCount(2);

  // 13. Delete date
  await page.locator('.plan-card').first().getByRole('button', { name: /^Hapus / }).click();
  await expect(page.locator('.plan-card')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.plan-card')).toHaveCount(1);
});
