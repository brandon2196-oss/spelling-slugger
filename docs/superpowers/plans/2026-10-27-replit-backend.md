# Replit Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace Supabase with a small Express API and Postgres that Brandon hosts on his existing Replit Core plan, so the game needs no new vendors and never pauses.

**Architecture:** One Node process serves the built frontend and `/api/*`. Postgres holds the same schema as before minus RLS; isolation is enforced in the API by scoping every query to the session's family. Auth is email/password with scrypt hashes and opaque session cookies (httpOnly, SameSite=Lax, custom header on mutations). The frontend gets an `ApiStore` and `ApiAuth` behind the existing `Store`/`AuthBackend` interfaces; local mode and all current tests stay. The server computes game summaries from the attempt log instead of trusting the client.

**Tech Stack:** Express 5, pg 8, Node 22+ (bundled with esbuild to `server/dist/index.mjs`), PGlite (Postgres in WASM) for server tests, Replit Autoscale deployment with a Replit production database.

**Spec:** `docs/superpowers/specs/2026-10-26-spelling-slugger-spec.md`; Brandon 2026-10-27: "replace Supabase with an Express API plus Replit Postgres, with email/password auth we own, and set it up to publish from the GitHub repo on my Replit account."

## Global Constraints

- No credentials in frontend code; `DATABASE_URL` and `SESSION_SECRET`-free design (opaque tokens hashed in the DB) live server-side only.
- Family isolation at the API layer for every table; foreign ids return 404, never 403, so existence doesn't leak.
- Spec test 22 (family isolation) runs for real in `npm test` against PGlite.
- Child data minimization unchanged: first name/nickname only.
- Frontend `Store` and `AuthBackend` interfaces unchanged; local mode unchanged; e2e stays on local mode.
- Password reset without email: a CLI the site owner runs; the Forgot page says so plainly.

## Review Focus

1. Session cookie on a mutation without the `X-Requested-With: slugger` header → 403 (CSRF via SameSite + custom header).
2. Family B calling PATCH/DELETE on family A's player, list, game → 404 and no change.
3. `record_attempt` idempotency across a retry and the outcome written once.
4. completeGame computes the summary server-side from attempts; a client-sent summary is ignored.
5. Static SPA fallback never shadows `/api/*`, and `/sw.js` is served no-cache.

---

### Task 1: Database layer, schema, migrations
**Files:** `server/src/db.ts`, `server/migrations/0001_init.sql`, `server/src/db.test.ts`, `tsconfig.server.json`.
**Produces:** `interface Db { query<T>(sql, params?): Promise<{ rows: T[] }>; exec(sql): Promise<void>; close(): Promise<void> }`, `createPgDb(url): Db`, `createTestDb(): Promise<Db>` (PGlite), `migrate(db): Promise<string[]>` (applied filenames; idempotent via `schema_migrations`).
- [ ] Test: migrate on PGlite applies 0001 once, second call applies nothing, tables exist (users, families, sessions, players, word_lists, words, games, game_words, attempts). Fail → implement → pass. Commit `feat(server): db layer, schema, migrations`.

### Task 2: Passwords and sessions
**Files:** `server/src/auth.ts`, `server/src/auth.test.ts`.
**Produces:** `hashPassword(pw)`, `verifyPassword(pw, hash)`, `newSessionToken()`, `tokenHash(token)`, `SESSION_COOKIE = 'slugger_session'`, `SESSION_DAYS = 90`.
- [ ] Tests: roundtrip true, wrong false, two hashes differ, token is 43+ chars url-safe. Commit `feat(server): scrypt passwords, session tokens`.

### Task 3: Server store (family-scoped data access)
**Files:** `server/src/store.ts`, `server/src/store.test.ts`.
**Produces:** `createServerStore(db, familyId): Store` (the shared `Store` interface) plus `createFamilyWithUser(db, email, hash)`.
- [ ] Tests on PGlite: players CRUD; lists create/update(replace words renumbered)/setActive exclusive/delete; games create/getGame/recordAttempt idempotent + outcome once/complete computes summary via engine `rebuild`+`summarize`; PIN set/verify/has; deleteAccount cascades; **isolation**: store B sees none of A's rows, getters return null, mutations throw NOT_FOUND. Commit `feat(server): family-scoped store + isolation test`.

### Task 4: HTTP API
**Files:** `server/src/app.ts`, `server/src/app.test.ts`.
**Produces:** `createApp(db, { secureCookies, staticDir? }): express.Express`. Routes under `/api`: `auth/register|login|logout|me|password`, `players`, `players/:id`, `players/:pid/lists`, `lists/:id`, `players/:pid/active-list`, `games`, `games/:id`, `games/:id/attempts`, `games/:id/complete`, `players/:pid/games`, `players/:pid/games/in-progress`, `pin`, `pin/verify`, `account`. Errors: `{ error: 'CODE' }` with 400/401/403/404/409.
- [ ] Tests via fetch to `listen(0)`: register sets cookie + me; duplicate 409; bad login 401; unauth 401; mutation without header 403; player create/list/patch/delete; family B 404s on A's ids; static fallback serves index.html but `/api/nope` is JSON 404. Commit `feat(server): express api`.

### Task 5: Frontend ApiStore + ApiAuth + backend switch
**Files:** `src/data/api-client.ts`, `src/data/api-store.ts`, `src/data/api-auth.ts`, `src/data/api.contract.test.ts`, `src/App.tsx`, `src/features/auth/ForgotPage.tsx`, `src/features/auth/ResetPage.tsx`.
- [ ] Contract test (node env): ApiStore + ApiAuth with a cookie-jar fetch against the real app on PGlite: sign up, create player, list, game, attempts, complete, PIN, sign out → getUser null. Fail → implement → pass.
- [ ] `chooseBackend(): 'local' | 'api'`: `VITE_STORE` wins; else `import.meta.env.PROD ? 'api' : 'local'`. Forgot page copy: reset is done by the site owner. Commit `feat(client): api backend`.

### Task 6: Serve, build, Replit config, dev proxy
**Files:** `server/src/index.ts`, `server/src/cli.ts`, `scripts/build-server.mjs`, `.replit`, `vite.config.ts` (proxy `/api`, workbox NetworkOnly `/api/`), `package.json` scripts (`build:all`, `start`, `server:dev`, `dev:full`, `reset-password`).
- [ ] `npm run build:all` produces `dist/` and `server/dist/index.mjs`; `node server/dist/index.mjs` with a DATABASE_URL-less env fails fast with a clear message. Commit `feat(deploy): replit autoscale config, server bundle`.

### Task 7: Remove Supabase, docs
**Files:** delete `src/data/supabase-*.ts`, `src/data/rls.integration.test.ts`, `supabase/`, `vercel.json`, `createSupabaseAuth`; update `.env.example`, `README.md`, `docs/DEPLOY.md` (Replit runbook), `docs/PRIVACY-NOTES.md`.
- [ ] `npm uninstall @supabase/supabase-js`; grep for "supabase" in src/docs returns only the spec/plan history. Suite, typecheck, lint, e2e, build green. Commit `chore: remove supabase; replit deploy docs`.
