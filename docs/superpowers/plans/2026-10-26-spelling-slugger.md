# Cooper's Spelling Slugger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A hosted, installable web app where a child hears a spelling word, types it, and earns doubles, singles, walks or strikeouts in a 2D baseball game, with parents managing weekly word lists and reading progress, one private account per family.

**Architecture:** A pure, deterministic TypeScript game engine (`src/engine`) owns every rule; the React UI dispatches submissions to it and the Phaser field only *renders* the events it emits. All persistence goes through one `Store` interface with two implementations: `LocalStore` (localStorage, used for development before Supabase exists and for end-to-end tests) and `SupabaseStore` (Postgres with row-level security). Game truth is the ordered list of submitted attempts; resuming a game replays them through the engine, which makes duplicate scoring impossible.

**Tech Stack:** Vite 6, React 19, TypeScript 5 (strict), react-router 7, Tailwind CSS 4, Phaser 3.90, @supabase/supabase-js 2, vite-plugin-pwa, Vitest 3, Playwright. Hosting: Vercel (free tier). Database/auth: Supabase (free tier). Node 26 / npm 11 on the dev machine.

**Spec:** `docs/superpowers/specs/2026-10-26-spelling-slugger-spec.md`

## Global Constraints

- Every incorrect full-word submission is exactly ONE strike; letters are never graded individually; empty submissions are not strikes.
- Outcomes: correct on attempt 1 = DOUBLE, attempt 2 = SINGLE, attempt 3 = WALK, three incorrect = STRIKEOUT (one out). A walk never counts as a hit.
- Comparison is case-insensitive and trims whitespace; punctuation (apostrophes, hyphens) must match after normalizing curly apostrophes to `'`.
- Weekly game = active list's words (normally 15) + 5 distinct review words from the immediately preceding week's list of the same child; order randomized; selection stored with the game; no duplicate words within a game.
- No nine-inning limit; three outs clear the bases; the game ends after the last word; runners left on base never score.
- Never display the correct spelling while an at-bat is active; reveal it only after a strikeout.
- Children have no accounts; no public profiles or leaderboards; collect only a first name/nickname per child.
- Families are isolated by Postgres row-level security, never by frontend hiding alone.
- No subscriptions, ads, payments, copyrighted logos or audio; all art is drawn procedurally; all sound is synthesized or browser TTS.
- Product branding is "Cooper's Spelling Slugger"; nothing about Cooper is hardcoded into registration for other families.
- `spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off"` on the spelling input; no letter or length hints in official games.
- Ask Brandon before: installing Playwright browsers, installing the Supabase CLI via brew, or anything that costs money or deploys publicly.
- Secrets live only in `.env.local`; `.env.example` ships with placeholders; the Supabase anon key is the only key the frontend ever sees.
- Commit after each task. Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. A pasted list with blank lines, trailing commas, numbering like `1. apple`, or duplicate words must produce a clean numbered list, not junk entries. (Test in Task 11: `parseWordPaste`.)
2. A word with a curly apostrophe typed on an iPhone (`don’t`) must be graded correct against `don't`. (Test in Task 2.)
3. Pressing Enter twice quickly, or Enter while a play animation runs, must not produce a second attempt. (Engine guard in Task 4; UI lock test in Task 13; e2e in Task 20.)
4. Closing the laptop mid-at-bat with two strikes must resume at two strikes on the same word, not restart the word. (Test in Task 6 `rebuild`; e2e in Task 20.)
5. A previous-week list that shares words with the current week must not put the same word in the game twice, and a list from three weeks ago must not be mistaken for "last week". (Tests in Tasks 5 and 13.)

---

## File Structure

```
spelling-slugger/
  index.html  vite.config.ts  tsconfig.json  vitest.config.ts  playwright.config.ts
  .env.example  .gitignore  README.md  vercel.json
  public/icon.svg  public/icons/*.png (generated)
  scripts/make-icons.mjs
  supabase/migrations/0001_init.sql        schema, RLS, triggers, RPC functions
  supabase/README.md                        how to apply migrations without Docker
  src/
    main.tsx  App.tsx  routes.tsx
    styles/tokens.css  styles/app.css
    engine/                                 PURE, no React, no DOM
      types.ts  grade.ts  bases.ts  game.ts  selection.ts  results.ts  replay.ts  rng.ts
    data/
      types.ts        Player, Appearance, WordList, Word, GameRecord, StoredAttempt, GameMode
      store.ts        Store interface + StoreProvider/useStore
      local-store.ts  LocalStore (localStorage)
      supabase-client.ts  supabase-store.ts
      auth.tsx        AuthProvider/useAuth with Local and Supabase backends
      previous-week.ts  findPrecedingList()
    audio/speech.ts  audio/sfx.ts  audio/settings.ts
    field/
      layout.ts       FIELD geometry, batterPlacement(), runnerPath()  (pure, tested)
      figures.ts      drawBatter/drawPitcher/drawRunner with Phaser.Graphics
      FieldScene.ts   Phaser.Scene implementing FieldController
      controller.ts   FieldController interface
      Field.tsx       React wrapper mounting Phaser.Game
    features/
      welcome/WelcomePage.tsx
      auth/LoginPage.tsx RegisterPage.tsx ForgotPage.tsx ResetPage.tsx
      players/PlayersPage.tsx PlayerEditorPage.tsx PlayerPreview.tsx appearance.ts
      home/ChildHomePage.tsx
      game/GamePage.tsx useGameSession.ts startGame.ts Scoreboard.tsx SpellingInput.tsx
           Announcement.tsx ResultsPage.tsx
      parent/ParentGate.tsx PinPad.tsx ParentLayout.tsx ListsPage.tsx ListEditorPage.tsx
             wordPaste.ts HistoryPage.tsx GameDetailPage.tsx StatsPage.tsx stats.ts
             AccountPage.tsx charts/Sparkline.tsx charts/Bars.tsx
      share/ShareButton.tsx
    components/Button.tsx Card.tsx Modal.tsx TextField.tsx ColorPicker.tsx Banner.tsx
  e2e/smoke.spec.ts  e2e/game-flow.spec.ts
```

Unit tests sit next to their modules as `*.test.ts(x)`. Vitest runs `src/**`; Playwright runs `e2e/**`.

---

## Phase 1 — Foundation

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles/tokens.css`, `src/styles/app.css`, `.gitignore`, `.env.example`, `README.md`, `src/engine/smoke.test.ts`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `preview`, `test` (vitest run), `test:watch`, `typecheck` (tsc --noEmit), `e2e` (playwright test). Env vars `VITE_STORE` (`local` | `supabase`, default `local` when Supabase vars absent), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`.

