import { createDate, expect, seedVenues, test } from './fixtures';

test('"Opsi lainnya" swaps a venue and "Coba ide lain" gives a different idea', async ({ page, consoleErrors }) => {
  void consoleErrors;
  await seedVenues(page);
  page.on('dialog', (d) => d.accept());
  // Only coffee: two cafés exist, so the first stop has an alternative.
  await createDate(page, { hours: 2, toggleActivities: ['Kuliner'] });
  const names = page.locator('.timeline-item .venue-card-name');
  // The stop that offers alternatives (the café).
  const stop = page.locator('.timeline-item', { has: page.getByRole('button', { name: 'Opsi lainnya' }) }).first();
  const before = await stop.locator('.venue-card-name').textContent();
  const index = await page.locator('.timeline-item').evaluateAll((els, b) => els.findIndex((e) => e.querySelector('.venue-card-name')?.textContent === b), before);

  await stop.getByRole('button', { name: 'Opsi lainnya' }).click();
  const alt = stop.locator('.alt-list li').first();
  const altName = (await alt.locator('.alt-name').textContent())!;
  await alt.getByRole('button', { name: 'Pakai' }).click();
  await expect(names.nth(index)).toHaveText(altName);
  expect(altName).not.toBe(before);

  // Another idea from the same answers: none of the venues just shown.
  const shown = await names.allTextContents();
  await page.getByRole('button', { name: 'Coba ide lain' }).click();
  await expect(page.getByText('Ini ide lainnya ♡')).toBeVisible();
  const fresh = await names.allTextContents();
  expect(fresh.length).toBeGreaterThan(0);
  expect(fresh.some((n) => !shown.includes(n))).toBe(true);

  await page.getByRole('button', { name: 'Simpan date' }).click();
  await expect(page).toHaveURL(/\/rencana\//);
});

test('wizard: progress, back/continue, validation and editing answers', async ({ page, consoleErrors }) => {
  void consoleErrors;
  await seedVenues(page);
  await page.goto('/buat');
  await expect(page.getByText('1/6')).toBeVisible();
  await page.getByRole('button', { name: /^Lanjut/ }).click();
  await expect(page.locator('h1')).toHaveText('Kapan nih?');
  await page.locator('.wizard-actions').getByRole('button', { name: 'Kembali' }).click();
  await expect(page.locator('h1')).toHaveText('Mau date di mana?');

  // Jump ahead via the progress bar; activities step blocks when nothing is selected.
  await page.getByRole('button', { name: 'Langkah 4: Mau ngapain?' }).click();
  await expect(page.locator('h1')).toHaveText('Mau ngapain?');
  for (const label of ['Kuliner', 'Coffee']) await page.locator('label.choice-card', { hasText: label }).click();
  await page.getByRole('button', { name: /^Lanjut/ }).click();
  await expect(page.getByRole('alert')).toHaveText('Pilih minimal satu aktivitas.');
  await page.locator('label.choice-card', { hasText: 'Movies' }).click();
  await page.getByRole('button', { name: /^Lanjut/ }).click();
  await expect(page.locator('h1')).toHaveText('Budget date berapa?');

  // Custom budget below the minimum is rejected.
  await page.locator('label.choice-card', { hasText: 'Custom' }).click();
  await page.getByLabel('Budget kamu').fill('10000');
  await page.getByRole('button', { name: /^Lanjut/ }).click();
  await expect(page.getByRole('alert')).toContainText('minimal');
  await page.locator('label.choice-card', { hasText: 'Rp300k' }).click();
  await page.getByRole('button', { name: /^Lanjut/ }).click();

  // Transum reveals the Jakarta transit modes; all are selectable.
  await page.locator('label.choice-card', { hasText: 'Transum' }).click();
  for (const m of ['TransJakarta', 'MRT', 'LRT', 'KRL', 'Apa aja']) {
    await page.locator('label.chip', { hasText: new RegExp(`^${m}$`) }).click();
    await expect(page.locator('label.chip', { hasText: new RegExp(`^${m}$`) }).locator('input')).toBeChecked();
  }
  await page.getByRole('button', { name: /Cari ide/ }).click();
  await expect(page).toHaveURL(/\/hasil$/);
  await expect(page.locator('.date-hero .pill').nth(2)).toHaveText('Transum');

  // "Ubah jawaban" brings the answers back.
  await page.getByRole('button', { name: 'Ubah jawaban' }).click();
  await expect(page.locator('h1')).toHaveText('Mau date di mana?');
  await page.getByRole('button', { name: 'Langkah 6: Berangkat naik apa?' }).click();
  await expect(page.locator('label.choice-card', { hasText: 'Transum' }).locator('input')).toBeChecked();
  await expect(page.locator('label.chip', { hasText: /^Apa aja$/ }).locator('input')).toBeChecked();
});
