# Grand Slam Spelling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand to Grand Slam Spelling and give moms a type-15-tag-difficulty weekly list that auto-builds to 20 (5 review words from last week), with Hard words worth a home run on the first try, plus a clean kid picker and a private-share flow for a few friends.

**Architecture:** Difficulty and source (`current` | `review`) become persisted columns on `words` and `game_words`. Review words move from game start (`selectGameWords`) to list save (`buildWeekList` in the engine, called by `ListEditorPage`), so the saved list *is* the 20-word weekly set and `startWeeklyGame` only shuffles it. The engine gains a `homeRun` outcome and a pure `outcomeFor(attemptNumber, difficulty)` ladder; first-try counting switches from "outcome was double" to "resolved on attempt 1".

**Tech Stack:** React 19 + Vite + TypeScript, react-router, Phaser field scene, Express + Postgres (`server/`), localStorage store for local mode, Vitest (`npm test`), Playwright (`npm run e2e`), Node 22.

## Global Constraints

- Product name in all UI/PWA/share copy: **Grand Slam Spelling** (repo name `spelling-slugger` stays).
- Mom types or pastes **15** new words; system adds **5 random** from that kid's previous week → **20**.
- First week (no preceding list): save the 15 only, with a warning; mom may type up to 20 manually.
- Difficulty per word: `easy | medium | hard`; new words default **medium**; review words default **easy** (mom can retag before save).
- First-try hits: Easy → **single**, Medium → **double**, Hard → **home run**.
- Try 2 = one tier down from that word's first-try hit (homeRun→double, double→single, single→walk). Try 3 correct = walk. Miss = strikeout. Strikes/outs/innings unchanged.
- Siblings always have **separate** lists. Each friend makes her **own** family login. No shared accounts.
- Private share = unlisted URL texted by Brandon; optional `ALLOW_REGISTRATION=false` gate.
- Do NOT change PDF import, parent PIN core, family isolation, or the audio-redo scope.
- Review words must not be added twice: saved list already contains them; game start only shuffles.

---

## File map

| File | Change | Responsibility |
| --- | --- | --- |
| `index.html`, `vite.config.ts`, `README.md`, `src/features/auth/AuthShell.tsx`, `src/features/welcome/WelcomePage.tsx`, `server/src/index.ts`, `e2e/smoke.spec.ts` | Modify | Rename copy |
| `src/features/share/ShareButton.tsx` (+ test) | Modify | Title/text + private blurb |
| `src/engine/types.ts` | Modify | `Difficulty`, `Outcome` + `'homeRun'`, `GameWord.difficulty`, `Tallies.homeRuns` |
| `src/data/types.ts` | Modify | `Word`/`NewWord` gain `difficulty`, `source` |
| `server/migrations/0002_difficulty.sql` | Create | Columns + widened outcome check |
| `server/src/store.ts`, `server/src/app.ts` | Modify | Persist/parse difficulty+source; register gate |
| `src/data/local-store.ts` | Modify | Persist difficulty+source with defaults for old data |
| `src/engine/bases.ts` (+ test) | Modify | `homeRun` = advanceAll(4) |
| `src/engine/game.ts` (+ test) | Modify | `outcomeFor`, tallies |
| `src/engine/results.ts` (+ test) | Modify | first-try = resolved on attempt 1 |
| `src/features/parent/stats.ts` (+ test) | Modify | same first-try fix |
| `src/engine/weekList.ts` (+ test) | Create | `buildWeekList` (15 + 5 review) |
| `src/engine/selection.ts` (+ test) | Modify | Remove review logic; `weeklyWords` shuffle-only; carry difficulty |
| `src/features/game/startGame.ts` (+ test) | Modify | Use saved 20, no double review |
| `src/features/parent/ListEditorPage.tsx` (+ test) | Modify | Difficulty pickers, build-week review preview |
| `src/field/layout.ts`, `src/field/FieldScene.ts`, `src/field/controller.ts` | Modify | Animate homeRun |
| `src/features/game/announcements.ts`, `playSequence.ts`, `src/audio/announcer.ts`, `ResultsPage.tsx`, `Scoreboard.tsx` | Modify | HR copy/audio/tallies |
| `src/features/players/PlayersPage.tsx` | Modify | Kid picker + Add sibling |
| `src/features/auth/RegisterPage.tsx`, `src/data/api-auth.ts` | Modify | Closed-signup message |
| `e2e/grand-slam.spec.ts`, `e2e/helpers.ts` | Create/Modify | Two kids, difficulties, Hard → HR |

---

### Task 1: Rename to Grand Slam Spelling

**Files:**
- Modify: `index.html:13`, `vite.config.ts:15` (+ `short_name` next to it), `README.md:1`, `src/features/auth/AuthShell.tsx:9`, `src/features/welcome/WelcomePage.tsx:27`, `server/src/index.ts:24`, `src/features/share/ShareButton.tsx:4-5`
- Test: `src/features/share/ShareButton.test.tsx`, `e2e/smoke.spec.ts:6`

**Interfaces:** Produces: exported `SHARE_TITLE = 'Grand Slam Spelling'` and `SHARE_TEXT` from `ShareButton.tsx`.

- [ ] **Step 1: Write the failing test** — append to `src/features/share/ShareButton.test.tsx`:

```tsx
import { SHARE_TEXT, SHARE_TITLE } from './ShareButton'

describe('share copy', () => {
  it('uses the Grand Slam Spelling name and private-share wording', () => {
    expect(SHARE_TITLE).toBe('Grand Slam Spelling')
    expect(SHARE_TEXT).toMatch(/Grand Slam Spelling/)
    expect(SHARE_TEXT).not.toMatch(/Slugger/)
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/features/share/ShareButton.test.tsx`
Expected: FAIL — `SHARE_TITLE` is not exported.

- [ ] **Step 3: Implement** — in `ShareButton.tsx` replace lines 4-5:

```tsx
export const SHARE_TITLE = 'Grand Slam Spelling'
export const SHARE_TEXT = 'Grand Slam Spelling — a baseball game for weekly spelling words. Free, no ads. Sharing just with friends, so please keep the link to yourself:'
```

