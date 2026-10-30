# Miss feedback + this-game practice — plan

1. [TDD] `src/engine/letterHint.test.ts` → `letterHint.ts` (`gradeLetters`).
2. `src/features/game/LetterHint.tsx` + test (non-color cue, aria labels).
3. GamePage: store last strike try; render hint for strikes 1–2; clear on at-bat complete. Strike-3 modal lists wrong tries. GamePage test.
4. [TDD] `startThisGameMissesGame` in `startGame.ts` + tests (only this game's strikeouts, dedupe, throws when none).
5. ResultsPage: primary "Practice these words" button when misses exist; test.
6. `npm run typecheck && npm run lint && npm test`; open PR. No merge/publish.
