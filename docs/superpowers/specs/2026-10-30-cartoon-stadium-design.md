# Cartoon stadium (Phase 1) design

Source: `2026-10-30-fun-overhaul-grok-brief.md` section 4. This doc records what this branch builds and how.

## Architecture

- `src/field/CartoonScene.ts`: a second `FieldController`. `FieldScene.ts` (pixel) is not modified.
- Phaser config for cartoon: 1280 by 960, `pixelArt: false`, `antialias: true`, `roundPixels: false`, FIT scaling.
- `src/field/Field.tsx` picks the scene. Build time: `VITE_FIELD=cartoon|pixel` (default `cartoon`). Run time: a hidden toggle stored in `localStorage` key `slugger.field` overrides the build value. The toggle lives on the kid home screen under "In the booth tonight": tap the heading five times to flip between cartoon and pixel. The heading briefly shows the current scene name.
- `src/field/manifest.ts`: typed view of `public/art/manifest.json`. Null coordinates fall back to defaults (the pixel layout scaled 4x). Reports missing assets so the scene draws placeholders.
- `src/field/camera.ts`: `pushIn(target, ms)`, `followBall(ms)`, `panToStands(ms)`, `reset(ms)`. Every duration goes through `motionScale`.
- `src/field/rig.ts`: stub in this PR. Placeholder batter is a shape. Real tinted RenderTexture rig lands with the art.

## Placeholders

Labeled colored shapes: sky, wall, stands, grass and dirt bands; batter as a rounded rect in the jersey color with the number; gray pitcher, catcher and seven fielders; white ball with a shadow. When manifest entries flip to `"status": "ready"` the scene uses them with no logic change (texture path is wired in a later PR).

## Plays (motionScale 1)

| Call | Placeholder behavior |
| --- | --- |
| playPitch | windup 250 ms, ball mound to plate 450 ms with shadow. Fires `pitchArrival`. |
| playStrike(1,2) | swing (or called strike one time in three), banner STRIKE ONE or TWO 900 ms |
| playStrike(3) | swing or called, punchout slump, banner STRIKE THREE |
| playHit(single) | contact flash, low arc to a random side, followBall 600 ms then reset, batter to first 900 ms, banner BASE HIT |
| playHit(double) | deeper arc to the wall (fires `wall`), runner to second 1400 ms, banner DOUBLE |
| playHit(homeRun) | high arc to `ballLeavesYard` (fires `leavesYard`), panToStands, trot 2200 ms, banner HOME RUN with shake |
| playWalk | jog to first 900 ms, forced runners advance, banner BALL FOUR |
| playInningEnd | fielders fade, banner THREE OUTS then NEW INNING |
| playGameOver | batter hops at home, banner GAME OVER |
| banner | cartoon banner (rounded panel, Fredoka) |

Every runner crossing home gets a small burst and fires `runScored` once.

## Beat hooks for Ballpark Sound (Phase 2)

Ballpark Sound owns Phase 2 SFX. The scene plays no sound. `FieldController` gains one optional field:

```ts
export type FieldBeat = 'pitchArrival' | 'contact' | 'wall' | 'leavesYard' | 'runScored'
onBeat?: (beat: FieldBeat) => void
```

- `pitchArrival`: ball reaches the plate.
- `contact`: bat contact frame.
- `wall`: a double hits the wall.
- `leavesYard`: a home run ball clears the wall.
- `runScored`: once per runner crossing home.

Fire and forget. Phase 2 sets `field.onBeat = ...` in `playSequence.ts`, keeping it the single choke point. `SequenceSfx` is unchanged. The pixel scene does not fire beats in this PR.

## Layout, performance

Score bug and caption as DOM over the canvas (section 4.4) wait for the SVG chrome art; existing Scoreboard test ids unchanged. Performance numbers (section 4.5) need real art and an iPhone; not measured on placeholders.

## Acceptance (section 4.6) status

- Nine methods, contract test against both scenes with motionScale 0: done.
- Placeholder build playable end to end: done.
- Atlas packer and tinted batters for three appearances: blocked on art.
- e2e on both scenes: run with `VITE_FIELD=pixel` and default.
- Nicole test list: in the PR.