and replace every `TITLE`/`TEXT` use in that file with `SHARE_TITLE`/`SHARE_TEXT`. Then:
- `index.html:13` → `<title>Grand Slam Spelling</title>`; also set any `apple-mobile-web-app-title` meta content to `Grand Slam Spelling`.
- `vite.config.ts` manifest → `name: 'Grand Slam Spelling'`, `short_name: 'Grand Slam'`.
- `README.md:1` → `# Grand Slam Spelling`
- `AuthShell.tsx:9` link text → `Grand Slam Spelling`
- `WelcomePage.tsx:27` span text → `Grand Slam Spelling` (heading line above it that says "Cooper's" becomes nothing; the h1 accessible name must read `Grand Slam Spelling`).
- `server/src/index.ts:24` log → `Grand Slam Spelling listening on :${port} ...`
- `e2e/smoke.spec.ts:6` → `getByRole('heading', { name: 'Grand Slam Spelling' })`

- [ ] **Step 4: Verify**

Run: `npx vitest run src/features/share && rg -n "Spelling Slugger" src server/src index.html vite.config.ts README.md e2e`
Expected: tests PASS; `rg` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add -A index.html vite.config.ts README.md src server/src e2e
git commit -m "feat: rename app to Grand Slam Spelling"
```

---

### Task 2: Difficulty + source on words (types, migration, stores, API)

**Files:**
- Modify: `src/engine/types.ts`, `src/data/types.ts:30-38`, `server/src/store.ts:30,35,42,59,97-99,208-211`, `server/src/app.ts:73-96`, `src/data/local-store.ts:53-54`
- Create: `server/migrations/0002_difficulty.sql`
- Test: `src/data/local-store.test.ts`, `server/src/store.test.ts`

**Interfaces:**
- Produces (engine/types.ts): `export type Difficulty = 'easy' | 'medium' | 'hard'`; `export const DIFFICULTIES: readonly Difficulty[]`; `GameWord.difficulty: Difficulty`; `Outcome = 'homeRun' | 'double' | 'single' | 'walk' | 'strikeout'`; `Tallies.homeRuns: number`.
- Produces (data/types.ts): `Word { id; position; text; sentence; difficulty: Difficulty; source: WordSource }`, `NewWord { text; sentence; difficulty?: Difficulty; source?: WordSource }` (optional on input; stores default `medium` / `current`).

- [ ] **Step 1: Write failing tests** — add to `src/data/local-store.test.ts`:

```ts
it('stores difficulty and source per word, defaulting to medium/current', async () => {
  const p = await store.createPlayer(player)
  const list = await store.createWordList(p.id, {
    title: 't', weekStart: '2026-10-26',
    words: [{ text: 'cat', sentence: null, difficulty: 'hard' }, { text: 'dog', sentence: null }, { text: 'sun', sentence: null, difficulty: 'easy', source: 'review' }],
  })
  expect(list.words.map((w) => [w.text, w.difficulty, w.source])).toEqual([
    ['cat', 'hard', 'current'], ['dog', 'medium', 'current'], ['sun', 'easy', 'review'],
  ])
})
```

(If the file's player fixture has a different name than `player`, use that fixture.) Add the same test body to `server/src/store.test.ts` inside its existing describe, using that file's store/player fixtures.

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/data/local-store.test.ts server/src/store.test.ts`
Expected: FAIL — `difficulty` undefined / TS errors.

- [ ] **Step 3: Implement types** — `src/engine/types.ts`:

```ts
export type Outcome = 'homeRun' | 'double' | 'single' | 'walk' | 'strikeout'
export type Difficulty = 'easy' | 'medium' | 'hard'
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard']
```

Add `difficulty: Difficulty` to `GameWord` and `homeRuns: number` to `Tallies` (after `hits`). In `src/data/types.ts`:

```ts
import type { Difficulty, GameWord, Hand, Outcome, WordSource } from '../engine/types'

export interface Word {
  id: string
  /** 1-based display number. */
  position: number
  text: string
  sentence: string | null
  difficulty: Difficulty
  source: WordSource
}
export interface NewWord {
  text: string
  sentence: string | null
  difficulty?: Difficulty
  source?: WordSource
}
```

- [ ] **Step 4: Migration** — create `server/migrations/0002_difficulty.sql`:

```sql
alter table words add column if not exists difficulty text not null default 'medium'
  check (difficulty in ('easy','medium','hard'));
alter table words add column if not exists source text not null default 'current'
  check (source in ('current','review'));
alter table game_words add column if not exists difficulty text not null default 'medium'
  check (difficulty in ('easy','medium','hard'));
alter table game_words drop constraint if exists game_words_outcome_check;
alter table game_words add constraint game_words_outcome_check
  check (outcome in ('homeRun','double','single','walk','strikeout'));
```

- [ ] **Step 5: Server store** — `server/src/store.ts`:

```ts
interface WordRow { id: string; list_id: string; position: number; text: string; sentence: string | null; difficulty: Difficulty; source: WordSource }
interface GameWordRow { game_id: string; position: number; text: string; sentence: string | null; source: GameWord['source']; source_word_id: string | null; difficulty: Difficulty; outcome: Outcome | null }
const toWord = (w: WordRow): Word => ({ id: w.id, position: w.position, text: w.text, sentence: w.sentence, difficulty: w.difficulty, source: w.source })
```

In `toGame` word map add `difficulty: w.difficulty`. `insertWords`:

```ts
await q.query(
  'insert into words (list_id, position, text, sentence, difficulty, source) values ($1, $2, $3, $4, $5, $6)',
  [listId, i + 1, w.text, w.sentence, w.difficulty ?? 'medium', w.source ?? 'current'],
)
```

`createGame` game_words insert: add column `difficulty` and `$7` = `w.difficulty`. Import `Difficulty, WordSource` from `../../src/engine/types` (same path the file already uses for `GameWord`).

- [ ] **Step 6: API parsing** — `server/src/app.ts`:

```ts
const DIFF = ['easy', 'medium', 'hard'] as const
function parseWords(v: unknown) {
  if (!Array.isArray(v) || v.length > 200) throw bad()
  return v.map((w) => {
    if (!isObj(w)) throw bad()
    return {
      text: str(w.text, 60), sentence: w.sentence == null ? null : str(w.sentence, 300),
      difficulty: w.difficulty == null ? 'medium' as const : oneOf(w.difficulty, DIFF),
      source: w.source == null ? 'current' as const : oneOf(w.source, ['current', 'review'] as const),
    }
  })
}
```

