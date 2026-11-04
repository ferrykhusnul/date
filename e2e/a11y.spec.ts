import { createRequire } from 'node:module';
import { createDate, expect, seedVenues, test } from './fixtures';

const require = createRequire(import.meta.url);
const AXE = require.resolve('axe-core/axe.min.js');

const ROUTES = ['/', '/buat', '/hasil', '/tersimpan', '/venue', '/venue/baru', '/venue/kafe-uji', '/pengaturan', '/cadangan'];

test('no serious or critical axe violations', async ({ page, consoleErrors }) => {
  void consoleErrors;
  await seedVenues(page);
  // Content on the result and saved pages.
  await createDate(page, { transport: 'Transum', transit: 'MRT' });
  await page.getByRole('button', { name: 'Simpan date' }).click();
  await page.getByRole('button', { name: 'Duplikat' }).click();

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

test('wizard steps have no serious or critical axe violations', async ({ page, consoleErrors }) => {
  void consoleErrors;
  await seedVenues(page);
  // Scan the settled UI, not the 0.28s step fade-in (disabled under reduced motion).
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/buat');
  const report: string[] = [];
  for (let step = 1; step <= 6; step++) {
    await page.addScriptTag({ path: AXE });
    const v = await page.evaluate(async () => {
      // @ts-expect-error injected global
      const r = await window.axe.run(document, { resultTypes: ['violations'] });
      return r.violations
        .filter((x: { impact: string }) => x.impact === 'serious' || x.impact === 'critical')
        .map((x: { id: string; nodes: { target: string[] }[] }) => `${x.id}: ${x.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
    });
    report.push(...v.map((x: string) => `step ${step} → ${x}`));
    if (step < 6) await page.getByRole('button', { name: /^Lanjut/ }).click();
  }
  expect(report).toEqual([]);
});
