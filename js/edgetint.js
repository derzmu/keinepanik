/* Tints the two strips iOS paints outside the page area — the status-bar band at the
 * top and the band behind the bottom toolbar.
 *
 * Measured on a device: those strips take the nearest OPAQUE background in the ancestor
 * chain at that screen edge. An opaque band reaches them, which is why the footer's
 * black runs all the way down. A see-through band does not — it falls through to the
 * root colour — and the photograph never counts at all, because it is an element in
 * front, not a background behind.
 *
 * So the see-through bands are given an opaque colour after all, matching the
 * photograph at that edge, and the photograph is stacked over it (see components.css)
 * so nobody sees it. Two bands, two elements, two colours — which is the thing a single
 * root colour could never do.
 *
 * Phones only. Elsewhere there are no such strips.
 */
(() => {
  const PHONE = '(max-width: 647px)';
  const backdrop = document.getElementById('backdrop');
  if (!backdrop) return;

  const bands = [...document.querySelectorAll('.band, .site-footer')];
  /* Which bands are see-through must be decided before anything is tinted. */
  const transparent = c => {
    if (!c || c === 'transparent') return true;
    const m = /^rgba?\(([^)]+)\)$/.exec(c);
    if (!m) return false;
    const parts = m[1].split(',').map(v => parseFloat(v));
    /* Only a fourth component of zero means see-through. Black is rgb(0, 0, 0), which
       a lazier test reads as transparent and then paints the footer brown. */
    return parts.length > 3 && parts[3] === 0;
  };
  const seeThrough = new Set(bands.filter(b => transparent(getComputedStyle(b).backgroundColor)));

  let edges = null;

  /* The colour the photograph shows at the very top and the very bottom of the screen.
     It is a fixed layer, so both are constant until the viewport changes. */
  function measure() {
    const box = backdrop.getBoundingClientRect();
    if (!backdrop.naturalWidth || !box.height) return null;
    const W = 8, H = Math.round(box.height);
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d', { willReadFrequently: true });
    /* Mirrors object-fit:cover with object-position:center top. */
    const s = Math.max(box.width / backdrop.naturalWidth, box.height / backdrop.naturalHeight);
    const dw = backdrop.naturalWidth * s, dh = backdrop.naturalHeight * s;
    const k = W / box.width;
    try { g.drawImage(backdrop, (box.width - dw) / 2 * k, 0, dw * k, dh); }
    catch { return null; }
    const row = y => {
      const d = g.getImageData(0, Math.min(Math.max(y, 0), H - 1), W, 1).data;
      let r = 0, gr = 0, b = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; gr += d[i + 1]; b += d[i + 2]; }
      const n = d.length / 4;
      return `rgb(${Math.round(r / n)},${Math.round(gr / n)},${Math.round(b / n)})`;
    };
    return { top: row(0), bottom: row(Math.round(innerHeight) - 1) };
  }

  const bandAt = y => {
    const el = document.elementFromPoint(Math.round(innerWidth / 2), y);
    return el ? el.closest('.band, .site-footer') : null;
  };
  const clear = () => bands.forEach(b => { b.style.backgroundColor = ''; });

  let queued = false;
  function sync() {
    queued = false;
    if (!matchMedia(PHONE).matches) return clear();
    if (!edges) { edges = measure(); if (!edges) return; }
    clear();
    const top = bandAt(0);
    const bottom = bandAt(Math.round(innerHeight) - 1);
    if (top && seeThrough.has(top)) top.style.backgroundColor = edges.top;
    /* A band tall enough to hold both edges can only answer for one; the bottom strip
       is the one that shows a mismatch, so it wins. */
    if (bottom && seeThrough.has(bottom)) bottom.style.backgroundColor = edges.bottom;
  }
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(sync); } };
  const remeasure = () => { edges = null; schedule(); };

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', remeasure);
  if (window.visualViewport) {
    visualViewport.addEventListener('resize', remeasure);
    visualViewport.addEventListener('scroll', schedule);
  }
  if (backdrop.complete) schedule(); else backdrop.addEventListener('load', remeasure);
})();