- [ ] **Step 1: Scaffold with Vite** — `cd ~/Documents/Personal-Projects && npm create vite@latest spelling-slugger -- --template react-ts` (the folder already holds `docs/`; run in a temp dir and move files in, or scaffold then restore `docs/`). `git init`, default branch `main`.
- [ ] **Step 2: Add dependencies** — `npm i react-router phaser @supabase/supabase-js` and `npm i -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/user-event tailwindcss @tailwindcss/vite vite-plugin-pwa @playwright/test sharp`. Do NOT run `npx playwright install` yet (Task 20 asks first).
- [ ] **Step 3: Configure** — `tsconfig.json` with `"strict": true, "noUncheckedIndexedAccess": true`. `vitest.config.ts`: `environment: 'jsdom'`, `include: ['src/**/*.test.{ts,tsx}']`. `vite.config.ts`: react + tailwind plugins (PWA plugin added in Task 20). `tokens.css`: CSS variables `--grass`, `--dirt`, `--chalk`, `--navy`, `--red`, `--gold`, `--ink`, `--paper`, font stack with a rounded display font via Google Fonts (`Fredoka`) for headings and system UI for body.
- [ ] **Step 4: Write `src/engine/smoke.test.ts`** asserting `1 + 1 === 2`; run `npm test` → 1 passed. Run `npm run build` → succeeds. Run `npm run typecheck` → clean.
- [ ] **Step 5: `.env.example`** with the four vars and comments; `.gitignore` adds `.env.local`, `dist`, `test-results`, `playwright-report`. `README.md` with one paragraph and the scripts table (deployment docs come in Task 21).
- [ ] **Step 6: Commit** — `chore: scaffold Vite + React + TS project`.

### Task 2: Grading

**Files:**
- Create: `src/engine/types.ts`, `src/engine/grade.ts`, `src/engine/grade.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  ```ts
  export type Hand = 'L' | 'R';
  export type Outcome = 'double' | 'single' | 'walk' | 'strikeout';
  export type WordSource = 'current' | 'review';
  export interface GameWord { position: number; text: string; sentence: string | null; source: WordSource; sourceWordId: string | null; }
  export interface Bases { first: boolean; second: boolean; third: boolean; }
  export interface Attempt { attemptNumber: 1 | 2 | 3; text: string; correct: boolean; }
  export interface AtBat { position: number; inning: number; attempts: Attempt[]; strikes: number; outcome: Outcome | null; runsScored: number; }
  export interface Tallies { runs: number; hits: number; singles: number; doubles: number; walks: number; strikeouts: number; totalStrikes: number; firstTry: number; secondTry: number; thirdTry: number; missed: number; }
  export interface GameState { words: GameWord[]; index: number; strikes: number; outs: number; inning: number; bases: Bases; tallies: Tallies; atBats: AtBat[]; status: 'active' | 'complete'; }
  ```
- Produces (`grade.ts`): `normalize(s: string): string` (trim, collapse inner whitespace to one space, lowercase, map `’‘ʼ` → `'`, map `‐‑–—` → `-`); `isBlank(s: string): boolean`; `isCorrect(submitted: string, target: string): boolean` = `normalize(a) === normalize(b)`.

- [ ] **Step 1: Write failing tests** in `grade.test.ts`:
  - `isCorrect('Baseball', 'baseball')` → true; `'  baseball '` → true.
  - `isCorrect('basbal','baseball')`, `'basaball'`, `'bseball'` → all false (each is just "incorrect"; the function returns a boolean, never a letter count).
  - `isCorrect("don’t", "don't")` → true; `isCorrect("dont", "don't")` → false; `isCorrect('well–known', 'well-known')` → true.
  - `isBlank('')`, `isBlank('   ')` → true; `isBlank('a')` → false.
- [ ] **Step 2: Run** `npx vitest run src/engine/grade.test.ts` → FAIL (module not found).
- [ ] **Step 3: Implement** `types.ts` and `grade.ts`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `feat(engine): word grading`.

### Task 3: Baserunning

**Files:**
- Create: `src/engine/bases.ts`, `src/engine/bases.test.ts`

**Interfaces:**
- Produces: `EMPTY_BASES: Bases`; `advance(bases: Bases, outcome: Outcome): { bases: Bases; runs: number }`; `runnersOn(bases: Bases): number`.
- Walk rule: batter to first; a runner advances only if the base behind him is being filled by a forced runner (chain from first). Runs score only on bases-loaded walk.

- [ ] **Step 1: Write failing tests** (spec tests 7–11):
  - single, runner on first → `{first:true, second:true, third:false}`, runs 0.
  - single, runners on second and third → first only occupied, runs 2.
  - double, runner on first → `{first:false, second:true, third:true}`, runs 0; double with bases loaded → `{first:false,second:true,third:false}`, runs 2.
  - walk, runner on second only → `{first:true, second:true, third:false}`, runs 0 (not forced).
  - walk, runners on first and second → bases loaded, runs 0; walk, bases loaded → bases loaded, runs 1.
  - strikeout, runner on third → unchanged, runs 0.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `feat(engine): baserunning with force logic`.

### Task 4: Game reducer

**Files:**
- Create: `src/engine/game.ts`, `src/engine/game.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type SubmitEvent =
    | { kind: 'ignored'; reason: 'blank' | 'complete' }
    | { kind: 'strike'; strike: 1 | 2; attemptsSoFar: Attempt[] }
    | { kind: 'at-bat-complete'; outcome: Outcome; attempts: Attempt[]; runsScored: number;
        basesBefore: Bases; basesAfter: Bases; outsAfter: number; inningEnded: boolean;
        nextInning: number; gameOver: boolean; correctSpelling: string; word: GameWord };
  export function createGame(words: GameWord[]): GameState;   // index 0, inning 1, EMPTY_BASES, zeroed tallies
  export function currentWord(state: GameState): GameWord | null;
  export function submitAnswer(state: GameState, text: string): { state: GameState; event: SubmitEvent };  // pure; never mutates input
  ```
- Rules the body must follow: strike count resets per word; outcome by attempt number; strikeout → outs+1, bases untouched; third out → bases cleared, outs 0, inning+1 (only if words remain; if the strikeout was the final word, `gameOver` is true and `inningEnded` is true but bases simply clear); after the final word's at-bat completes `status = 'complete'`; walk counts in `walks` not `hits`; `totalStrikes` counts every incorrect submission.

- [ ] **Step 1: Write failing tests** with a helper `mk(words: string[])` producing GameWords and `play(state, ...answers)`:
  - (1) correct first try → outcome double, batter on second, `tallies.doubles===1, hits===1, firstTry===1`.
  - (2) wrong then right → single, `singles===1, hits===1, secondTry===1, totalStrikes===1`.
  - (3) wrong, wrong, right → walk, `walks===1, hits===0, thirdTry===1`.
  - (4) three wrong → strikeout, `outs===1, strikeouts===1, missed===1`, event `correctSpelling` equals the word.
  - (5) `'basbal'` vs `baseball` → event `{kind:'strike', strike:1}`; strike count 1 regardless of how many letters differ.
  - (6) blank submission → `{kind:'ignored', reason:'blank'}`, state unchanged (deep-equal).
  - (12/13) three strikeouts in a row with a runner on second from an earlier double → after third out: `outs===0, inning===2, bases===EMPTY_BASES`.
  - (14) a 20-word game runs until `index===20`/`status==='complete'`, including a game with 7 strikeouts (3 innings).
  - (15) final word is a double with a runner on first → runs scored only for the runner crossing home (none here); batter and runner left on base add nothing; `runs` unchanged.
  - (26) submitting after `status==='complete'` → `{kind:'ignored', reason:'complete'}` and identical state.
  - strikes reset: strikeout then correct first try on next word → double.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `game.ts` using `isCorrect`/`isBlank` and `advance`. **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `feat(engine): deterministic game reducer`.

