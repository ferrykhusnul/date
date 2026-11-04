import { chromium } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDate, expect, seedVenues, test } from './fixtures';

test.describe('PWA', () => {
  test('manifest, icons, service worker and precache', async ({ page, baseURL, consoleErrors }) => {
    void consoleErrors;
    await page.goto('/');
    const manifest = await page.evaluate(async () => {
      const href = (document.querySelector('link[rel=manifest]') as HTMLLinkElement).href;
      const res = await fetch(href);
      const json = await res.json();
      const icons = await Promise.all(
        json.icons.map(async (i: { src: string; sizes: string; purpose: string }) => {
          const r = await fetch(new URL(i.src, href));
          const bmp = await createImageBitmap(await r.blob());
          return { sizes: i.sizes, purpose: i.purpose, status: r.status, actual: `${bmp.width}x${bmp.height}` };
        }),
      );
      return { contentType: res.headers.get('content-type'), json, icons };
    });
    expect(manifest.contentType).toContain('application/manifest+json');
    expect(manifest.json).toMatchObject({ name: 'A Day With Us', short_name: 'ADWU', display: 'standalone', start_url: '/', scope: '/', theme_color: '#fdf7f5', background_color: '#fdf7f5' });
    for (const icon of manifest.icons) {
      expect(icon.status).toBe(200);
      expect(icon.actual).toBe(icon.sizes);
    }
    expect(manifest.icons.map((i) => i.purpose)).toEqual(expect.arrayContaining(['any', 'maskable']));

    const reg = await page.evaluate(async () => {
      const r = await navigator.serviceWorker.ready;
      return { scope: r.scope, script: r.active?.scriptURL };
    });
    expect(reg.script).toMatch(/\/sw\.js$/);

    await page.reload();
    expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

    // Precache holds same-origin app-shell files only.
    const cached = await page.evaluate(async () => {
      const urls: string[] = [];
      for (const name of await caches.keys()) for (const req of await (await caches.open(name)).keys()) urls.push(req.url);
      return urls;
    });
    expect(cached.length).toBeGreaterThan(5);
    expect(cached.every((u) => u.startsWith(baseURL!))).toBe(true);
    expect(cached.some((u) => /google/.test(u))).toBe(false);
  });

  test('Chromium reports the app as installable', async ({ baseURL }) => {
    test.skip(test.info().project.name !== 'desktop', 'one installability check is enough');
    // Test contexts are incognito-like and Chrome never installs from incognito,
    // so this check uses a normal (persistent) profile.
    const dir = mkdtempSync(join(tmpdir(), 'dp-install-'));
    const ctx = await chromium.launchPersistentContext(dir, {
      executablePath: process.env.PW_CHROMIUM_PATH || undefined,
      baseURL,
    });
    try {
      const page = ctx.pages()[0] ?? (await ctx.newPage());
      await page.goto('/');
      await page.evaluate(() => navigator.serviceWorker.ready);
      await page.reload();
      const cdp = await ctx.newCDPSession(page);
      expect((await cdp.send('Page.getAppManifest')).errors).toEqual([]);
      expect((await cdp.send('Page.getInstallabilityErrors')).installabilityErrors).toEqual([]);
    } finally {
      await ctx.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('app shell and local data work offline', async ({ page, context, consoleErrors }) => {
    void consoleErrors;
    await seedVenues(page);
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

    // Save a plan while online.
    await createDate(page);
    await page.getByRole('button', { name: 'Simpan date' }).click();
    await expect(page).toHaveURL(/\/rencana\//);
    const planPath = new URL(page.url()).pathname;

    await context.setOffline(true);
    const probe = await page.evaluate(async () => {
      try {
        await fetch(`/not-cached-${Date.now()}.txt`, { cache: 'no-store' });
        return 'reachable';
      } catch {
        return 'offline';
      }
    });
    expect(probe).toBe('offline');

    for (const path of ['/', planPath, '/tersimpan', '/venue', '/venue/kafe-uji', '/buat', '/pengaturan', '/cadangan']) {
      const res = await page.goto(path);
      expect(res?.fromServiceWorker(), path).toBe(true);
      await expect(page.locator('h1')).toBeVisible();
    }
    await expect(page.locator('.offline-banner')).toBeVisible();

    // Saved plan + budget offline.
    await page.goto(planPath);
    await expect(page.locator('.cost-total strong')).toHaveText(/^Rp /);
    await expect(page.locator('.venue-card a.is-offline').first()).toHaveAttribute('title', 'Butuh koneksi internet');

    // Generator offline.
    await createDate(page, { mood: 'Chill' });
    await expect(page.locator('.timeline-item').first()).toBeVisible();
    await page.getByRole('checkbox', { name: 'Atur lagi' }).check();
    const before = await page.locator('.cost-total strong').textContent();
    await page.locator('.timeline-item').first().getByLabel('Kira-kira biaya berdua').fill('123000');
    await expect(page.locator('.cost-total strong')).not.toHaveText(before!);
    await page.getByRole('button', { name: 'Simpan date' }).click();
    await page.goto('/tersimpan');
    await expect(page.locator('.plan-card')).toHaveCount(2);
    await context.setOffline(false);
  });
});