In `parseGameWords` add `difficulty: w.difficulty == null ? 'medium' as const : oneOf(w.difficulty, DIFF),`. In `parseAttempt` outcome list → `['homeRun', 'double', 'single', 'walk', 'strikeout'] as const`.

- [ ] **Step 7: Local store** — `src/data/local-store.ts:53`:

```ts
function numberWords(words: NewWord[]): Word[] {
  return words.map((w, i) => ({
    id: uid(), position: i + 1, text: w.text, sentence: w.sentence,
    difficulty: w.difficulty ?? 'medium', source: w.source ?? 'current',
  }))
}
```

Where lists are read back from localStorage, normalize legacy words: `words: l.words.map((w) => ({ ...w, difficulty: w.difficulty ?? 'medium', source: w.source ?? 'current' }))`; for games: `words: g.words.map((w) => ({ ...w, difficulty: w.difficulty ?? 'medium' }))`.

- [ ] **Step 8: Fix fixtures** — `npx tsc -b --noEmit` (or `npm run build`) and add `difficulty: 'medium'` to every `GameWord` literal and `homeRuns: 0` to every `Tallies` literal it flags (e.g. `src/data/local-store.test.ts:20`, `src/data/api.contract.test.ts:72`, `src/engine/game.ts` `ZERO_TALLIES`).

- [ ] **Step 9: Run**

Run: `npx vitest run src/data server/src`
Expected: PASS (server tests that need Postgres run where `DATABASE_URL` is set; they apply 0002 automatically via `migrate`).

- [ ] **Step 10: Commit**

```bash
git add -A src/engine/types.ts src/data server
git commit -m "feat: persist word difficulty and source"
```

---

### Task 3: Engine — home run + difficulty-aware outcomes

**Files:**
- Modify: `src/engine/bases.ts`, `src/engine/game.ts`, `src/engine/results.ts`, `src/features/parent/stats.ts`
- Test: `src/engine/bases.test.ts`, `src/engine/game.test.ts`, `src/engine/results.test.ts`, `src/features/parent/stats.test.ts`

**Interfaces:**
- Consumes: `Difficulty`, `Outcome` (Task 2).
- Produces: `export function outcomeFor(attemptNumber: 1 | 2 | 3, difficulty: Difficulty): Exclude<Outcome, 'strikeout'>` in `game.ts`; `advance(bases, 'homeRun')`.

- [ ] **Step 1: Failing tests** — `bases.test.ts`:

```ts
it('home run clears the bases and scores everyone plus the batter', () => {
  expect(advance({ first: true, second: true, third: true }, 'homeRun')).toEqual({ bases: EMPTY_BASES, runs: 4 })
  expect(advance(EMPTY_BASES, 'homeRun')).toEqual({ bases: EMPTY_BASES, runs: 1 })
  expect(advance({ first: false, second: true, third: false }, 'homeRun')).toEqual({ bases: EMPTY_BASES, runs: 2 })
})
```

`game.test.ts`:

```ts
import { createGame, outcomeFor, submitAnswer } from './game'

describe('outcomeFor', () => {
  it.each([
    [1, 'easy', 'single'], [1, 'medium', 'double'], [1, 'hard', 'homeRun'],
    [2, 'easy', 'walk'], [2, 'medium', 'single'], [2, 'hard', 'double'],
    [3, 'easy', 'walk'], [3, 'medium', 'walk'], [3, 'hard', 'walk'],
  ] as const)('try %i on %s → %s', (n, d, out) => {
    expect(outcomeFor(n, d)).toBe(out)
  })
})

it('a hard word spelled on the first try is a home run and is tallied', () => {
  const g = createGame([{ position: 0, text: 'rhythm', sentence: null, source: 'current', sourceWordId: null, difficulty: 'hard' }])
  const { state, event } = submitAnswer(g, 'rhythm')
  expect(event.kind === 'at-bat-complete' && event.outcome).toBe('homeRun')
  expect(state.tallies).toMatchObject({ homeRuns: 1, hits: 1, runs: 1, firstTry: 1 })
})
```

`results.test.ts`:

```ts
it('counts first-try by attempt, not by outcome', () => {
  const words = (['easy', 'hard'] as const).map((difficulty, position) => ({ position, text: `w${position}`, sentence: null, source: 'current' as const, sourceWordId: null, difficulty }))
  let s = createGame(words)
  s = submitAnswer(s, 'w0').state
  s = submitAnswer(s, 'w1').state
  const sum = summarize(s)
  expect(sum.current.firstTry).toBe(2)
  expect(sum.firstTryAccuracy).toBe(100)
})
```

`stats.test.ts` — add a case with a stored game whose final attempt is `{ attemptNumber: 1, correct: true, outcome: 'single' }` and assert the word's `firstTry` count is 1 (use the file's existing game-record factory).

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/engine src/features/parent/stats.test.ts`
Expected: FAIL — `outcomeFor` not exported; homeRun unhandled.

- [ ] **Step 3: Implement bases** — `bases.ts` `advanceAll` batter line becomes `if (n <= 3) after[n - 1] = true; else runs += 1`, and `advance` gains `case 'homeRun': return advanceAll(bases, 4)`.

- [ ] **Step 4: Implement game** — replace `outcomeForAttempt` in `game.ts`:

```ts
const FIRST_TRY: Record<Difficulty, Exclude<Outcome, 'strikeout' | 'walk'>> = { easy: 'single', medium: 'double', hard: 'homeRun' }
const ONE_DOWN: Record<'homeRun' | 'double' | 'single', 'double' | 'single' | 'walk'> = { homeRun: 'double', double: 'single', single: 'walk' }

/** Outcome for a correct answer on attempt n given the word's difficulty. */
export function outcomeFor(n: 1 | 2 | 3, difficulty: Difficulty): Exclude<Outcome, 'strikeout'> {
  const first = FIRST_TRY[difficulty]
  if (n === 1) return first
  if (n === 2) return ONE_DOWN[first]
  return 'walk'
}
```

Call site: `const outcome: Outcome = correct ? outcomeFor(attemptNumber, word.difficulty ?? 'medium') : 'strikeout'`. In `tallyOutcome` add:

```ts
    case 'homeRun':
      next.homeRuns += 1
      next.hits += 1
      break
