# keine Panik. — Einseiter

Static one-page site. No build step, no framework, nothing loaded from a CDN at
runtime — both webfonts and all four platform glyphs are in `assets/`. Open
`index.html` in a browser, or drop the whole folder on any web host.

## Structure
```
keine-panik-website/
├─ index.html            the page — markup only, no styling
├─ impressum.html        legal, no photograph, no gate
├─ datenschutz.html      legal, no photograph, no gate
├─ css/
│  ├─ base.css           document defaults: html, body, links, headings, backdrop
│  ├─ components.css     every component class on the page
│  └─ tokens/            colours, typography, spacing, effects, @font-face
├─ js/
│  ├─ gate.js            the pre-launch password curtain
│  ├─ app.js             the audio player (and the parked newsletter form)
│  └─ gigs.js            renders the live dates from assets/gigs.json
├─ tools/
│  ├─ validate-tokens.mjs  guards the rules below — CI runs it on every push
│  ├─ fetch-gigs.mjs       pulls the live dates; CI runs it hourly
│  └─ make-variants.mjs    rebuilds the served copies of the backdrop photograph
└─ assets/
   ├─ logo-offwhite.svg  brand logo (drawn as a CSS mask — see note)
   ├─ heartakreis.svg    the rotating hand-drawn mark (also a mask)
   ├─ favicon.svg        one heart out of heartakreis.svg (+ the two PNG sizes)
   ├─ icons/             the four platform glyphs
   ├─ fonts/             Sue Ellen Francisco (headings), Heebo (copy)
   ├─ gigs.json          the live dates, written by CI — never edited by hand
   ├─ audio/             song files — see the README in there
   ├─ downloads/         press files — see the README in there
   └─ img/magnolia.jpg   the one photograph the whole page runs on
                         (the master; the served copies sit beside it)
```

The seven stylesheets are linked one by one from `<head>`, in cascade order. They
used to be pulled in by an `@import` list in a `css/styles.css`, which cost seven
serialised round trips in the critical path — the browser cannot discover the second
file until it has fetched and parsed the first. As links they are fetched in
parallel. The order in `index.html` is the cascade order; keep it.

## The legal pages

`impressum.html` and `datenschutz.html` sit beside `index.html` and share its
stylesheets, tokens and footer. They carry **no** `#backdrop` and **no** gate: a legal
page is running text, the photograph would only cost legibility and 241KB, and an
Impressum is meant to be reachable. `data-page="legal"` on `<html>` puts the page on
cream all the way into the iOS strips.

The Art. 21 objection is set in capitals because the statute is; it is set smaller and
boxed so it does not shout down the rest of the page.

**The footer is now copied into three files.** There is no build step and no include —
that is the deliberate trade — so `validate-tokens.mjs` compares the three
`<footer class="site-footer">` blocks and fails if they drift apart. Change one, change
all three, and let the guard catch you when you forget.

## Deploy, and what `.gitignore` is doing here

`.gitignore` does nothing **for** the site. It never reaches a browser and it is not
a config file the page reads. It is an instruction to git alone: these paths are
never to be tracked — editor folders, `.DS_Store`, `node_modules`. Since everything
this site serves is checked in on purpose, that list is short and only covers what a
machine leaves lying around.

What it does **not** do is keep files out of the deploy. If the server checks the
repository out into the webroot, everything in it is served, including the parts the
page never asks for:

| Ships but is not part of the site | |
|---|---|
| `README.md` | **names the gate password.** Already in `js/gate.js` by design, but publishing it twice is worse than once |
| `assets/img/magnolia.jpg` | the 3.4MB master — never served by the page, still downloadable |
| `tools/`, `.github/`, `.gitignore` | build-time only |
| `assets/*/README.md` | notes for whoever adds the files |

None of it is secret and none of it breaks anything, but it is roughly 3.5MB of dead
weight on the server and a password sitting at a guessable URL. Two ways out:

- **rsync with an exclude list** — a GitHub Action builds nothing and copies only what
  the page needs. This is the cleaner one, and the exclude list is the table above.
- **`git pull` into the webroot** — simplest, and then add a server rule denying
  `/.git`, `/README.md`, `/tools`, `/.github`. On nginx that is one `location` block.

Either way the deploy stays a copy of the repository; there is nothing to build.

## The design system

