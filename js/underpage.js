/* Keeps the canvas colour matched to whatever sits at the bottom of the screen.
 *
 * iOS fills the strip behind its bottom toolbar from the root background colour.
 * Page content cannot paint there — measured on a device, #backdrop overshoots the
 * visible area by 40px and still does not reach it — so the only way to control that
 * strip is this colour. Safari samples the top of the page for the status bar by
 * itself; this does the same job at the bottom.
 *
 * Without JS the CSS value stands: the tone the photograph has where it slides under
 * the toolbar, which is right for every see-through band and close enough elsewhere.
 */
(() => {
  const root = document.documentElement;
  const fallback = getComputedStyle(root).backgroundColor;
  const opaque = c => {
    const m = /^rgba?\(([^)]+)\)$/.exec(c || '');
    if (!m) return false;
    const parts = m[1].split(',').map(s => parseFloat(s));
    return parts.length < 4 || parts[3] === 1;
  };

  function bottomColour() {
    /* Sampled one pixel above the fold, at the centre so a narrow element at the
       edge cannot speak for the whole width. */
    const el = document.elementFromPoint(Math.round(innerWidth / 2), innerHeight - 1);
    for (let n = el; n && n !== root; n = n.parentElement) {
      const c = getComputedStyle(n).backgroundColor;
      /* Semi-transparent panels are skipped on purpose: what shows through them is
         the photograph, so the band behind them is the honest answer. */
      if (opaque(c)) return c;
    }
    return fallback;
  }

  let queued = false;
  function sync() {
    queued = false;
    const c = bottomColour();
    if (c && c !== root.style.backgroundColor) root.style.backgroundColor = c;
  }
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(sync); } };

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  if (window.visualViewport) {
    visualViewport.addEventListener('resize', schedule);
    visualViewport.addEventListener('scroll', schedule);
  }
  sync();
})();
