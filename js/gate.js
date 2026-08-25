/* Pre-launch gate.
 *
 * THIS IS NOT SECURITY. The site is static, so this file — password included —
 * is served to anyone who asks for it, and the gate is one devtools click away.
 * It keeps the work-in-progress out of sight; it does not protect anything.
 * Real protection is HTTP Basic Auth or the host's own password setting.
 * Hashing the password here would only make that weakness harder to see.
 *
 * Loaded render-blocking in <head> so an already-unlocked session never sees
 * the gate flash past.
 */
(() => {
  const PASSWORD = 'peinekanik';
  const KEY = 'kp:unlocked';
  const root = document.documentElement;

  const remembered = () => {
    try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; }
  };

  /* Nothing behind the gate may run — least of all the Bandsintown request,
     which would hand the visitor's IP to a US service before they are even in. */
  const announce = () => document.dispatchEvent(new CustomEvent('kp:unlock'));

  const wasOpen = remembered();
  if (wasOpen) root.removeAttribute('data-locked');

  document.addEventListener('DOMContentLoaded', () => {
    if (wasOpen) return announce();

    const form = document.getElementById('gate-form');
    const input = document.getElementById('gate-input');
    const error = document.getElementById('gate-error');
    if (!form || !input) return;

    input.focus();

    form.addEventListener('submit', e => {
      e.preventDefault();
      if (input.value.trim().toLowerCase() !== PASSWORD) {
        error.hidden = false;
        input.value = '';
        input.focus();
        return;
      }
      try { sessionStorage.setItem(KEY, '1'); } catch { /* private mode */ }
      root.removeAttribute('data-locked');
      announce();
    });

    input.addEventListener('input', () => { error.hidden = true; });
  });
})();