Editing colours, type or spacing means editing `css/tokens/` — never the page.
Four rules keep that true, and `tools/validate-tokens.mjs` fails the build if one breaks:

1. **The markup carries no styling.** No `style=""` attributes, no `<style>` block —
   on any of the three pages. Markup names things; `css/components.css` styles them.
2. **Rules never hold raw values.** Every colour, spacing value, font size, weight,
   border width and opacity in `base.css` / `components.css` is a `var(--token)`.
   A value that has no token yet gets one added to `css/tokens/` first.
3. **Spacing lives on the scale.** Every padding, margin and gap resolves to one of
   the nine `--space-*` steps (4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96). Off-scale
   values are bugs, not nuances.
4. **Colour is never manufactured.** No `filter: invert()` or `brightness()` to turn
   a graphic white — paint it with a token. That is how the rotating mark ended up a
   different white from the wordmark.

Components read the **semantic** aliases (`--text-on-dark`, `--line-hairline`,
`--surface-dark`), not the raw palette (`--kp-cream`, `--kp-ink-12`). Retinting the
brand is then a change to the alias block in `css/tokens/colors.css` alone.

```
node tools/validate-tokens.mjs
```

Beyond the four rules it also checks that every `var()` resolves, that every
stylesheet `<link>` points at a file that exists, and that **every class name built
in `js/` has a rule behind it** — `gigs.js` writes markup, so a class renamed in CSS
and not in the script would leave the live dates unstyled with every other check
still passing.

It also lists tokens that are defined but unused. Those are not errors — the palette
and the type scale are deliberately wider than this one page needs.

## Contrast

The palette is checked against WCAG 2.2 AA, and two places needed the numbers rather
than the eye:

- **The dark surfaces are one colour.** The footer used to be pure `#000000` while
  the live band was `--kp-ink` `#231c17`. Two near-blacks a band apart read as a
  mistake rather than a decision, so `--surface-footer` now points at `--kp-ink` too
  and `--kp-black` is gone from the palette. Everything in the footer keeps a wide
  margin on the slightly lighter ground: wordmark and glyphs 16.39:1, the nav links
  8.78:1, the focus ring 4.02:1.
- **The focus ring is two rings.** Magnolia carries cream, mint, ink and black, but
  it sits at almost exactly the sky's luminance and would vanish on the follow icons.
  The cream halo covers precisely the surfaces magnolia cannot. On every surface on
  this page at least one of the two clears 3:1.

**One place is knowingly short: the sky band.** The white "Folgen" sits at 2.59:1 on
the sky and the off-white glyphs at 2.53:1, against a 3:1 minimum.

A scrim was tried and reverted, and the reason is worth keeping so nobody builds it
twice: a tint on `.band--sky` stops where the band stops, at about 195px, while the
sky carries on well past it. That leaves a hard horizontal edge straight across the
photograph — the exact kind of seam the rest of this file is about avoiding. **Any
darkening bounded by that band does the same.** `--overlay-photo-scrim` is still
defined and still unused; do not reach for it here.

If this gets fixed, it has to be fixed on the type and on the glyph files, not on the
picture: re-export the four SVGs in `assets/icons/` in a darker tone, and give the
heading a colour that clears the blue. The sky itself stays the flat `--kp-sky`.

`--text-on-dark-faint` is white at 50%, not 40%: at 40% it lands on 3.79:1 against
`--kp-ink`, and the labels using it ("Ausverkauft", "Gespielt") are 10–11px.

## Pre-launch gate

`js/gate.js` puts a password screen in front of the site. Password: `peinekanik`
(case- and whitespace-tolerant). Unlocking is remembered for the browser session.

**It is a curtain, not a lock.** The site is static, so `js/gate.js` — password
included — is served to anyone who requests it, and the gate is one devtools click
away. It keeps a work in progress out of sight; it protects nothing. Hashing the
password would only make that weakness harder to see, so it is stored in the clear.

Real protection is server-side, and it is usually one setting at the host:

| Host | Where |
|---|---|
| Apache | `.htaccess` + `.htpasswd` (HTTP Basic Auth) |
| Netlify | Site settings → Access control → Password protection |
| Vercel | Project settings → Deployment protection |
| Cloudflare Pages | Access policy |

GitHub Pages, where this is hosted, offers none of that — private Pages needs
Enterprise — so on Pages the curtain is the only option there is.

