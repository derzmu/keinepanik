#!/usr/bin/env node
/* Rebuilds the served copies of the backdrop photograph. Run: node tools/make-variants.mjs
 *
 * #backdrop is a real <img>, so the browser picks a file from srcset by itself.
 *
 * The master is the SOURCE and is never served and never rewritten: re-encoding it in
 * place would compound generation loss with every run. Every entry in the srcset —
 * 2304 included — is derived from it here at one quality, so the largest file the page
 * can fetch is a fraction of the master rather than the master itself.
 *
 * 2304px is the master's width and the largest there is, so it stays the top of the set.
 * Retina desktop would want more; it did before this too.
 *
 * Playwright is used only because it can decode and re-encode a JPEG without pulling a
 * dependency into the site. Any image tool would do — this is not a dependency of the
 * site, and the site has no build step: the variants are checked in.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/* Resolve playwright wherever it happens to live: a local install, a global one, or
   the toolbox path it sat on when this script was written. Hard-coding one machine's
   path made this unrunnable everywhere else. */
async function loadChromium() {
  const candidates = [
    'playwright',
    '/opt/node22/lib/node_modules/playwright/index.js',
    '/usr/lib/node_modules/playwright/index.js',
  ];
  for (const spec of candidates) {
    try {
      /* playwright is CommonJS: depending on how Node reads it, chromium is either a
         named export or only reachable through the default one. Accept both. */
      const mod = await import(spec);
      const chromium = mod.chromium ?? mod.default?.chromium;
      if (chromium) return chromium;
    } catch { /* try the next one */ }
  }
  throw new Error(
    'playwright not found. Install it (npm i -g playwright) or re-encode the variants\n' +
    'with any image tool at the sizes and quality named at the top of this file.'
  );
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const master = path.join(root, 'assets/img/magnolia.jpg');
const WIDTHS = [1200, 1800, 2304];
const QUALITY = 0.82;

const chromium = await loadChromium();
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

console.log(`master ${made.master[0]}x${made.master[1]}  ${(fs.statSync(master).size / 1024).toFixed(0)} KB  (source only, not served)`);
for (const v of made.out) {
  const file = path.join(root, `assets/img/magnolia-${v.w}.jpg`);
  fs.writeFileSync(file, Buffer.from(v.data.split(',')[1], 'base64'));
  console.log(`  ${v.w}x${v.h}  ${(fs.statSync(file).size / 1024).toFixed(0)} KB  ${path.basename(file)}`);
}
