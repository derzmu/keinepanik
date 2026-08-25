/* Drifts the photograph against the scroll on phones — a light parallax, and the only
 * construction that reaches the two strips iOS paints outside the page area.
 *
 * Those strips take the nearest background in the ancestor chain at that screen edge,
 * and a background image counts. An element in front never does, which is why a fixed
 * layer could not fill them however it was sized, stacked or positioned. So the
 * photograph is the body's background here rather than a layer.
 *
 * iOS ignores background-attachment:fixed, so the position is set from here. Holding it
 * perfectly still that way looks broken — scroll events arrive late during a flick and
 * the picture lurches. Letting it drift instead turns that same lag into a little more
 * or less parallax, which nobody reads as a fault.
 *
 * Desktop keeps the fixed layer and is untouched.
 */
(() => {
  const PHONE = '(max-width: 647px)';
  const root = document.documentElement;
  const body = document.body;
  const num = (name, fallback) => {
    const v = parseFloat(getComputedStyle(root).getPropertyValue(name));
    return Number.isFinite(v) ? v : fallback;
  };
  const speed = Math.min(Math.max(num('--parallax-speed', 0.1), 0), 1);
  const drop = num('--backdrop-drop', 120);

  let queued = false;

  /* The picture must cover the screen plus everything it will drift over, or its bottom
     edge climbs into view at the end of the page. */
  function resize() {
    const maxScroll = Math.max(0, root.scrollHeight - innerHeight);
    body.style.backgroundSize = 'auto ' + Math.ceil(innerHeight + maxScroll * speed + drop) + 'px';
  }

  function sync() {
    queued = false;
    if (!matchMedia(PHONE).matches) {
      body.style.backgroundSize = '';
      body.style.backgroundPosition = '';
      return;
    }
    if (!body.style.backgroundSize) resize();
    /* Anchored to the document, so subtracting the scroll parks it at the top of the
       screen; keeping a fraction of the scroll makes it drift instead. */
    body.style.backgroundPosition = 'center ' + Math.round(scrollY * (1 - speed)) + 'px';
  }
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(sync); } };
  const relayout = () => { body.style.backgroundSize = ''; schedule(); };

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', relayout);
  addEventListener('load', relayout);
  if (window.visualViewport) {
    visualViewport.addEventListener('resize', relayout);
    visualViewport.addEventListener('scroll', schedule);
  }
  sync();
})();
