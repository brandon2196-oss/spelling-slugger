# Audio Redo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace synthesized beeps and browser TTS booth commentary with real SFX files and pre-baked announcer clips so Cooper hears a real bat, crowd, organ, and human-sounding booth.

**Architecture:** Keep `playSequence` and public `Sfx` / `sayAs` APIs. Add a small `ClipPlayer` that loads and plays audio buffers. Point `Sfx` at `public/audio/sfx/` pools. Point `sayAs` at a baked manifest under `public/audio/announcers/`. Spelling-word speech stays on `speech.ts`. A builder-only `scripts/bake-audio.mjs` generates announcer clips; runtime never calls a TTS API.

**Tech Stack:** Existing Vite/React/Vitest/Playwright; Web Audio `AudioBuffer` playback; OGG (preferred) or MP3 in `public/`; Node bake script using a free/cheap batch TTS (pick one in Task 4: e.g. Piper offline, or edge-tts / similar batch CLI). No new runtime npm dependency for TTS.

**Spec:** `docs/superpowers/specs/2026-10-28-audio-redo-design.md`

## Global Constraints

- Do not change engine, Store, API, PDF import, field rules, or parent PIN/lists.
- No celebrity voice imitation; Big Red and Smooth Eddie stay original and G-rated.
- Full play with commentary stays under about five seconds.
- Missing announcer clip → skip that booth moment (quiet), never fall back to `speechSynthesis` for commentary.
- Mute/volume from `readAudioSettings()` still apply to SFX and booth clips.
- Document every SFX source license in `AUDIO-CREDITS.md` before merge.
- Word TTS (`speakWord` / `speakSlowly` / `speakSentence`) stays on browser speech for clarity.

## File map

| Path | Role |
| --- | --- |
| `src/audio/clips.ts` | Load/decode/play one URL; preload list; mute/volume aware |
| `src/audio/clips.test.ts` | Stub AudioContext / fetch |
| `src/audio/sfx.ts` | Rewrite to play pool clips; keep public method names |
| `src/audio/sfx.test.ts` | New: pool pick + enabled/muted |
| `src/audio/announcer.ts` | `sayAs` plays clip from manifest; keep line lists + `lineFor` |
| `src/audio/announcer.test.ts` | Update: clip path, missing → quiet |
| `src/audio/manifest.ts` | Types + load `announcer-manifest.json` |
| `public/audio/sfx/**` | Real effect variants |
| `public/audio/announcers/{bigRed,smoothEddie}/**` | Baked lines |
| `public/audio/announcer-manifest.json` | Map announcer → event → lineIndex → path |
| `scripts/bake-audio.mjs` | Generate clips + manifest from line lists |
| `AUDIO-CREDITS.md` | SFX (and bake-TTS) licenses |
| `src/features/home/*` | Preload SFX + selected announcer on home |
| `src/features/game/playSequence.ts` | Unchanged API; only benefit from better `sfx`/`commentary` |
| `README.md` | Note bake + credits |

---

### Task 1: ClipPlayer

**Files:**
- Create: `src/audio/clips.ts`, `src/audio/clips.test.ts`

**Interfaces:**
- Produces:
  - `createClipPlayer(opts?: { fetchImpl?: typeof fetch }): ClipPlayer`
  - `ClipPlayer.load(url: string): Promise<void>`
  - `ClipPlayer.play(url: string): Promise<void>` — no-op if muted/volume 0 / unloadable; resolves when playback ends or after duration cap
  - `ClipPlayer.preload(urls: string[]): Promise<void>`
  - `ClipPlayer.setVolume(v: number): void`
  - `ClipPlayer.setMuted(m: boolean): void`

- [ ] **Step 1: Write failing tests** for load+play resolves, muted skips audio, missing URL rejects load but `play` resolves without throwing, preload caches.

- [ ] **Step 2: Run** `npx vitest run src/audio/clips.test.ts` — expect FAIL (module missing).

- [ ] **Step 3: Implement** `ClipPlayer` with one shared `AudioContext`, decode via `decodeAudioData`, gain node for volume/mute. Cap wait at 7s so a play cannot lock (match commentary budget).

- [ ] **Step 4: Run tests — PASS.**

- [ ] **Step 5: Commit** `feat(audio): ClipPlayer for buffer playback`

---

### Task 2: Real SFX packs + rewrite `Sfx`

**Files:**
- Create: `public/audio/sfx/{crack,whiff,cheer,groan,walkChime,strikeBuzz,fanfare,organ-charge,organ-inning,organ-walkup}/` with 3–4 variants each (`.ogg` preferred)
- Create: `AUDIO-CREDITS.md`
- Create: `src/audio/sfx.test.ts`
- Modify: `src/audio/sfx.ts`
- Modify: `src/audio/settings.ts` — also call clip volume if Sfx uses ClipPlayer singleton

**SFX acquisition (do this first in the task):**
- Prefer CC0 / public domain packs (e.g. Kenney interface/sports, Freesound CC0). Short baseball-like crack, whoosh, crowd, organ-ish stabs are fine even if not MLB-authentic.
- Normalize loudness roughly by ear; trim silence.
- List every file URL + license + author in `AUDIO-CREDITS.md`.

**Interfaces:**
- Keep: `crack()`, `whiff()`, `cheer(durationMs?)`, `walkChime()`, `strikeBuzz()`, `fanfare()`, `groan()`, `organ(riff)`, `unlock()`, `setVolume`, `enabled`
- Internals: each method uses `createPicker` over variant URLs and `ClipPlayer.play`. `cheer(durationMs)` may ignore duration if clip has natural length (document in code comment).

