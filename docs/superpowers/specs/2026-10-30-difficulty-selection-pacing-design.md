# Difficulty: selection ramp + hard-word pacing (design A)

Approved 2026-10-30.

## Selection (weekly games only)
- `weeklyWords` orders words with a progress-weighted ramp: each word gets key `score + jitter`, where score is easy 0 / medium 1 / hard 2 and jitter is uniform in ±`RAMP_JITTER` (1.25) from the game rng. Words are sorted by key after a shuffle.
- Result: still mixed (a hard word can come early, an easy one late), but early positions trend easy and later ones trend hard. Not a strict band sort.
- Practice, missed-words, and this-game-misses keep today's pure shuffle (`practiceWords`).
- Runs only at game create; order is stored in `game_words.position`, so resume never reorders.

## Pacing
- `paceMultiplier(difficulty)`: easy 1, medium 1, hard 1.5.
- The breath before an at-bat is the announcement beat (`ANNOUNCE_MS`, 1100 ms). When the upcoming word is hard, the game holds an extra `ANNOUNCE_MS * 0.5` before unlocking input and reading the word (total 1.5x). Applies after a completed at-bat and after the strike-3 Next button. Scaled by `motionScale` like all waits.

## Unchanged
Scoring, strikes/attempt limits, innings, announcer lines, schema.