```

and `homeRuns: 0` in `ZERO_TALLIES`.

- [ ] **Step 5: Implement first-try fixes** — `results.ts` breakdown: `firstTry: atBats.filter((ab) => ab.outcome !== 'strikeout' && ab.attempts.length === 1).length`. `stats.ts` lines 28, 61, 95: replace `x.outcome === 'double'` with `x.outcome !== 'strikeout' && x.attemptNumber === 1` (where `x` is `final` / `a`).

- [ ] **Step 6: Run**

Run: `npx vitest run src/engine src/features/parent`
Expected: PASS. Also run `npx vitest run src/engine/replay.test.ts` — old fixtures with no difficulty fall back to medium so try-1 is still a double.

- [ ] **Step 7: Commit**

```bash
git add src/engine src/features/parent/stats.ts src/features/parent/stats.test.ts
git commit -m "feat(engine): difficulty-aware hits and home runs"
```

---

### Task 4: Build the 20-word week at save; stop double review at game start

**Files:**
- Create: `src/engine/weekList.ts`, `src/engine/weekList.test.ts`
- Modify: `src/engine/selection.ts`, `src/engine/selection.test.ts`, `src/features/game/startGame.ts`, `src/features/game/startGame.test.ts`, `src/features/parent/ListEditorPage.tsx`, `src/features/parent/ListEditorPage.test.tsx`

**Interfaces:**
- Consumes: `NewWord`, `Difficulty`, `findPrecedingList`, `shuffle`, `normalize`, `REVIEW_COUNT`.
- Produces: `buildWeekList(typed: NewWord[], previous: NewWord[] | null, rng: () => number): { words: NewWord[]; warnings: string[] }` — returns typed words (source `current`, difficulty default `medium`) followed by up to 5 review words (source `review`, difficulty `easy`). `weeklyWords(list: SourceWord[], rng): GameWord[]` in `selection.ts`. `SourceWord` gains `difficulty: Difficulty; source: WordSource`.

- [ ] **Step 1: Failing tests** — `src/engine/weekList.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { seededRng } from './rng'
import { buildWeekList } from './weekList'

const typed = (n: number) => Array.from({ length: n }, (_, i) => ({ text: `c${i}`, sentence: null, difficulty: 'hard' as const }))
const prev = (n: number) => Array.from({ length: n }, (_, i) => ({ text: `p${i}`, sentence: null, difficulty: 'hard' as const }))

describe('buildWeekList', () => {
  it('adds 5 distinct review words from last week, tagged review + easy', () => {
    const { words, warnings } = buildWeekList(typed(15), prev(15), seededRng(1))
    expect(words).toHaveLength(20)
    const review = words.filter((w) => w.source === 'review')
    expect(review).toHaveLength(5)
    expect(new Set(review.map((w) => w.text)).size).toBe(5)
    expect(review.every((w) => w.difficulty === 'easy' && w.text.startsWith('p'))).toBe(true)
    expect(words.slice(0, 15).every((w) => w.source === 'current' && w.difficulty === 'hard')).toBe(true)
    expect(warnings).toEqual([])
  })
  it('defaults typed words to medium', () => {
    const { words } = buildWeekList([{ text: 'cat', sentence: null }], null, seededRng(1))
    expect(words[0]).toMatchObject({ difficulty: 'medium', source: 'current' })
  })
  it('first week: no previous list keeps just the typed words and warns', () => {
    const { words, warnings } = buildWeekList(typed(15), null, seededRng(1))
    expect(words).toHaveLength(15)
    expect(warnings[0]).toMatch(/No previous week/)
  })
  it('fewer than 5 eligible review words adds all of them and skips words repeated this week', () => {
    const { words, warnings } = buildWeekList(typed(15), [{ text: 'c0', sentence: null }, { text: 'p1', sentence: null }], seededRng(1))
    expect(words.filter((w) => w.source === 'review').map((w) => w.text)).toEqual(['p1'])
    expect(warnings[0]).toMatch(/Only 1 review word/)
  })
  it('ignores review words already on last week\'s list (only its typed words count)', () => {
    const last = [...prev(3).map((w) => ({ ...w, source: 'current' as const })), { text: 'old', sentence: null, source: 'review' as const }]
    const { words } = buildWeekList(typed(15), last, seededRng(1))
    expect(words.some((w) => w.text === 'old')).toBe(false)
  })
  it('is deterministic for a seed', () => {
    expect(buildWeekList(typed(15), prev(15), seededRng(7))).toEqual(buildWeekList(typed(15), prev(15), seededRng(7)))
  })
})
```

Replace the `startWeeklyGame` tests in `startGame.test.ts:23-50` with:

```ts
describe('startWeeklyGame', () => {
  it('plays exactly the saved list, shuffled, with no extra review words', async () => {
    await store.createWordList(playerId, { title: 'Oct 12', weekStart: '2026-10-12', words: w('p', 15) })
    const words = [...w('c', 15), ...w('p', 5).map((x) => ({ ...x, source: 'review' as const, difficulty: 'easy' as const }))]
    const active = await store.createWordList(playerId, { title: 'Oct 19', weekStart: '2026-10-19', words })
    const g = await startWeeklyGame(store, playerId, active.id, seededRng(1))
    expect(g.words).toHaveLength(20)
    expect(g.words.filter((x) => x.source === 'review')).toHaveLength(5)
    expect(g.words.find((x) => x.text === 'p0')!.difficulty).toBe('easy')
    expect(g.warnings).toEqual([])
  })
  it('a 15-word list plays 15', async () => {
    const active = await store.createWordList(playerId, { title: 'Oct 19', weekStart: '2026-10-19', words: w('c', 15) })
    expect((await startWeeklyGame(store, playerId, active.id, seededRng(1))).words).toHaveLength(15)
  })
})
```

In `selection.test.ts` delete the `selectGameWords` describe (tests 16-18 and the warning tests move to `weekList.test.ts` above) and add:

```ts
describe('weeklyWords', () => {
  it('keeps every list word with its source and difficulty, shuffled', () => {
    const list = [
      { id: 'a', text: 'cat', sentence: null, source: 'current' as const, difficulty: 'hard' as const },
      { id: 'b', text: 'dog', sentence: null, source: 'review' as const, difficulty: 'easy' as const },
    ]
    const out = weeklyWords(list, seededRng(3))
    expect(out.map((x) => x.text).sort()).toEqual(['cat', 'dog'])
    expect(out.find((x) => x.text === 'dog')).toMatchObject({ source: 'review', difficulty: 'easy', sourceWordId: 'b' })
    expect(out.map((x) => x.position)).toEqual([0, 1])
  })
})
```

Update `practiceWords` test fixtures to include `source: 'current', difficulty: 'medium'`.

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/engine/weekList.test.ts src/engine/selection.test.ts src/features/game/startGame.test.ts`
Expected: FAIL — module `./weekList` not found; `weeklyWords` not exported.

