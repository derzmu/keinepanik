# keine Panik. — Einseiter

Static one-page site. No build step, no framework, no CDN at runtime except the
Heebo webfont (see below). Open `index.html` in a browser, or drop the whole folder
on any web host.

## Structure
```
keine-panik-website/
├─ index.html            the page — markup only, no styling
├─ css/
│  ├─ styles.css         the only stylesheet the page links; an @import list
│  ├─ base.css           document defaults: html, body, links, headings, backdrop
│  ├─ components.css     every component class on the page
│  └─ tokens/            colours, typography, spacing, effects, @font-face
├─ js/
│  ├─ gate.js            the pre-launch password curtain
│  ├─ variant.js         picks the backdrop fassung (pre-launch A/B)
│  ├─ app.js             the audio player and the newsletter form
│  └─ gigs.js            live dates, pulled from Bandsintown at page load
├─ tools/
│  ├─ validate-tokens.mjs  guards the rules below — run it before you commit
│  └─ make-variants.mjs    rebuilds the smaller copies of the backdrop photograph
└─ assets/
   ├─ logo-offwhite.svg  brand logo (drawn as a CSS mask — see note)
   ├─ heartakreis.svg    the rotating hand-drawn mark
   ├─ icons/             the four platform glyphs
   ├─ fonts/             Sue Ellen Francisco (headings), Heebo (copy)
   └─ img/magnolia.jpg   the one photograph the whole page runs on
                         (plus -1200 and -1800 copies for srcset)
```

## The design system

Editing colours, type or spacing means editing `css/tokens/` — never the page.
Three rules keep that true, and `tools/validate-tokens.mjs` fails the build if one breaks:

1. **`index.html` carries no styling.** No `style=""` attributes, no `<style>` block.
   Markup names things; `css/components.css` styles them.
2. **Rules never hold raw values.** Every colour, spacing value, font size and
   weight in `base.css` / `components.css` is a `var(--token)`. A value that has no
   token yet gets one added to `css/tokens/` first.
3. **Spacing lives on the scale.** Every padding, margin and gap resolves to one of
   the nine `--space-*` steps (4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96). Off-scale
   values are bugs, not nuances.

Components read the **semantic** aliases (`--text-on-dark`, `--line-hairline`,
`--surface-dark`), not the raw palette (`--kp-cream`, `--kp-ink-12`). Retinting the
brand is then a change to the alias block in `css/tokens/colors.css` alone.

```
node tools/validate-tokens.mjs
```

The validator also lists tokens that are defined but unused. Those are not errors —
the palette and the type scale are deliberately wider than this one page needs.

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

**To remove the gate before launch:** delete `js/gate.js`, its `<script>` tag, the
`data-locked` attribute on `<html>`, the `robots` meta tag, the `#gate` block in
`index.html`, the gate rules in `css/components.css`, and the `data-locked` check at
the bottom of `js/gigs.js`.

While the gate is up, nothing behind it runs — the Bandsintown request in particular
waits for the `kp:unlock` event, so no visitor IP reaches a US service before someone
is actually through.

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
- The rail seeks: click it, or focus it and use the arrow keys.

Adding a song is therefore two steps: drop the file in `assets/audio/`, add
`data-src` to its row. Nothing else needs touching.

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

To check the API by hand:
```
curl "https://rest.bandsintown.com/artists/id_15633413/events?app_id=<APP_ID>&date=upcoming"
```

**Privacy:** the request goes from the visitor's browser straight to Bandsintown, so
their IP reaches a US service. That belongs in `datenschutz` before this goes live.

## The backdrop photograph

`#backdrop` is a real `<img>`, so `srcset` does the work: a phone fetches 243KB or 458KB
where it used to fetch the 1MB master. 2304px is the master's width and the largest that
exists, so retina desktop is slightly short — as it was before.

`sizes` describes the **rendered** width, not the element width. `object-fit: cover` blows
the picture up past the viewport on a narrow screen — 556px of image across a 390px
element — so a plain `100vw` would fetch a file too small and it would look soft. Hence
`(max-width: 647px) 143vw, 100vw`.

After changing the master, rebuild the copies and commit them; the site has no build step:

```
node tools/make-variants.mjs
```

## Paths
Font `src` URLs in `css/tokens/fonts.css` are relative to **that file**, so they read
`../../assets/fonts/…` — two levels up out of `css/tokens/`. Moving the tokens folder
means fixing those two lines.

## Notes
- **Fully offline.** Nothing loads from a CDN: both webfonts and all four platform
  glyphs are in `assets/`.
- **Platform glyphs** are the band's own SVGs in `assets/icons/`, drawn pre-filled in
  off-white — they belong on the sky band and the black footer, not on cream. Both
  rows link to the same four destinations; changing one means changing the other.
  Tidal was dropped — the glyph is recoverable from git history if it returns.
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
- **The strip behind the iOS bottom toolbar, and the status-bar band at the top,** stay
  sky-coloured, and the join is hidden in the photograph instead: it is authored to end in
  `#5daacd`. Its top row already does, to within one value of green; the bottom is where a
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

- **The logo SVG carries no fill of its own**, so it is painted as a CSS mask in
  `--kp-cream`. Rendering it as a plain `<img>` gives black-on-black in the footer.
- **Placeholders to replace:** press download links (`#`), the footer Kontakt link (`#`),
  and the press contact address.
- **Unreleased songs** sit in the tracklist without a `data-src`, which shows them as
  "bald" and makes them unclickable. Giving one a file and a `data-src` is all it
  takes to release it.
