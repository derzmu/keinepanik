/* Holds the body's background photograph against the scroll, so it lines up with the
 * still photograph in front of it.
 *
 * Why the body carries a second copy at all: the two strips iOS paints outside the page
 * area — behind the status bar and behind the bottom toolbar — take the nearest
 * background in the ancestor chain at that edge. A background image counts there;
 * #backdrop, being an element in front rather than a background behind, never does.
 * So the strips can only get the picture this way.
 *
 * iOS ignores background-attachment:fixed, hence doing it here. The screen itself is
 * covered by #backdrop, which is genuinely fixed, so any lag in this tracking is only
 * ever visible in the strips.
 *
 * Phones only — see the media query in css/base.css.
 */
(() => {
  const PHONE = '(max-width: 647px)';
  const body = document.body;
  let queued = false;

  function sync() {
    queued = false;
    if (!matchMedia(PHONE).matches) { body.style.backgroundPosition = ''; return; }
    /* The background sits at the document top, so moving it down by the scroll offset
       parks it at the top of the viewport — the same place #backdrop occupies. */
    body.style.backgroundPosition = 'center ' + Math.round(scrollY) + 'px';
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
