# keine Panik. — Einseiter

Static one-page site. No build step, no framework, nothing loaded from a CDN at
runtime — both webfonts and all four platform glyphs are in `assets/`. Open
`index.html` in a browser, or drop the whole folder on any web host.

## Structure
```
keine-panik-website/
├─ index.html            the page — markup only, no styling
├─ css/
│  ├─ base.css           document defaults: html, body, links, headings, backdrop
│  ├─ components.css     every component class on the page
│  └─ tokens/            colours, typography, spacing, effects, @font-face
├─ js/
│  ├─ gate.js            the pre-launch password curtain
│  ├─ variant.js         picks the backdrop fassung (pre-launch A/B)
│  ├─ app.js             the audio player and the newsletter form
│  └─ gigs.js            live dates, pulled from Bandsintown after unlock
├─ tools/
│  ├─ validate-tokens.mjs  guards the rules below — CI runs it on every push
│  └─ make-variants.mjs    rebuilds the served copies of the backdrop photograph
└─ assets/
   ├─ logo-offwhite.svg  brand logo (drawn as a CSS mask — see note)
   ├─ heartakreis.svg    the rotating hand-drawn mark (also a mask)
   ├─ icons/             the four platform glyphs
   ├─ fonts/             Sue Ellen Francisco (headings), Heebo (copy)
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

## The design system

Editing colours, type or spacing means editing `css/tokens/` — never the page.
Four rules keep that true, and `tools/validate-tokens.mjs` fails the build if one breaks:

1. **`index.html` carries no styling.** No `style=""` attributes, no `<style>` block.
   Markup names things; `css/components.css` styles them.
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

- **The sky band.** White type and the off-white glyphs sit at 2.59:1 and 2.55:1 on
  bare sky, which fails. `--overlay-photo-scrim` darkens the band under them to
  4.75:1 and 4.63:1. Its first stop is fully transparent and stays that way for
  `--backdrop-fade`, which is load-bearing: darkening the top edge would put the
  seam with the iOS status-bar strip straight back. The ramp coincides with the mask
  on `#backdrop`, so on a phone the band darkens at the rate the photograph emerges.
- **The focus ring is two rings.** Magnolia carries cream, mint, ink and black, but
  it sits at almost exactly the sky's luminance and would vanish on the follow icons.
  The cream halo covers precisely the surfaces magnolia cannot. On every surface on
  this page at least one of the two clears 3:1.

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

## The two backdrop fassungen (pre-launch A/B)

The photograph can be read two ways on a phone, and only a real iPhone can decide
between them, so both ship side by side. One page, one query parameter:

| | URL | What it does |
|---|---|---|
| **A** | `/` | the photograph is the fixed `#backdrop` layer and stands still |
| **B** | `/?bg=scroll` | the photograph is the body's background and scrolls with the page |

`js/variant.js` reads the parameter and puts `data-bg="scroll"` on `<html>`; the rules
sit in the mobile block of `css/base.css`. It is render-blocking for the same reason
`js/gate.js` is — the attribute has to be there before the first paint, or A paints and
is then swapped for B in front of the eye. The URL is the whole state; nothing is
remembered. Both fassungen carry a switch in the footer so the two can be compared a tap
apart.

**The trade, plainly.** A is the picture as composed, standing still, and iOS paints its
two strips (status bar, bottom toolbar) in the sky colour — the seam this whole exercise
is about. B has no seam at all, because the scrolling document's own background does reach
those strips, and it is perfectly smooth because nothing runs per frame; but `cover`
measures against the whole 3600px document rather than a screen, so the picture is
magnified roughly six times, the first screen is almost flat blue, and it moves with the
page. Desktop is untouched by either — the block is `max-width: 647px`.

Note B fetches one file more than it needs: the `#backdrop` `<img>` is `display: none` but
still loads its `srcset` pick. Not worth a script to prevent while this is temporary.

**Both go away at launch, together with the gate:** delete `js/variant.js`, its `<script>`
tag, the `.variant` nav in the footer and its rules, and keep whichever fassung won.

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

## The newsletter form is not wired up

**Deliberately, for now.** There is no newsletter tool behind it yet. `js/app.js`
swallows the submit, hides the form and shows "Passt. Schau in dein Postfach." — the
address is not sent anywhere and not stored anywhere.

That confirmation is a promise the site cannot currently keep, and the consent
checkbox asks for a processing that does not happen. **Connect it to a provider
before launch, or disable the form until there is one.**

## Live dates (Bandsintown)

`js/gigs.js` fills the "Live und in Farbe" block from the Bandsintown API on every
page load. Config sits at the top of that file: `appId`, the artist as
`id_15633413` (the numeric id is unambiguous, the name is not), and the artist URL.

The `app_id` is **not** a secret. Bandsintown issues it as a public client
identifier and it is meant to travel in front-end code, which is why this needs no
backend — their API sends `Access-Control-Allow-Origin: *`.

**There is no static fallback, by design.** If the API is unreachable the block says
so and links to Bandsintown rather than showing dates nobody has checked. Stale gig
dates on a band site are worse than none.

The block covers five states: dates listed · nothing booked · past dates (collapsed,
newest first) · API unreachable · loading. "Show anfragen" is offered in all of them.

Fetches are cached in `sessionStorage` for 30 minutes, so moving around the site does
not re-hit the API.

Everything from the API reaches the DOM through `textContent`, never `innerHTML`. The
one exception is a row's `href`, which is checked for an `http(s)` scheme before it is
assigned — an offer URL is the only value from outside that reaches a live sink.

To check the API by hand:
```
curl "https://rest.bandsintown.com/artists/id_15633413/events?app_id=<APP_ID>&date=upcoming"
```

**Privacy:** the request goes from the visitor's browser straight to Bandsintown, so
their IP reaches a US service. That belongs in `datenschutz` before this goes live.

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
  The one construction that *does* reach both strips is fassung B above: give the scrolling
  document itself the background. It costs the standing picture and a great deal of
  magnification, which is exactly why both fassungen are on the site to be compared.

- **Unreleased songs** sit in the tracklist without a `data-src`, which shows them as
  "bald" and makes them unclickable. Giving one a file and a `data-src` is all it
  takes to release it.

## Before launch

- [ ] Newsletter form connected to a provider, or disabled — see above
- [ ] The four files in `assets/downloads/` added (the rows 404 until then)
- [ ] Press contact address confirmed; the footer Kontakt link currently points at it
- [ ] Bandsintown named in the Datenschutz on `keinepanikmusik.de`
- [ ] Gate removed, and with it `robots: noindex` and both backdrop fassungen
- [ ] `og:` / `twitter:` tags and a favicon — both need the final domain, which is
      why they are not in `<head>` yet
- [ ] The bottom edge of the photograph faded to the sky colour
- [ ] Both fassungen compared on a real iPhone, and the scrim on the sky band looked
      at there — it is the one change in this pass that alters the picture
