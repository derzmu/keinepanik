# Audio

Song files for the player. A track in `index.html` becomes playable by pointing
its `data-src` at a file in here:

```html
<button class="trk" data-src="assets/audio/wecker.mp3" data-cover="assets/img/wecker.gif">
```

Expected right now:

| File | Track |
|---|---|
| `wecker.mp3` | Wecker |

Durations are read from the files at load time — never write one into the markup.
A track whose file is missing or fails to load falls back to "bald" on its own,
so a wrong filename degrades quietly instead of offering a dead play button.

MP3 plays everywhere that matters. Keep the files reasonably small; the page has
no build step and serves them as they are.
