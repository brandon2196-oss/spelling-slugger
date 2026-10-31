# Ballpark home & menu redesign — design (Approach A: shared BallparkShell)

Date: 2026-10-30 · Base: main `c65fb28` (Phase 4) · Approved by Brandon

## Goal
Make every menu surface feel like walking into the cartoon stadium, with the field and characters front and center. One coordinated pass covers Welcome, Players picker, Child home, and a light stadium match for the Parent zone.

## Approach
**A — shared `BallparkShell`.** One reusable layout component wraps all four surfaces so they share one look:
- Dark stadium gradient background.
- Optional framed still built from existing `public/art/stadium/` layers (sky → stands-far → outfield-wall → grass → dirt → chalk → bases → dugout-near). No new stadium art.
- Fredoka 700 `.board-text` titles (the Phase 4 board style).
- Gold primary and cream secondary action buttons.
- No live `CartoonScene` on any menu. Menus render stills only.

## Screens
### Welcome (`src/features/welcome/WelcomePage.tsx`)
- Big framed stadium still as the hero.
- Remove the leftover broadcast chrome ("On air", "Now batting").
- Short pitch line plus the result legend.
- "Create account" and "Sign in" as gold buttons.

### Players picker (`src/features/players/PlayersPage.tsx`)
- Inside `BallparkShell`.
- Kid cards use darker stadium styling. Keep the figure, team, and Play / Edit actions.
- Parent zone and Share become ballpark-style controls, not small text links.

### Child home (`src/features/home/ChildHomePage.tsx`)
- Stadium still or framed hero behind the batter figure.
- Season W/L stays prominent.
- "Play this week" is the big gold CTA. Practice, Missed, and Past weeks are secondary buttons.
- Announcer row shows neutral placeholders until Brandon's cartoon booth art lands. Pixel announcer portraits are removed from this screen.

### Parent zone (`src/features/parent/ParentLayout.tsx` and children)
- Same dark shell and Fredoka titles. No stadium hero.
- Keep the PIN gate, tabs, and "Managing" context exactly as they work today.
- Auth pages (sign in, sign up, reset) are unchanged.

## Art
- Grand Slam Spelling drafts the booth-art prompts in `docs/art/nano-banana-prompts.md`.
- Brandon generates the images in Gemini and drops them in `art-src/`. They ship through `pack-art`.
- Bots never invent or generate character art.
- Menus can ship with placeholders. Swapping in the final art is a follow-up PR with art changes only.

## Roles
- Grand Slam Spelling: implements, on its own branch and PR.
- Martin: QA review (PASS/FAIL) before Brandon is asked to merge and publish.
- Ballpark Sound: only if audio is touched. This pass is not expected to touch audio.

## Constraints
- No schema or migration changes.
- No changes to the game screen, results screen, `CartoonScene`, or the SequenceSfx / playSequence path.
- Existing tests stay green. Add a test that each of the four surfaces renders inside `BallparkShell`.
- Must pass on phone (iPhone Playwright project) and desktop.

## Out of scope
- Live `CartoonScene` on menus.
- CartoonScene loss walk-off and outfield scoreboard.
- Ump-strike sound.
- Any parent feature change (behavior, data, or flows).

## Acceptance
1. All four surfaces use `BallparkShell`. Welcome, Players, and Child home show a stadium still built only from existing layers.
2. "On air" and "Now batting" are gone from Welcome.
3. Child home shows placeholders, not pixel portraits, in the announcer row.
4. Parent PIN, tabs, Managing, and auth pages work as before.
5. `npm test`, typecheck, lint, and Playwright game-flow pass.
