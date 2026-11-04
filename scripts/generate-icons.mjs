/**
 * Renders the app icons in public/ from inline SVG using Playwright's
 * Chromium. Run with `node scripts/generate-icons.mjs` after changing the
 * design (set PW_CHROMIUM_PATH to reuse an installed Chromium). Not part of
 * the build; the PNGs are committed.
 */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const INK = '#96596e'; // dusty rose (deep)
const PAPER = '#fdf7f5'; // pinkish ivory
const ACCENT = '#e8bfcb'; // rose
const BLUSH = '#f5dde3';

/** Soft heart on a blush circle with a small sparkle, in a 512×512 box. */
const mark = `
  <circle cx="276" cy="256" r="170" fill="${BLUSH}"/>
  <path fill="${INK}" d="M276 384s-118-68-118-152a64 64 0 0 1 118-34 64 64 0 0 1 118 34c0 84-118 152-118 152z"/>
  <path d="M232 214a30 30 0 0 1 30-30" fill="none" stroke="${PAPER}" stroke-width="16" stroke-linecap="round"/>
  <path fill="${ACCENT}" d="M420 92c6 26 14 34 40 40-26 6-34 14-40 40-6-26-14-34-40-40 26-6 34-14 40-40z"/>`;

/** Regular icon: rounded tile, mark fills most of it. */
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="${PAPER}"/>
  <g transform="translate(-20 0)">${mark}</g>
</svg>`;

/** Maskable: full-bleed background, mark inside the 80% safe zone. */
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${PAPER}"/>
  <g transform="translate(256 256) scale(0.78) translate(-276 -256)">${mark}</g>
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

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
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
