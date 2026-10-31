# Phase 4: retire the pixel field

Source of truth: `2026-10-30-fun-overhaul-grok-brief.md` section 7, Phase 4. This note records the calls made.

## Deleted
- `src/field/FieldScene.ts`, `figures.ts`, `sprites.ts` (and `sprites.test.ts`).
- `src/field/fieldChoice.ts` (and test): the `VITE_FIELD=pixel` build flag, the `slugger.field` device override and the scene switch.
- The hidden five-tap stadium toggle on the booth heading (child home).
- Pixel-only helpers in `layout.ts`: `basePoint`, `runnerPath`, `batterPlacement`, `infieldDiamond`, `grassStripes`, with their tests.
- Press Start 2P: the font load and `--font-pixel`. The welcome page does not need it either.
- The pixel `StadiumStrip` SVG on the welcome page.

## Kept
- `layout.ts`: `FIELD` (the manifest scales it into default coordinates), `Point`, `Base`, `Destination`, `basesDiff` (CartoonScene).
- `controller.ts`, `camera.ts`, `rig.ts`, `manifest.ts`, `playSequence.ts`, SequenceSfx: untouched.
- Booth announcer portraits (existing SVG art, pixel styled) in `Broadcast.tsx` and the picker. They are live character art, not the pixel field, and the brief does not retire them.
- A stale `slugger.field` localStorage value is now ignored; nothing reads it.

## Changed
- `Field.tsx` always mounts `CartoonScene`. `data-field-kind` is always `cartoon`.
- `.pixel-text` becomes `.board-text` and `.announce-pixel` becomes `.announce-board`, both in Fredoka 700. Sizes unchanged.
- Welcome hero: a still of the cartoon stadium, built by stacking the packed layers already in `public/art/stadium/` in manifest draw order (no near fence). No new art, no new image file.
- Audio: every sfx pool and booth clip is still referenced, so none were retired. `AUDIO-CREDITS.md` says so.
- README architecture updated; broadcast-look spec marked superseded.

## Verify
`npm test`, `npm run typecheck`, `npm run lint`, e2e game flow on desktop and iphone.