### Task 5: Word selection

**Files:**
- Create: `src/engine/rng.ts`, `src/engine/selection.ts`, `src/engine/selection.test.ts`

**Interfaces:**
- Produces: `seededRng(seed: number): () => number` (mulberry32); `shuffle<T>(xs: T[], rng: () => number): T[]`;
  ```ts
  export interface SourceWord { id: string; text: string; sentence: string | null; }
  export interface Selection { words: GameWord[]; warnings: string[]; }
  export const REVIEW_COUNT = 5;
  export function selectGameWords(current: SourceWord[], previous: SourceWord[] | null, rng: () => number): Selection;
  export function practiceWords(list: SourceWord[], rng: () => number): GameWord[];  // all words, shuffled, source 'current'
  ```
- Eligible review words = previous-list words whose `normalize(text)` is not in the current list (and distinct among themselves). Pick `min(5, eligible.length)` at random. Warnings (exact copy):
  - previous `null`: `No previous week's list was found, so this game uses only the current words.`
  - eligible < 5: `Only {n} review word{s} from last week were available (words that also appear this week are skipped), so this game has {total} words instead of {current+5}.`
- Positions are assigned 0..n-1 after shuffling; `sourceWordId` = SourceWord.id.

- [ ] **Step 1: Write failing tests** (spec 16–18): 15 current + 10 previous → 20 words, exactly 5 `source:'review'`, all 5 ids from previous, no duplicate normalized text; two different seeds → different review id sets or different order (assert at least one differs across 5 seeds); previous `null` → 15 words + the first warning; previous with 3 eligible (7 overlap) → 18 words, second warning with `n=3`; shuffle is deterministic for the same seed.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** — `feat(engine): weekly word selection with review words`.

### Task 6: Results and replay

**Files:**
- Create: `src/engine/results.ts`, `src/engine/replay.ts`, `src/engine/results.test.ts`, `src/engine/replay.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface SourceBreakdown { total: number; firstTry: number; missed: number; }
  export interface GameSummary extends Tallies { firstTryAccuracy: number /* 0-100 integer */; current: SourceBreakdown; review: SourceBreakdown; missedWords: string[]; }
  export function summarize(state: GameState): GameSummary;
  export interface ReplayAttempt { position: number; attemptNumber: number; text: string; }
  export function rebuild(words: GameWord[], attempts: ReplayAttempt[]): GameState;   // sorts by (position, attemptNumber), dedupes exact duplicates, feeds submitAnswer
  ```
- [ ] **Step 1: Write failing tests**: summarize a 4-word game (double, single, walk, strikeout) → `firstTryAccuracy===25`, `missedWords` has the one word, `review.total` counts review words; rebuild of a full 20-word attempt log equals the live state produced by playing the same answers (deep-equal); rebuild with a duplicated attempt row scores once (spec 26); rebuild with attempts ending mid-word at two strikes → `state.strikes===2`, `index` unchanged (Review Focus 4).
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** — `feat(engine): summaries and attempt replay`.

### Task 7: Store interface and LocalStore

**Files:**
- Create: `src/data/types.ts`, `src/data/store.ts`, `src/data/local-store.ts`, `src/data/local-store.test.ts`, `src/data/previous-week.ts`, `src/data/previous-week.test.ts`

**Interfaces:**
- Produces (`data/types.ts`):
  ```ts
  export type Hairstyle = 'short' | 'curly' | 'long' | 'buzz' | 'ponytail' | 'afro';
  export interface Appearance { primaryColor: string; secondaryColor: string; jerseyColor: string; pantsColor: string; hatColor: string; skinTone: string; hairColor: string; hairstyle: Hairstyle; }
  export interface Player { id: string; name: string; teamName: string; jerseyNumber: number; hand: Hand; appearance: Appearance; createdAt: string; }
  export type NewPlayer = Omit<Player, 'id' | 'createdAt'>;
  export interface Word { id: string; position: number; text: string; sentence: string | null; }
  export interface WordList { id: string; playerId: string; title: string; weekStart: string /* YYYY-MM-DD */; isActive: boolean; createdAt: string; words: Word[]; }
  export interface NewWord { text: string; sentence: string | null; }
  export type GameMode = 'weekly' | 'practice' | 'missed';
  export interface StoredAttempt { position: number; attemptNumber: 1 | 2 | 3; text: string; correct: boolean; outcome: Outcome | null; }
  export interface GameRecord { id: string; playerId: string; listId: string | null; mode: GameMode; status: 'in_progress' | 'complete'; words: GameWord[]; attempts: StoredAttempt[]; warnings: string[]; summary: GameSummary | null; startedAt: string; completedAt: string | null; }
  ```
- Produces (`store.ts`):
  ```ts
  export interface Store {
    listPlayers(): Promise<Player[]>;
    createPlayer(input: NewPlayer): Promise<Player>;
    updatePlayer(id: string, patch: Partial<NewPlayer>): Promise<Player>;
    deletePlayer(id: string): Promise<void>;
    listWordLists(playerId: string): Promise<WordList[]>;          // newest weekStart first
    getWordList(id: string): Promise<WordList | null>;
    createWordList(playerId: string, input: { title: string; weekStart: string; words: NewWord[] }): Promise<WordList>;
    updateWordList(id: string, patch: { title?: string; weekStart?: string; words?: NewWord[] }): Promise<WordList>;  // words replaced wholesale, repositioned 1..n
    setActiveList(playerId: string, listId: string): Promise<void>;    // exactly one active per player
    deleteWordList(id: string): Promise<void>;
    createGame(input: { playerId: string; listId: string | null; mode: GameMode; words: GameWord[]; warnings: string[] }): Promise<GameRecord>;
    recordAttempt(gameId: string, attempt: StoredAttempt): Promise<void>;   // idempotent on (gameId, position, attemptNumber)
    completeGame(gameId: string, summary: GameSummary): Promise<void>;
    getGame(id: string): Promise<GameRecord | null>;
    findInProgressGame(playerId: string): Promise<GameRecord | null>;
    listGames(playerId: string, filter?: { mode?: GameMode; listId?: string; status?: GameRecord['status'] }): Promise<GameRecord[]>;  // newest first
    hasParentPin(): Promise<boolean>;
    setParentPin(pin: string): Promise<void>;
    verifyParentPin(pin: string): Promise<boolean>;
    deleteAccount(): Promise<void>;
  }
  export const StoreContext: React.Context<Store | null>; export function useStore(): Store;
  ```
