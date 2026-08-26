#!/usr/bin/env node
/* Fetches the live dates from Bandsintown and writes assets/gigs.json.
 * Run: node tools/fetch-gigs.mjs        (CI runs it hourly, see .github/workflows/gigs.yml)
 *
 * WHY THIS EXISTS. The page used to call the Bandsintown API from the visitor's
 * browser. That works and needs no backend, but it means every visitor's IP, user
 * agent and the origin of this site reach a US service before they have asked for
 * anything — a processing that would have to be declared, justified under Art. 6(1)(f)
 * and carried as a third-country transfer. Moving the call here removes the cause
 * rather than documenting it: the request now comes from a CI runner, and the browser
 * only ever talks to this site's own domain.
 *
 * The app_id is NOT a secret. Bandsintown issues it as a public client identifier
 * and it travelled in the front-end code before this. It stays in the clear.
 *
 * Only the fields the page actually renders are written out. The API returns a great
 * deal more; none of it is needed, and what is not written cannot be shipped.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const CONFIG = {
  appId: '497c6d21b4d5cea98fff71063aae4f4c',
  artist: 'id_15633413',          // keine panik. — numeric id, the name is not unambiguous
  api: 'https://rest.bandsintown.com',
  pastLimit: 12,                  // the page never shows more; no reason to carry more
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'assets/gigs.json');

/* The shape js/gigs.js reads. Anything not named here is dropped on purpose. */
const trim = e => {
  const v = e.venue || {};
  const offers = (Array.isArray(e.offers) ? e.offers : [])
    .map(o => ({ type: o?.type ?? null, url: o?.url ?? null, status: o?.status ?? null }))
    .filter(o => o.type || o.url || o.status);
  const row = {
    datetime: e.datetime ?? null,
    title: e.title ?? null,
    url: e.url ?? null,
    venue: { name: v.name ?? null, city: v.city ?? null, country: v.country ?? null, location: v.location ?? null },
  };
  if (offers.length) row.offers = offers;
  return row;
};

async function load(when) {
  const url = `${CONFIG.api}/artists/${encodeURIComponent(CONFIG.artist)}/events`
    + `?app_id=${encodeURIComponent(CONFIG.appId)}&date=${when}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Bandsintown ${when}: HTTP ${res.status}`);
  const body = await res.json();
  /* An artist with nothing on the calendar comes back as {} or as a warning object
     rather than an empty array. */
  return Array.isArray(body) ? body : [];
}

const byDate = dir => (a, b) => dir * (String(a.datetime || '').localeCompare(String(b.datetime || '')));

const [upcoming, past] = await Promise.all([load('upcoming'), load('past')]);

const data = {
  /* Rendered nowhere — it is here so a stale file is visible at a glance. */
  fetchedAt: new Date().toISOString(),
  upcoming: upcoming.map(trim).sort(byDate(1)),
  past: past.map(trim).sort(byDate(-1)).slice(0, CONFIG.pastLimit),
};

fs.writeFileSync(out, JSON.stringify(data, null, 2) + '\n');
console.log(`assets/gigs.json  ${data.upcoming.length} upcoming, ${data.past.length} past  (${(fs.statSync(out).size / 1024).toFixed(1)} KB)`);
