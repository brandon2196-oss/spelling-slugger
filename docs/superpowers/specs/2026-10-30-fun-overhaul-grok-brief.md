# Grand Slam Spelling: fun overhaul brief for the build bots

**Date:** 2026-10-30
**Owner:** Brandon (product). Nicole (playtest lead). Cooper (the player).
**Status:** Approved design, ready for Phase 0 and Phase 1 to start.
**Audience:** The autonomous build bots (Grok) working in this repo, and the artist who draws the assets.

This document is the whole instruction set. Read all of it before starting any phase. When this document and the code disagree, this document wins. When this document and Brandon disagree, Brandon wins.

---

## 0. The problem, in one paragraph

The game works. The spelling rules, the parent zone, the word audio, the accounts, the tests: all solid. What is wrong is what an 8 year old sees and hears. The field is a 320 by 240 canvas of code-drawn blobs with no ball, no swing, no fielders and no outfield. A hit is a yellow word over the field while runners teleport. The sound effects are interface beeps from a UI pack: a "confirmation" chime for a walk, an "error" buzz for a strike, a cloth rustle for a whiff, steel-drum jingles standing in for a ballpark organ. The announcers are flat text-to-speech. Nicole's verdict after family playtests: terrible audio and graphics. Her direction across the last nine pull requests has been consistent: straight baseball, no camp, real feedback, hard words worth more. This brief finishes that direction by replacing the presentation layer and adding just enough stakes that the score matters.

## 1. Decisions already made (do not reopen)

| Topic | Decision |
| --- | --- |
| Art direction | Clean modern cartoon. Thick outlines, flat shading, bright stadium. Think a Nintendo Switch kids' sports title, not retro pixels. |
| Who draws | Brandon supplies the art through an artist, built to the contract in section 3. Bots never generate, buy or scrape character art. |
| Sound effects | Real recorded ballpark sound from licensed libraries replaces every current clip. |
| Voices | Unchanged. Big Red Brannigan and Jack Dalton keep their Edge TTS baked clips. Spelling words stay on Jenny with browser speech fallback. No paid voice service. |
| Stakes | Light. An opposing team that scores, a season record per kid, a ten second end-of-game highlight. No new spelling rules, no fielding or baserunning choices, no unlockables. |
| Structure | Four ordered phases, one PR each, after a Phase 0 that writes the asset contract. No big-bang PR. |
| Merge and publish | Nothing merges or publishes without Brandon's explicit yes, in writing, per PR. Bots never deploy to Replit. |
| Rules that never change | Grading, strikes, outs, innings, difficulty ladder, word selection, family isolation, parent PIN, data model (except the additive fields in Phase 3). |

## 2. The seams in the code you will build against

Read these files first. They are the only places the presentation touches the game.

- `src/field/controller.ts`: the `FieldController` interface. Nine methods. Everything the game screen may ask the stadium to show. The field never decides outcomes; it animates what the engine already decided. Phase 1 implements this interface a second time.
- `src/field/Field.tsx`: mounts one Phaser game into a 4:3 box and hands the scene to the game page through `controllerRef`. Phase 1 adds the scene switch here.
- `src/features/game/playSequence.ts`: the one place that turns a `SubmitEvent` into motion, sound, board text and booth commentary, in order. Phases 1, 2 and 3 all edit this file. Keep it the single choke point; do not scatter sound or animation calls into components.
- `src/features/game/timing.ts`: `motionScale`, `wait`, pacing by difficulty. Every new animation duration goes through `motionScale` so reduced-motion users and the Playwright tests stay fast.
- `src/audio/sfx.ts`, `src/audio/clips.ts`, `src/audio/pool.ts`, `src/audio/preload.ts`: the sound layer. Phase 2 rewrites `sfx.ts` pools and adds mixing; the player and no-repeat picker stay.
- `src/engine/*`: pure TypeScript, no DOM. Phase 3 adds the opponent here and nowhere else. A game is rebuilt from `words` plus `attempts` (`src/engine/replay.ts`), so anything you add must be a pure function of that log plus the game id.
- `src/features/game/GamePage.tsx`, `Scoreboard.tsx`, `ResultsPage.tsx`: the screens that change in Phases 1 and 3.
- `src/data/types.ts` and the `Store` interface in `src/data/`: game records. Phase 3 adds fields; the API store and the local store both need them.
- `e2e/game-flow.spec.ts` and `e2e/helpers.ts`: the flows you must keep green and extend.

