# Audio redo: real SFX + pre-baked announcer voices

Brandon, 2026-10-28, after Cooper played the retro-broadcast build: announcers and sound effects both sound bad. Browser text-to-speech and Web Audio beeps are not good enough. He chose pre-baked voice clips plus real SFX files (direction A). Design approved in chat before this write-up.

## Intent

Make hits, crowd, organ, and the booth sound like a real (kid-friendly) baseball game on a TV, without changing spelling rules, scoring, saving, or the parent zone. Cooper should want the next at-bat because it *sounds* good.

## Goals

- Replace synthesized SFX with a small royalty-free / CC0 (or owned) clip pack: crack, whiff, cheer, groan, walk chime, strike buzz, fanfare, organ charge / inning / walkup. Each effect keeps a pool of 3–4 variants with no immediate repeat.
- Keep Big Red Brannigan, Smooth Eddie Breeze, and Quiet Booth. Same rotating G-rated line lists. Pre-bake every spoken line to an audio file once; at play time play the clip instead of browser `speechSynthesis`.
- Keep the spelling **word** on its own clear speech path (existing word TTS), separate from booth commentary.
- Bake is a builder/parent script, not something Cooper runs. Missing clip → skip that commentary moment (quiet), never fall back to robotic TTS.
- Preload clips on the child's home screen so the first play is not silent.
- Document SFX sources in `AUDIO-CREDITS.md`.

## Non-goals and anti-goals

- No change to the engine, Store, API, PDF import, field animation rules, or parent PIN / lists.
- No imitation of real celebrities; characters stay original and G-rated.
- No slowing the game: a full play with commentary stays under about five seconds.
- No live paid TTS API at play time (Cooper's device stays offline-capable for commentary).
- No requirement to ship Quiet Booth clips (Quiet remains sounds-only).

## Decisions

- **Direction A:** pre-bake announcer lines + real SFX files.
- **Layout:** `public/audio/sfx/` for effect pools; `public/audio/announcers/{bigRed|smoothEddie}/` for line clips; a small manifest maps `(announcerId, event, lineIndex)` → relative path (and optional duration).
- **Runtime:** `Sfx` loads and plays buffers; `sayAs` resolves the picked line to a clip via the manifest and plays it; mouth flap / board text still key off play start and end.
- **Word speech:** unchanged clear path in `src/audio/speech.ts` for the spelling word only.
- **Bake script:** `scripts/bake-audio.mjs` reads announcer line lists + two voice profiles, writes clips + regenerates the manifest when lines change.
- **Voice tooling for the bake:** free or cheap offline/batch TTS chosen at bake time (exact engine left to the implementation plan / first bake pass). The runtime never depends on that engine.
- **Format:** compressed OGG (preferred) or MP3, sized for a PWA; only the two talking booths ship clips.
- **Tests:** unit tests stub audio; e2e still completes a play with sound on or off; no new dependency on real network TTS in CI.

## Architecture sketch

```
Child home → preload SFX + selected announcer clips
     ↓
Play event → engine decides outcome (unchanged)
     ↓
playSequence → sfx.crack()/cheer()/… (real buffers)
            → sayAs(id, event, ctx) → pick line → play clip from manifest
            → board text + mouth flap on clip start/end
```

## Success criteria

- Cooper (and Brandon) judge bat, crowd, and organ as clearly better than the beeps.
- Booth lines sound like a person, not a GPS, for both Big Red and Smooth Eddie.
- Quiet Booth still works (SFX only).
- Mute / volume settings still apply.
- `npm test` and `npm run e2e` stay green; family isolation and game rules unchanged.

## Out of scope for this spec (later)

- Custom domain, new game modes, OCR for scanned PDFs, rewriting line copy unless needed for bake length.
- Human VO recording (direction C) — not chosen; can replace baked clips later without changing runtime.

## Open item for the implementation plan

- Exact free/cheap bake TTS and the first SFX pack URLs/licenses (must be documented in `AUDIO-CREDITS.md` before merge).
