# Jack Dalton booth + crowd cheer thinning (2026-10-30)

## Why
Family playtest: Smooth Eddie's "Easy breezy" lines were campy and repetitive, the crowd cheer fired on nearly every scoring play, and booth clips said "that spelling" instead of the kid's word.

## Design
1. **Rename** Smooth Eddie Breeze to **Jack Dalton**. Internal id stays `smoothEddie` so saved family settings still work. New tagline: "Calm, classic play-by-play. Straight calls."
2. **No Easy Breezy anywhere.** All Jack lines rewritten as short, straight, G-rated play calls (5–6 per event, matching Big Red).
3. **No `{word}` in any announcer line** (Big Red or Jack). Booth audio is pre-baked, so a clip can never say the live word; `{word}` lines baked as "that spelling". `{runs}`/`{inning}` stay (baked as 2/3, same as before). A test now forbids `{word}` in booth lines.
4. **Crowd cheer** (`playSequence.ts`): one cheer per play, only on a home run or when `runsScored >= 2`. No cheer for a single-run RBI. A home run that scores runs still cheers once.
5. **Rebake** all booth clips with `scripts/bake-audio.mjs`. This also adds Big Red `homeRun-*` clips, which were never baked (live serves the SPA HTML for those URLs). `BAKE_ONLY=<id>` added to bake one booth.

## Verify
- Pick Jack Dalton: label/tagline show Jack, no Easy Breezy.
- Single scoring 1 run: no cheer. Home run, or 2+ runs: exactly one cheer.
- `grep -i "easy breezy\|{word}" src/audio/announcer-lines.json` returns nothing.
- Every manifest URL exists under `public/`.