Existing specs that explain why things are the way they are: `docs/superpowers/specs/2026-10-27-broadcast-look-design.md` (the retro look you are replacing), `2026-10-28-audio-redo-design.md`, `2026-10-30-jack-dalton-cheer-thinning-design.md`, `2026-10-30-difficulty-selection-pacing-design.md`.

---

## 3. Phase 0: the art contract

**Who does it:** a bot writes `docs/art/ART-CONTRACT.md` and `public/art/manifest.json` (empty entries with every expected file name) in a small PR. Brandon hands `ART-CONTRACT.md` to the artist. Phase 1 starts in parallel on placeholders and does not wait for art.

### 3.1 Style sheet

- Bold cartoon. Outlines about 3 px at delivery scale, rounded joints, flat color with one shade of shadow per surface, no gradients, no texture noise.
- Proportions: big head, short body, oversized hands and bat, so the batter reads at phone size. Faces have eyes and a mouth; the mouth has at least open and closed variants for the booth window.
- Palette: use the existing brand tokens where they appear in the UI (navy `#142850`, red `#d7263d`, gold `#f5b700`, chalk `#fffaf0`), a daytime sky, and a grass green that is lighter than the current `#47a853` so the characters pop.
- Daytime stadium by default. A night variant is optional and not required for launch.
- Nothing licensed, nothing that imitates a real team, league, mascot or person. Original jerseys, original mascot.

### 3.2 Canvas and delivery scale

- The game renders at 1280 by 960, the same 4:3 box as today, with smoothing on and `pixelArt` off.
- Deliver all raster art at 2x: character frames at 256 by 256 per frame, stadium layers at 2560 by 1920. The build downsamples for the atlas; the 2x master stays in `art-src/` outside `public/`.
- UI chrome delivered as SVG with the artboard at 1280 by 960.

### 3.3 The kid's batter is layered and tintable (the most important rule)

The player builder lets the kid pick skin tone, hair color, hairstyle, jersey, pants, hat, trim and number color, and a left or right stance. That stays. So the batter and runner rig is delivered as grayscale layers that the game tints at runtime, not as a finished colored character.

Per frame, deliver these layers as separate PNGs with identical dimensions and registration:

| Layer | What it holds | Tinted from |
| --- | --- | --- |
| `outline` | all black line work | never tinted |
| `skin` | face, neck, hands, in grayscale for shading | `appearance.skinTone` |
| `hair-short`, `hair-long`, `hair-curly`, `hair-buzz` | one hair layer per hairstyle, only one is shown | `appearance.hairColor` |
| `jersey` | shirt body | `appearance.jerseyColor` |
| `trim` | sleeves, collar, socks, stripes | `appearance.primaryColor` |
| `pants` | pants | `appearance.pantsColor` |
| `hat` | cap crown | `appearance.hatColor` |
| `hat-brim` | cap brim | `appearance.secondaryColor` |
| `number` | blank white rectangle where the number sits, for the game to stamp text | `appearance.secondaryColor` for text |
| `shoes-bat-glove` | shoes, bat, batting gloves | never tinted (fixed colors) |

Grayscale layers are white where the surface is lit and mid-gray where it is shaded; the game multiplies the tint over them, so shading comes for free. One rig only: the right-handed stance. The game flips it for lefties.

#### 3.3.1 Chroma-key delivery (what actually arrived)

Brandon generated the art with Gemini (Nano Banana) using `docs/art/nano-banana-prompts.md`, and the raw outputs are committed under `art-src/` (see `art-src/README.md` for what exists and what is still missing). Image generators cannot output separate tint layers, so the batter arrives as a flat drawing in placeholder colors on a solid `#00FF00` background. The build pipeline (`npm run pack-art`, Phase 1) turns `art-src/` into `public/art/`:

1. **Key the background.** `#00FF00` with a tight tolerance becomes alpha 0 on every file. Watch for green fringing on anti-aliased edges; erode one pixel if needed.
2. **Split the batter into layers by color.** Each batter frame is drawn in these colors, with shading as a darker shade of the same hue. Classify each pixel by hue into a layer and store its luminance as the grayscale shading for that layer:

   | Layer | Source color | Hex |
   | --- | --- | --- |
   | `jersey` | magenta | `#FF00FF` |
   | `pants` | cyan | `#00FFFF` |
   | `hat` | yellow | `#FFFF00` |
   | `hat-brim` | orange | `#FF8000` |
   | `trim` | blue | `#0000FF` |
   | `skin` | red | `#FF0000` |
   | `hair` | purple | `#8000FF` |
   | `outline` and fixed parts | black, dark gray shoes, wood bat, white gloves | never tinted |

