# audio-src

CC0 masters for `npm run process-audio`. Never edit files in `public/audio/sfx/` by hand; change the
master here and rerun the script.

- `sfx/<pool>/<pool>-<n>.<wav|flac|ogg|mp3|aif|aiff>`: one master per variant. `<pool>` matches a key of
  `POOL_SPEC` in `src/audio/sfx.ts` and `<n>` runs from 1 to that pool's `n`.
- `sfx/ambience/ambience-low.<ext>` and `ambience-high.<ext>`: seamless 30 to 60 second loops. Cut them
  on a zero crossing; the script does not trim them.
- `ir/stadium.<ext>`: short stadium or large outdoor impulse response for the voice bus reverb.
- Every file here has a row in `/AUDIO-CREDITS.md` before it is committed.
- Slice, fade or pitch edits happen before the file lands here; record them in the credits row.
