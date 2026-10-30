# Ballpark Sound Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Real ballpark SFX, four-bus mixer, voice ducking and reverb.

**Spec:** `docs/superpowers/specs/2026-10-30-ballpark-sound-design.md`

**Branch:** `feat/ballpark-sound`, after `feat/cartoon-stadium` exists. Rebase before Martin QA.

## Global Constraints

- Do not change spelling engine rules, Store, API, or voices.
- CC0 only. Stub pools we cannot fill free. `ping` off.
- Every PR to Martin first. No merge or publish without Martin's go.

## Tasks

- [ ] 1. `mixer.ts` plus tests: bus names, duck scheduler (9 dB, 80 ms down, 400 ms up, ref count). Fake `AudioContext`.
- [ ] 2. `ClipPlayer` buses and `play(url, { bus, loop })` with stop handle. Voice convolver at 12 percent wet.
- [ ] 3. Move `sayAs` and baked `sayWord` onto the voice bus. Duck start/end around `speechSynthesis`.
- [ ] 4. `layering.ts` plus tests: stacks, offsets via `motionScale`, one-cheer rule.
- [ ] 5. New `SequenceSfx` in `playSequence.ts`, mitt vs whiff decision, test double update.
- [ ] 6. Ambience lifecycle in `GamePage` plus intensity test.
- [ ] 7. `audio-src/`, `scripts/process-audio.mjs`, `npm run process-audio`.
- [ ] 8. Source CC0 clips, process, replace `public/audio/sfx/`, rewrite `AUDIO-CREDITS.md`, delete Kenney files. Stub what is missing.
- [ ] 9. Preload update, size check under 4 MB.
- [ ] 10. Gates: `npm test`, typecheck, lint, e2e. Hand PR to Martin.
