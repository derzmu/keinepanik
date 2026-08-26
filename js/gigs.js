/* Live dates, pulled from Bandsintown at page load.
 *
 * There is no static fallback: if the API cannot be reached the block says so
 * rather than showing dates nobody has checked.
 *
 * The app_id is not a secret — Bandsintown issues it as a public client
 * identifier and it is meant to travel in front-end code.
 */
const CONFIG = {
  appId: '497c6d21b4d5cea98fff71063aae4f4c',
  artist: 'id_15633413',                       // keine panik. — numeric id, not the name
  artistUrl: 'https://www.bandsintown.com/a/15633413',
  /* The artist page carries Bandsintown's own "Request a Show" button. If you
     have a direct deep link to that form, put it here instead. */
  requestShowUrl: 'https://www.bandsintown.com/a/15633413',
  api: 'https://rest.bandsintown.com',
  cacheMinutes: 30,
  pastLimit: 12,
};

const $ = sel => document.querySelector(sel);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

/* Bandsintown sends local venue time with no offset ("2026-03-13T20:00:00").
   Parsed by hand so no engine gets to guess at a timezone. */
function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(String(s || ''));
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
  return isNaN(d) ? null : d;
}

/* "MÄR", "JUN", "DEZ" — locale-driven, then trimmed to the three-letter form
   the design uses. Intl gives "März" and "Jan.", so strip the dot and cut. */
const monthShort = d =>
  new Intl.DateTimeFormat('de-DE', { month: 'short' })
    .format(d).replace(/\.$/, '').slice(0, 3).toUpperCase();

const yearShort = d => String(d.getFullYear()).slice(-2);
const pad2 = n => String(n).padStart(2, '0');

function ticketOffer(event) {
  const offers = Array.isArray(event.offers) ? event.offers : [];
  return offers.find(o => o && /ticket/i.test(o.type || '')) || offers[0] || null;
}

/* The city carries the line. The region is dropped — "Waging am See, BY" is
   noise to a German audience — and the country only earns its place when the
   show is abroad. */
function venueLine(event) {
  const v = event.venue || {};
  const abroad = v.country && !/^(germany|deutschland)$/i.test(v.country);
  if (v.city) return abroad ? `${v.city}, ${v.country}` : v.city;
  /* With no city, Bandsintown still sends location as ", Germany" — the empty
     city and its separator. Trim the orphaned comma before falling back. */
  const loc = String(v.location || '').replace(/^[\s,]+|[\s,]+$/g, '');
  return loc || v.country || '';
}

/* ---------- rendering ---------- */

/* The only value from the API that reaches a DOM sink rather than textContent.
   A javascript: or data: URL in an offer would run on click, so the scheme is
   checked rather than trusted. */