Impressum and Datenschutz in the footer point at the band's existing pages on
`keinepanikmusik.de`, which is allowed: they only have to be easy to reach, not to
live on this domain. Note that the Datenschutz there predates this site and says
nothing about the Bandsintown request — that needs a paragraph before launch.

**Nothing behind the gate runs.** Both `js/gigs.js` and `js/app.js` wait for the
`kp:unlock` event: no visitor IP reaches Bandsintown, and the player's duration probe
does not fetch track metadata, before someone is actually through. `app.js` used to
run regardless, which made this sentence untrue for the audio request.

**To remove the gate before launch:** delete `js/gate.js`, its `<script>` tag, the
`data-locked` attribute on `<html>`, the `robots` meta tag, the `#gate` block in
`index.html`, the gate rules in `css/components.css`, and the `data-locked` checks at
the bottom of `js/gigs.js` and `js/app.js`.

## The backdrop fassung, decided

The photograph could be read two ways on a phone and both shipped side by side for a
while, because only a real iPhone could decide between them:

| | What it did |
|---|---|
| **A**, kept | the photograph is the fixed `#backdrop` layer and stands still |
| **B**, dropped | the photograph is the body's background and scrolls with the page |

**A won.** B had no seam at all — the scrolling document's own background does reach
the strips iOS paints outside the page area, and it was perfectly smooth because
nothing ran per frame. But `cover` measures against the whole 3600px document rather
than a screen, so the picture came out magnified roughly six times, the first screen
was almost flat blue, and it moved with the page.

B is gone from the site: `js/variant.js`, the `?bg=scroll` parameter, the
`[data-bg="scroll"]` rules and the footer switch are all removed. It is in git history
if the trade ever needs looking at again.

## The player

`js/app.js` drives a real `<audio>` element: transport, progress rail and every
duration come from the file, not from a script pretending to play.

A track becomes playable by pointing `data-src` at a file in `assets/audio/`:

```html
<button class="trk" data-src="assets/audio/wecker.mp3" data-cover="assets/img/wecker.gif">
```

- `data-cover` is optional — without one the track keeps the magnolia, and a cover
  that fails to load falls back to it too, so a missing file never leaves a broken
  image in the panel.
- **Never write a duration into the markup.** It is read from the file on load.
- A track with no `data-src`, or whose file 404s, shows "bald", is not clickable, and
  is skipped by prev/next. If no track has a file, the transport disables itself.
- The rail seeks: click it, or focus it and use the arrow keys, `Home` or `End`.

Adding a song is therefore two steps: drop the file in `assets/audio/`, add
`data-src` to its row. Nothing else needs touching.

## The newsletter is parked

It is **off the page**, not deleted. The `<section>` sits commented out in
`index.html` behind a `PARKED:` marker; the `.news*` rules in `css/components.css`
and `initNewsletter()` in `js/app.js` are untouched and inert — the function finds no
`#nl` and returns straight away.

**To bring it back:** remove the comment markers around that section. Nothing else
changes. Both halves carry a note pointing at each other so neither gets tidied away
as an orphan.

**Why it went away:** there is no newsletter tool behind it. The form swallowed the
submit, showed "Passt. Schau in dein Postfach." and sent the address nowhere — a
promise the site could not keep, next to a consent checkbox for a processing that
never happened. Wire it to a provider before un-commenting.

## Live dates (Bandsintown)

**The browser never calls Bandsintown.** `tools/fetch-gigs.mjs` does, on a CI runner
once an hour, and commits the result as `assets/gigs.json`. `js/gigs.js` renders that
file. The visitor's browser only ever talks to this domain.

That is a privacy decision, not a caching one. A call from the page would hand every
visitor's IP, user agent and this site's origin to a US service before they had asked
for anything — a processing that would have to be declared in the Datenschutz,
justified under Art. 6(1)(f) and carried as a third-country transfer. Fetching at
build time removes the cause instead of documenting it, which is why the privacy
policy needs no paragraph about Bandsintown at all.

It also took one of the two things this site stored on the device with it: the
30-minute `sessionStorage` cache is gone, because an HTTP cache is what a static file
already has. The only remaining storage is the gate's unlock flag.

| | |
|---|---|
| Schedule | hourly, `0 * * * *`, plus every push to `main` |
| By hand | Actions tab → *gigs* → Run workflow, or `node tools/fetch-gigs.mjs` locally |
| Commits | only when the dates actually changed — a moved `fetchedAt` alone is not a commit |
| Config | `CONFIG` at the top of `tools/fetch-gigs.mjs` |

