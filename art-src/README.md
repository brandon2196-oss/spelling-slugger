# art-src: raw generated art for the fun overhaul

Source: Brandon ran `docs/art/nano-banana-prompts.md` through Gemini (Nano Banana) on 2026-10-30. Chat: https://gemini.google.com/app/382bd9ed34ce5104. These are the raw outputs, pulled straight from that chat. They are the masters; the bots turn them into `public/art/` per the brief (`docs/superpowers/specs/2026-10-30-fun-overhaul-grok-brief.md`, section 3.3.1 chroma-key delivery).

## What is here

All files are PNG on a flat `#00FF00` background unless noted. Most are 1024 px wide: Gemini's full-size download returns the wrong image for anything it edited in place, so the in-chat preview is the only correct copy of those. Treat 1024 px as the delivered scale and upscale or regenerate later if a sprite reads soft in the game.

| Folder | Files | Notes |
| --- | --- | --- |
| `style-sheet.png` | 1 | Full size, 2752 x 1536. The look every other prompt matched. |
| `stadium/full.png` | 1 | Full size, 2400 x 1792. The master wide shot, no people. |
| `stadium/full-night.png` | 1 | Night variant, optional, 1024 px. |
| `stadium/layers/` | 8 | outfield-wall, stands-far, grass, dirt, chalk, bases, dugout-near, foreground-fence. Edits of the master, 1024 px. See "sky" below. |
| `batter/swing-contact.png` | 1 | The ONLY batter sheet that exists. 8 cells, chroma-key colors, 1024 x 123 (128 px cells). |
| `pitcher/` | 3 | idle 4 cells, windup-throw 10 cells, react-hit 4 cells. 1024 px. |
| `fielders/` | 4 | idle, chase, catch, watch-hr. Two rows each (tall, stocky). 1024 px. |
| `catcher-ump/` | 5 | catcher-idle, catcher-receive, ump-idle, ump-strike, ump-punchout (the corrected 6-cell row). 1024 px. |
| `ball/` | 3 | ball, ball-spin (3 cells), ball-shadow (the corrected flat ellipse). 1024 px. |
| `crowd/` | 6 | row1 to row3, idle (2 stacked strips) and cheer (4 stacked strips). 1024 px. |
| `booth/` | 4 | bigRed and jackDalton, mouth-closed and mouth-open, split from the two-up images. 512 px each. |
| `chrome/` | 2 | score-bug and caption-bar concepts only. |
| `mascot/` | 3 | idle, happy, sad, 4 cells each. Optional. |
| `_rejected/` | 2 | First versions of ball-shadow and ump-punchout that Gemini's own audit rejected. Reference only. |

## What is missing (not generated in the chat, despite Gemini's audit table saying PASS)

Gemini wrote image placeholders as text for these turns instead of calling its image tool, and later claimed they existed. They do not. They need a fresh Gemini chat using the same prompts, with the style sheet uploaded first.

- `batter/turnaround.png` (B3.1)
- `batter/stance-idle.png` (B3.2)
- `batter/swing-miss.png` (B3.3)
- `batter/take-walk.png` (B3.5)
- `batter/run.png` (B3.6)
- `batter/trot.png` (B3.7)
- `batter/strikeout-slump.png` (B3.8)
- `batter/celebrate.png` (B3.9)
- `batter/hair-short.png`, `hair-long.png`, `hair-curly.png`, `hair-buzz.png` (B3.10)
- `chrome/banners.png` (B10.3)
- `chrome/frame.png` (B10.4)
- The "fixed" B4.1, B4.2, B6.1 and B9.1 that Gemini's audit mentions were never produced; the originals are here and are usable.

The batter is the one that matters: without it Phase 1 runs on placeholder shapes. Everything else can ship.

## Sky layer

`stadium/layers/sky.png` is a screen capture of the chat preview, not a pixel-exact export: that one image was served cross-origin and could not be read back. It is fine as a reference and the bots can regenerate it from `stadium/full.png` by masking everything below the wall top.

## For the bots

Key out `#00FF00`, split the batter's chroma colors into tint layers, slice sprite rows into equal cells, normalize baselines, pack atlases, and fill `public/art/manifest.json`. Section 3.3.1 of the brief has the color table. Do not edit the files in this folder; regenerate `public/art/` from them.
