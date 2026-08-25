#!/usr/bin/env node
/* Rebuilds the smaller copies of the backdrop photograph. Run: node tools/make-variants.mjs
 *
 * #backdrop is a real <img>, so the browser picks a file from srcset by itself: a phone
 * fetches a few hundred KB instead of the full master. Run this whenever the master
 * changes — the variants are checked in, since the site has no build step.
 *
 * 2304px is the master's width and the largest there is, so it stays the top of the set.
 * Retina desktop would want more; it did before this too.
 *
 * Playwright is used only because it is already on this machine and can decode and
 * re-encode a JPEG. Any image tool would do — this is not a dependency of the site.
 */
import playwright from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = playwright;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const master = path.join(root, 'assets/img/magnolia.jpg');
const WIDTHS = [1200, 1800];
const QUALITY = 0.82;

const src = 'data:image/jpeg;base64,' + fs.readFileSync(master).toString('base64');
const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
await page.setContent('<body></body>');

const made = await page.evaluate(async ([data, widths, q]) => {
  const img = new Image();
  img.src = data;
  await img.decode();
  const out = [];
  for (const w of widths) {
    const h = Math.round(w * img.naturalHeight / img.naturalWidth);
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, w, h);
    out.push({ w, h, data: cv.toDataURL('image/jpeg', q) });
  }
  return { master: [img.naturalWidth, img.naturalHeight], out };
}, [src, WIDTHS, QUALITY]);
await browser.close();

console.log(`master ${made.master[0]}x${made.master[1]}  ${(fs.statSync(master).size / 1024).toFixed(0)} KB`);
for (const v of made.out) {
  const file = path.join(root, `assets/img/magnolia-${v.w}.jpg`);
  fs.writeFileSync(file, Buffer.from(v.data.split(',')[1], 'base64'));
  console.log(`  ${v.w}x${v.h}  ${(fs.statSync(file).size / 1024).toFixed(0)} KB  ${path.basename(file)}`);
}
