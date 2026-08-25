/* Which backdrop treatment the page shows — a pre-launch A/B, not a feature.
 *
 * A (default)   the photograph is a fixed layer and stands still; on a phone iOS
 *               paints its own strips above and below the page in the sky colour
 * B (?bg=scroll) the photograph is the body's background and scrolls with the
 *               document, which reaches those strips — at the price of a picture
 *               magnified over the whole page height
 *
 * Render-blocking in <head> on purpose: the attribute has to sit on <html> before
 * the first paint, otherwise A paints and is then swapped for B in front of the eye.
 *
 * The URL is the whole state — nothing is remembered. Unlocking the gate does not
 * reload, so there is nothing to survive.
 *
 * Goes away with the gate: this file, its <script> tag and the .variant nav.
 */
(() => {
  const root = document.documentElement;
  const scrolls = /(?:^|[?&])bg=scroll(?:&|$)/.test(location.search);
  if (scrolls) root.setAttribute('data-bg', 'scroll');

  document.addEventListener('DOMContentLoaded', () => {
    const here = document.getElementById(scrolls ? 'variant-scroll' : 'variant-fixed');
    if (here) here.setAttribute('aria-current', 'true');
  });
})();
