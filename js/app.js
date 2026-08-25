/* Player mock-up and newsletter form. No dependencies, no build step. */
(() => {
  const rows = [...document.querySelectorAll('.trk')];
  const now = document.getElementById('now'), flag = document.getElementById('flag');
  const bar = document.getElementById('bar'), pos = document.getElementById('pos'), dur = document.getElementById('dur');
  const play = document.getElementById('play');
  let i = 0, playing = false, t = 0, timer = null;
  const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const len = () => +rows[i].dataset.d;
  function paint() {
    rows.forEach((r, n) => {
      r.setAttribute('aria-current', n === i ? 'true' : 'false');
      r.querySelector('.n').textContent = (n === i && playing) ? '▶' : String(n + 1);
    });
    now.textContent = rows[i].querySelector('.t').textContent;
    flag.textContent = playing ? 'läuft' : 'pause';
    play.textContent = playing ? '❙❙' : '▶';
    play.setAttribute('aria-label', playing ? 'Pause' : 'Abspielen');
    dur.textContent = fmt(len());
    pos.textContent = fmt(t);
    bar.style.width = (t / len() * 100) + '%';
  }
  function tick() {
    clearInterval(timer);
    if (!playing) return;
    timer = setInterval(() => { t = t + 1 > len() ? 0 : t + 1; paint(); }, 1000);
  }
  function select(n) { i = (n + rows.length) % rows.length; t = 0; playing = true; paint(); tick(); }
  rows.forEach((r, n) => r.addEventListener('click', () => select(n)));
  document.getElementById('prev').addEventListener('click', () => select(i - 1));
  document.getElementById('next').addEventListener('click', () => select(i + 1));
  play.addEventListener('click', () => { playing = !playing; paint(); tick(); });
  const nl = document.getElementById('nl');
  nl.addEventListener('submit', e => {
    e.preventDefault();
    nl.hidden = true;
    document.getElementById('nl-ok').hidden = false;
  });
  paint();
})();
