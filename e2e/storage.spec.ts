import { writeFileSync } from 'node:fs';
import { expect, seedVenues, test } from './fixtures';

test('corrupt stored data is quarantined and reported, app keeps working', async ({ page, consoleErrors }) => {
  void consoleErrors;
  await page.addInitScript(() => {
    if (sessionStorage.getItem('corrupted')) return;
    sessionStorage.setItem('corrupted', '1');
    localStorage.setItem('date-planner.plans', '{corrupt');
    localStorage.setItem('date-planner.settings', JSON.stringify({ app: 'date-planner', schemaVersion: 1, updatedAt: '', data: { defaultCity: '', defaultBudget: 'x' } }));
  });
  await page.goto('/');
  await expect(page.locator('.storage-banner')).toContainText('rusak dan tidak bisa dibaca');
  const copies = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('.rusak-')));
  expect(copies).toHaveLength(1);
  expect(await page.evaluate((k) => localStorage.getItem(k), copies[0])).toBe('{corrupt');
  await page.goto('/pengaturan');
  await expect(page.getByLabel('Kota bawaan')).toHaveValue('Jakarta'); // invalid value replaced by default
  await expect(page.locator('.quarantine li')).toHaveCount(1);
  // Reload does not create another copy.
  await page.reload();
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('.rusak-')).length)).toBe(1);
});

test('invalid, foreign and newer backups are rejected without touching data', async ({ page, consoleErrors }, info) => {
  void consoleErrors;
  await seedVenues(page);
  await page.goto('/cadangan');
  const before = await page.evaluate(() => localStorage.getItem('date-planner.venues'));
  const cases: [string, string, RegExp][] = [
    ['bad.json', '{"not": json', /bukan JSON yang valid/],
    ['foreign.json', JSON.stringify({ hello: 'world' }), /bukan cadangan Date Planner/],
    ['newer.json', JSON.stringify({ app: 'date-planner', kind: 'backup', schemaVersion: 99, data: {} }), /versi aplikasi yang lebih baru/],
    ['empty.json', JSON.stringify({ app: 'date-planner', kind: 'backup', schemaVersion: 1, data: { plans: [] } }), /tidak berisi data/],
  ];
  for (const [name, body, msg] of cases) {
    const file = info.outputPath(name);
    writeFileSync(file, body);
    await page.locator('#backup-file').setInputFiles(file);
    await expect(page.getByRole('alert')).toHaveText(msg);
  }
  expect(await page.evaluate(() => localStorage.getItem('date-planner.venues'))).toBe(before);
  await expect(page.locator('.import-preview')).toHaveCount(0);
});

test('replace import needs acknowledgement and can be undone', async ({ page, consoleErrors }, info) => {
  void consoleErrors;
  await seedVenues(page);
  page.on('dialog', (d) => d.accept());
  await page.goto('/buat');
  await page.getByLabel('Kota').fill('Kota Uji');
  await page.getByRole('button', { name: 'Susun rencana' }).click();
  await page.getByRole('button', { name: 'Simpan rencana' }).click();
  await expect(page).toHaveURL(/\/rencana\//);

  const file = info.outputPath('replace.json');
  writeFileSync(file, JSON.stringify({ app: 'date-planner', kind: 'backup', schemaVersion: 1, exportedAt: new Date().toISOString(), data: { plans: [], venues: [] , settings: { defaultCity: 'Bandung', defaultBudget: 300000, defaultTransportation: 'krl', useSampleVenues: false } } }));
  await page.goto('/cadangan');
  await page.locator('#backup-file').setInputFiles(file);
  await page.getByLabel(/Ganti semua/).check();
  await expect(page.locator('.import-summary')).toContainText('1 rencana di perangkat akan dihapus');
  const apply = page.getByRole('button', { name: 'Ganti semua data' });
  await expect(apply).toBeDisabled();
  await page.getByLabel(/Saya mengerti/).check();
  await apply.click();
  await expect(page.getByText(/Impor selesai/)).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('date-planner.plans')!).data.length)).toBe(0);

  await page.getByRole('button', { name: 'Pulihkan data ini' }).click();
  await expect(page.getByText('Data sebelumnya berhasil dipulihkan.')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('date-planner.plans')!).data.length)).toBe(1);
});