- [ ] **Step 3: Implement `src/engine/weekList.ts`**

```ts
/** Builds a kid's weekly list at save time: the typed words plus up to 5 review words from last week. */
import type { NewWord } from '../data/types'
import { normalize } from './grade'
import { shuffle } from './rng'

export const REVIEW_COUNT = 5

export function buildWeekList(typed: NewWord[], previous: NewWord[] | null, rng: () => number): { words: NewWord[]; warnings: string[] } {
  const current: NewWord[] = typed.map((w) => ({ ...w, difficulty: w.difficulty ?? 'medium', source: 'current' }))
  if (previous === null) {
    return { words: current, warnings: ["No previous week's list was found, so this week has only the words you typed."] }
  }
  const seen = new Set(current.map((w) => normalize(w.text)))
  const eligible: NewWord[] = []
  for (const w of previous) {
    if ((w.source ?? 'current') !== 'current') continue
    const key = normalize(w.text)
    if (seen.has(key)) continue
    seen.add(key)
    eligible.push(w)
  }
  const review: NewWord[] = shuffle(eligible, rng)
    .slice(0, REVIEW_COUNT)
    .map((w) => ({ text: w.text, sentence: w.sentence, difficulty: 'easy', source: 'review' }))
  const warnings: string[] = []
  if (review.length < REVIEW_COUNT) {
    const n = review.length
    warnings.push(`Only ${n} review word${n === 1 ? '' : 's'} from last week ${n === 1 ? 'was' : 'were'} available, so this week has ${current.length + n} words.`)
  }
  return { words: [...current, ...review], warnings }
}
```

- [ ] **Step 4: Simplify `selection.ts`** — delete `selectGameWords`, `Selection`, and its `REVIEW_COUNT` (now in `weekList.ts`). Make `SourceWord` and helpers carry difficulty/source:

```ts
export interface SourceWord {
  id: string
  text: string
  sentence: string | null
  source: WordSource
  difficulty: Difficulty
}

function toGameWords(items: SourceWord[]): GameWord[] {
  return items.map((w, position) => ({
    position, text: w.text, sentence: w.sentence, source: w.source, difficulty: w.difficulty, sourceWordId: w.id,
  }))
}

/** The weekly game: the saved list (already 15 + review) shuffled. Never adds words. */
export function weeklyWords(list: SourceWord[], rng: () => number): GameWord[] {
  return toGameWords(shuffle(distinct(list), rng))
}

export function practiceWords(list: SourceWord[], rng: () => number): GameWord[] {
  return toGameWords(shuffle(distinct(list), rng).map((w) => ({ ...w, source: 'current' as const })))
}
```

(`distinct` keeps its body but its `exclude` param is now unused — remove it.) Run `rg -n "selectGameWords|REVIEW_COUNT" src` and repoint any import of `REVIEW_COUNT` to `./weekList` / `../../engine/weekList`.

- [ ] **Step 5: `startGame.ts`**

```ts
import type { GameRecord, Store, WordList } from '../../data/types'
import { normalize } from '../../engine/grade'
import { practiceWords, weeklyWords, type SourceWord } from '../../engine/selection'
import type { GameWord } from '../../engine/types'

const toSource = (list: Pick<WordList, 'words'>): SourceWord[] =>
  list.words.map((w) => ({ id: w.id, text: w.text, sentence: w.sentence, source: w.source, difficulty: w.difficulty }))

export async function startWeeklyGame(store: Store, playerId: string, listId: string, rng: () => number = Math.random): Promise<GameRecord> {
  const list = await store.getWordList(listId)
  if (!list || list.playerId !== playerId) throw new Error('LIST_NOT_FOUND')
  return store.createGame({ playerId, listId, mode: 'weekly', words: weeklyWords(toSource(list), rng), warnings: [] })
}
```

Drop the `findPrecedingList` import here. In `startMissedWordsGame`'s mapping add `source: 'current' as const, difficulty: s.word.difficulty ?? 'medium'`.