The `app_id` is **not** a secret. Bandsintown issues it as a public client identifier
and it travelled in the front-end code before this; it stays in the clear.

Only the fields the page renders are written out — `datetime`, the venue's name, city,
country and location, the offers, the event URL and title. The API returns a great
deal more; what is not written cannot be shipped.

**There is still no hand-maintained fallback.** If the file is missing (the workflow
has never run) or malformed, the block says so and links to Bandsintown rather than
showing dates nobody has checked. The old rule — stale dates on a band site are worse
than none — is better served by an hourly refresh than it was by a live call.

The block covers five states: dates listed · nothing booked · past dates (collapsed,
newest first) · file unreachable · loading. "Show anfragen" is offered in all of them.

Everything from the file reaches the DOM through `textContent`, never `innerHTML`. The
one exception is a row's `href`, which is checked for an `http(s)` scheme before it is
assigned — those URLs still originate at Bandsintown, only by way of the runner.

## The backdrop photograph

`#backdrop` is a real `<img>`, so `srcset` does the work: a phone fetches 241KB or
450KB, and the widest copy any screen can ask for is 916KB.

**The master is never served.** `assets/img/magnolia.jpg` is 2304×3456 at 3.4MB —
roughly five times less compressed per pixel than its own derivatives — and it used to
sit in the `srcset` as the 2304w entry, which is what desktop and retina fetched.
Every entry is now derived from it by `tools/make-variants.mjs` at one quality,
`magnolia-2304.jpg` included. The master stays as the source and is never rewritten:
re-encoding it in place would compound generation loss on every run.

`sizes` describes the **rendered** width, not the element width. `object-fit: cover` blows
the picture up past the viewport on a narrow screen — 556px of image across a 390px
element — so a plain `100vw` would fetch a file too small and it would look soft. Hence
`(max-width: 647px) 143vw, 100vw`.

After changing the master, rebuild the copies and commit them; the site has no build step:

```
node tools/make-variants.mjs
```

Measured after a rebuild: the photograph's **top** row is `#5eaacc`, exactly
`--kp-sky`, so that seam is closed. Its **bottom** row is around `#6f5553` — the fade
into the sky colour still has to be built into the picture. Re-encoding does not move
either edge.

## Paths
Font `src` URLs in `css/tokens/fonts.css` are relative to **that file**, so they read
`../../assets/fonts/…` — two levels up out of `css/tokens/`. Moving the tokens folder
means fixing those two lines. The mask URLs in `components.css` are relative to that
file instead, one level up: `../assets/…`.

## Notes
- **Fonts are woff2.** Same outlines, same variable axis, 172KB down to 79KB. The
  `.ttf` files are kept as the source; only the woff2 is served. Every browser that
  can run this page supports woff2, so there is no second format to fall back to.
- **Platform glyphs** are the band's own SVGs in `assets/icons/`, drawn pre-filled in
  off-white — they belong on the sky band and the black footer, not on cream. Both
  rows link to the same four destinations; changing one means changing the other.
  Tidal was dropped — the glyph is recoverable from git history if it returns.
- **Both brand marks are painted as CSS masks**, in `--text-on-dark`. Neither SVG
  carries a fill of its own, so rendering either as a plain `<img>` gives
  black-on-black in the footer. A mask clips the element, so both have to be empty
  elements rather than `<img>` tags — an `<img>` would paint its own black paths over
  the masked fill.
- **The standing photograph** is a `position: fixed` `<img>` (`#backdrop`) behind the
  content, not `background-attachment: fixed` — iOS ignores that outright. An element
  rather than a CSS background, and `object-fit: cover` does the job `background-size:
  cover` would. It is sized with `height: 100lvh` plus `--backdrop-drop`, **not**
  `inset: 0`: `inset: 0` follows the layout viewport, which is what made the picture
  rescale as the iOS browser bars slide.
  Nothing here runs on scroll. If you are about to add something that does, read the
  comment above `#backdrop` in `css/base.css` first — that is where an afternoon of
  measurements is written down.