3. **Slice and align.** Cut single-row sheets (1 x N) and two-row fielder sheets (2 x N) into equal cells, find each frame's foot baseline and shift so all frames in a clip share it, resize to the contract cell size, and pack atlases.
4. **Scale.** Most files are 1024 px wide (128 px per cell on an 8-cell row), not the 2x masters in 3.2. Pack them as delivered; upscaling is a later decision once Nicole sees them in the game. If a sprite reads soft, the fix is regenerating at a higher size in Gemini, not filtering.

`art-src/` is committed, not gitignored, because it is the only copy.

### 3.4 Animations and frame counts

All animations at 12 frames per second unless noted. Frame counts are minimums; more is fine if the atlas stays under the size budget.

**Batter and runner rig (layered as above)**

| Clip | Frames | Notes |
| --- | --- | --- |
| `stance-idle` | 4 | subtle bat waggle loop |
| `swing-miss` | 8 | full swing, no contact, bat wraps around |
| `swing-contact` | 8 | frame 4 is contact; ball leaves on frame 5 |
| `take-walk` | 6 | drops bat, jogs toward first |
| `run` | 6 | loop, used on the basepaths |
| `trot` | 6 | slow home-run trot loop |
| `strikeout-slump` | 4 | shoulders drop, then holds |
| `celebrate` | 6 | jump and fist pump, used at home plate after a run and in the highlight |

**Pitcher (fixed colors, gray visitors uniform)**

| Clip | Frames |
| --- | --- |
| `pitcher-idle` | 4 |
| `pitcher-windup-throw` | 10 (release on frame 7) |
| `pitcher-react-hit` | 4 |

**Fielders (fixed colors, same visitors uniform, two body types)**

| Clip | Frames |
| --- | --- |
| `fielder-idle` | 4 |
| `fielder-chase` | 6 loop |
| `fielder-catch` | 6 |
| `fielder-watch-hr` | 4 (looks up and back) |

**Catcher and umpire**

| Clip | Frames |
| --- | --- |
| `catcher-idle` | 2 |
| `catcher-receive` | 4 |
| `ump-idle` | 2 |
| `ump-strike` | 4 |
| `ump-punchout` | 6 (strike three) |

**Ball:** `ball` single sprite plus `ball-spin` 3 frames, and `ball-shadow` single sprite.

**Crowd:** three tile rows, each 512 px wide and tileable horizontally, with `crowd-idle` 2 frames and `crowd-cheer` 4 frames per row. Row 1 is nearest and most detailed.

**Mascot (optional for launch):** `mascot-idle` 4, `mascot-happy` 4, `mascot-sad` 4. If skipped, the manifest entry stays empty and the scene hides it.

**Booth portraits:** Big Red and Jack Dalton redrawn in the cartoon style, head and shoulders, with `mouth-closed` and `mouth-open` frames each, 512 by 512.

### 3.5 Stadium layers (separate PNGs, 2560 by 1920 at delivery)

In draw order, back to front:

