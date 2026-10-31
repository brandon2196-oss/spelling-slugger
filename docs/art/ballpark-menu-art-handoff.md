# Ballpark menu booth art — handoff for Brandon

The menu PR (#22) shipped neutral placeholders in the kid-home announcer row. Final art is a separate, art-only PR.

## Status (2026-10-31): SHIPPED via `feat/booth-menu-art`
Brandon generated the B10 booth-window poses after all, so they replace the "Reuse B9" plan below.

- Sources: `art-src/booth/menu-bigRed.png`, `menu-jackDalton.png`, `menu-quiet.png` (green-key, accepted by Martin).
- Packed by `npm run pack-art` (booth step, 512×512 contain) to `public/art/booth/menu-*.png` (manifest `booth.menu-*`).
- `AnnouncerPicker` now renders `BoothArt` (the packed images) instead of `BoothPlaceholder`. Quiet uses the empty-booth image.
- The game booth (`Broadcast.tsx`) still uses the B9 mouth-closed/open portraits, unchanged.

## Your choice (decided 2026-10-31): Reuse B9
Brandon chose **Reuse B9**. No new images are needed.

- This menu PR keeps the `BoothPlaceholder` placeholders.
- A follow-up art-only PR wires the existing mouth-closed B9 portraits into the booth row:
  - `public/art/booth/bigRed-mouth-closed.png`
  - `public/art/booth/jackDalton-mouth-closed.png`
- Quiet keeps its placeholder, or uses B10.3 if Brandon generates it later.
- Martin QAs that PR; Brandon says yes before merge/publish.

## Optional: steps for B10 (only if you later want new art)
1. Open a new Gemini (Nano Banana) chat. Upload `art-src/style-sheet.png` first.
2. Paste prompt B10.1 from `docs/art/nano-banana-prompts.md`, then B10.2, then B10.3, in the same chat. (For Quiet only, paste just B10.3.)
3. Save each result with the exact filename: `art-src/booth/menu-bigRed.png`, `art-src/booth/menu-jackDalton.png`, `art-src/booth/menu-quiet.png`. Reject anything with text, logos, or a real-person look.
4. Hand the files to Grand Slam Spelling (drop them in the chat or commit to a branch). GSS adds them to `pack-art` (`scripts/pack-art/index.mjs` booth step, 512×512 contain) and swaps `BoothPlaceholder` for the packed image in an art-only PR.
5. Martin QAs that PR; you say yes before merge/publish.
