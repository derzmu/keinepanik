/* The player and the newsletter form. No dependencies, no build step.
 *
 * Audio is real: transport, progress and every duration come from the <audio>
 * element. Nothing here invents a running time. A track is playable when it
 * carries data-src and the file behind it actually loads; anything else is
 * announced as "bald" rather than pretending to play.
 *
 * Nothing in here runs behind the pre-launch gate — see the bottom of the file.
 * The duration probe fetches metadata from every track file, which is a request
 * on a page the visitor has not been let into yet.
 */
function initPlayer() {
  const audio = document.getElementById('audio');
  const rows = [...document.querySelectorAll('.trk')];
  if (!audio || !rows.length) return;

  const now = document.getElementById('now');
  const cover = document.getElementById('cover');
  const flag = document.getElementById('flag');
  const bar = document.getElementById('bar');
  const seek = document.getElementById('seek');
  const pos = document.getElementById('pos');
  const dur = document.getElementById('dur');
  const play = document.getElementById('play');
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');

  const defaultCover = cover.getAttribute('src');
  const fmt = s => (Number.isFinite(s) ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '–:––');
  const playable = r => !!r.dataset.src && r.dataset.broken !== 'true';
  const playableRows = () => rows.filter(playable);

  let i = rows.findIndex(playable);
  if (i < 0) i = 0;

  /* ---------- painting ---------- */
  function paint() {
    rows.forEach((r, n) => {
      const current = n === i;
      r.setAttribute('aria-current', current ? 'true' : 'false');
      r.querySelector('.n').textContent = (current && !audio.paused) ? '▶' : String(n + 1);
      r.classList.toggle('trk--soon', !playable(r));
      r.disabled = !playable(r);
    });

    /* Re-checked on every paint, not once at startup: a file that turns out to
       be missing takes its track down with it, and the last one takes the
       transport. */
    const count = playableRows().length;
    [play, prev, next].forEach(b => { b.disabled = count === 0; });
    /* With a single song there is nothing to skip to, so skip buttons that would
       only restart it are not shown at all. They come back with the next track. */
    [prev, next].forEach(b => { b.hidden = count < 2; });

    const row = rows[i];
    now.textContent = row.querySelector('.t').textContent;
    cover.setAttribute('src', row.dataset.cover || defaultCover);

    if (!playable(row)) {
      flag.textContent = 'bald';
      play.textContent = '▶';
      play.setAttribute('aria-label', 'Abspielen');
      return;
    }
    flag.textContent = audio.paused ? 'pause' : 'läuft';
    play.textContent = audio.paused ? '▶' : '❙❙';
    play.setAttribute('aria-label', audio.paused ? 'Abspielen' : 'Pause');
  }

  function paintTime() {
    /* Before play is pressed the <audio> element holds no file, so its duration
       is unknown — but the tracklist probe already read it. Show that instead of
       a dash next to a row that plainly states the running time. */
    const d = Number.isFinite(audio.duration) ? audio.duration : Number(rows[i].dataset.dur);
    const t = audio.currentTime;
    pos.textContent = fmt(t);
    dur.textContent = fmt(d);
    const ratio = Number.isFinite(d) && d > 0 ? t / d : 0;
    bar.style.width = (ratio * 100) + '%';
    seek.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
    seek.setAttribute('aria-valuetext', fmt(t));
  }

  /* ---------- transport ---------- */
  function select(n, autoplay) {
    const list = playableRows();
    if (!list.length) return;
    /* Skip over anything not playable, in whichever direction we were headed. */
    const step = n > i ? 1 : -1;
    let target = (n + rows.length) % rows.length;
    let guard = rows.length;
    while (!playable(rows[target]) && guard--) target = (target + step + rows.length) % rows.length;
    if (!playable(rows[target])) return;

    i = target;
    audio.src = rows[i].dataset.src;
    audio.currentTime = 0;
    paint();
    paintTime();
    if (autoplay) audio.play().catch(() => paint());
  }

  function toggle() {
    if (!playable(rows[i])) return;
    if (!audio.src) { select(i, true); return; }
    if (audio.paused) audio.play().catch(() => paint()); else audio.pause();
  }

  play.addEventListener('click', toggle);
  prev.addEventListener('click', () => select(i - 1, !audio.paused));
  next.addEventListener('click', () => select(i + 1, !audio.paused));
  rows.forEach((r, n) => r.addEventListener('click', () => select(n, true)));

  audio.addEventListener('play', paint);
  audio.addEventListener('pause', paint);
  audio.addEventListener('timeupdate', paintTime);
  audio.addEventListener('loadedmetadata', paintTime);
  audio.addEventListener('ended', () => select(i + 1, true));

  /* A file that will not load must not sit there looking playable. */
  audio.addEventListener('error', () => {
    rows[i].dataset.broken = 'true';
    rows[i].querySelector('.d').textContent = 'bald';
    paint();
  });

  /* ---------- seeking ---------- */
  function seekTo(ratio) {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    audio.currentTime = Math.max(0, Math.min(1, ratio)) * audio.duration;
    paintTime();
  }
  seek.addEventListener('click', e => {
    const box = seek.getBoundingClientRect();
    seekTo((e.clientX - box.left) / box.width);
  });
  /* Home and End are part of the ARIA slider pattern, not an extra: a keyboard
     user expects them to reach the ends of the range. */
  seek.addEventListener('keydown', e => {
    if (!Number.isFinite(audio.duration)) return;
    const nudge = { ArrowLeft: -5, ArrowRight: 5, ArrowDown: -5, ArrowUp: 5 }[e.key];
    let target = null;
    if (nudge != null) target = audio.currentTime + nudge;
    else if (e.key === 'Home') target = 0;
    else if (e.key === 'End') target = audio.duration;
    if (target == null) return;
    e.preventDefault();
    audio.currentTime = Math.max(0, Math.min(audio.duration, target));
    paintTime();
  });

  /* ---------- durations, read from the files ---------- */
  rows.filter(r => r.dataset.src).forEach(r => {
    const probe = new Audio();
    probe.preload = 'metadata';
    probe.addEventListener('loadedmetadata', () => {
      r.dataset.dur = String(probe.duration);
      r.querySelector('.d').textContent = fmt(probe.duration);
      paintTime();
    });
    probe.addEventListener('error', () => {
      r.dataset.broken = 'true';
      r.querySelector('.d').textContent = 'bald';
      paint();
    });
    probe.src = r.dataset.src;
  });

  /* A cover that is not there yet must not leave a broken image in the panel. */
  cover.addEventListener('error', () => {
    if (cover.getAttribute('src') !== defaultCover) cover.setAttribute('src', defaultCover);
  });

  paint();
  paintTime();
}

/* ---------- newsletter ----------
 * There is no newsletter tool behind this yet: the submit is swallowed, the
 * confirmation is shown, and the address goes nowhere. That is deliberate and
 * temporary — see the note in index.html. Wire it to a provider before launch.
 */
function initNewsletter() {
  const nl = document.getElementById('nl');
  if (!nl) return;
  nl.addEventListener('submit', e => {
    e.preventDefault();
    nl.hidden = true;
    document.getElementById('nl-ok').hidden = false;
  });
}

/* Behind the pre-launch gate nothing here runs — the duration probe would fetch
   track metadata for a visitor who has not been let in yet. Same handshake as
   js/gigs.js: gate.js clears data-locked synchronously for a remembered session,
   and fires kp:unlock when someone gets through. */
function start() {
  initPlayer();
  initNewsletter();
}

if (document.documentElement.hasAttribute('data-locked')) {
  document.addEventListener('kp:unlock', start, { once: true });
} else {
  start();
}