- Produces (`previous-week.ts`): `MAX_PRECEDING_GAP_DAYS = 21`; `findPrecedingList(lists: WordList[], target: WordList): WordList | null` = the list with the greatest `weekStart < target.weekStart`, but `null` if that list is more than 21 days earlier (my call: a gap longer than three weeks means "last week's list is missing", per spec §6 "Do not pull from an older week").
- `LocalStore` persists one JSON blob under localStorage key `slugger.v1`; ids via `crypto.randomUUID()`; the PIN is stored as a SHA-256 hex via `crypto.subtle` (local mode is a dev/test convenience, documented as such).

- [ ] **Step 1: Write failing tests** `local-store.test.ts` (fresh `localStorage.clear()` per test): create two players, each with lists → `listWordLists(a)` never includes b's lists and games for a never appear for b (spec 23); `setActiveList` flips the previous active off; `recordAttempt` twice with the same key → `getGame().attempts.length===1`; `updateWordList` with 3 words → positions `[1,2,3]`; `findInProgressGame` returns the game until `completeGame`; `deleteWordList` keeps completed games (`listId` becomes null, words intact) (spec 19). `previous-week.test.ts`: lists dated 10-05, 10-12, 10-19 → preceding of 10-19 is 10-12; lists 09-14 and 10-19 → `null`; 10-05 and 10-19 (14 days) → 10-05.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** — `feat(data): Store interface and LocalStore`.

### Task 8: Supabase schema, RLS, and SupabaseStore

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `supabase/README.md`, `src/data/supabase-client.ts`, `src/data/supabase-store.ts`, `src/data/rls.integration.test.ts`

**Interfaces:**
- Consumes: `Store` from Task 7.
- Produces: `createSupabaseStore(client: SupabaseClient): Store`; `supabase` singleton created from `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`.
- Schema (all `id uuid primary key default gen_random_uuid()`, `created_at timestamptz default now()`):
  - `families(id, parent_pin_hash text)`; `family_members(family_id → families on delete cascade, user_id → auth.users on delete cascade, role text default 'parent', primary key(family_id,user_id))`.
  - `players(id, family_id → families cascade, name text not null check (length(name) between 1 and 30), team_name text not null default '', jersey_number int not null check (0..99), batting_hand text not null check in ('L','R'), appearance jsonb not null)`.
  - `word_lists(id, player_id → players cascade, title text not null, week_start date not null, is_active bool not null default false, source_list_id uuid null references word_lists on delete set null)` + partial unique index `(player_id) where is_active`.
  - `words(id, list_id → word_lists cascade, position int not null, text text not null, sentence text null, unique(list_id, position))`.
  - `games(id, player_id → players cascade, list_id uuid null → word_lists on delete set null, mode text check in ('weekly','practice','missed'), status text check in ('in_progress','complete') default 'in_progress', warnings text[] not null default '{}', summary jsonb null, started_at timestamptz default now(), completed_at timestamptz null)`.
  - `game_words(id, game_id → games cascade, position int, text text, sentence text null, source text check in ('current','review'), source_word_id uuid null, outcome text null check in (...), unique(game_id, position))` — `source_word_id` deliberately has NO foreign key so editing/deleting lists never alters history.
  - `attempts(id, game_id → games cascade, position int, attempt_number int check 1..3, text text, correct bool, unique(game_id, position, attempt_number))`.
  - Indexes: `players(family_id)`, `word_lists(player_id, week_start desc)`, `games(player_id, started_at desc)`, `game_words(game_id)`, `attempts(game_id)`.
  - Functions: `my_family_ids() returns setof uuid` (security definer, stable; `select family_id from family_members where user_id = auth.uid()`); `my_player_ids()` likewise via players. Trigger `on_auth_user_created` after insert on `auth.users` → insert family + membership. RPCs: `set_parent_pin(pin text)` and `verify_parent_pin(pin text) returns boolean` using pgcrypto `crypt(pin, gen_salt('bf'))`; `record_attempt(p_game_id uuid, p_position int, p_attempt_number int, p_text text, p_correct bool, p_outcome text)` = insert into attempts on conflict do nothing + update game_words.outcome when `p_outcome` not null, security invoker so RLS applies; `delete_my_account()` security definer: delete families in `my_family_ids()` then `delete from auth.users where id = auth.uid()`.
  - RLS enabled on every table. Policies (select/insert/update/delete, all four): `families`: `id in (select my_family_ids())`; `family_members`: `user_id = auth.uid()`; `players`: `family_id in (select my_family_ids())`; `word_lists`, `games`: `player_id in (select my_player_ids())`; `words`: `list_id in (select id from word_lists where player_id in (select my_player_ids()))`; `game_words`, `attempts`: `game_id in (select id from games where player_id in (select my_player_ids()))`.
- `supabase/README.md`: create project → SQL editor → paste migration; or `brew install supabase/tap/supabase && supabase link && supabase db push` (needs no Docker). Auth settings: enable email provider, set Site URL and redirect `/reset`.
- `rls.integration.test.ts` runs only when `SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY`, `SUPABASE_TEST_SERVICE_KEY` are set (`describe.skipIf`); creates two users via `auth.admin.createUser`, signs each in with its own client, family A creates a player+list+game, then asserts family B's `listPlayers()` is empty, `getWordList(aListId)` is null, `getGame(aGameId)` is null, and a direct `from('words').select()` returns zero rows (spec 22); cleans up both users.

- [ ] **Step 1: Write the migration** and `supabase/README.md`.
- [ ] **Step 2: Write the integration test** (skipped locally by default).
- [ ] **Step 3: Implement `supabase-store.ts`** mapping each `Store` method to queries; `recordAttempt` → `rpc('record_attempt')`; `updateWordList` with words → delete then insert in one `Promise.all` after the update (document the small window; acceptable at this scale); `setActiveList` → two updates (clear then set) inside an RPC `set_active_list(p_player_id, p_list_id)` to respect the partial unique index — add that RPC to the migration.
- [ ] **Step 4: Typecheck** `npm run typecheck` → clean; `npm test` → integration suite reports skipped.
- [ ] **Step 5: Commit** — `feat(data): Supabase schema with RLS and SupabaseStore`.

### Task 9: Auth, app shell, welcome

**Files:**
- Create: `src/data/auth.tsx`, `src/routes.tsx`, `src/features/welcome/WelcomePage.tsx`, `src/features/auth/{LoginPage,RegisterPage,ForgotPage,ResetPage}.tsx`, `src/components/{Button,Card,TextField,Modal,Banner}.tsx`, `src/features/auth/auth.test.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`