const safeUrl = u => (/^https?:\/\//i.test(String(u || '')) ? u : null);

function gigRow(event, { past }) {
  const date = parseDate(event.datetime);
  const offer = ticketOffer(event);
  const soldOut = /sold\s*out/i.test((offer && offer.status) || '');
  const href = (!past && !soldOut && offer && safeUrl(offer.url))
    || safeUrl(event.url)
    || CONFIG.artistUrl;

  const row = el('a', past ? 'gig gig--past' : 'gig');
  row.href = href;
  row.target = '_blank';
  row.rel = 'noopener';

  const day = el('span', 'day');
  if (date) {
    day.append(el('b', null, pad2(date.getDate())));
    day.append(el('span', null, `${monthShort(date)} ${yearShort(date)}`));
  }
  row.append(day);

  const v = el('span', 'v');
  v.append(el('b', null, (event.venue && event.venue.name) || event.title || 'Show'));
  const line = venueLine(event);
  if (line) v.append(el('span', null, line));
  row.append(v);

  if (past) {
    row.append(el('span', 'gig__note caps', 'Gespielt'));
  } else if (soldOut) {
    row.append(el('span', 'pill pill--off caps', 'Ausverkauft'));
  } else if (offer && safeUrl(offer.url)) {
    row.append(el('span', 'pill caps', 'Tickets'));
  } else {
    row.append(el('span', 'pill caps', 'Infos'));
  }
  return row;
}

function renderUpcoming(events) {
  const list = $('#gig-list');
  const count = $('#gig-count');
  const empty = $('#gig-empty');
  list.replaceChildren();

  if (!events.length) {
    count.textContent = 'Termine';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  count.textContent = `Termine · ${events.length}`;
  events.forEach(e => list.append(gigRow(e, { past: false })));
}

function renderPast(events) {
  const wrap = $('#gig-past');
  const list = $('#gig-past-list');
  const toggle = $('#gig-past-toggle');
  if (!events.length) { wrap.hidden = true; return; }

  list.replaceChildren();
  events.slice(0, CONFIG.pastLimit).forEach(e => list.append(gigRow(e, { past: true })));
  $('#gig-past-count').textContent = String(events.length);
  wrap.hidden = false;

  /* Bound once. A second render would otherwise stack a second handler on the
     same button, and the two would cancel each other out. */
  if (toggle.dataset.bound) return;
  toggle.dataset.bound = 'true';
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    list.hidden = open;
  });
}

function renderError() {
  $('#gig-list').replaceChildren();
  $('#gig-count').textContent = 'Termine';
  $('#gig-error').hidden = false;
}

/* ---------- fetching ---------- */

function cached(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { at, data } = JSON.parse(raw);
    if (Date.now() - at > CONFIG.cacheMinutes * 60000) return null;
    return data;
  } catch { return null; }
}

function cache(key, data) {
  try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data })); } catch { /* private mode */ }
}

async function load(when) {
  const key = `bit:${CONFIG.artist}:${when}`;
  const hit = cached(key);
  if (hit) return hit;

  const url = `${CONFIG.api}/artists/${encodeURIComponent(CONFIG.artist)}/events`
    + `?app_id=${encodeURIComponent(CONFIG.appId)}&date=${when}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Bandsintown ${when}: HTTP ${res.status}`);

  const body = await res.json();
  /* An artist with nothing on the calendar can come back as {} or as a warning
     object rather than an empty array. */
  const data = Array.isArray(body) ? body : [];
  cache(key, data);
  return data;
}

const byDate = dir => (a, b) => {
  const x = parseDate(a.datetime), y = parseDate(b.datetime);
  if (!x || !y) return 0;
  return dir * (x - y);
};

async function init() {
  if (!$('#gig-list')) return;

  /* getAttribute, not .href: the property returns the RESOLVED url, so on an
     http(s) page it always starts with "http" — even for href="#". Read through
     the property this fallback could never fire. */
  const links = [$('#gig-follow'), $('#gig-request'), $('#gig-error-link')];
  links.forEach(a => {
    if (a && !/^https?:\/\//i.test(a.getAttribute('href') || '')) a.href = CONFIG.artistUrl;
  });

  try {
    const [upcoming, past] = await Promise.allSettled([load('upcoming'), load('past')]);

    if (upcoming.status === 'fulfilled') {
      renderUpcoming(upcoming.value.slice().sort(byDate(1)));
    } else {
      console.warn(upcoming.reason);
      renderError();
    }

    if (past.status === 'fulfilled') {
      renderPast(past.value.slice().sort(byDate(-1)));
    } else {
      console.warn(past.reason);
    }
  } catch (err) {
    /* allSettled does not throw, but a render can. Without this the block would
       sit on "Termine werden geladen." for good. */
    console.warn(err);
    renderError();
  } finally {
    $('#gig-loading').hidden = true;
  }
}

/* Behind the pre-launch gate nothing is fetched: the request would send the
   visitor's IP to Bandsintown before they have even reached the page. */
if (document.documentElement.hasAttribute('data-locked')) {
  document.addEventListener('kp:unlock', init, { once: true });
} else {
  init();
}
