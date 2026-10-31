# Art polish audit (after Phase 1, PR #17)

Checked `art-src/` on main (4a59662) for the three polish slots. Rule: pack only real masters, never invent art. Result: nothing new ships; all three stay `missing` in `public/art/manifest.json`.

| Slot | Master in art-src | Decision | Why |
| --- | --- | --- | --- |
| Chrome (score bug, caption bar, frame corners, ON AIR tag, 16 banners) | `chrome/score-bug.png`, `caption-bar.png`, `frame.png`, `banners.png` | missing | Contract section 6 wants SVG on a 1280x960 artboard. These are raster concepts with baked sample data (score bug reads HOME 3 / VISITORS 2 / 4th / WORD 12; banner sheet bakes "2 RUNS SCORED" where the contract wants a number slot). Tracing them to SVG would be new art, and embedding the PNG in an SVG wrapper would not meet the contract. Needs a real SVG redraw. |
| `foreground-fence` | `stadium/layers/foreground-fence.png` (1024x765) | missing | The fence rail starts at source row 618, game y about 776. Home plate is at y 840, so the rail and netting cover home plate and the batter's feet. Same reason #15 skipped it. Needs a regen that keeps the fence below about y 900 or splits it into left and right sections clear of home. |
| Batter `number` layer | none | missing | No batter sheet carries a separate number rectangle in a key color, and there is no number master. The batter clips list `number` in `missingLayers`; the game skips it. |

## To unblock

- Chrome: SVG redraws (or a request to accept raster chrome, which would be a contract change for Brandon).
- Fence: regenerate with the fence lower or with an opening at home.
- Number: add a flat key color for the jersey number rectangle to the batter prompts and regenerate, or accept the game drawing the number in code.
