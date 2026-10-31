# Phase 2: Ballpark Sound Design

**Status:** Approved by Brandon (sections 1 to 3), 2026-10-30.
**Brief:** `docs/superpowers/specs/2026-10-30-fun-overhaul-grok-brief.md` section 5.
**Branch for code:** `feat/ballpark-sound`, cut after Phase 1's `feat/cartoon-stadium` exists, rebased onto it before Martin QA.

## Overview

Replace the Kenney UI and jingle clips with real ballpark sound: bat, mitt, umpire, crowd, organ. Add a mixer so every spelling word stays clear over the crowd. Voices stay Edge TTS. The spelling engine does not change.

## Architecture

- `src/audio/clips.ts`: `ClipPlayer` keeps one `AudioContext` and the existing master gain (volume and mute). Lazy init adds four bus `GainNode`s into master: `sfx`, `crowd`, `music`, `voice`.
- `src/audio/mixer.ts`: bus names, duck constants, and the duck scheduler that `ClipPlayer` calls. This is the `mixer.ts` the brief names; the buses themselves live on `ClipPlayer`.
- `play(url, { bus, loop })` routes a buffer source to the named bus. `loop` is for ambience. Returns a handle with `stop()`.
- `src/audio/layering.ts`: timed SFX stacks per play. Pure scheduling, reusable by Phase 3 to replay one `SubmitEvent` outside the live game.
- `src/features/game/playSequence.ts` stays the single place that fires sound and motion for a play.

## Clip replacement map

From brief section 5.2.

| Pool | Today | Replace with | Variants | Bus |
| --- | --- | --- | --- | --- |
| `crack` | UI wood impact | real wood bat on ball | 4 | sfx |
| `crack-hr` (new) | none | louder, deeper wood bat for home runs | 3 | sfx |
| `ping` (new, optional) | none | aluminum bat for singles; off until Brandon says yes | 3 | sfx |
| `whiff` | cloth rustle | bat swish through air | 4 | sfx |
| `mitt` (new) | none | catcher's mitt pop | 4 | sfx |
| `ump-strike` (new) | none | umpire "strike" | 4 | sfx |
| `ump-strike3` (new) | none | umpire strike three call | 3 | sfx |
| `strikeBuzz` | UI error beep | removed | 0 | none |
| `walkChime` | UI confirm beep | removed | 0 | none |
| `ump-ball4` (new) | none | umpire "ball four" | 3 | sfx |
| `cheer-small`, `cheer-big`, `cheer-hr` | hall applause | stadium crowd roar, three sizes | 3 each | crowd |
| `groan` | pitched shout | real stadium groan | 3 | crowd |
| `organ-charge` | steel drum | Hammond "charge" | 3 | music |
| `organ-walkup` | 8-bit jingle | short organ walk-up riffs | 4 | music |
| `organ-inning` | pizzicato | organ inning-change riff | 3 | music |
| `fanfare` | sax jingle | stadium PA sting, home run and game over | 3 | music |
| `ambience` (new) | none | crowd murmur loop, 30 to 60 s seamless, low and high | 2 | crowd |
| `ball-wall` (new) | none | ball off the outfield wall, doubles | 2 | sfx |

## Mixing and ducking

- Voice bus chain: source, voice gain, then split dry plus a `ConvolverNode` (CC0 short stadium IR) at 12 percent wet, both into master.
- Duck: when any voice source starts, `crowd` ramps down 15 dB and `music` ramps down 18 dB over 80 ms. When the last voice source ends, they recover over 400 ms. Overlapping voices keep the duck held (reference count).
- Booth `sayAs` and baked `sayWord` both call `clips.play(url, { bus: 'voice' })`. Word MP3s move off `HTMLAudioElement` onto the graph, so they get ducking and reverb.
- `speechSynthesis` fallback cannot enter the graph. It calls `mixer.duckStart()` on `onstart` and `mixer.duckEnd()` on `onend` or `onerror`. No reverb.
- Level-match the two booth voices within 1 dB (brief 5.3).
- Master volume and mute stay on the existing master gain.

## Layering

`SequenceSfx` drops `strikeBuzz` and `walkChime` and adds `mitt`, `umpStrike`, `umpStrike3`, `umpBall4`, `ballWall`, `crackHomeRun`, `cheerSmall`, `cheerBig`, `cheerHr`. The `cheer()` method is replaced by the three sizes. The test double in `playSequence.test.ts` updates in the same PR.

Stacks in `layering.ts`. Offsets pass through `motionScale` from `src/features/game/timing.ts`, so tests run fast under `VITE_NO_ANIMATION=1`.

| Play | Stack |
| --- | --- |
| Hit | `crack` at 0, cheer at +120 ms, `organ-charge` if runs scored |
| Double | hit stack plus `ball-wall` at +700 ms |
| Home run | `crack-hr` at 0, `cheer-hr` at +200 ms, `fanfare` at +1200 ms |
| Strike | `whiff` or `mitt`, plus `ump-strike` |
| Strikeout | `ump-strike3` plus `groan`, no extra mitt |
| Walk | `mitt` plus `ump-ball4` |