**Interfaces:**
- Produces: `AuthProvider`, `useAuth(): { user: { id: string; email: string | null } | null; loading: boolean; signIn(email, password): Promise<void>; signUp(email, password): Promise<'signed_in' | 'confirm_email'>; signOut(): Promise<void>; resetPassword(email): Promise<void>; updatePassword(newPassword): Promise<void> }`. Local backend: `signUp`/`signIn` create a fake user in localStorage. Supabase backend wraps `supabase.auth`.
- `StoreProvider` chooses `LocalStore` or `SupabaseStore` by `VITE_STORE`; `App` composes `AuthProvider > StoreProvider > RouterProvider`.
- Routes: `/` Welcome (redirects to `/players` when signed in), `/login`, `/register`, `/forgot`, `/reset`, and a `RequireAuth` layout for everything else. Welcome copy: title, one-paragraph explanation of double/single/walk/strikeout, buttons "Create a family account" and "Sign in".
- [ ] **Step 1: Write failing test** `auth.test.tsx`: render `RegisterPage` with LocalStore/local auth, fill email+password, submit → `useAuth().user` not null and location `/players`. Login with wrong password (local backend records password hash) → error banner text `That email or password doesn't match.`
- [ ] **Step 2–4:** FAIL → implement → PASS. Also `npm run dev` and view `/` at 390px and 1280px: no horizontal scroll.
- [ ] **Step 5: Commit** — `feat: auth, routing and welcome screen`.

### Task 10: Players and customization

**Files:**
- Create: `src/features/players/{PlayersPage,PlayerEditorPage,PlayerPreview}.tsx`, `src/features/players/appearance.ts`, `src/components/ColorPicker.tsx`, `src/features/players/PlayerPreview.test.tsx`, `src/features/players/appearance.test.ts`

**Interfaces:**
- Produces (`appearance.ts`): `DEFAULT_APPEARANCE: Appearance`; `PALETTE: { name: string; hex: string }[]` (12 uniform colors), `SKIN_TONES: string[]` (6), `HAIR_COLORS: string[]` (6), `HAIRSTYLES: Hairstyle[]`; `isValidJersey(n: number): boolean` (integer 0–99).
- `PlayerPreview({ appearance, hand, jerseyNumber, size })` renders an inline SVG figure: cap, hair by style, face, jersey with number, pants, bat; `hand==='L'` applies `transform="scale(-1,1)"` on the figure group so the bat and stance mirror. `data-hand` attribute on the root `<svg>`.
- `PlayersPage` (`/players`): cards per player with preview, "Play" → `/play/:id`, "Edit"; "Add a player" → `/players/new`; "Parent zone" link (gated in Task 11). If zero players, redirect to `/players/new`.
- `PlayerEditorPage` (`/players/new`, `/players/:id/edit`): name, team, jersey number, hand toggle (Left / Right), color pickers, skin tone, hair color, hairstyle, live preview. Save → store, navigate to `/players`.
- [ ] **Step 1: Write failing tests**: `appearance.test.ts` `isValidJersey(99)` true, `100`/`-1`/`4.5` false; `PlayerPreview.test.tsx` renders `data-hand="L"` with a mirrored group and `data-hand="R"` without (spec 20/21 static half; the animated half is Task 15).
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** — `feat: player profiles with live customization preview`.

### Task 11: Parent gate and word list management

**Files:**
- Create: `src/features/parent/{ParentGate,PinPad,ParentLayout,ListsPage,ListEditorPage}.tsx`, `src/features/parent/wordPaste.ts`, `src/features/parent/wordPaste.test.ts`, `src/features/parent/ListEditorPage.test.tsx`