- [ ] **Step 6: ListEditor test (failing)** — add to `ListEditorPage.test.tsx` (reuse the file's render helper and store setup):

```tsx
it('tags difficulty, then builds the week with 5 easy review words from last week', async () => {
  await store.createWordList(playerId, { title: 'last', weekStart: '2026-10-19', words: Array.from({ length: 10 }, (_, i) => ({ text: `old${i}`, sentence: null })) })
  renderEditor(playerId) // existing helper → /parent/players/:playerId/lists/new
  await user.clear(screen.getByLabelText('Week starts'))
  await user.type(screen.getByLabelText('Week starts'), '2026-10-26')
  for (const t of ['cat', 'dog']) await user.type(screen.getByLabelText('Type a word and press Enter'), `${t}{Enter}`)
  await user.click(screen.getByRole('radio', { name: 'cat: Hard' }))
  expect(screen.getByRole('radio', { name: 'dog: Medium' })).toBeChecked()
  await user.click(screen.getByRole('button', { name: 'Build week' }))
  expect(await screen.findAllByText('from last week')).toHaveLength(5)
  await user.click(screen.getByRole('button', { name: 'Save list' }))
  const saved = (await store.listWordLists(playerId)).find((l) => l.weekStart === '2026-10-26')!
  expect(saved.words).toHaveLength(7)
  expect(saved.words.find((w) => w.text === 'cat')!.difficulty).toBe('hard')
  expect(saved.words.filter((w) => w.source === 'review').every((w) => w.difficulty === 'easy')).toBe(true)
})
```

Run: `npx vitest run src/features/parent/ListEditorPage.test.tsx` → FAIL (no radio "cat: Hard").

- [ ] **Step 7: Implement ListEditor** — in `ListEditorPage.tsx`:

1. Imports: `import { buildWeekList } from '../../engine/weekList'`, `import { findPrecedingList } from '../../data/previous-week'`, `import { DIFFICULTIES, type Difficulty } from '../../engine/types'`.
2. State: `const [review, setReview] = useState<NewWord[] | null>(null)` and `const [buildNotes, setBuildNotes] = useState<string[]>([])`.
3. Load existing list: `setWords(l.words.filter((w) => w.source === 'current').map((w) => ({ text: w.text, sentence: w.sentence, difficulty: w.difficulty, source: 'current' })))` and `setReview(l.words.some((w) => w.source === 'review') ? l.words.filter((w) => w.source === 'review').map((w) => ({ text: w.text, sentence: w.sentence, difficulty: w.difficulty, source: 'review' })) : null)`.
4. `addWords` pushes `{ text: t, sentence: null, difficulty: 'medium', source: 'current' }` and calls `setReview(null)` (typed list changed → rebuild needed).
5. Helper:

```tsx
async function buildWeek(): Promise<NewWord[]> {
  const lists = await store.listWordLists(playerId)
  const target = { id: listId ?? '__new__', playerId, title: '', weekStart, isActive: false, createdAt: '', words: [] }
  const prev = findPrecedingList(lists, target)
  const built = buildWeekList(words, prev ? prev.words : null, Math.random)
  const rev = built.words.filter((w) => w.source === 'review')
  setReview(rev)
  setBuildNotes(built.warnings)
  return rev
}
```

6. `onSubmit`: after validation, `const rev = review ?? (await buildWeek())`, then save `words: [...words, ...rev]` for both create and update.
7. Difficulty control inside each typed-word `<li>` after the word input:

```tsx
<DifficultyPicker word={w.text} value={w.difficulty ?? 'medium'} onChange={(d) => setWords((ws) => ws.map((x, j) => (j === i ? { ...x, difficulty: d } : x)))} />
```

with this component at the bottom of the file:

```tsx
function DifficultyPicker({ word, value, onChange }: { word: string; value: Difficulty; onChange: (d: Difficulty) => void }) {
  const label: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }
  return (
    <div role="radiogroup" aria-label={`Difficulty for ${word}`} className="flex rounded-full border border-navy/20 overflow-hidden text-sm">
      {DIFFICULTIES.map((d) => (
        <button key={d} type="button" role="radio" aria-checked={value === d} aria-label={`${word}: ${label[d]}`}
          onClick={() => onChange(d)}
          className={`px-3 py-1 ${value === d ? 'bg-navy text-chalk' : 'text-navy'}`}>
          {label[d]}
        </button>
      ))}
    </div>
  )
}
```

8. Below the `<ol>`: a `Build week` secondary button (`onClick={() => void buildWeek()}`), then when `review` is non-null a second list headed "Review words" whose rows show the word text (read-only), a `from last week` badge, and the same `DifficultyPicker` updating `setReview`. Render `buildNotes` through `<Banner>`.
9. Intro copy (line with "Drop in the teacher's PDF…") → `Type this week's 15 words and tag each Easy, Medium, or Hard. We add 5 review words from last week to make 20.`
10. Counter target stays `TARGET = 15`, counting `words.length` (typed only).

- [ ] **Step 8: Run**

Run: `npx vitest run src/engine src/features/game src/features/parent`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/engine src/features/game/startGame.ts src/features/game/startGame.test.ts src/features/parent/ListEditorPage.tsx src/features/parent/ListEditorPage.test.tsx
git commit -m "feat: build 15+5 week at list save with difficulty tags"
```

---

### Task 5: Home run in the game UI, booth, field, results

**Files:**
- Modify: `src/field/layout.ts:59-60`, `src/field/FieldScene.ts:276-286`, `src/field/controller.ts:19`, `src/features/game/announcements.ts`, `src/features/game/playSequence.ts:67`, `src/audio/announcer.ts:11,51,148,237`, `src/features/game/ResultsPage.tsx:76`, `src/features/game/Scoreboard.tsx`
- Test: `src/features/game/announcements.test.ts`, `src/field/layout.test.ts` (create if absent), `src/features/game/ResultsPage.test.tsx`

**Interfaces:** Consumes `Outcome` with `'homeRun'`; `AnnounceEvent` gains `'homeRun'`; `playHit(outcome: 'single' | 'double' | 'homeRun', …)`.

- [ ] **Step 1: Failing tests**

`announcements.test.ts`:

```ts
it('calls a home run', () => {
  const ev = { kind: 'at-bat-complete', outcome: 'homeRun', attempts: [], runsScored: 1, basesBefore: EMPTY_BASES, basesAfter: EMPTY_BASES,
    outsAfter: 0, inningEnded: false, nextInning: 1, gameOver: false, correctSpelling: 'rhythm',
    word: { position: 0, text: 'rhythm', sentence: null, source: 'current', sourceWordId: null, difficulty: 'hard' } } as const
  expect(announcementsFor(ev)[0]).toBe('HOME RUN!')
})
```

`src/field/layout.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { basesDiff } from './layout'

describe('basesDiff homeRun', () => {
  it('sends every runner and the batter home', () => {
    expect(basesDiff({ first: true, second: false, third: true }, { first: false, second: false, third: false }, 'homeRun', 3)).toEqual([
      { from: 'third', to: 'score' }, { from: 'first', to: 'score' }, { from: 'home', to: 'score' },
    ])
  })
})
```

`ResultsPage.test.tsx`: in the existing render, give the summary `homeRuns: 2` and assert `screen.getByText('Home runs')` and its value `2` are present.

- [ ] **Step 2: Run** `npx vitest run src/features/game src/field` → FAIL.

- [ ] **Step 3: Implement**
- `layout.ts`: change the hit branch to

```ts
  if (outcome === 'single' || outcome === 'double' || outcome === 'homeRun') {
    const n = outcome === 'single' ? 1 : outcome === 'double' ? 2 : 4
    for (const b of occupied) {
      const idx = ORDER.indexOf(b) + n
      moves.push({ from: b, to: idx >= 4 ? 'score' : ORDER[idx]! })
    }
    moves.push({ from: 'home', to: n >= 4 ? 'score' : ORDER[n]! })
    return moves
  }
```

(`ORDER` is `['home','first','second','third']`; verify with the test.)
- `controller.ts:19` and `FieldScene.ts:276`: widen type to `'single' | 'double' | 'homeRun'`; in `FieldScene.playHit` use `const deep = outcome !== 'single'`; for `homeRun` set `ty = WALL_TOP - 30` (ball leaves the yard), duration `1200`, otherwise existing values.
- `announcements.ts`: add `case 'homeRun': out.push('HOME RUN!'); break`.
- `announcer.ts`: add `'homeRun'` to `ANNOUNCE_EVENTS`; add `homeRun` arrays — Big Red: `["GONE! {word} is OUTTA HERE! A grand-slam-sized home run!", "Touch 'em all, kid! That one's a HOME RUN!"]`; Smooth Eddie: `["Waaaay back… and gone. Home run, smooth as you like.", "That's a souvenir for somebody. Home run."]`; quiet: `homeRun: []`. (If audio-redo merged pre-recorded clips keyed by event, `homeRun` falls back to speech — out of scope to record new clips.)
- `playSequence.ts`: in the default (hit) branch, when `event.outcome === 'homeRun'` also call `sfx.cheer()` before the play; comment becomes `// HOME RUN! / DOUBLE! / BASE HIT!`.
- `ResultsPage.tsx:76`: `['Hits', s.hits], ['Home runs', s.homeRuns ?? 0], ['Doubles', s.doubles], …` (`?? 0` keeps old saved summaries rendering).
- `Scoreboard.tsx`: no new cell needed (hits already includes HR); leave unchanged unless tsc flags an exhaustive switch.

- [ ] **Step 4: Run** `npx vitest run && npx tsc -b --noEmit` → PASS / no errors.

- [ ] **Step 5: Commit**

```bash
git add src/field src/features/game src/audio/announcer.ts
git commit -m "feat: home run calls, animation, and results row"
```

---

### Task 6: Kid picker + Add sibling + private share blurb

**Files:**
- Modify: `src/features/players/PlayersPage.tsx`
- Test: `src/features/players/PlayersPage.test.tsx` (create)

**Interfaces:** Consumes `usePlayers`, `ShareButton`, `PlayerPreview` (unchanged).

- [ ] **Step 1: Failing test** — `src/features/players/PlayersPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import { PlayersPage } from './PlayersPage'

vi.mock('./usePlayers', () => ({
  usePlayers: () => ({ loading: false, players: [
    { id: 'a', name: 'Cooper', teamName: '', jerseyNumber: 7, hand: 'L', appearance: {}, createdAt: '' },
    { id: 'b', name: 'Mia', teamName: '', jerseyNumber: 3, hand: 'R', appearance: {}, createdAt: '' },
  ] }),
}))
vi.mock('./PlayerPreview', () => ({ PlayerPreview: () => null }))

it('shows every kid as a big pick and an Add sibling action with private share copy', () => {
  render(<MemoryRouter><PlayersPage /></MemoryRouter>)
  expect(screen.getByRole('link', { name: 'Play as Cooper' })).toHaveAttribute('href', '/play/a')
  expect(screen.getByRole('link', { name: 'Play as Mia' })).toHaveAttribute('href', '/play/b')
  expect(screen.getByRole('link', { name: 'Add sibling' })).toHaveAttribute('href', '/players/new')
  expect(screen.getByText(/only with friends/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run** `npx vitest run src/features/players/PlayersPage.test.tsx` → FAIL.

- [ ] **Step 3: Implement** — in `PlayersPage.tsx`:
- Header `h1` → `Who's up to bat?`
- Each card's Play link: `<Link to={`/play/${p.id}`} aria-label={`Play as ${p.name}`} className="btn-primary min-h-14 px-6 py-3 text-xl">Play</Link>`; make the whole card larger (`PlayerPreview size={130}`).
- Replace `Add a player` with `<Link to="/players/new" className="btn-secondary min-h-14 text-lg">Add sibling</Link>`.
- Share block text → `<p className="mb-2">Sharing only with friends? Send them the link — each family makes its own login and kids stay private.</p>`.

- [ ] **Step 4: Run** `npx vitest run src/features/players` → PASS. Run `rg -n "Add a player" e2e src` and update any matches to `Add sibling`.

- [ ] **Step 5: Commit**

```bash
git add src/features/players e2e
git commit -m "feat: kid picker with Add sibling and private share copy"
```

---

### Task 7: Registration gate (`ALLOW_REGISTRATION`)

**Files:**
- Modify: `server/src/app.ts:195`, `server/src/index.ts`, `src/data/api-auth.ts` (error mapping), `src/features/auth/RegisterPage.tsx`
- Test: `server/src/app.test.ts`, `src/features/auth/auth.test.tsx`

**Interfaces:** Produces app option `allowRegistration: boolean` (default `true`) on whatever options object `createApp` already takes; 403 body `{ error: 'REGISTRATION_CLOSED' }`.

- [ ] **Step 1: Failing test** — `server/src/app.test.ts`, using its existing app factory:

```ts
it('refuses new signups when registration is closed', async () => {
  const app = makeApp({ allowRegistration: false }) // existing helper; pass option through to createApp
  const res = await request(app).post('/api/auth/register').set('x-requested-with', 'slugger')
    .send({ email: `closed-${Date.now()}@example.com`, password: 'longenough1' })
  expect(res.status).toBe(403)
  expect(res.body).toEqual({ error: 'REGISTRATION_CLOSED' })
})
```

`auth.test.tsx`: mock register to reject with the API error the client produces for `REGISTRATION_CLOSED`, submit the form, expect `/invite-only/i` text.

- [ ] **Step 2: Run** `npx vitest run server/src/app.test.ts src/features/auth` → FAIL.

- [ ] **Step 3: Implement**
- `app.ts`: add `allowRegistration?: boolean` to the createApp options type; at top of the register handler: `if (opts.allowRegistration === false) return res.status(403).json({ error: 'REGISTRATION_CLOSED' })`.
- `index.ts`: pass `allowRegistration: process.env.ALLOW_REGISTRATION !== 'false'`.
- `api-auth.ts` / `authErrorMessage`: map `REGISTRATION_CLOSED` → `Grand Slam Spelling is invite-only right now. Ask the friend who sent you the link.`
- README: add under setup: ``Set `ALLOW_REGISTRATION=false` (Replit Secrets) once friends have signed up to stop new accounts.``

- [ ] **Step 4: Run** → PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src src/data/api-auth.ts src/features/auth README.md
git commit -m "feat: ALLOW_REGISTRATION gate for invite-only sharing"
```

---

### Task 8: e2e — two kids, difficulty list, Hard first try = home run

**Files:**
- Create: `e2e/grand-slam.spec.ts`
- Modify: `e2e/helpers.ts` (add `addWordListWithDifficulty`), `e2e/game-flow.spec.ts` (if `hits`/outcome expectations change: 3 Medium words still double, so expected unchanged)

**Interfaces:** Consumes `registerAndCreatePlayer`, `openNewList`, `stubSpeech`, `spoken`, `cleanupFamily`; UI labels from Tasks 4–6 (`'<word>: Hard'`, `Add sibling`, `Build week`, `HOME RUN!`).

- [ ] **Step 1: Helper** — append to `e2e/helpers.ts`:

```ts
export async function addWordListWithDifficulty(page: Page, playerId: string, words: [string, 'Easy' | 'Medium' | 'Hard'][]): Promise<void> {
  await openNewList(page, playerId)
  const input = page.getByLabel('Type a word and press Enter')
  for (const [w] of words) { await input.fill(w); await input.press('Enter') }
  for (const [w, d] of words) await page.getByRole('radio', { name: `${w}: ${d}` }).click()
  await page.getByRole('button', { name: 'Save list' }).click()
  await page.waitForURL(new RegExp(`/parent/players/${playerId}/lists$`))
  await page.getByText('Active', { exact: true }).waitFor()
}
```

- [ ] **Step 2: Spec** — `e2e/grand-slam.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { addWordListWithDifficulty, cleanupFamily, registerAndCreatePlayer, spoken, stubSpeech } from './helpers'

test.afterEach(async ({ page }) => { await cleanupFamily(page) })

test('two kids, a hard word on the first try is a home run', async ({ page }) => {
  await stubSpeech(page)
  const cooperId = await registerAndCreatePlayer(page)

  await page.goto('/players')
  await page.getByRole('link', { name: 'Add sibling' }).click()
  await page.getByLabel('Player name').fill('Mia')
  await page.getByRole('radio', { name: 'Right-handed' }).click()
  await page.getByRole('button', { name: 'Save player' }).click()
  await page.waitForURL(/\/play\/[^/]+$/)
  await page.goto('/players')
  await expect(page.getByRole('link', { name: 'Play as Cooper' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Play as Mia' })).toBeVisible()

  await addWordListWithDifficulty(page, cooperId, [['rhythm', 'Hard']])

  await page.goto(`/play/${cooperId}`)
  await page.getByRole('button', { name: "Play this week's game" }).click()
  await page.waitForURL(/\/game\/[^/]+$/)
  const input = page.getByLabel('Spell the word')
  await expect(input).toBeEnabled()
  await expect.poll(async () => (await spoken(page)).includes('rhythm')).toBe(true)
  await input.fill('rhythm')
  await input.press('Enter')
  await expect(page.getByText('HOME RUN!')).toBeVisible()
  await expect(page.getByTestId('runs')).toHaveText('1')
})
```

(First week → 1 word, no review, so the only word is the Hard one.)

- [ ] **Step 3: Run**

Run: `npm run build && npm run e2e -- e2e/grand-slam.spec.ts e2e/game-flow.spec.ts e2e/smoke.spec.ts`
Expected: all PASS. If "Play this week's game" isn't shown because the game ended instantly or the board text flashes too fast, assert on `page.getByTestId('hits')` = `1` and the results page `Home runs` row = `1` instead.

- [ ] **Step 4: Full suite**

Run: `npm test && npm run e2e`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add e2e
git commit -m "test(e2e): siblings + hard word home run"
```

---

## Self-review (against spec)

| Spec item | Task |
| --- | --- |
| Rename surfaces (title, welcome, PWA, apple title, README) | 1 |
| Multi-kid picker + Add sibling | 6 |
| Type 15, paste, Easy/Medium/Hard (default Medium) | 4 |
| 5 random review from previous week at save, shown "from last week", default Easy, retag allowed | 4 |
| First week → 15 only + warning | 4 (`buildWeekList` null branch) |
| <5 prior → add all available | 4 |
| `words.difficulty`, `words.source` | 2 |
| `game_words` snapshot difficulty | 2 |
| `homeRuns` tally, `'homeRun'` outcome, bases n=4 | 2, 3 |
| `outcomeFor(n, difficulty)` matrix | 3 |
| Results/scoreboard/booth mention home runs; big-hit SFX | 5 |
| Private share copy; optional `ALLOW_REGISTRATION` | 1, 6, 7 |
| e2e: register → two kids → difficulties → HR | 8 |
| No double review at game start | 4 (`weeklyWords`, tests assert 20 not 25) |
| Family isolation unchanged | ownership guards untouched in 2 |

**Spec gaps resolved here:**
1. Spec names `words.source` values `new | review`; codebase already uses `current | review` on `GameWord`. Plan reuses `current | review` everywhere.
2. Spec says play list "of 20" while also "15 + 5"; plan does not hard-cap typed words (mom may type up to 20 on week 1, and the existing "any number works" stays).
3. First-try stats (`results.ts`, `stats.ts`) assumed first try = `double`; with Easy→single that breaks, so first-try is now "resolved correctly on attempt 1".
4. Review words are drawn only from last week's `current` words, so a word never cascades as review-of-review.
5. Legacy rows/games without difficulty default to `medium` (try 1 = double, identical to today).
6. Audio-redo pre-recorded clips don't cover `homeRun`; booth falls back to speech lines added in Task 5 (no new recordings — out of scope).
