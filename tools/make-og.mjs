#!/usr/bin/env node
/* Rebuilds the share image. Run: node tools/make-og.mjs
 *
 * assets/img/og.jpg is what WhatsApp, Instagram, Signal, Facebook and Discord show
 * when someone pastes the link. It is never loaded by the page itself — only by the
 * crawlers behind those previews — and it is referenced from <head> by an absolute
 * URL, because a relative path is all a crawler would have and none of them resolve
 * one. See the og: block in index.html.
 *
 * 1200x630 is the size every one of those platforms crops to (1.91:1). The backdrop
 * photograph is 2304x3456 standing, so this is a wide slice out of its top third:
 * open sky for the wordmark, the crown of the blossom underneath as a floor.
 *
 * The mark is painted in ink, not in the offwhite the footer uses. White on this sky
 * reaches 2.4:1 and a preview thumbnail is small; ink reaches 8.9:1 on the same
 * pixels. It is the same decision the gate panel made, for the same reason. Darkening
 * the photograph instead was not an option: the brand has no scrims and no shadows —
 * see --overlay-photo-scrim in css/tokens/effects.css, which exists to say so.
 *
 * Like tools/make-variants.mjs this renders through Chromium, so the site keeps its
 * no-build-step promise: the result is checked in, and playwright is a tool on the
 * machine rather than a dependency of the page.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/* Resolve playwright wherever it happens to live — same three candidates as
   tools/make-variants.mjs, for the same reason. */
async function loadChromium() {
  const candidates = [
    'playwright',
    '/opt/node22/lib/node_modules/playwright/index.js',
    '/usr/lib/node_modules/playwright/index.js',
  ];
  for (const spec of candidates) {
    try {
      const mod = await import(spec);
      const chromium = mod.chromium ?? mod.default?.chromium;
      if (chromium) return chromium;
    } catch { /* try the next one */ }
  }
  throw new Error(
    'playwright not found. Install it (npm i -g playwright) or build the share image\n' +
    'by hand at the size, crop and colours named at the top of this file.'
  );
}

/* A machine that has playwright does not necessarily have playwright's own browser
   download: CI images and sandboxes often ship one chromium and point the library at
   it instead. Try the library's copy first, then a chromium installed beside it, then
   an explicit path. CHROMIUM_PATH covers whatever this list does not. */
async function launch(chromium) {
  const known = ['/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  const attempts = [
    {},
    { channel: 'chromium' },
    ...(process.env.CHROMIUM_PATH ? [{ executablePath: process.env.CHROMIUM_PATH }] : []),
    ...known.filter(p => fs.existsSync(p)).map(p => ({ executablePath: p })),
  ];
  let last;
  for (const opts of attempts) {
    try { return await chromium.launch(opts); } catch (err) { last = err; }
  }
  throw new Error(
    `no chromium playwright could start. Set CHROMIUM_PATH to one, or run\n` +
    `npx playwright install chromium.\n\nLast error: ${last?.message}`
  );
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'assets/img/og.jpg');

const W = 1200;
const H = 630;
const QUALITY = 82;

/* Which slice of the standing photograph the frame lands on. At cover the master is
   scaled to 1200x1800, so 0% would be its top edge and 100% its bottom; 11% puts the
   horizon of blossom just below the middle and leaves the sky above it clear. */
const CROP_Y = '11%';

/* The mark reads as the subject here, not as a caption, so it runs wider than the
   --size-wordmark the page uses. 1.969 is its intrinsic aspect — the same number
   --ratio-wordmark carries in css/tokens/spacing.css. */
const MARK_W = 430;
const MARK_RATIO = 1.969;

const dataUri = (file, mime) =>
  `data:${mime};base64,` + fs.readFileSync(path.join(root, file)).toString('base64');

const photo = dataUri('assets/img/magnolia.jpg', 'image/jpeg');
const mark = dataUri('assets/logo-offwhite.svg', 'image/svg+xml');

/* Ink and sky are read from the brand tokens rather than restated: --kp-ink is the
   mark, --kp-sky only ever shows if the photograph itself fails to decode. */
const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0}
  .frame{position:relative;width:${W}px;height:${H}px;overflow:hidden;background:#5eaacc}
  .frame img{width:100%;height:100%;object-fit:cover;object-position:50% ${CROP_Y};display:block}
  .mark{
    position:absolute;
    left:50%;
    top:${Math.round(H * 0.30)}px;
    transform:translate(-50%,-50%);
    width:${MARK_W}px;
    height:${Math.round(MARK_W / MARK_RATIO)}px;
    background:#231c17;
    -webkit-mask:url("${mark}") no-repeat center/contain;
    mask:url("${mark}") no-repeat center/contain;
  }
</style></head>
<body><div class="frame"><img src="${photo}" alt=""><span class="mark"></span></div></body></html>`;

const chromium = await loadChromium();
const browser = await launch(chromium);
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.setContent(html);
/* The photograph is a 3.4MB data: URI — screenshotting before it has decoded would
   catch the sky fallback with the mark floating on it. */
await page.locator('.frame img').evaluate(img => img.decode());
await page.locator('.frame').screenshot({ path: out, type: 'jpeg', quality: QUALITY });
await browser.close();

console.log(`${W}x${H}  ${(fs.statSync(out).size / 1024).toFixed(0)} KB  ${path.relative(root, out)}`);
