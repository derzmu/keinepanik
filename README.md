[README.md](https://github.com/user-attachments/files/31411176/README.md)
# keine Panik. — Einseiter

Static one-page site. No build step, no framework, no CDN at runtime except the
Heebo webfont (see below). Open `index.html` in a browser, or drop the whole folder
on any web host.

## Structure
```
keine-panik-website/
├─ index.html            the page — markup, inline styles, ~40 lines of vanilla JS
├─ css/
│  ├─ styles.css         the only stylesheet the page links; an @import list
│  └─ tokens/            colours, typography, spacing, effects, @font-face
└─ assets/
   ├─ logo-offwhite.svg  brand logo (drawn as a CSS mask — see note)
   ├─ heartakreis.svg    the rotating hand-drawn mark
   ├─ icons/             the five platform glyphs
   ├─ fonts/             Sue Ellen Francisco (headings), Heebo (copy)
   └─ img/magnolia.jpg   the one photograph the whole page runs on
```

Editing colours, type or spacing means editing `css/tokens/` — never the page.

## Notes
- **Fully offline.** Nothing loads from a CDN: both webfonts and all five platform
  glyphs are in `assets/`.
- **Platform glyphs** are the band's own SVGs in `assets/icons/`, drawn pre-filled in
  off-white — they belong on the sky band and the black footer, not on cream.
- **The standing photograph** is a `position: fixed` layer (`#backdrop`), not
  `background-attachment: fixed` — iOS Safari ignores the latter.
- **The logo SVG carries no fill of its own**, so it is painted as a CSS mask in
  `--kp-cream`. Rendering it as a plain `<img>` gives black-on-black in the footer.
- **Placeholders to replace:** press download links (`#`), the press contact address,
  ticket links, social links, and the track titles "Song 3" / "Song 4".
