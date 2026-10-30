# Baked word audio — design

Approved by Brandon 2026-10-30.

## Goal
Spelling words and sentences play as natural neural speech (Edge TTS `en-US-JennyNeural`) instead of the
device's robotic browser voice, with browser speech as the safety net.

## Decisions (binding)
- **When:** the server bakes clips in the background after a parent creates or edits a list. Saving never waits.
- **Engine:** unofficial Edge TTS from the live server via the `msedge-tts` npm package (pure Node, no Python,
  works on `nodejs-22`). Fallback if Microsoft breaks the endpoint: clips stop appearing and the game uses browser
  speech; an alternate package (`edge-tts-universal`) or the Python `edge-tts` CLI can be swapped in behind `Synth`.
- **Clips per word:** `word` (normal), `slow`, and `sentence` when the word has one.
- **Name:** `sha256("voice|rate|pitch|text")` hex + `.mp3`. Same text + settings → same file, shared across
  families and lists. Changing a voice setting changes every hash, so old clips are just ignored.
- **Storage:** Replit App Storage (`@replit/object-storage`, prefix `word-audio/`) in production; filesystem
  adapter (`WORD_AUDIO_DIR`, default `.data/word-audio`) for tests and local dev. **No DB migration.**
- **Serve:** `GET /audio/words/:hash.mp3` (64-hex hash only; immutable cache headers; 404 when missing).
- **Progress:** `GET /api/lists/:id/audio-status` → `{ total, ready, pending }` for the signed-in family.
- **Client:** `src/audio/word-audio.ts` computes the same hash with Web Crypto, plays the MP3, and falls back to
  `speech.ts` on any failure (404, decode, autoplay block, timeout). Local mode never fetches clips.
- **Limits:** at most 2 concurrent syntheses, 3 attempts each with backoff, 15 s synth timeout, in-memory
  de-dupe of queued hashes. A server restart drops the queue; the next save re-queues anything missing.

## Profiles (`src/audio/word-audio-profile.ts`, shared by server and client)
| kind | rate | pitch |
|---|---|---|
| word | -10% | +0Hz |
| slow | -45% | +0Hz |
| sentence | -5% | +0Hz |

## Risks
- Edge TTS is unofficial; Microsoft can rate-limit or change it without notice. Fallback keeps the game working.
- Voice output terms: see AUDIO-CREDITS.md.
- A kid starting a game seconds after a save may hear browser speech for words not yet baked.
- Autoscale instances keep their own in-memory queue; clips are deduped by name in App Storage.