**Interfaces:**
- Produces: `parseWordPaste(raw: string): { words: string[]; dropped: string[] }` — split on commas and newlines, trim, strip leading list markers matching `/^\s*\d+[.)]?\s+/`, drop empties, dedupe case-insensitively (second copy goes to `dropped`), preserve the typed capitalization/punctuation.
- `ParentGate`: wraps `/parent/*`. If `hasParentPin()` false → "Set a 4-digit parent PIN" screen (enter twice). Else PIN pad; on success set `sessionStorage['slugger.parentUnlocked']='1'`. Wrong PIN → shake + `That's not it. Ask a grown-up.` Children never see parent screens without the PIN.
- `ListsPage` (`/parent/players/:playerId/lists`): lists newest first with title, week of, word count, Active badge; buttons New week, Make active, Duplicate (creates copy titled `{title} (copy)` dated +7 days, not active), Delete (confirm modal: `Delete "{title}"? Finished games keep their words.`).
- `ListEditorPage` (`/parent/players/:playerId/lists/new`, `/.../:listId`): title (default `Week of {weekStart}`), week start date (default: this week's Monday), a single text input "Type a word and press Enter" that appends and refocuses, numbered word rows with inline edit and remove, optional sentence per word (collapsed), "Paste a whole list" toggle showing a textarea that runs `parseWordPaste` and appends; count badge turns green at 15; Save. Keyboard only path: type, Enter, type, Enter ... Enter on empty input focuses Save.
- [ ] **Step 1: Write failing tests**: `wordPaste.test.ts` with `"1. apple\n2) banana,\n\ncherry, Apple "` → words `['apple','banana','cherry']`, dropped `['Apple']` (Review Focus 1). `ListEditorPage.test.tsx`: type `cat` Enter `dog` Enter → two numbered rows, input empty and focused; Save → `store.listWordLists(player)` has one list with positions `[1,2]`.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** — `feat(parent): PIN gate and weekly word lists`.

## Phase 2 is the engine (Tasks 2–6, already done). Phase 3 — Playable Interface

### Task 12: Speech and sound

**Files:**
- Create: `src/audio/speech.ts`, `src/audio/sfx.ts`, `src/audio/settings.ts`, `src/audio/speech.test.ts`

**Interfaces:**
- Produces (`speech.ts`): `speechAvailable(): boolean`; `speak(text: string, opts?: { rate?: number; volume?: number; pitch?: number }): Promise<void>` (cancels any in-flight utterance; resolves on `end`/`error`; rejects only if unavailable); `speakWord(word)` rate 0.9; `speakSlowly(word)` rate 0.5; `speakSentence(sentence)` rate 0.95; `umpire(call: string)` pitch 0.7 rate 1.1; `primeSpeech()` to call from the first user gesture (speaks an empty utterance so iOS unlocks TTS).
- Produces (`sfx.ts`): `Sfx` class over one `AudioContext` created lazily on first gesture: `crack()`, `cheer(durationMs)`, `whiff()`, `walkChime()`, `strikeBuzz()`, `fanfare()`, `setVolume(0..1)`; all synthesized (noise bursts, filtered noise swells, triangle arpeggio). No audio files.
- Produces (`settings.ts`): `useAudioSettings(): { volume: number; muted: boolean; sfx: boolean; set(...) }` persisted under `slugger.audio`.
- Fallback: when `speechAvailable()` is false the game screen shows `This browser can't read words aloud. A grown-up can tap "Show the word" to read it to you.`; that button reveals the word for 3 seconds in a modal (only path by which a word is shown mid-at-bat, and only when TTS is impossible).
- [ ] **Step 1: Write failing tests** with a stubbed `window.speechSynthesis`: `speak` resolves when the utterance's `onend` fires and calls `cancel()` first; `speakSlowly` sets `rate===0.5`; with `speechSynthesis` undefined `speechAvailable()` is false and `speak` rejects.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** — `feat(audio): speech wrapper and synthesized SFX`.

### Task 13: Game session (engine ↔ store)

**Files:**
- Create: `src/features/game/startGame.ts`, `src/features/game/useGameSession.ts`, `src/features/game/startGame.test.ts`, `src/features/game/useGameSession.test.tsx`

**Interfaces:**
- Consumes: engine (Tasks 4–6), `Store`, `findPrecedingList`.
- Produces (`startGame.ts`):
  ```ts
  export async function startWeeklyGame(store: Store, playerId: string, listId: string, rng = Math.random): Promise<GameRecord>;   // selectGameWords(list.words, preceding?.words ?? null)
  export async function startPracticeGame(store: Store, playerId: string, listId: string, rng?): Promise<GameRecord>;
  export async function startMissedWordsGame(store: Store, playerId: string, rng?): Promise<GameRecord>;  // distinct words with ≥1 incorrect attempt across the player's completed games, ranked by incorrect-attempt count desc then recency, max 20; throws Error('NO_MISSED_WORDS') when none
  export async function resumeOrNull(store: Store, playerId: string): Promise<GameRecord | null>;
  ```
- Produces (`useGameSession(gameId)`): `{ loading, record, state: GameState, busy: boolean, lastEvent: SubmitEvent | null, submit(text): Promise<SubmitEvent>, setBusy(b) }`. On load: `getGame` → `rebuild(words, attempts)`. `submit`: if `busy` or state complete → returns `ignored` without touching the store; else `submitAnswer`, then `recordAttempt` with `outcome` on at-bat completion, then `completeGame(summarize(state))` when `gameOver`. `busy` is set true by `submit` and released by the UI after animations (`setBusy(false)`).
- [ ] **Step 1: Write failing tests** (LocalStore): weekly start with lists 10-12 (15 words) and 10-19 active → record has 20 words, 5 review, `listId` is the 10-19 list; weekly start where the only earlier list is 09-01 → 15 words + warning (Review Focus 5); two weekly starts with different rngs → different review sets; practice start → words = list words, mode practice; missed start after a completed game with two strikeouts → 2 words, mode missed, `listId` null; `useGameSession`: submit then reload the hook → `state.index===1`; submit while `busy` → ignored and `attempts.length` unchanged (spec 26); after the final word `record.status==='complete'` and `summary.runs` equals `state.tallies.runs` (spec 25).
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** — `feat(game): session hook, game starters, resume`.

### Task 14: Game screen, child home, results (no stadium yet)

**Files:**
- Create: `src/features/home/ChildHomePage.tsx`, `src/features/game/{GamePage,Scoreboard,SpellingInput,Announcement,ResultsPage}.tsx`, `src/features/game/SpellingInput.test.tsx`, `src/features/game/GamePage.test.tsx`

**Interfaces:**
- `ChildHomePage` (`/play/:playerId`): big preview of the player, "Play This Week's Game" (disabled with `Ask a grown-up to add this week's words` when no active list), "Practice", "Missed Words", "Previous Weeks" (these three navigate to pickers built in Task 17; stub links now), Resume banner when `resumeOrNull` returns a game (`Finish your game — word {index+1} of {n}`), small "Switch player" and "Parent zone" links.
- `SpellingInput({ disabled, onSubmit, onClear })`: `<input>` with the four anti-hint attributes, `inputMode="text"`, `enterKeyHint="done"`, font-size ≥ 28px, Enter submits, Submit and Clear buttons; disabled while `busy`; refocuses after each submit.
- `Scoreboard({ state })`: inning, outs (3 dots), strikes (3 dots), runs, hits, words done/total, base diamond glyph with occupied bases lit.
- `Announcement`: large animated text from the event: `DOUBLE!`, `BASE HIT!`, `STRIKE ONE!`, `STRIKE TWO!`, `STRIKE THREE!`, `TAKE YOUR BASE!`, `RUN SCORED!` (×runs), `THREE OUTS!`, `NEW INNING!`, `GAME OVER!`.
- `GamePage` (`/game/:gameId`): layout two columns ≥ 900px (field placeholder left, controls right), stacked below; buttons Hear Word, Repeat, Hear It Slowly, Hear a Sentence (only when `sentence` present), mute; on new word auto-speak after the previous play's announcement; strikeout → reveal card `The word was: {text}` with "Hear it again" and "Next word" button; final at-bat → navigate `/game/:id/results`. Speech fallback from Task 12 when unavailable.
- `ResultsPage` (`/game/:gameId/results`): every spec §12 figure, new-personal-best celebration (`personalBest = max runs over completed games with the same mode for this player, excluding this one`), buttons Play Again (same mode/list via starters), Practice Missed Words, View Stats (→ parent history for this player, gated), Return Home.
- [ ] **Step 1: Write failing tests**: `SpellingInput` has `spellcheck="false"`, `autocomplete="off"`, `autocorrect="off"`, `autocapitalize="off"`; Enter calls `onSubmit('cat')` and clears; disabled input ignores Enter. `GamePage.test.tsx` (LocalStore, stubbed speech, animations skipped via `VITE_NO_ANIMATION` or a `prefers-reduced-motion` switch): the current word's text does not appear in the DOM during an at-bat; after three wrong answers the reveal card shows it; the scoreboard shows `Outs 1`.
- [ ] **Step 2–4:** FAIL → implement → PASS. Manual check in dev at 390px portrait, 844px landscape, 1280px.
- [ ] **Step 5: Commit** — `feat(game): playable game screen, child home, results`.

## Phase 4 — Visual Game Experience

### Task 15: Phaser field, figures, handedness

**Files:**
- Create: `src/field/layout.ts`, `src/field/layout.test.ts`, `src/field/figures.ts`, `src/field/controller.ts`, `src/field/FieldScene.ts`, `src/field/Field.tsx`

**Interfaces:**
- Produces (`layout.ts`, pure):
  ```ts
  export const FIELD = { width: 800, height: 600, home: {x:400,y:525}, first: {x:565,y:410}, second: {x:400,y:295}, third: {x:235,y:410}, mound: {x:400,y:430} };
  export type Base = 'home' | 'first' | 'second' | 'third';
  export function basePoint(b: Base): { x: number; y: number };
  export function batterPlacement(hand: Hand): { x: number; y: number; flipX: boolean };  // L → x = home.x + 42 (first-base side, viewer's right), flipX true; R → home.x − 42, flipX false; both y = home.y − 6
  export function runnerPath(from: Base, to: Base | 'score'): { x: number; y: number }[];  // waypoints around the diamond in order
  export function basesDiff(before: Bases, after: Bases, outcome: Outcome, runsScored: number): { from: Base; to: Base | 'score' }[];  // movement list incl. batter from 'home'
  ```
- Produces (`controller.ts`):
  ```ts
  export interface PlayerLook { hand: Hand; appearance: Appearance; jerseyNumber: number; }
  export interface FieldController {
    setPlayer(look: PlayerLook): void;
    setBases(b: Bases): void;
    playPitch(): Promise<void>;
    playStrike(n: 1 | 2 | 3): Promise<void>;
    playHit(outcome: 'single' | 'double', before: Bases, after: Bases, runs: number): Promise<void>;
    playWalk(before: Bases, after: Bases, runs: number): Promise<void>;
    playInningEnd(nextInning: number): Promise<void>;
    playGameOver(runs: number): Promise<void>;
    banner(text: string, ms?: number): Promise<void>;
  }
  ```
- `figures.ts`: `drawFigure(scene, look, { pose: 'stance' | 'swing' | 'run' | 'pitch' | 'followThrough' }): Phaser.GameObjects.Container` built from Graphics primitives (cap, head, hair, torso with jersey color + number text, pants, limbs, bat); `flipX` via `container.setScale(-1, 1)`.
- `FieldScene`: draws stadium (sky gradient, crowd band of colored dots, outfield wall, grass, dirt diamond, foul lines, bases, mound, plate), pitcher on mound facing home, batter at `batterPlacement`, runners as smaller figures. Implements `FieldController` stubs that resolve immediately in this task (animations in Task 16).
- `Field.tsx`: `forwardRef<FieldController, { look: PlayerLook; bases: Bases }>` mounting `new Phaser.Game({ type: Phaser.AUTO, parent, width: 800, height: 600, scale: { mode: FIT, autoCenter: CENTER_BOTH }, backgroundColor })`; destroys on unmount; respects `prefers-reduced-motion` by exposing `reducedMotion` to the scene (tweens use 1ms).
- [ ] **Step 1: Write failing tests** `layout.test.ts` (spec 20/21): `batterPlacement('L').x > FIELD.home.x` and `flipX===true`; `batterPlacement('R').x < FIELD.home.x` and `flipX===false`; `runnerPath('first','third')` passes through `second`; `basesDiff(EMPTY, {second}, 'double', 0)` → `[{from:'home', to:'second'}]`; `basesDiff({third}, {first}, 'single', 1)` → includes `{from:'third', to:'score'}`.
- [ ] **Step 2–4:** FAIL → implement → PASS; then wire `<Field>` into `GamePage` (replacing the placeholder) and visually confirm in dev that toggling a player's hand moves the batter to the other box with a mirrored stance.
- [ ] **Step 5: Commit** — `feat(field): Phaser stadium with handed batter`.

### Task 16: Animations bound to engine events

**Files:**
- Modify: `src/field/FieldScene.ts`, `src/features/game/GamePage.tsx`
- Create: `src/features/game/playSequence.ts`, `src/features/game/playSequence.test.ts`

**Interfaces:**
- Produces: `playSequence(field: FieldController, sfx: Sfx, event: SubmitEvent): Promise<void>` — the ONLY place that maps events to animations:
  - `strike` → `playPitch`, `playStrike(n)` (swing-and-miss or called strike), `whiff`, `umpire('Strike one!'/'Strike two!')`.
  - `at-bat-complete` strikeout → `playPitch`, `playStrike(3)`, umpire `Strike three!`; then if `inningEnded && !gameOver` → `playInningEnd(nextInning)`.
  - single/double → `playPitch`, `playHit(...)` (swing, crack, ball arc to right/left/center chosen at random, runners tween along `runnerPath`, `RUN SCORED!` banner + `cheer` per run), `BASE HIT!`/`DOUBLE!` banner.
  - walk → `playWalk` (`TAKE YOUR BASE!`, batter trots to first, forced runners advance, `walkChime`).
  - `gameOver` → `playGameOver(runs)` (`GAME OVER!`, fireworks particles, `fanfare`).
- `FieldScene` animation implementation: pitch = ball tween mound→plate 650ms; swing = batter pose swap stance→swing→followThrough over 250ms (mirrored for L); contact flash; ball arc tween with `ease: 'Quad.easeOut'` 900ms; runner tweens 450ms per base, sequential per waypoint, parallel across runners; banner = scaled-in text 900ms. Durations halve on reduced motion.
- `GamePage` flow: `submit` → `await playSequence(...)` → `setBusy(false)` → speak next word. Input disabled while busy; Enter during busy is ignored (Review Focus 3).
- [ ] **Step 1: Write failing test** `playSequence.test.ts` with a mock `FieldController` recording calls: a double event with one run → calls in order `playPitch`, `playHit`, no `playInningEnd`; a strikeout with `inningEnded` → `playPitch`, `playStrike(3)`, `playInningEnd(2)`; a strikeout with `gameOver` → `playGameOver` and no `playInningEnd`; a strike event → never `playHit`.
- [ ] **Step 2–4:** FAIL → implement → PASS. Manual: play a full game in dev at 390px and 1280px; verify the scoreboard always matches the field after each play.
- [ ] **Step 5: Commit** — `feat(field): pitch, swing, hit, walk, strikeout and celebration animations`.

## Phase 5 — Progress Tracking

### Task 17: Practice, missed words, previous weeks

**Files:**
- Create: `src/features/home/ListPickerPage.tsx`
- Modify: `src/features/home/ChildHomePage.tsx`, `src/routes.tsx`

**Interfaces:**
- `ListPickerPage` (`/play/:playerId/pick/:mode` where mode ∈ `practice | previous`): lists newest first with title, week, word count, and that list's best runs in the matching mode; tapping starts `startPracticeGame` (practice) or `startWeeklyGame` (previous, review from its own preceding list) and navigates to `/game/:id`. Missed Words button calls `startMissedWordsGame` directly; on `NO_MISSED_WORDS` show `No missed words yet. Nice!`. Starting any game while an in-progress game exists asks `Finish your current game first?` with Resume / Start new (new abandons the old: `completeGame` is NOT called; the old record stays `in_progress` and is hidden by `findInProgressGame` returning the newest only — document this; my call).
- [ ] **Step 1: Write failing test** (RTL): with one list and a completed weekly game, the picker shows `Best: {runs} runs`; with no missed words the home shows the "No missed words yet" message.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** — `feat(game): practice, missed words and previous-week modes`.

### Task 18: Parent dashboard

**Files:**
- Create: `src/features/parent/{HistoryPage,GameDetailPage,StatsPage}.tsx`, `src/features/parent/stats.ts`, `src/features/parent/stats.test.ts`, `src/features/parent/charts/{Sparkline,Bars}.tsx`

**Interfaces:**
- Produces (`stats.ts`, pure):
  ```ts
  export interface WordStat { text: string; seen: number; firstTry: number; missed: number; strikes: number; lastSeen: string; }
  export function wordStats(games: GameRecord[]): WordStat[];                       // completed games only
  export function frequentlyMissed(stats: WordStat[], min = 1): WordStat[];        // missed ≥ min, sorted missed desc then strikes desc
  export function mastered(stats: WordStat[]): WordStat[];                          // seen ≥ 2 and firstTry === seen
  export function weeklyTrend(games: GameRecord[]): { weekStart: string; bestRuns: number; firstTryAccuracy: number }[];  // weekly mode, grouped by list
  export function reviewRetention(games: GameRecord[]): number | null;             // first-try % over review words, null when none
  export function totals(games: GameRecord[]): { games: number; practice: number; highScore: number; firstTryRate: number };
  ```
- `HistoryPage` (`/parent/players/:id/history`): table of completed games newest first: date, mode, list title, runs, hits, strikeouts, first-try %; row → `GameDetailPage` (`/parent/games/:gameId`) listing each word with source badge, attempts in order (wrong ones struck through), strikes, outcome, correct spelling.
- `StatsPage` (`/parent/players/:id/stats`): totals tiles, `Sparkline` of weekly best runs and first-try %, `Bars` of top 10 missed words, mastered words chips, review retention %. Before writing the charts, load the `dataviz` skill.
- `ParentLayout` nav: Lists · History · Stats · Account, with a player switcher.
- [ ] **Step 1: Write failing tests** `stats.test.ts` with three fabricated GameRecords: `frequentlyMissed` ranks the twice-missed word first; `mastered` excludes a word seen once; `weeklyTrend` returns one entry per list with the best runs; `reviewRetention` null when no review words.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** — `feat(parent): history, game detail and stats dashboard`.

### Task 19: Account, sharing, recovery

**Files:**
- Create: `src/features/parent/AccountPage.tsx`, `src/features/share/ShareButton.tsx`, `src/features/share/ShareButton.test.tsx`
- Modify: `src/features/auth/{ForgotPage,ResetPage}.tsx` (finish flows), `src/features/players/PlayersPage.tsx` (add ShareButton)

**Interfaces:**
- `ShareButton`: uses `navigator.share({ title: "Cooper's Spelling Slugger", text: 'A baseball game that makes spelling practice fun.', url: VITE_APP_URL })` when available, else copies the URL and shows `Link copied!`; also renders `mailto:` and `sms:` links with the same text.
- `AccountPage` (`/parent/account`): email, Sign out, Change parent PIN, Change password (`updatePassword`), Delete account (type `DELETE` to confirm → `store.deleteAccount()` → sign out → `/`).
- Forgot: `resetPassword(email)` → `Check your email for a reset link.` Reset: reads the Supabase recovery session, sets new password, → `/players`.
- [ ] **Step 1: Write failing test** `ShareButton.test.tsx`: with `navigator.share` undefined, click → clipboard `writeText` called with the app URL and the button text becomes `Link copied!`.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** — `feat: account management, sharing and password recovery`.

## Phase 6 — Sharing and Deployment

### Task 20: PWA and end-to-end tests

**Files:**
- Create: `public/icon.svg`, `scripts/make-icons.mjs`, `playwright.config.ts`, `e2e/smoke.spec.ts`, `e2e/game-flow.spec.ts`, `vercel.json`
- Modify: `vite.config.ts` (VitePWA), `index.html` (theme-color, apple-touch-icon, viewport-fit=cover)

**Interfaces:**
- `make-icons.mjs` uses sharp to render `icon.svg` (a baseball with a bat, drawn by hand in SVG) to `public/icons/icon-192.png`, `icon-512.png`, `maskable-512.png`, `apple-touch-icon-180.png`; npm script `icons`.
- VitePWA: `registerType: 'autoUpdate'`, manifest `name: "Cooper's Spelling Slugger"`, `short_name: 'Slugger'`, `display: 'standalone'`, `orientation: 'any'`, `theme_color` = `--navy`, `background_color` = `--paper`; workbox precache of the build; runtime `NetworkOnly` for `supabase.co`.
- `vercel.json`: SPA rewrite `{"source":"/(.*)","destination":"/index.html"}`.
- Playwright: projects `desktop` (1280×800 chromium) and `iphone` (`devices['iPhone 14']`), `webServer` runs `vite --mode e2e` with `VITE_STORE=local` and `VITE_NO_ANIMATION=1`; `addInitScript` stubs `speechSynthesis` to record `speak` calls on `window.__spoken`.
- [ ] **Step 1: Ask Brandon** before `npx playwright install chromium` (~150 MB download). Proceed on yes.
- [ ] **Step 2: Write failing e2e** `smoke.spec.ts`: `/` renders without horizontal overflow on both projects (`document.documentElement.scrollWidth <= innerWidth`); manifest link present. `game-flow.spec.ts` (both projects): register → set PIN → create player "Cooper", Left-handed → new list with 3 words → Play This Week → `window.__spoken` has the first word (spec 27) → type the correct word, Enter → scoreboard shows `Hits 1`; press Enter twice fast on the second word → only one attempt recorded (scoreboard strikes `1`) (spec 26); `page.reload()` → same word index and strike count (spec 24); finish → results page shows `Runs`.
- [ ] **Step 3: Implement** PWA config, icons, playwright config, any test hooks (`data-testid`s). Run `npm run build && npm run e2e` → all pass on both projects. Lighthouse PWA installability check via Chrome DevTools in the built preview: installable.
- [ ] **Step 4: Commit** — `feat: PWA manifest, icons, and end-to-end tests`.

### Task 21: Deployment documentation and launch checklist

**Files:**
- Modify: `README.md`; Create: `docs/DEPLOY.md`, `docs/PRIVACY-NOTES.md`

- `docs/DEPLOY.md`: (1) Supabase: create free project (region US East), run `0001_init.sql` in SQL editor, Auth → URL configuration with the Vercel URL and `/reset` redirect, copy URL + anon key; (2) GitHub: `gh repo create spelling-slugger --private --source . --push`; (3) Vercel: import repo, set the three `VITE_*` env vars, deploy; redeploys on every push to `main`; (4) custom domain optional; (5) costs table: Supabase free (500 MB DB, 50k MAU, pauses after 7 idle days — note how to unpause and that a $25/mo Pro plan removes the pause), Vercel Hobby free (non-commercial), domain ~$12/yr if wanted; total expected $0/mo.
- `docs/PRIVACY-NOTES.md`: what is collected (parent email, child first name, spelling attempts), what is not, COPPA summary: the parent is the account holder and the child has no account, no data is shared with third parties, no ads; state plainly that this is not a legal compliance determination and recommend a privacy policy page before sharing widely.
- `README.md`: setup (`cp .env.example .env.local`, `npm i`, `npm run dev` runs in local mode with no Supabase), scripts, architecture summary, the three test commands, link to the spec and plan.
- [ ] **Step 1: Write the docs.** **Step 2:** `npm run typecheck && npm test && npm run build` → all green. **Step 3: Commit** — `docs: deployment, costs and privacy notes`.
- [ ] **Step 4: Hand-off:** list for Brandon the two actions only he can do (create the Supabase project, connect Vercel) and offer to walk through them.

---

## Self-review notes

- Spec coverage: §1–§15, §17–§22 map to tasks above; §16 (shared lists) is covered by `word_lists.source_list_id` and `GameWord.sourceWordId` with no UI, as the spec allows.
- Known calls made by the planner (not in the spec): 21-day preceding-week window (Task 7); parent PIN instead of password re-entry (Task 11); abandoning an in-progress game leaves it `in_progress` (Task 17); personal best is per mode (Task 14); procedural art and synthesized audio instead of asset packs (Tasks 12, 15); LocalStore mode for development and e2e (Task 7).
