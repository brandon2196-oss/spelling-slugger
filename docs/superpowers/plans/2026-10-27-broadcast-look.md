# Retro Broadcast Look Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 16-bit pixel stadium inside a 90s broadcast frame, sound-effect pools with variety, and two selectable G-rated announcer characters read by the browser voice.

**Architecture:** The Phaser scene renders at 320×240 with `pixelArt` and code-drawn sprite grids; the `FieldController` API is unchanged so the game page and sequencer don't change shape. A React `Broadcast` overlay draws the score bug, announcer window and caption over the field. `sfx.ts` gains variant pools; `announcer.ts` holds personas, line pools, voice picking and a speaking-state emitter for the mouth flap. `playSequence` gets a `commentary` callback that runs alongside board text.

**Tech Stack:** Phaser 3 (pixelArt, canvas textures), React 19, Web Audio, Web Speech, Press Start 2P (Google Fonts), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-27-broadcast-look-design.md`

## Global Constraints
- `FieldController` interface and all `data-testid`s on the scoreboard (`runs`, `hits`, `inning`, `strikes`, `outs`, `progress`) stay.
- No audio or image files; everything generated. Google Fonts only.
- Word input, buttons and parent screens keep Fredoka; pixel font only on board/bug/caption/titles.
- A full play with commentary ≤ ~5 s; commentary capped by `speak`'s timeout; `VITE_NO_ANIMATION` still makes e2e fast.
- Announcer lines: original, G-rated, ≥5 per event per persona, no immediate repeats.

## Review Focus
1. Lefty batter: flipped sprite stands in the right-hand box and the bat swings toward the pitcher.
2. Commentary and the spoken word never overlap or cancel each other; the next word is read only after the line ends.
3. Quiet booth: no commentary utterances at all, board text and sfx unchanged.
4. Pool picker with a one-item pool never loops forever.
5. Phone landscape: score bug and caption don't cover the batter; input still visible.

---

### Task 1: Pixel sprites and the low-res field
**Files:** Create `src/field/sprites.ts`, `src/field/sprites.test.ts`; modify `src/field/layout.ts` (FIELD → 320×240 coordinates), `src/field/figures.ts` (replace Graphics figures with `PixelFigure` images), `src/field/FieldScene.ts` (pixel stadium, frame-based swing/run, square particles), `src/field/Field.tsx` (`pixelArt: true`, low-res config, `image-rendering: pixelated`).
**Produces:** `gridToImageData(grid: string[], palette: Record<string, string>): { width; height; data: Uint8ClampedArray }`, `ensureTexture(scene, key, grid, palette)`, `SPRITES.batterStance/batterSwing/runA/runB/pitchA/pitchB`, `paletteFor(look)`, `class PixelFigure { image; setPose(pose) }`.
- [ ] Tests: grid size → width/height; letters map to palette RGBA; `.` is transparent; unknown letter throws; `paletteFor` maps appearance colors to roles. Fail → implement → pass.
- [ ] Scene draws sky dither, light towers with cones, 3-row pixel crowd, wall, striped grass, dirt diamond at the new coordinates; batter/pitcher/runners are `PixelFigure`s; swing = frame swap; runners alternate run frames while tweening. Commit `feat(field): 16-bit pixel stadium and sprites`.

### Task 2: Pixel font, broadcast frame and score bug
**Files:** modify `src/styles/app.css` (font import, `--font-pixel`, `.pixel`, bezel/bug/caption classes, landscape rules), `src/styles/tokens.css`; create `src/features/game/Broadcast.tsx` (bezel, `ScoreBug`, `AnnouncerWindow`, `CaptionBar`, LIVE tag); modify `src/features/game/Scoreboard.tsx` (becomes the bug content, same testids), `src/features/game/Announcement.tsx` (pixel-font pop), `src/features/game/GamePage.tsx` (wrap Field in Broadcast; bug overlays the field; side column keeps the turn panel).
- [ ] Tests: `Broadcast` renders testids and the announcer name; caption text shows; GamePage tests still green. Commit `feat(game): broadcast frame, score bug, captions`.

### Task 3: Sound pools
**Files:** modify `src/audio/sfx.ts`; create `src/audio/pool.ts`, `src/audio/pool.test.ts`.
**Produces:** `createPicker<T>(items: T[], rng?): () => T` (never the same twice in a row when length > 1), `Sfx.crack/whiff/cheer/walkChime/strikeBuzz/fanfare` draw from pools; new `Sfx.groan()`, `Sfx.organ(riff: 'charge' | 'inning' | 'walkup')`; `SequenceSfx` gains `groan` and `organ`.
- [ ] Tests: picker never repeats consecutively over 200 draws; single-item pool returns it; `Sfx` methods don't throw without an AudioContext. Commit `feat(audio): sound pools, crowd groan, organ riffs`.

### Task 4: Announcers
**Files:** create `src/audio/announcer.ts`, `src/audio/announcer.test.ts`, `src/features/home/AnnouncerPicker.tsx` (+ test); modify `src/audio/settings.ts` (`announcer: AnnouncerId`, default `bigRed`), `src/audio/speech.ts` (`voice` option, `onstart` hook), `src/features/game/playSequence.ts` (+ `commentary`), `playSequence.test.ts`, `src/features/game/GamePage.tsx` (commentary wiring, game-start line, mouth state → Broadcast), `src/features/home/ChildHomePage.tsx` (picker).
**Produces:** `ANNOUNCERS`, `type AnnouncerId`, `type AnnounceEvent = 'gameStart'|'double'|'single'|'walk'|'strike1'|'strike2'|'strikeout'|'run'|'runs'|'inningEnd'|'gameOver'`, `lineFor(id, event, ctx)`, `pickAnnouncerVoice(voices, id)`, `sayAs(id, event, ctx): Promise<void>` (no-op for quiet), `announcerState.subscribe(cb)`.
- [ ] Tests: lines rotate without immediate repeat; every persona has ≥5 lines per event; quiet says nothing; voice picker prefers persona regex then any en voice; playSequence calls commentary alongside board text in the right order; picker sets the setting and speaks a sample. Commit `feat(audio): announcer characters with rotating lines`.

### Task 5: Title and results in the new look
**Files:** modify `src/features/welcome/WelcomePage.tsx`, `src/features/game/ResultsPage.tsx`, `public/icon.svg` untouched.
- [ ] Welcome: pixel title block with ON AIR tag and the pixel stadium strip (inline SVG); results: "postgame show" panel in pixel font with the same stats. Existing tests green. Commit `feat(ui): broadcast title and postgame screens`.

### Task 6: e2e and verification
**Files:** modify `e2e/game-flow.spec.ts` (use the last spoken utterance; assert the announcer picker exists), `e2e/helpers.ts`.
- [ ] `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run e2e` (local, iphone, api) green; main bundle growth noted. Commit `test(e2e): announcer-aware speech checks`.
