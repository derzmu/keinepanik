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

Until a file is here its row 404s on click. Renaming a file means renaming it in
`index.html` too — the two are not linked by anything cleverer than the path.

## Why in the repository and not somewhere else

Everything the site serves is checked in, so one `git pull` on the server is the
whole deploy. Keeping the photo pack on the server instead would mean a second path,
a second way to get it wrong, and an `rsync --exclude` that has to be remembered
every single time — forget it once and the pack is gone without anyone noticing.
One path beats two.

The size is fine. What matters is not the size alone but size × how often it changes,
and band photos change when there is a new shoot — roughly once a year:

| | |
|---|---|
| photo pack | ~35MB |
| logo pack | a few MB |
| the two PDFs | small |
| **per photo update** | **~35MB added to the history, permanently** |

Three shoots over the life of this site is around 100MB. GitHub warns at 50MB for a
single file and suggests keeping a repository under 1GB, so there is a lot of room.

Git does keep every version of every binary forever, though, and it never shrinks.
So: **rebuild the ZIPs for a release, not for every retouch.**

There is deliberately **no combined "everything" ZIP.** It would hold a second copy
of the same bytes — roughly doubling both the storage and the amount added on every
photo update — and it is the file everyone forgets to rebuild, which is how a press
kit ends up serving last year's photographs. Four rows, four files, each one current.

## Print-resolution photographs

`keine-panik-fotos.zip` is the print pack, so it holds the full-size files —
300 dpi, longest edge as shot, no downscaling. They are not what the page displays
and never pass through `tools/make-variants.mjs`: that script only rebuilds the
backdrop's screen copies from `assets/img/magnolia.jpg`.

Keep the loose originals out of this folder. Only the ZIP that the row offers
belongs here; a folder of stray 8MB JPEGs beside it gets deployed too and nothing
links to it.