- **viewport-fit=cover is load-bearing.** Without it iOS confines the page to the safe
  area and fills the rest — the status-bar band at the top, the home-indicator band at
  the bottom — with the root background colour. That was the strip along the top. With
  it the page paints there and the photograph runs to the edge. The `env(safe-area-inset-*)`
  padding in `css/components.css` is what keeps content clear of the hardware in exchange;
  the bands stay full-bleed on purpose.
- **`theme-color` is set to the sky.** It tints the browser's own chrome above the
  page, which is the one standard mechanism that was never tried in the round of
  measurements below. It does not address the in-page strips — that is what
  `viewport-fit=cover` is for — and it has not been checked on a device yet.
- **The strip behind the iOS bottom toolbar, and the status-bar band at the top,** stay
  sky-coloured, and the join is hidden in the photograph instead: it is authored to end in
  `#5daacd`. Its top row already does — measured, exactly `#5eaacc`; the bottom is where a
  fade has to be built into the picture. **This is settled — it cannot be solved in CSS.**
  Three requirements, and no two leave room for the third:
  1. to reach those bands, the picture must be the **scrolling element's** background;
  2. to stand still, a background must be repositioned every frame, since iOS refuses
     `background-attachment: fixed`;
  3. to scroll smoothly, nothing may run every frame.
  Drifting instead of standing still is the same per-frame work and the same stutter.
  Scrolling inside a container removes the JavaScript, but then `main` is the scroller, the
  bands fall back to the root colour, and Safari's address bar stops retracting.
  Measured and failed, each in its own commit: `inset: 0`, `100lvh`, a 120px overscan,
  `z-index: -1` and `0`, `position: sticky`, `viewport-fit=cover`, the photograph on `html`,
  a blurred stretched copy of it, opaque tint colours under the photograph, a JS-pinned and
  a JS-drifted `body` background, and the inner scroller. Also tested and disproved on the
  device: that `background-attachment: fixed` works on iOS if the `url()` is root-absolute
  or a full `https://` one. It does not — all three URL forms scroll.
  The one construction that *does* reach both strips is to give the scrolling document
  itself the background. That shipped as fassung B and was compared on a device; it
  costs the standing picture and a great deal of magnification, and it lost. Do not
  rediscover it as a new idea — it is in git history, already measured.

- **The favicon is one heart out of `heartakreis.svg`**, upright and centred, on a
  cream ground rather than transparent — the heart is ink on paper, and on a dark
  browser toolbar a transparent one would disappear. `favicon.svg` is what modern
  browsers use; `favicon-32.png` and `apple-touch-icon.png` cover iOS home screens
  and the few places that still refuse an SVG icon. Rebuilding them means rendering
  `favicon.svg` at 32 and 180.
- **The photograph carries a grain.** A fixed layer between it and the page
  (`body::after` in `base.css`), not noise rendered into the JPEG — high-frequency
  noise is what JPEG compresses worst, and baking it in would undo a good part of
  the 3.4MB → 916KB the served copies cost now. As a layer it costs no bytes.
  It is `position:fixed; inset:0`, covering exactly what `#backdrop` covers, so it
  has **no edge anywhere**. That is deliberate and it is the lesson from the scrim:
  a layer bounded by a band stops where the band stops and leaves a hard line across
  the picture. Do not re-hang this on a band.
  Everything on the page sits at `z-index:1` or above, so no text or control is ever
  grained — only the photograph and the sky. The legal pages are excluded; they are
  paper. Strength is `--grain-opacity`, one number; `--grain-tile` sets how fine it is.
- **Unreleased songs** sit in the tracklist without a `data-src`, which shows them as
  "bald" and makes them unclickable. Giving one a file and a `data-src` is all it
  takes to release it.

## Before launch

- [ ] Newsletter: only bring it back once a provider is behind it — see above
- [ ] The four files in `assets/downloads/` added (the rows 404 until then)
- [ ] **Move to Hetzner.** The Datenschutz names Hetzner as the host and promises an
      AVV. On GitHub Pages that section is untrue — and Pages can set no HTTP headers
      and no server-side password either
- [ ] Gate removed, and with it `robots: noindex`
- [ ] `og:` / `twitter:` tags — they need the final domain for an absolute image URL,
      which is why they are not in `<head>` yet
- [ ] Newsletter, when it is wired up, gets its own section in the Datenschutz
- [ ] The bottom edge of the photograph faded to the sky colour
- [ ] Decide the sky band: leave the white type as it is, or darken the four glyph
      files and the heading colour. Not by tinting the picture — see Contrast above
