# Downloads

The files behind the "Downloads" block in `index.html`. Same principle as
`assets/audio/`: the file lives here, the markup points at it by name, and there
is nothing else to configure — no build step, no upload panel, no CDN.

Expected, under exactly these names:

| File | Row | Status |
|---|---|---|
| `keine-panik-fotos.zip` | Fotos — JPG, druckfähig | **fehlt noch** |
| `keine-panik-logo.zip` | Logo — hell und dunkel, SVG/PNG/PDF | **fehlt noch** |
| `keine-panik-promotexte.pdf` | Promotexte — Kurz- und Langversion | **fehlt noch** |
| `keine-panik-rider.pdf` | Rider — Technik und Backline | **fehlt noch** |
| `keine-panik-presskit.zip` | Alles als ZIP — enthält alle vier oben | **fehlt noch** |

Until a file is here its row 404s on click. Renaming a file means renaming it in
`index.html` too — the two are not linked by anything cleverer than the path.

## Why in the repository and not somewhere else

Everything the site serves is checked in, so one `git pull` on the server is the
whole deploy. Splitting the press files off to object storage would mean a second
place to keep in step, a second set of credentials, and a URL that rots
independently of the page pointing at it. For a handful of files that is a worse
trade than the repository size.

**Where that stops being true:** git keeps every version of every binary forever.
Replacing a 40MB photo pack five times leaves 200MB in the history permanently, and
it never shrinks. So:

- regenerate the ZIPs for a release, not on every retouch;
- keep any single file under ~25MB if you can;
- if the photo pack outgrows that, leave the ZIP out of git and copy it to the
  server separately — the rest of this folder can stay as it is.

## Print-resolution photographs

`keine-panik-fotos.zip` is the print pack, so it holds the full-size files —
300 dpi, longest edge as shot, no downscaling. They are not what the page displays
and never pass through `tools/make-variants.mjs`: that script only rebuilds the
backdrop's screen copies from `assets/img/magnolia.jpg`.

Keep the loose originals out of this folder. Only the ZIP that the row offers
belongs here; a folder of stray 8MB JPEGs beside it gets deployed too and nothing
links to it.
