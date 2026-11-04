import { createRequire } from 'node:module';
import { expect, seedVenues, test } from './fixtures';

const require = createRequire(import.meta.url);
const AXE = require.resolve('axe-core/axe.min.js');

const ROUTES = ['/', '/buat', '/hasil', '/tersimpan', '/venue', '/venue/baru', '/venue/kafe-uji', '/pengaturan', '/cadangan'];

test('no serious or critical axe violations', async ({ page, consoleErrors }) => {
  void consoleErrors;
  await seedVenues(page);
  // Content on the result and saved pages.
  await page.goto('/buat');
  await page.getByLabel('Kota').fill('Kota Uji');
  await page.locator('label.chip', { hasText: 'MRT Jakarta' }).click();
  await page.getByRole('button', { name: 'Susun rencana' }).click();
  await page.getByRole('button', { name: 'Simpan rencana' }).click();
  await page.getByRole('button', { name: 'Duplikat rencana' }).click();

  const report: string[] = [];
  const planPath = new URL(page.url()).pathname;
  for (const scheme of ['light', 'dark'] as const) {
  await page.emulateMedia({ colorScheme: scheme });
  for (const path of [...ROUTES, planPath]) {
    await page.goto(path);
    await expect(page.locator('h1, .empty-state h2').first()).toBeVisible();
    await page.addScriptTag({ path: AXE });
    const violations = await page.evaluate(async () => {
      // @ts-expect-error injected global
      const r = await window.axe.run(document, { resultTypes: ['violations'] });
      return r.violations
        .filter((v: { impact: string }) => v.impact === 'serious' || v.impact === 'critical')
        .map((v: { id: string; impact: string; nodes: { target: string[] }[] }) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
    });
    for (const v of violations) report.push(`[${scheme}] ${path} → ${v}`);
  }
  }
  expect(report).toEqual([]);
});
