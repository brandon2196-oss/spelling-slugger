> **Superseded** by `2026-10-30-fun-overhaul-grok-brief.md` (Phase 4 retired the pixel field and Press Start 2P). Kept for history.

# Retro Broadcast look, sound pools and announcers

Brandon, 2026-10-27, after his wife and Cooper played the first version: "think more 16 bit gaming and
lets make the sound effects more fun and alternating. a baseball announcer with options that sound
like brockmire or snoop dog but g rated." He chose direction C (Retro Broadcast) from three mockups,
the computer voice reading character-written lines over recorded audio, and then said "just go with
it". Calls below marked (call) are mine.

## Intent
Make the game feel like a 16-bit console baseball game shown on a 90s TV broadcast, with a booth
announcer who has personality, so an 8-to-10-year-old wants to take the next at-bat. Nothing about
the spelling rules, scoring, saving or the parent zone changes.

## Goals
- Pixel-art stadium rendered at a real low resolution and scaled up with hard pixels.
- A broadcast frame around the field: score bug, announcer window with a moving mouth, caption bar.
- Sound effects with variety: every event draws from a pool and never repeats the same clip twice
  in a row; crowd and organ stingers join in.
- Two announcer characters plus a "quiet booth", chosen by the kid on the home screen, remembered
  on the device. Lines are original, G-rated, and rotate so they don't repeat back to back.
- Title and results screens match the look.

## Non-goals and anti-goals
- No 3D (Nintendo 64 was asked about; the field is 2D). No licensed art, fonts beyond Google Fonts,
  or audio files; everything stays generated in code.
- No imitation of real people. The announcers are original characters with their own names.
- Never slow the game down: a full play with commentary stays under about five seconds, and the
  child's typed word stays in a clear, readable font, not the pixel font.
- No change to the engine, data model, API or tests of those layers.

## Decisions
- **Direction C over the night field from A** (call): the broadcast frame wraps the existing navy
  night game; the daytime palette from the C sketch is not used.
- **Low-res rendering** (call): the Phaser canvas renders at 320×240 with `pixelArt` on; sprites are
  pixel grids drawn in code, colored from the player's appearance; the lefty is the same grid
  flipped. Jersey numbers leave the sprite (too small) and appear in the "now batting" bug.
- **Announcers:** Big Red Brannigan (old-school booming booth, "OH MY STARS!") and Smooth Eddie
  Breeze (laid-back, rhymes, "easy breezy"); third option Quiet booth. Spoken by the browser's
  text-to-speech with a persona-specific voice preference, rate and pitch. The word itself keeps
  the existing clear voice. Commentary runs alongside the board text, not after it.
- **Selection lives in device audio settings** (call), picked on the child's home screen with
  portraits; tapping a portrait plays a sample line.
- **Pixel font** (Press Start 2P) for board text, score bug, captions, titles; Fredoka stays for
  the word input, buttons and parent screens.
- **Sound pools** (call): three or more variants per event, no immediate repeat, plus crowd groan on
  strikeouts, organ "charge" on runs, an inning-change organ riff, and a short fanfare pool.

## Left to the builder
Exact sprite pixels, palette ramps, caption typography, the precise line lists (at least five per
event per announcer), and mouth-flap timing.
