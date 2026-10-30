# Miss feedback + this-game practice — design

Approved 2026-10-30 (approach A).

## Letter grade (engine)
`src/engine/letterHint.ts` exports `gradeLetters(typed, correct): LetterMark[]`. Pure, no React/network.
- Compares the trimmed try to the correct spelling after `normalize` rules (case-insensitive, straight apostrophes/dashes).
- One mark per typed character: `{ char, ok }`. `ok` only when the same index of the answer has that letter.
- Extra letters past the word length are wrong. No yellow. Untyped letters are never shown (no blanks), so the word is not revealed.
- Note: `grade.ts` still grades the whole word only; letter marks are display hints, not scoring.

## Strikes 1–2 (UI)
`LetterHint` renders the last try under the input: green + underline for right letters, red + strikethrough for wrong ones (non-color cue), with an sr-only label "letter X right/wrong". Cleared when the at-bat ends. Board/announcer unchanged.

## Strike 3
Existing "Strike three!" modal adds "Your tries" listing each wrong try (colored with the same component). Hear it again / Next unchanged.

## Results
If `summary.missedWords` is non-empty, a primary "Practice these words" button calls `startThisGameMissesGame(store, record)`: missed words from this game's attempt log (struck-out words only, deduped), shuffled with `practiceWords`, created as an existing `missed` mode game (no new enum, `listId: null`). The all-time "Practice missed words" button stays.

## Out of scope
Schema/migrations, difficulty, new GameMode, yellow letters.