- One-cheer rule (Jack Dalton spec): at most one cheer per play. `cheer-big` or `cheer-hr` only on a home run or 2+ runs. A single run, or a hit with no runs, gets `cheer-small`.
- Mitt vs whiff is decided in `playSequence`, not in Phase 1 scene code, so the sound never depends on random animation choice.

### Ambience

- Starts low when the game screen mounts. Swaps to high when any runner is on base, back to low when bases clear. Stops on the results screen.
- Driven from game session hooks (`GamePage`), not from field components.
- Quiet Booth keeps ambience and SFX, removes only voices. Speaker mute silences everything, ambience included.

## Assets, licensing, process-audio

- CC0 only (Brandon, 2026-10-30). Sources: freesound CC0 filter, OpenGameArt CC0, Sonniss GDC bundles where app redistribution is allowed. No paid packs.
- Not allowed: CC-BY-NC, attribution-in-UI licenses, anything ripped from video, real broadcast or real PA recordings.
- If no free umpire or Hammond organ clip is good enough, that pool ships as a stub (see Open questions).
- Delete all Kenney files and the current non-ballpark cheer and groan files, plus their `AUDIO-CREDITS.md` rows.
- Every new file gets a credits row: folder, file, source URL, author, license, processing.
- Masters live in `audio-src/`. `npm run process-audio` regenerates `public/audio/sfx/`: trim leading silence, loudnorm to about -16 LUFS, mono, Ogg Vorbis q5. Ambience loops keep their loop points.
- `public/audio/sfx/` stays under 4 MB total.
- Preload on the home screen covers the new pools. The no-repeat picker in `pool.ts` stays.

## File map

| File | Change |
| --- | --- |
| `src/audio/clips.ts` | buses, `play(url, { bus, loop })`, stop handles |
| `src/audio/mixer.ts` (new) | bus names, duck constants, duck scheduler |
| `src/audio/mixer.test.ts` (new) | duck curve with fake `AudioContext` |
| `src/audio/layering.ts` (new) | per-play stacks and offsets |
| `src/audio/layering.test.ts` (new) | order, offsets, one-cheer rule |
| `src/audio/sfx.ts` | new pools, bus per pool, ambience start/stop/intensity |
| `src/audio/announcer.ts` | `sayAs` on voice bus |
| `src/audio/word-audio.ts` | baked words on voice bus via `ClipPlayer` |
| `src/audio/speech.ts` | duck start/end around `speechSynthesis` |
| `src/audio/preload.ts` | new pools |
| `src/features/game/playSequence.ts` | new `SequenceSfx`, mitt vs whiff, calls `layering.ts` |
| `src/features/game/playSequence.test.ts` | test double update |
| `src/features/game/GamePage.tsx` | ambience lifecycle and intensity |
| `scripts/process-audio.mjs` (new), `package.json` | `process-audio` script |
| `audio-src/` (new) | masters |
| `public/audio/sfx/` | replaced clips |
| `AUDIO-CREDITS.md` | rows replaced |

## Out of scope

- Spelling engine rules, word lists, Store, API.
- Voice changes. Booth and words stay Edge TTS; no rebake (Phase 3 owns booth lines).
- Character art or any generated art.
- Phase 1 motion and scene code beyond the mitt vs whiff call site.
- `ping` until Brandon says yes.
- Paid sound packs.

## Acceptance

- No file under `public/audio/sfx/` is from a UI or jingle pack.
- `AUDIO-CREDITS.md` has a row for every file. `npm run process-audio` reproduces them.
- No-repeat picker holds. Preload covers new pools. `public/audio/sfx/` under 4 MB.
- Unit tests: duck curve, layering order and offsets, one-cheer rule, ambience intensity switching.
- Gates: `npm test`, typecheck, lint, e2e all pass.
- Nicole's check: one game with sound on. Strike sounds like a mitt and an umpire, hit like a bat, home run like a stadium, every spelling word clear over the crowd.
- PR goes to Martin with link and checklist before merge or publish.

## Open questions

1. **Mitt vs whiff with Phase 1.** Grand Slam Spelling agrees the decision lives in `playSequence` and is passed to the field controller, not chosen by the scene. Confirm the hook shape once `feat/cartoon-stadium` exists.
2. **Walk-up call site.** `organ-walkup` needs a trigger at batter change. Today that sits near the at-bat start in `GamePage`. Confirm whether Phase 1 moves batter change, and keep the call in one place.
3. **IR sourcing.** Need a CC0 short stadium or large outdoor IR. If none is found, ship a dry voice bus (reverb off) and note it in the PR.
4. **Stub policy.** A stub pool has zero files and plays nothing; the layer is skipped with no error and no fallback beep. Stubs are listed in the PR and in `AUDIO-CREDITS.md` as "pending, CC0 search failed". Most likely candidates: `ump-*` and `organ-*`.
