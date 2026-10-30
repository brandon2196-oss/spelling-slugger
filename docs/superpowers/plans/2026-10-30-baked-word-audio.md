# Baked word audio — plan

Spec: `docs/superpowers/specs/2026-10-30-baked-word-audio-design.md`. Branch `baked-word-audio`. TDD each task.

1. **Shared profile + hash** — `src/audio/word-audio-profile.ts`. Test: stable sha256 of `voice|rate|pitch|text`,
   differs per kind, trims text, `clipsForWord` skips missing sentence.
2. **Clip storage** — `server/src/word-audio/storage.ts`: `ClipStorage` interface, `createFsClipStorage`,
   `createReplitClipStorage` (lazy import), `createMemoryClipStorage`. Test fs + memory round trip, name validation.
3. **Baker queue** — `server/src/word-audio/baker.ts`: dedupe, concurrency cap, retries, skip existing, `status()`.
   Test with fake synth (concurrency, retry, failure gives up, skip existing).
4. **Edge synth** — `server/src/word-audio/edge-synth.ts` using `msedge-tts` with timeout (no network test;
   typecheck only, smoke-run manually).
5. **HTTP** — `createApp(db, { wordAudio })`: enqueue after list create/patch, `GET /api/lists/:id/audio-status`,
   `GET /audio/words/:hash.mp3`. Tests in `server/src/word-audio/http.test.ts`.
6. **Wire production** — `server/src/index.ts` picks storage (App Storage on Replit, fs elsewhere, `WORD_AUDIO=off`).
7. **Client playback** — `src/audio/word-audio.ts`: `enableBakedWordAudio`, `sayWord(kind, text)` baked-first with
   speech fallback; GamePage uses it; App enables it in api mode. Tests with injected audio factory + fetch-free.
8. **Docs** — AUDIO-CREDITS.md live Edge note; README setup for App Storage bucket.
9. Full suite, typecheck, lint, build; push; PR.
