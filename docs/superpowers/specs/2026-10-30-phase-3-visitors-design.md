# Phase 3: light stakes (Visitors, season record, highlight)

Implements fun-overhaul brief section 6. Short by design; the brief carries the detail.

## Engine
- `src/engine/opponent.ts`: `visitorRuns(gameId, inning, difficultyMix)` and `visitorScore(state, gameId)`. Seeded from an FNV hash of `gameId:visitors:inning` through `rng.ts`. Each inning the Visitors bat once per word the kid finished that inning, at that word's difficulty, at the typical kid rate (70/20/5/5), through the same `outcomeFor` and `advance` rules. Hard-heavy lists make the Visitors hit more home runs too.
- Tuning measured by `opponent.test.ts` (1,000 games per mix, 14 words): kid wins 66% (easy heavy), 65% (balanced), 66% (hard heavy); median margin 1.
- `GameState` gains `gameId` and `visitors`. `createGame(words, gameId)` and `rebuild(words, attempts, gameId)` take the id (default `''`). The Visitors only bat on an inning-ending or game-ending play. A perfect one-inning game gets one Visitors inning at the end.
- `SubmitEvent` (`at-bat-complete`) gains `visitorRunsThisInning`, `gameResult`, and two helpers the booth needs: `visitorsBefore` and `homeTotal`. A tie is a win.
- `src/engine/season.ts`: `seasonRecord` over completed weekly games with a result. `src/engine/highlight.ts`: `bestPlay`.

## Data
- `GameRecord.result` and `GameRecord.visitorRuns`, filled on complete from the attempt log (server and local store both ignore the client; same as `summary`).
- Migration `0003_visitors.sql`: two nullable columns with `add column if not exists`. No drops, no backfill. Legacy rows stay null and are left out of the record.

## Presentation
- Score bug gains a HOME / VISITORS line score (`data-testid="line-score"`, `visitors`). Existing test ids unchanged. The game screen holds the Visitors line back until `playSequence` reveals it during the inning-end play.
- `playSequence.ts` (still the one choke point) adds booth events `visitorsScore`, `visitorsTie`, `visitorsLead`, `kidRetakesLead`, `walkOff`, `win`, `loss`; board text `VISITORS SCORE N!`, `HOME TEAM WINS!`, `WALK OFF!`, `TOUGH LOSS`. A loss gets no fanfare and no celebration, a `TOUGH LOSS` banner, and a kind booth line. Five new lines per event per announcer, baked with `BAKE_EVENTS=... npm run bake-audio` (new env var bakes only those events and leaves existing clips untouched).
- Results: WIN or LOSS, both teams' line score, record after this game, then the play of the game (replayed through `playSequence` in a small `Field`, capped at 10 s, freezes on the last frame; reduced motion shows the caption only; Skip button; never blocks buttons).
- Home: record line under the name. Parent stats: season record row with a W/L sparkline. History: Visitors and W/L columns.

## Not done here (needs a call)
- The loss "batter walking off" animation and the outfield scoreboard panel need `CartoonScene` work. `FieldScene` and `SequenceSfx` are untouched as asked; `CartoonScene` is untouched too. Both are follow-ups.
- Nicole reads the loss lines before they ship (they are baked so the PR is testable; re-bake is one command if she wants changes).
