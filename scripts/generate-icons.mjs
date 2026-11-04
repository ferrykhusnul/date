/**
 * Renders the app icons in public/ from inline SVG using Playwright's
 * Chromium. Run with `node scripts/generate-icons.mjs` after changing the
 * design. Not part of the build; the PNGs are committed.
 */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const INK = '#1f1a17';
const PAPER = '#f6f1ea';
const ACCENT = '#b4532a';

/** "D" monogram with an accent dot, drawn in a 512×512 box. */
const mark = `
  <path fill-rule="evenodd" fill="${INK}"
    d="M168 120h108c96 0 156 60 156 136s-60 136-156 136H168z
       M232 180v152h40c58 0 94-30 94-76s-36-76-94-76z"/>
  <circle cx="406" cy="388" r="26" fill="${ACCENT}"/>`;

/** Regular icon: rounded tile, mark fills most of it. */
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="${PAPER}"/>
  <g transform="translate(-44 0)">${mark}</g>
</svg>`;

/** Maskable: full-bleed background, mark inside the 80% safe zone. */
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${PAPER}"/>
  <g transform="translate(256 256) scale(0.62) translate(-276 -256)">${mark}</g>
</svg>`;

/** Monochrome-friendly favicon (SVG, used directly by browsers). */
writeFileSync('public/favicon.svg', iconSvg + '\n');
// Source of the maskable PNG; kept out of public/ so it is not shipped.
writeFileSync('scripts/maskable-icon.svg', maskableSvg + '\n');

const targets = [
  { file: 'public/pwa-192x192.png', svg: iconSvg, size: 192 },
  { file: 'public/pwa-512x512.png', svg: iconSvg, size: 512 },
  { file: 'public/maskable-icon-512x512.png', svg: maskableSvg, size: 512 },
  { file: 'public/apple-touch-icon-180x180.png', svg: maskableSvg, size: 180 },
  { file: 'public/favicon-32x32.png', svg: iconSvg, size: 32 },
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${t.svg.replace('<svg ', `<svg width="${t.size}" height="${t.size}" `)}</body></html>`,
  );
  await page.screenshot({ path: t.file, omitBackground: true, clip: { x: 0, y: 0, width: t.size, height: t.size } });
  console.log('wrote', t.file);
}
await browser.close();
