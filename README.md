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
│  ├─ app.js             the player mock-up and the newsletter form
│  └─ gigs.js            live dates, pulled from Bandsintown at page load
├─ tools/
│  └─ validate-tokens.mjs  guards the rules below — run it before you commit
└─ assets/
   ├─ logo-offwhite.svg  brand logo (drawn as a CSS mask — see note)
   ├─ heartakreis.svg    the rotating hand-drawn mark
   ├─ icons/             the five platform glyphs
   ├─ fonts/             Sue Ellen Francisco (headings), Heebo (copy)
   └─ img/magnolia.jpg   the one photograph the whole page runs on
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

## Paths
Font `src` URLs in `css/tokens/fonts.css` are relative to **that file**, so they read
`../../assets/fonts/…` — two levels up out of `css/tokens/`. Moving the tokens folder
means fixing those two lines.

## Notes
- **Fully offline.** Nothing loads from a CDN: both webfonts and all five platform
  glyphs are in `assets/`.
- **Platform glyphs** are the band's own SVGs in `assets/icons/`, drawn pre-filled in
  off-white — they belong on the sky band and the black footer, not on cream.
- **The standing photograph** is a `position: fixed` layer (`#backdrop`), not
  `background-attachment: fixed` — iOS Safari ignores the latter. Because that layer sits
  at `z-index: -1`, `body` must stay `background: transparent`; the sky fallback lives on
  `html`. Giving `body` a background hides the photo completely.
- **The logo SVG carries no fill of its own**, so it is painted as a CSS mask in
  `--kp-cream`. Rendering it as a plain `<img>` gives black-on-black in the footer.
- **Placeholders to replace:** press download links (`#`), the press contact address,
  ticket links, social links, and the track titles "Song 3" / "Song 4".
