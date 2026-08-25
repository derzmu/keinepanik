/* Keeps the canvas matched to whatever sits at the bottom of the screen.
 *
 * iOS fills the strip behind its bottom toolbar from the root background, and page
 * content cannot paint there — measured on a device, #backdrop overshoots the visible
 * area by 40px and still does not reach it. css/base.css therefore puts the photograph
 * on the root itself, so the picture carries on into that strip instead of stopping
 * at the fold.
 *
 * That is right wherever the photograph is what shows above the fold. Over the cream
 * band, the dark band or the footer it would be wrong — the strip would jump from an
 * opaque band straight back to blossoms. So over those, this drops the root image and
 * puts the band's own colour there instead.
 *
 * Safari does this for the status bar at the top by itself. This is the same job at
 * the bottom. Without JS the CSS stands: the photograph everywhere, which is right for
 * the see-through bands and merely imperfect elsewhere.
 */
(() => {
  const root = document.documentElement;
  const opaque = c => {
    const m = /^rgba?\(([^)]+)\)$/.exec(c || '');
    if (!m) return false;
    const parts = m[1].split(',').map(s => parseFloat(s));
    return parts.length < 4 || parts[3] === 1;
  };

  /* The opaque band at the fold, or null when the photograph reaches it. */
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
    return null;
  }

  let queued = false;
  function sync() {
    queued = false;
    const c = bottomColour();
    /* null means the photograph is what reaches the fold: hand the strip back to the
       root image by clearing the override. */
    const image = c ? 'none' : '';
    if (root.style.backgroundImage !== image) root.style.backgroundImage = image;
    const colour = c || '';
    if (root.style.backgroundColor !== colour) root.style.backgroundColor = colour;
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