- [ ] **Step 1: Drop in files + write `AUDIO-CREDITS.md`.**

- [ ] **Step 2: Failing tests** — when enabled, `crack()` calls play with a `/audio/sfx/crack/` URL; when `enabled=false`, no play; organ riffs hit `organ-charge` etc.; no back-to-back same variant (spy picker or inject rng).

- [ ] **Step 3: Rewrite `sfx.ts`** to remove noise/tone synthesis; wire ClipPlayer. Keep class export `sfx`.

- [ ] **Step 4: `npx vitest run src/audio/sfx.test.ts src/audio/clips.test.ts` PASS.** Manual: `npm run dev`, unlock audio, trigger a hit in local mode — hear a real crack.

- [ ] **Step 5: Commit** `feat(audio): real SFX pools replace synth beeps`

---

### Task 3: Announcer manifest + clip `sayAs`

**Files:**
- Create: `src/audio/manifest.ts`, `src/audio/manifest.test.ts`
- Create: placeholder `public/audio/announcer-manifest.json` (can start empty `{}` or with fixture paths for tests)
- Modify: `src/audio/announcer.ts`, `src/audio/announcer.test.ts`

**Interfaces:**
- `type Manifest = { version: 1; clips: Record<AnnouncerId, Partial<Record<AnnounceEvent, string[]>>> }`  
  where each string is a public path like `/audio/announcers/bigRed/double-00.ogg` aligned with `ANNOUNCERS[id].lines[event][index]`.
- `loadManifest(): Promise<Manifest>` (fetch once, cache)
- `clipUrlFor(id, event, lineIndex): string | null`

**Preferred approach (lock this in):**
1. Keep `lineFor` for board text if needed, but for audio add `pickLineIndex(id, event, ctx, rng): { index: number; text: string } | null` that uses the same no-repeat picker on indices.
2. `sayAs` plays `clips[id][event][index]` if present; sets `announcerState` speaking true/false around play; on missing clip, emit speaking false and return (quiet).
3. Stop calling `speak()` inside `sayAs` / `previewLine`.
4. `previewLine` plays the first available gameStart clip or picks via index.

- [ ] **Step 1: Tests** — manifest load; `sayAs` with stub ClipPlayer plays expected URL; missing clip does not call `speak`; quiet id no-ops; muted volume resolves immediately.

- [ ] **Step 2: Implement** manifest + refactor announcer speaking path. Leave `pickAnnouncerVoice` unused by `sayAs` (delete dead TTS persona path only if tests allow).

- [ ] **Step 3: Vitest PASS for announcer + manifest.**

- [ ] **Step 4: Commit** `feat(audio): booth plays baked clips from manifest`

---

### Task 4: Bake script

**Files:**
- Create: `scripts/bake-audio.mjs`
- Modify: `package.json` — add `"bake-audio": "node scripts/bake-audio.mjs"`
- Modify: `public/audio/announcer-manifest.json` (generated)
- Add generated clips under `public/audio/announcers/`

**Bake behavior:**
- **Recommended:** extract `lines` for bigRed/smoothEddie into `src/audio/announcer-lines.json`, import in `announcer.ts`, bake reads the same file.
- Voice profiles: two named voices (config at top of bake script). Document chosen engine + license in `AUDIO-CREDITS.md`.
- Output naming: `{announcer}/{event}-{NN}.ogg` matching array order.
- Manifest written last.
- Script must be idempotent; re-run overwrites.

- [ ] **Step 1: Extract lines JSON + keep unit tests green.**

- [ ] **Step 2: Implement bake script; run it; commit clips + manifest** (keep under ~15MB total if possible).

- [ ] **Step 3: Dev smoke — pick Big Red, start game, hear baked welcome + a hit line.**

- [ ] **Step 4: Commit** `feat(audio): bake-audio script + initial booth clips`

---

### Task 5: Preload on child home + settings volume

**Files:**
- Modify child home (announcer picker under `src/features/home/`) to call SFX preload + preload selected announcer manifest URLs on mount / announcer change.
- Ensure `useAudioSettings` apply() sets ClipPlayer mute/volume used by booth.

- [ ] **Step 1: Test or light e2e** that home mounts without throw when manifest fetch fails (degrade quiet).

- [ ] **Step 2: Implement preload + volume wiring.**

- [ ] **Step 3: Commit** `feat(audio): preload SFX and booth clips on home`

---

### Task 6: Verify + docs

**Files:**
- Modify: `README.md` (bake command, credits pointer)

- [ ] **Step 1: Run** `npm test && npm run typecheck && npm run e2e`

- [ ] **Step 2: Fix failures** without weakening assertions.

- [ ] **Step 3: Update README** with `npm run bake-audio` and link to `AUDIO-CREDITS.md`.

- [ ] **Step 4: Commit** `docs: audio redo bake notes + credits`

- [ ] **Step 5: Report to Martin:** sample paths of 2 SFX + 2 booth clips, total audio bytes, test commands green, Replit deploy note (push includes `public/audio`).

## Review / QA gate (Martin)

Before calling done:
- Cooper (or Brandon) listens: crack, cheer, organ, Big Red line, Smooth Eddie line, Quiet booth.
- No robotic TTS on booth.
- Word still speaks clearly.
- Mute works.

## Handoff note for Ron

Brandon asked Martin to hand build work to you after this plan. Implement task-by-task on `brandon2196-oss/spelling-slugger` main (or a short-lived branch then PR). Do not change spelling rules. When audio is ready for a listen test, tell Martin with the live/Replit URL.