1. `sky` (with light towers)
2. `outfield-wall` with an empty scoreboard panel region defined in the manifest by pixel rectangle, so the game draws live numbers on it
3. `stands-far` (the far crowd backdrop, static)
4. `grass` (outfield and infield grass, with mown stripes)
5. `dirt` (infield skin, mound, batter's boxes, baselines)
6. `chalk` (foul lines, boxes, on-deck circle)
7. `bases` (three bases plus home plate as separate small sprites so runners can stand on them)
8. `dugout-near` (the near dugout rail, drawn in front of the batter's feet)
9. `foreground-fence` (optional near fence or netting at the very bottom edge)

The manifest records, in game coordinates (1280 by 960), the pixel positions of: home plate, first, second, third, the mound, the batter's boxes (left and right), the catcher spot, the umpire spot, seven fielder spots, the outfield wall top edge as a polyline, the scoreboard panel rectangle, and the "ball leaves the yard" point for a home run.

### 3.6 UI chrome (SVG)

- Score bug with both teams, inning, outs, strikes, and word counter.
- Caption bar for the booth line.
- Banner word treatments: `STRIKE ONE`, `STRIKE TWO`, `STRIKE THREE`, `BALL FOUR`, `BASE HIT`, `DOUBLE`, `HOME RUN`, `RUN SCORED`, `RUNS SCORED` (with a number slot), `THREE OUTS`, `NEW INNING`, `GAME OVER`, `WALK-OFF`, `YOU WIN`, `TOUGH LOSS`, `HIGHLIGHT`.
- Broadcast frame corners and the ON AIR tag in the cartoon style.

### 3.7 File layout and manifest

```
art-src/                       2x masters, never shipped (gitignored, Brandon keeps a copy)
public/art/
  manifest.json                every file below, plus the coordinates from 3.5
  stadium/*.png                the nine layers
  batter/<clip>/<frame>-<layer>.png   layered frames, packed into atlases by the build
  pitcher.png + pitcher.json   atlas and frames
  fielders.png + fielders.json
  catcher-ump.png + catcher-ump.json
  crowd.png + crowd.json
  mascot.png + mascot.json     may be absent
  booth/bigRed-*.png, booth/jackDalton-*.png
  chrome/*.svg
```

The build packs `batter/` into one atlas per layer with an `npm run pack-art` script the Phase 1 bot writes (free-pixi-packer or a small custom script using `sharp`; no TexturePacker license required). Atlas size budget: 8 MB total over the wire for everything under `public/art/`, after PNG optimization.

### 3.8 Contract acceptance

The Phase 0 PR is done when `docs/art/ART-CONTRACT.md` says everything in 3.1 to 3.7 in plain language an artist can follow, with a checklist they can tick, and `public/art/manifest.json` lists every expected file with `"status": "missing"`. Brandon reviews the contract before it goes to the artist.

---

## 4. Phase 1: the cartoon stadium

**Branch:** `feat/cartoon-stadium`. **Spec:** `docs/superpowers/specs/<date>-cartoon-stadium-design.md`. **Plan:** `docs/superpowers/plans/<date>-cartoon-stadium.md`.

### 4.1 Architecture

- New file `src/field/CartoonScene.ts` implementing `FieldController`. The existing `FieldScene.ts` is not modified.
- `src/field/Field.tsx` picks the scene from a setting: `VITE_FIELD=cartoon|pixel` at build time, and a hidden toggle in the device audio settings so Nicole can flip between them on her phone during testing. Default is `cartoon` once Phase 1 merges.
- Phaser config for the cartoon scene: 1280 by 960, `pixelArt: false`, `antialias: true`, `roundPixels: false`, FIT scaling as today.
- A new `src/field/rig.ts` builds a tinted batter from the layered atlas and an `Appearance`: one `RenderTexture` per clip per player, built once and cached by a hash of the appearance, so there is no per-frame tint cost. Lefties are the same textures flipped.
- A new `src/field/camera.ts` wraps Phaser camera moves: `pushIn(target, ms)`, `followBall(ms)`, `panToStands(ms)`, `reset(ms)`. Every duration passes through `motionScale`.
- `src/field/manifest.ts` loads `public/art/manifest.json`, exposes typed coordinates, and reports which assets are missing so the scene can fall back to placeholders.

### 4.2 Placeholders first

Until the real art lands, the scene must run on labeled colored shapes: a rounded rectangle batter in the kid's jersey color with the number stamped on it, a gray pitcher, a white ball with a shadow, gray fielders, green and brown stadium bands. Every animation, camera move and timing is final on placeholders. When the real atlas appears in `public/art/`, the manifest flips entries to `"status": "ready"` and the scene uses them with no logic change. Nicole plays the placeholder build to judge motion before any art is finished.

### 4.3 The plays

Timings are at `motionScale` 1. A full play including commentary stays under 5 seconds; the inning-end and game-over plays may run to 7 seconds.

| Controller call | What happens |
| --- | --- |
| `playPitch()` | Pitcher `windup-throw`, ball travels mound to plate in 450 ms with shadow, catcher `receive` if no swing yet. Camera at the default wide shot. Returns when the ball reaches the plate. |
| `playStrike(1 or 2)` | Batter `swing-miss` (or, every third strike at random, no swing and `ump-strike` for a called strike). Banner STRIKE ONE or TWO slides in for 900 ms. Caption shows the booth line. |
| `playStrike(3)` | Same swing or called strike, then `ump-punchout` and batter `strikeout-slump`. Banner STRIKE THREE. Crowd `idle` only. |
| `playHit(single)` | `swing-contact`, contact flash on frame 4, ball arcs on a low line into left or right field (random side), fielder `chase` then `catch` after the runner is safe, batter `run` to first along the manifest path in 900 ms, other runners advance per `before` and `after`. Camera `followBall` for 600 ms then `reset`. Banner BASE HIT. |
| `playHit(double)` | Same, deeper arc to the gap, fielder chases to the wall, batter runs through first to second in 1400 ms. Camera follows longer. Banner DOUBLE. |
| `playHit(homeRun)` | Contact, ball climbs on a high arc to the manifest "leaves the yard" point, fielders `watch-hr`, camera `panToStands` as the ball clears the wall, crowd `cheer` loop, scoreboard panel flashes, batter `trot` around all bases in 2200 ms while runners ahead jog home. Banner HOME RUN with a shake. |
| `playWalk()` | `take-walk`, batter jogs to first in 900 ms, runners forced ahead advance. Banner BALL FOUR. |
| `playInningEnd(n)` | Fielders jog off, a short scoreboard wipe, banner THREE OUTS then NEW INNING. |
| `playGameOver(runs)` | Crowd `cheer` if the kid won (Phase 3 passes the result; before Phase 3, treat any runs as a win), batter `celebrate` at home, banner GAME OVER. |
| `banner(text, ms)` | Any text in the cartoon banner style. Used by the game page for RUN SCORED and friends. |
| `setBases(b)` | Places tinted runners on occupied bases in `stance-idle` reduced to a 2-frame breathe loop. |
| `setPlayer(look)` | Rebuilds the rig cache for a new appearance. |

Runs scored during a play: each runner who crosses home triggers a small `celebrate` burst and the scoreboard panel ticks up, so a 2-run double visibly produces two runs, not one banner.

### 4.4 Screen layout around the field

- The score bug and caption bar move into the SVG chrome from 3.6 and render as DOM over the canvas, not inside Phaser, so they stay crisp and screen-reader friendly. The existing `Scoreboard.tsx` test ids (`hits`, `runs`, `strikes`, `progress`) must keep working.
- The booth window shows the cartoon portrait with mouth flaps driven by the existing announcer playback events.
- The pixel font is removed from the game screen. Fredoka stays for the word input. Banner words use the SVG treatments.
- Portrait phone: field on top, input below, both visible without scrolling, as the Playwright test already asserts at 844 by 390.

### 4.5 Performance and loading

- Target 60 frames per second on an iPhone 11 in Safari during a home run with crowd cheer. Measure with the Safari timeline and record the result in the PR.
- Cold load of the game screen under 3 seconds on a 4G connection: atlases preloaded from the kid's home screen the way audio is preloaded today (`src/audio/preload.ts` pattern), with a progress bar on the Play button if assets are still loading.
- Total `public/art/` under 8 MB over the wire. Use `oxipng` or `pngquant` in `npm run pack-art`.
- Memory: destroy render textures on scene shutdown. Verify no leak across ten consecutive games in the browser's memory panel.

### 4.6 Acceptance

- All nine `FieldController` methods implemented and covered by a contract test that runs against both the pixel scene and the cartoon scene (`src/field/controller.contract.test.ts`), with `motionScale` 0.
- A placeholder build is playable end to end with the real timings before any art exists.
- With the sample art set (a bot may draw crude placeholder PNGs in the exact file layout to prove the pipeline; these are deleted when real art arrives), the atlas packer runs and the scene renders tinted batters for at least three different appearances including a lefty.
- e2e `game-flow.spec.ts` passes on both scenes.
- Nicole's test list in the PR: pick a booth, play one game, confirm she can see the ball, the swing, the runners, and the camera on a home run.

---

## 5. Phase 2: real ballpark sound

**Branch:** `feat/ballpark-sound`. Depends on nothing; may start as soon as Phase 1's branch exists, and rebases onto it.

### 5.1 Sources and licensing

- Acceptable: CC0 recordings (freesound.org CC0 filter, opengameart CC0, Sonniss GDC bundles where the license permits app redistribution), or a paid library whose license explicitly allows redistribution inside an app (for example Soundly, Boom, or Pro Sound Effects single-pack purchases). Brandon approves any purchase over 50 dollars before it happens.
- Not acceptable: CC-BY-NC, anything that requires attribution in the UI, anything scraped from video, any recording of a real broadcast or real stadium PA announcer.
- Every file gets a row in `AUDIO-CREDITS.md`: folder, file, source URL, author, license, and the processing applied. The existing Kenney rows are deleted when their clips are.
- Processing is the same as today: trim leading silence, loudness normalize to about -16 LUFS, mono, Ogg Vorbis at quality 5, with an `npm run process-audio` script that regenerates everything from `audio-src/` so it is reproducible.

### 5.2 Replacement map

| Pool | Today | Replace with | Variants |
| --- | --- | --- | --- |
| `crack` | wood impact from a UI pack | real wood bat on ball, solid contact | 4 |
| `crack-hr` (new) | none | wood bat, louder and deeper, used for home runs | 3 |
| `ping` (new, optional) | none | aluminum bat, used for singles if Brandon says yes for the youth-league feel; off by default | 3 |
| `whiff` | cloth rustle | bat swish through air | 4 |
| `mitt` (new) | none | catcher's mitt pop, every pitch that is not hit | 4 |
| `ump-strike` (new) | none | umpire "strike" call, no words beyond that | 4 |
| `ump-strike3` (new) | none | umpire strike three call, no words beyond that | 3 |
| `strikeBuzz` | UI error beep | removed; strike three uses `ump-strike3` plus `groan` | 0 |
| `walkChime` | UI confirmation beep | removed; walk uses `mitt` plus `ump-ball4` | 0 |
| `ump-ball4` (new) | none | umpire "ball four" call, no words beyond that | 3 |
| `cheer` | hall applause | stadium crowd roar, three intensities: `cheer-small`, `cheer-big`, `cheer-hr` | 3 each |
| `groan` | pitched crowd shout | real stadium groan | 3 |
| `organ-charge` | steel drum jingle | real Hammond organ "charge" | 3 |
| `organ-walkup` | 8-bit jingle | short organ walk-up riffs | 4 |
| `organ-inning` | pizzicato jingle | organ inning-change riff | 3 |
| `fanfare` | sax jingle | stadium PA sting for home run and game over | 3 |
| `ambience` (new) | none | crowd murmur loop, 30 to 60 seconds seamless, two intensities | 2 |
| `ball-wall` (new) | none | ball hitting the outfield wall, for doubles | 2 |

### 5.3 Mixing

- `src/audio/mixer.ts` adds four buses on the existing `ClipPlayer`: `sfx`, `crowd`, `music` (organ and stings), `voice` (booth and word clips, including browser speech when used). Master volume and mute stay where they are.
- Ducking: when anything plays on `voice`, `crowd` and `music` drop by 9 dB over 80 ms and recover over 400 ms after the voice ends. The spelling word must always be intelligible over a cheer. A unit test asserts the gain curve.
- The `SequenceSfx` interface in `playSequence.ts` changes to match the new pools (`strikeBuzz` and `walkChime` go away; `mitt`, `umpStrike`, `umpStrike3`, `umpBall4`, `ballWall`, `crackHomeRun` and the three cheer sizes arrive). Update its test double in the same PR.
- Layering per play, wired in `playSequence.ts`: hit = `crack` then `cheer-small` at +120 ms then `organ-charge` if runs scored; double adds `ball-wall` at +700 ms; home run = `crack-hr`, `cheer-hr` at +200 ms, `fanfare` at +1200 ms; strike = `whiff` or `mitt` plus `ump-strike`; strikeout = `ump-strike3` plus `groan`; walk = `mitt` plus `ump-ball4`. The one-cheer-per-play rule from the Jack Dalton spec stays: at most one `cheer-*` per play, and only `cheer-big` or `cheer-hr` on a home run or 2+ runs; a single run gets `cheer-small`.
- Ambience starts on the game screen at the low intensity, swaps to high when any runner is on base, and stops on the results screen. It respects the speaker toggle and the Quiet Booth setting (Quiet Booth keeps ambience and sound effects, removes only voices, as today).
- Booth and word clips get a light convolution reverb (a short stadium impulse response, CC0) at 12 percent wet so they sit in the room. Level-match the two booth voices to each other within 1 dB.

### 5.4 Acceptance

- No file under `public/audio/sfx/` is from an interface or jingle pack. `AUDIO-CREDITS.md` has a row for every file and `npm run process-audio` reproduces them.
- Pool no-repeat picker still prevents back-to-back repeats. Preload on the home screen covers the new pools. Total `public/audio/sfx/` under 4 MB.
- Unit tests: mixer ducking curve, per-play layering order and offsets, one-cheer rule, ambience intensity switching.
- Nicole's test list: play one game with sound on; the strike should sound like a mitt and an umpire, a hit like a bat, a home run like a stadium, and she should hear every spelling word clearly over the crowd.

---

## 6. Phase 3: light stakes

**Branch:** `feat/visitors-and-season`. Depends on Phase 1 for the scoreboard panel and highlight; may be built against the pixel scene and the placeholder cartoon scene.

### 6.1 The Visitors score

- New pure module `src/engine/opponent.ts`: `visitorRuns(gameId: string, inning: number, difficultyMix: Difficulty[]): number` and `visitorScore(state: GameState, gameId: string): number[]` (runs per completed inning). Deterministic from the game id via the existing `rng.ts` seeded generator, so replay and resume always agree.
- Tuning target: against a kid who spells at the typical observed rate (about 70 percent first try, 20 percent second, 5 percent third, 5 percent miss), the kid wins about 65 percent of games and the median margin is 2 runs or fewer. A Hard-heavy list makes the Visitors a little better so the game stays close when the kid's home runs go up. A test simulates 1,000 games across three difficulty mixes and asserts the win rate is between 60 and 72 percent and the median margin at most 2.
- The Visitors score at inning end, never mid-inning, so a kid never watches runs appear while typing. Their runs for an inning are revealed on the scoreboard during `playInningEnd`.
- Innings in this game are driven by outs from strikeouts, so a kid who never strikes out plays the whole list in one inning. That is fine: the Visitors get one inning's worth of runs when the game ends, from the same function, so a perfect game can still be a close game.
- The engine's `GameState` gains `visitors: number[]` (runs per inning, filled at inning end) and `Tallies` gains nothing. `SubmitEvent` for `at-bat-complete` gains `visitorRunsThisInning: number | null` and `gameResult: 'win' | 'loss' | null` (null unless `gameOver`). A tie counts as a win for the kid.

### 6.2 On screen

- Score bug shows HOME (the kid's team name or "Slammers") and VISITORS with runs by inning, the way a real line score does. The outfield scoreboard panel from the manifest mirrors it.
- `playSequence.ts` adds booth events `visitorsScore`, `visitorsTie`, `visitorsLead`, `kidRetakesLead`, `walkOff`, `win`, `loss`. The bot writes 5 to 6 short lines each for Big Red and Jack Dalton in `src/audio/announcer-lines.json`, in each character's voice, G-rated, no `{word}` placeholder, and runs `npm run bake-audio` to bake them. Jack stays straight play-by-play; Big Red stays big but never mean about a loss.
- Loss lines must be kind and forward-looking ("They got us tonight. Same time tomorrow."). Nicole reads the loss lines before bake.
- `playGameOver` receives the result; a win gets the cheer and celebrate, a loss gets a quiet crowd, the batter walking off, and the banner TOUGH LOSS.

### 6.3 Season record

- `GameRecord` gains `result: 'win' | 'loss' | null` and `visitorRuns: number | null`, filled when the game completes. The Postgres migration is additive (nullable columns), idempotent like the existing ones, and the local store gains the same fields. Old records stay null and are excluded from the record.
- New pure helper `src/engine/season.ts`: `seasonRecord(games: GameRecord[]): { wins, losses, streak, lastFive }` over completed weekly games only (practice and missed-word games never count).
- Kid's home screen: a small record line under the name, "12 and 7, won 3 straight". Parent stats page: a wins-losses row, a streak sparkline using the existing `Sparkline.tsx`, and the record in the game history rows.
- Results screen: the final line score with both teams, WIN or LOSS, the record after this game, then the existing stats. The personal-best logic stays.

### 6.4 The highlight

- On the results screen, before the stats, a 10 second replay of the game's best play rendered by the cartoon scene in a smaller box with the booth call, then it freezes on the last frame. The best play is picked by a pure function: home run with most runs, else the play that scored most runs, else the first hit, else nothing (no highlight for a game with no hits).
- Implemented by replaying the chosen `SubmitEvent` through a scene instance with `setBases(before)` and the matching `playHit` or `playWalk`, with the real sound layering from Phase 2. Reduced motion shows a still frame with the caption.
- Skippable with one tap. Never blocks the Practice these words button.

### 6.5 Acceptance

- `opponent.test.ts`: determinism (same id and log, same runs, 10,000 runs), win-rate and margin tuning across three mixes, no runs mid-inning.
- `season.test.ts`: record math, streaks, practice games excluded, null legacy records excluded.
- Replay and resume: reload mid-game shows the same visitor line; the e2e game flow asserts it.
- Family isolation test still passes with the new columns.
- Nicole's test list: play a game and lose on purpose once; the loss should feel fair and the booth should be kind. Play again and win; the record on the home screen should update.

---

## 7. Phase 4: cleanup

**Branch:** `chore/retire-pixel-field`. After Nicole has played the cartoon build for a week and Brandon says go.

- Delete `src/field/FieldScene.ts`, `figures.ts`, `sprites.ts`, the pixel layout helpers that only the pixel scene used, the scene switch, and the `pixel` build flag.
- Remove the Press Start 2P font from the game screen and results page; keep it only if the welcome page still wants it, otherwise remove the font load.
- Delete retired audio clips and their credits rows.
- Welcome page hero uses a still from the cartoon stadium.
- Update `README.md` architecture section and `AUDIO-CREDITS.md`. Mark the broadcast-look spec as superseded by this brief.
- No behavior change; e2e and unit suites stay green.

---

## 8. Rules for the bots

1. One phase, one branch, one PR, in order: 0, 1, 2, 3, 4. Phase 2 may run in parallel with Phase 1 on its own branch and rebase before review.
2. Before coding a phase, write its spec and plan under `docs/superpowers/` the way the last nine PRs did. Keep them short; this brief carries the detail.
3. `npm test`, `npm run typecheck`, and the lint used in prior PRs pass before every PR. `npm run e2e` runs locally and the PR says what was run.
4. The PR body has: Summary, How to verify (for Brandon), Nicole's test list (for a parent), Tests, Performance numbers where this brief asks for them, and the line "Do not merge or publish without Brandon's explicit yes."
5. Never deploy to Replit. Never touch App Storage. Never run a database migration against production. Never push to `main`.
6. Never change grading, strikes, outs, innings, the difficulty ladder, word selection, the parent zone, accounts or family isolation. Phase 3's additive fields are the only data model change in this brief.
7. Never generate, buy or scrape character or stadium art. Placeholders are shapes, or crude PNGs clearly named `placeholder-*`, deleted when real art arrives.
8. Keep `playSequence.ts` the single choke point for motion and sound. No sound or animation calls from components.
9. Every duration goes through `motionScale`. Tests run with `VITE_NO_ANIMATION=1` and must not slow down.
10. If this brief is unclear or wrong, stop and ask Brandon in the PR, do not guess. If a phase is blocked (for example art not delivered), finish everything that does not depend on it and say exactly what is left.
11. No em dashes or en dashes in any document, PR body, or UI copy. Use commas, colons or periods.

---

## 9. Order of operations and what Brandon does

| Step | Who | What |
| --- | --- | --- |
| 1 | Bot | Phase 0 PR: art contract and empty manifest. |
| 2 | Brandon | Review the contract, hand it to the artist. |
| 3 | Bot | Phase 1 on placeholders, in parallel with the artist. Phase 2 on its own branch. |
| 4 | Nicole | Play the placeholder cartoon build; motion and timing feedback goes to the Phase 1 PR. |
| 5 | Artist | Deliver to `art-src/` and `public/art/` per the contract. |
| 6 | Bot | Drop real art in, run the packer, record performance, finish Phase 1. Brandon yes, merge, Brandon publishes. |
| 7 | Bot | Phase 2 review and merge the same way. |
| 8 | Bot | Phase 3. Nicole reads the loss lines before bake. Brandon yes, merge, publish. |
| 9 | Family | A week of play. |
| 10 | Bot | Phase 4 cleanup. |

## 10. Done looks like

Cooper picks Jack Dalton, the pitcher winds up, he hears the word, spells it, and watches his own cartoon batter in his own colors drive the ball into the gap while the crowd swells and the organ plays. The Visitors answer on the scoreboard at the end of the inning. The game is 4 to 3 going into the last word, and he wants the next at-bat. After the game he watches his home run again, sees the record go to 13 and 7, and asks to play tomorrow.
