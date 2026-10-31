# Ballpark Home & Menu Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put Welcome, Players picker, Child home, and the Parent zone inside one shared `BallparkShell` so every menu feels like walking into the cartoon stadium.

**Architecture:** A new `BallparkShell` layout component (dark stadium gradient, optional framed hero, `kid` / `parent` variants) replaces the `Stadium` / `Paper` wrappers on the four menu surfaces. A shared `StadiumStill` component (moved out of `WelcomePage.tsx`) stacks the existing packed `public/art/stadium/` layers. Gold / cream button classes and the Fredoka `.board-text` title style give one look. The announcer row on Child home swaps pixel portraits for neutral placeholders until Brandon's booth art lands.

**Tech Stack:** React 19 + react-router, TypeScript, Tailwind v4 (`src/styles/app.css` `@theme`), Vitest + Testing Library (jsdom), Playwright (`desktop` + `iphone` projects), oxlint.

**Spec:** `docs/superpowers/specs/2026-10-30-ballpark-home-menu-design.md` (branch `docs/ballpark-home-menu-spec`, commit `801a361`).

## Global Constraints

- Base: main `c65fb28` (Phase 4). Work on branch `feat/ballpark-home-menu`.
- No schema or migration changes (nothing under `server/` or any migration file changes).
- No changes to the game screen, results screen, `CartoonScene`, or the SequenceSfx / playSequence path. Do not edit `src/features/game/**`.
- No live `CartoonScene` on any menu. Menus render stills only.
- Stadium stills use only existing `public/art/stadium/` layers. No new stadium art.
- Bots never invent or generate character art. Announcer row ships placeholders.
- Auth pages (sign in, sign up, reset — `src/features/auth/**`) are unchanged.
- Parent PIN gate, tabs, and "Managing" context behave exactly as today. No parent feature change (behavior, data, or flows).
- Existing tests stay green. Add a test that each of the four surfaces renders inside `BallparkShell`.
- Must pass on phone (iPhone Playwright project) and desktop.
- Out of scope: CartoonScene loss walk-off and outfield scoreboard; ump-strike sound; audio changes.

## Roles (multi-bot)

- **Grand Slam Spelling (GSS):** implements this plan on `feat/ballpark-home-menu`, opens one PR against main, and drafts the booth-art prompt section (Task 9).
- **Martin:** QA review of the PR (PASS/FAIL against the checklist in Task 10).
- **Brandon:** generates the cartoon booth portraits in Gemini from GSS's prompts and drops them in `art-src/`. Swapping in final art is a separate art-only follow-up PR.
- **Ballpark Sound:** not involved (no audio in this pass).
- **Gate:** merge and publish to Replit only after Martin PASS **and** Brandon's explicit yes.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/components/StadiumStill.tsx` | Create | Stacked still of the cartoon stadium from existing layers; exports `STADIUM_STILL_LAYERS`. |
| `src/components/StadiumStill.test.tsx` | Create | Layer list and paths are only existing stadium files. |
| `src/components/BallparkShell.tsx` | Create | Shared shell: `<main data-shell="ballpark" data-variant>` + optional framed hero. |
| `src/components/BallparkShell.test.tsx` | Create | Shell renders markers, hero frame, variants. |
| `src/styles/app.css` | Modify | Add `.ballpark-shell`, `.ballpark-frame`, `.btn-gold`, `.btn-cream`, `.ballpark-card`. Keep `.on-air-tag` / `.live-dot` (ResultsPage and Broadcast still use them). |
| `src/features/welcome/WelcomePage.tsx` | Modify | Use shell + hero still; remove On air / Now batting; gold buttons. |
| `src/features/welcome/WelcomePage.test.tsx` | Create | No broadcast chrome; buttons; still present. |
| `src/features/players/PlayersPage.tsx` | Modify | Shell + stadium card styling; Parent zone / Share as ballpark controls. |
| `src/features/players/PlayersPage.test.tsx` | Modify | Add shell + control assertions. |
| `src/features/home/AnnouncerPicker.tsx` | Modify | Replace pixel `Portrait` with `BoothPlaceholder`. |
| `src/features/home/AnnouncerPicker.test.tsx` | Modify | Portrait test becomes placeholder test. |
| `src/features/home/ChildHomePage.tsx` | Modify | Shell + still hero behind batter; gold Play CTA; cream secondaries. |
| `src/features/home/ChildHomePage.test.tsx` | Create | Shell, record, CTA, placeholders. |
| `src/features/parent/ParentLayout.tsx` | Modify | Parent-variant shell, Fredoka titles, content on a light panel. |
| `src/features/parent/ParentGate.tsx` | Modify | Parent-variant shell around the existing Card. |
| `src/features/parent/ParentLayout.test.tsx` | Create | Tabs, Managing select, Outlet still work inside shell. |
| `src/components/ballpark.contract.test.ts` | Create | Static contract: the four surfaces import `BallparkShell`, not `Stadium` / `Paper`; no menu imports `CartoonScene`. |
| `docs/art/nano-banana-prompts.md` | Modify | Add section B10 menu booth portraits (prompts only). |
| `docs/art/ballpark-menu-art-handoff.md` | Create | Brandon's step-by-step Gemini → `art-src/` → `pack-art` handoff. |

Note on existing art: `art-src/booth/` and `public/art/booth/` already contain `bigRed-*` and `jackDalton-*` mouth-open/closed PNGs from section B9 (packed by `pack-art`, status `ready`, not referenced by `src/`). This plan does **not** wire them in. Whether the follow-up art PR reuses B9 output or new B10 output is Brandon's call (Task 7 handoff doc asks him).

---

### Task 1: StadiumStill component

**Files:**
- Create: `src/components/StadiumStill.tsx`
- Test: `src/components/StadiumStill.test.tsx`

**Interfaces:**
- Produces: `export const STADIUM_STILL_LAYERS: readonly string[]`; `export function StadiumStill(props: { className?: string; label?: string }): JSX.Element` — renders `<div class="stadium-still ..." role="img" aria-label={label}>` with one `<img alt="">` per layer, `src = ${import.meta.env.BASE_URL}art/stadium/${layer}.png`. Default label `"The cartoon baseball stadium"`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/StadiumStill.test.tsx
import { render, screen } from '@testing-library/react'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { STADIUM_STILL_LAYERS, StadiumStill } from './StadiumStill'

it('stacks only layers that already ship in public/art/stadium', () => {
  for (const layer of STADIUM_STILL_LAYERS) {
    expect(existsSync(resolve(__dirname, '../../public/art/stadium', `${layer}.png`))).toBe(true)
  }
  expect(STADIUM_STILL_LAYERS).toEqual(['sky', 'outfield-wall', 'stands-far', 'grass', 'dirt', 'chalk', 'bases', 'dugout-near'])
})

it('renders one decorative img per layer under a labelled img role', () => {
  render(<StadiumStill />)
  const still = screen.getByRole('img', { name: 'The cartoon baseball stadium' })
  const imgs = still.querySelectorAll('img')
  expect(imgs).toHaveLength(STADIUM_STILL_LAYERS.length)
  expect(imgs[0]!.getAttribute('src')).toMatch(/art\/stadium\/sky\.png$/)
  imgs.forEach((img) => expect(img).toHaveAttribute('alt', ''))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/StadiumStill.test.tsx`
Expected: FAIL — `Failed to resolve import "./StadiumStill"`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/StadiumStill.tsx
/** Drawn in the same order as the game's stadium (public/art/manifest.json), minus the near fence. */
export const STADIUM_STILL_LAYERS = ['sky', 'outfield-wall', 'stands-far', 'grass', 'dirt', 'chalk', 'bases', 'dugout-near'] as const

/** A still of the cartoon stadium, stacked from the packed layers the game already ships. No live scene. */
export function StadiumStill({ className = '', label = 'The cartoon baseball stadium' }: { className?: string; label?: string }) {
  return (
    <div className={`stadium-still rounded-md ${className}`} role="img" aria-label={label}>
      {STADIUM_STILL_LAYERS.map((layer) => (
        <img key={layer} src={`${import.meta.env.BASE_URL}art/stadium/${layer}.png`} alt="" />
      ))}
    </div>
  )
}
```

(The spec lists layers "sky → stands-far → outfield-wall …"; the code keeps the manifest draw order the Welcome still already uses, which puts `outfield-wall` before `stands-far`. Same layers, no new art.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/StadiumStill.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/StadiumStill.tsx src/components/StadiumStill.test.tsx
git commit -m "feat(menus): shared StadiumStill from existing stadium layers"
```

---

### Task 2: BallparkShell + ballpark CSS

**Files:**
- Create: `src/components/BallparkShell.tsx`
- Modify: `src/styles/app.css` (append after the `.stadium-still img` rule, ~line 174)
- Test: `src/components/BallparkShell.test.tsx`

**Interfaces:**
- Consumes: `StadiumStill` (Task 1).
- Produces:
  ```ts
  export type BallparkVariant = 'kid' | 'parent'
  export interface BallparkShellProps extends HTMLAttributes<HTMLElement> {
    variant?: BallparkVariant        // default 'kid'
    hero?: ReactNode | true          // true = default framed <StadiumStill/>; node = custom content inside the frame; omitted = no hero
    children?: ReactNode
  }
  export function BallparkShell(props: BallparkShellProps): JSX.Element
  ```
  DOM contract (tests in later tasks rely on it): root is `<main class="ballpark-shell ..." data-shell="ballpark" data-variant="kid|parent">`; hero frame is `<div class="ballpark-frame" data-testid="ballpark-hero">`.
- CSS classes produced: `.ballpark-shell`, `.ballpark-frame`, `.btn-gold`, `.btn-cream`, `.ballpark-card`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/BallparkShell.test.tsx
import { render, screen } from '@testing-library/react'
import { BallparkShell } from './BallparkShell'

it('renders a main landmark marked as the ballpark shell, kid variant by default', () => {
  render(<BallparkShell><p>hi</p></BallparkShell>)
  const main = screen.getByRole('main')
  expect(main).toHaveAttribute('data-shell', 'ballpark')
  expect(main).toHaveAttribute('data-variant', 'kid')
  expect(main).toHaveClass('ballpark-shell')
  expect(screen.getByText('hi')).toBeInTheDocument()
  expect(screen.queryByTestId('ballpark-hero')).toBeNull()
})

it('hero={true} frames the default stadium still', () => {
  render(<BallparkShell hero />)
  const hero = screen.getByTestId('ballpark-hero')
  expect(hero).toHaveClass('ballpark-frame')
  expect(hero.querySelector('[role="img"][aria-label="The cartoon baseball stadium"]')).not.toBeNull()
})

it('custom hero content renders inside the frame', () => {
  render(<BallparkShell hero={<span>custom</span>} />)
  expect(screen.getByTestId('ballpark-hero')).toHaveTextContent('custom')
})

it('parent variant is marked and passes through props', () => {
  render(<BallparkShell variant="parent" aria-busy="true" className="p-8" />)
  const main = screen.getByRole('main')
  expect(main).toHaveAttribute('data-variant', 'parent')
  expect(main).toHaveAttribute('aria-busy', 'true')
  expect(main).toHaveClass('p-8')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/BallparkShell.test.tsx`
Expected: FAIL — `Failed to resolve import "./BallparkShell"`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/BallparkShell.tsx
import type { HTMLAttributes, ReactNode } from 'react'
import { StadiumStill } from './StadiumStill'

export type BallparkVariant = 'kid' | 'parent'

export interface BallparkShellProps extends HTMLAttributes<HTMLElement> {
  variant?: BallparkVariant
  /** true = framed stadium still; a node = custom content inside the frame; omit for no hero. */
  hero?: ReactNode | true
  children?: ReactNode
}

/** One stadium look for every menu: dark ballpark gradient, optional framed still, board-text titles. */
export function BallparkShell({ variant = 'kid', hero, children, className = '', ...rest }: BallparkShellProps) {
  return (
    <main className={`ballpark-shell min-h-full text-chalk ${className}`} data-shell="ballpark" data-variant={variant} {...rest}>
      {hero !== undefined && hero !== false && hero !== null ? (
        <div className="ballpark-frame" data-testid="ballpark-hero">
          {hero === true ? <StadiumStill /> : hero}
        </div>
      ) : null}
      {children}
    </main>
  )
}
```

Append to `src/styles/app.css` directly after the `.stadium-still img { … }` rule:

```css
/* ---- Ballpark shell (menus) ---- */
.ballpark-shell {
  background:
    radial-gradient(ellipse at top, rgba(242, 177, 52, 0.10) 0%, transparent 45%),
    linear-gradient(180deg, #1b3466 0%, #0f2148 45%, #081329 100%);
}
.ballpark-shell[data-variant='parent'] { background: linear-gradient(180deg, #142850 0%, #0b1733 100%); }
.ballpark-frame {
  margin-inline: auto;
  max-width: 40rem;
  border: 4px solid var(--gold);
  border-radius: 1.25rem;
  overflow: hidden;
  box-shadow: 0 8px 0 #04070f, inset 0 0 0 2px #04070f;
  background: #04070f;
}
.btn-gold, .btn-cream {
  display: inline-flex; align-items: center; justify-content: center; gap: .5rem;
  font-family: var(--font-display); font-weight: 700; border-radius: 1rem; min-height: 3.5rem;
  padding: .75rem 1.5rem; user-select: none; transition: transform .08s;
}
.btn-gold { background: var(--gold); color: var(--navy); box-shadow: 0 5px 0 #a8741a; }
.btn-cream { background: var(--chalk); color: var(--navy); box-shadow: 0 5px 0 #c9bfa8; border: 2px solid rgba(20, 40, 80, .1); }
.btn-gold:active, .btn-cream:active { transform: translateY(3px); box-shadow: none; }
.btn-gold:focus-visible, .btn-cream:focus-visible { outline: 4px solid var(--chalk); outline-offset: 2px; }
.ballpark-card {
  background: linear-gradient(180deg, #1f3a70 0%, #13284f 100%);
  border: 2px solid rgba(242, 177, 52, .35);
  border-radius: 1.5rem;
  box-shadow: 0 8px 0 rgba(0, 0, 0, .35);
}
```

`--font-display` is the existing theme token (`src/styles/app.css:16`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/BallparkShell.test.tsx && npm run typecheck`
Expected: PASS (4 tests); typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/BallparkShell.tsx src/components/BallparkShell.test.tsx src/styles/app.css
git commit -m "feat(menus): BallparkShell layout with framed stadium hero and gold/cream buttons"
```

---

### Task 3: WelcomePage in the shell

**Files:**
- Modify: `src/features/welcome/WelcomePage.tsx` (whole file)
- Test: `src/features/welcome/WelcomePage.test.tsx`

**Interfaces:**
- Consumes: `BallparkShell` (Task 2) with `hero`; `useAuth` from `src/data/auth`.
- Produces: none new. Local `StadiumStill` / `STILL` in this file are deleted (now in `src/components/StadiumStill.tsx`).

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/welcome/WelcomePage.test.tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import { WelcomePage } from './WelcomePage'

vi.mock('../../data/auth', () => ({ useAuth: () => ({ user: null, loading: false }) }))

function renderPage() {
  return render(<MemoryRouter><WelcomePage /></MemoryRouter>)
}

it('renders inside the ballpark shell with a framed stadium still', () => {
  renderPage()
  expect(screen.getByRole('main')).toHaveAttribute('data-shell', 'ballpark')
  expect(screen.getByTestId('ballpark-hero')).toContainElement(screen.getByRole('img', { name: 'The cartoon baseball stadium' }))
})

it('drops the leftover broadcast chrome', () => {
  renderPage()
  expect(screen.queryByText(/on air/i)).toBeNull()
  expect(screen.queryByText(/now batting/i)).toBeNull()
})

it('keeps the pitch, the result legend, and gold account buttons', () => {
  renderPage()
  expect(screen.getByRole('heading', { level: 1, name: 'Grand Slam Spelling' })).toHaveClass('board-text')
  for (const r of ['Double', 'Single', 'Walk', 'Strikeout']) expect(screen.getByText(r)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute('href', '/register')
  expect(screen.getByRole('link', { name: 'Create account' })).toHaveClass('btn-gold')
  expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  expect(screen.getByRole('link', { name: 'Sign in' })).toHaveClass('btn-gold')
})
```

Before Step 2, confirm the auth hook export: `grep -n "export function useAuth" src/data/auth*`. If the module path is `src/data/auth.tsx` the mock path `'../../data/auth'` still resolves.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/welcome/WelcomePage.test.tsx`
Expected: FAIL — `data-shell` missing, "On air" found, no link named "Create account".

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/features/welcome/WelcomePage.tsx
import { Link, Navigate } from 'react-router'
import { useAuth } from '../../data/auth'
import { BallparkShell } from '../../components/BallparkShell'

const outcomes: [string, string][] = [
  ['Spell it right the first time', 'Double'],
  ['Get it on the second try', 'Single'],
  ['Third try does it', 'Walk'],
  ['Three misses', 'Strikeout'],
]

export function WelcomePage() {
  const { user, loading } = useAuth()
  if (!loading && user) return <Navigate to="/players" replace />
  return (
    <BallparkShell hero className="flex flex-col items-center px-4 py-8 [&>.ballpark-frame]:w-full">
      <div className="w-full max-w-xl text-center">
        <h1 className="board-text announce-board mt-6 uppercase leading-[1.5]">
          <span className="block whitespace-nowrap text-[clamp(1.1rem,5.2vw,1.95rem)]">Grand Slam Spelling</span>
        </h1>

        <p className="mt-4 text-lg text-chalk/85 max-w-md mx-auto">
          Your kid&apos;s weekly spelling words, as a baseball game. Hear it, spell it, swing.
        </p>

        <ul className="mt-6 grid grid-cols-2 gap-3 text-left">
          {outcomes.map(([how, result]) => (
            <li key={result} className="ballpark-card px-4 py-3">
              <span className="block text-chalk/70 text-sm">{how}</span>
              <span className="block font-display text-2xl text-gold">{result}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/register" className="btn-gold text-xl px-8 py-4">Create account</Link>
          <Link to="/login" className="btn-gold text-xl px-8 py-4">Sign in</Link>
        </div>
        <p className="mt-6 text-sm text-chalk/60">Free. No ads. Kids never need an account of their own.</p>
      </div>
    </BallparkShell>
  )
}
```

- [ ] **Step 4: Run tests and the e2e grep**

Run: `npx vitest run src/features/welcome && grep -rn "Create a family account" e2e src`
Expected: vitest PASS (3 tests). If grep finds e2e steps clicking "Create a family account", update those selectors to `'Create account'` in the same commit (selector change only) and run `npx playwright test e2e/smoke.spec.ts --project=desktop`; expected PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/welcome/WelcomePage.tsx src/features/welcome/WelcomePage.test.tsx e2e
git commit -m "feat(welcome): ballpark shell hero, drop broadcast chrome, gold account buttons"
```

---

### Task 4: PlayersPage in the shell

**Files:**
- Modify: `src/features/players/PlayersPage.tsx` (whole file)
- Test: `src/features/players/PlayersPage.test.tsx` (append tests; keep the existing one)

**Interfaces:**
- Consumes: `BallparkShell`; existing `PlayerPreview`, `usePlayers`, `ShareButton`.
- Produces: Parent zone link gets class `btn-cream` and `aria-label` unchanged text "Parent zone"; share block wrapper has `data-testid="share-control"`.

- [ ] **Step 1: Write the failing test** (append to `src/features/players/PlayersPage.test.tsx`)

```tsx
vi.mock('../share/ShareButton', () => ({ ShareButton: () => <button type="button">Share</button> }))

it('renders inside the ballpark shell with stadium-styled kid cards', () => {
  render(<MemoryRouter><PlayersPage /></MemoryRouter>)
  expect(screen.getByRole('main')).toHaveAttribute('data-shell', 'ballpark')
  expect(screen.getByRole('heading', { level: 1 })).toHaveClass('board-text')
  const card = screen.getByRole('link', { name: 'Play as Cooper' }).closest('li')!
  expect(card).toHaveClass('ballpark-card')
  expect(screen.getByRole('link', { name: 'Play as Cooper' })).toHaveClass('btn-gold')
  expect(screen.getAllByRole('link', { name: 'Edit' })[0]).toHaveClass('btn-cream')
})

it('Parent zone and Share are ballpark controls, not text links', () => {
  render(<MemoryRouter><PlayersPage /></MemoryRouter>)
  const parent = screen.getByRole('link', { name: 'Parent zone' })
  expect(parent).toHaveAttribute('href', '/parent')
  expect(parent).toHaveClass('btn-cream')
  expect(parent).not.toHaveClass('underline')
  expect(screen.getByTestId('share-control')).toHaveClass('ballpark-card')
})
```

Note: the `vi.mock('../share/ShareButton', …)` line goes at top level next to the existing mocks (Vitest hoists it). If the existing first test relied on the real `ShareButton`, it still passes because it only checks `/only with friends/i` copy, which stays in `PlayersPage`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/players/PlayersPage.test.tsx`
Expected: FAIL — no `data-shell`, Parent zone link has `underline`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/features/players/PlayersPage.tsx
import { Link, Navigate } from 'react-router'
import { BallparkShell } from '../../components/BallparkShell'
import { PlayerPreview } from './PlayerPreview'
import { usePlayers } from './usePlayers'
import { ShareButton } from '../share/ShareButton'

export function PlayersPage() {
  const { players, loading } = usePlayers()
  if (loading) return <BallparkShell className="p-8" aria-busy="true" />
  if (players!.length === 0) return <Navigate to="/players/new" replace />

  return (
    <BallparkShell className="px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="board-text text-gold text-2xl sm:text-3xl">Who&apos;s up to bat?</h1>
          <Link to="/parent" className="btn-cream text-base">Parent zone</Link>
        </header>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {players!.map((p) => (
            <li key={p.id} className="ballpark-card p-4 flex gap-4 items-center">
              <PlayerPreview appearance={p.appearance} hand={p.hand} jerseyNumber={p.jerseyNumber} size={130} />
              <div className="min-w-0 flex-1">
                <p className="font-display text-3xl text-chalk leading-none">{p.name}</p>
                <p className="text-chalk/70 mt-1">{p.teamName || 'No team yet'} · #{p.jerseyNumber} · {p.hand === 'L' ? 'Lefty' : 'Righty'}</p>
                <div className="mt-3 flex gap-2">
                  <Link to={`/play/${p.id}`} aria-label={`Play as ${p.name}`} className="btn-gold min-h-14 px-6 py-3 text-xl">Play</Link>
                  <Link to={`/players/${p.id}/edit`} className="btn-cream min-h-11 px-4 py-2 text-base">Edit</Link>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap gap-3 items-center justify-between">
          <Link to="/players/new" className="btn-cream text-lg">Add sibling</Link>
          <span className="text-sm text-chalk/50">Sign out and account settings live in the parent zone.</span>
        </div>
        <div className="ballpark-card mt-8 p-5 text-chalk/85" data-testid="share-control">
          <p className="mb-3">Sharing only with friends? Send them the link — each family makes its own login and kids stay private.</p>
          <ShareButton />
        </div>
      </div>
    </BallparkShell>
  )
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/features/players`
Expected: PASS (all players tests, including the original).

- [ ] **Step 5: Commit**

```bash
git add src/features/players/PlayersPage.tsx src/features/players/PlayersPage.test.tsx
git commit -m "feat(players): ballpark shell, stadium kid cards, ballpark parent/share controls"
```

---

### Task 5: Announcer booth placeholders

**Files:**
- Modify: `src/features/home/AnnouncerPicker.tsx`
- Test: `src/features/home/AnnouncerPicker.test.tsx` (replace the `each booth has a portrait` test)

**Interfaces:**
- Consumes: `ANNOUNCERS`, `previewLine`, `AnnouncerId` from `src/audio/announcer` (unchanged).
- Produces: `export function BoothPlaceholder({ id }: { id: AnnouncerId }): JSX.Element` → `<span data-testid="booth-placeholder" data-announcer={id} aria-hidden="true">` showing the announcer's initials (`quiet` shows `"—"`). The `Portrait` export and the `BoothPortrait` import from `../game/Broadcast` are removed from this file. `src/features/game/Broadcast.tsx` is **not** edited.

- [ ] **Step 1: Write the failing test** — in `AnnouncerPicker.test.tsx`, replace the whole `it('each booth has a portrait', …)` block with:

```tsx
  it('each booth shows a neutral placeholder, not a pixel portrait', () => {
    render(<AnnouncerPicker value="bigRed" onChange={() => {}} />)
    for (const name of [/big red/i, /jack dalton/i, /quiet/i]) {
      const btn = screen.getByRole('button', { name })
      expect(btn.querySelector('[data-testid="booth-placeholder"]')).not.toBeNull()
      expect(btn.querySelector('svg')).toBeNull()
    }
    expect(screen.getByRole('button', { name: /big red/i }).querySelector('[data-testid="booth-placeholder"]')).toHaveTextContent('BB')
    expect(screen.getByRole('button', { name: /jack dalton/i }).querySelector('[data-testid="booth-placeholder"]')).toHaveTextContent('JD')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/home/AnnouncerPicker.test.tsx`
Expected: FAIL — `booth-placeholder` not found (pixel `svg` present).

- [ ] **Step 3: Write minimal implementation** — in `src/features/home/AnnouncerPicker.tsx`:

Replace the header comment, the `BoothPortrait` import, and the `Portrait` function with:

```tsx
/**
 * Who's in the booth: three big toggle buttons. Tapping a talker plays one of his game-start lines so
 * the kid can hear the voice before choosing. Faces are neutral placeholders until Brandon's cartoon
 * booth art lands (art-only follow-up PR); bots do not draw announcer art.
 */
import { ANNOUNCERS, previewLine, type AnnouncerId } from '../../audio/announcer'

function initials(name: string) {
  return name.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('')
}

export function BoothPlaceholder({ id }: { id: AnnouncerId }) {
  const label = id === 'quiet' ? '—' : initials(ANNOUNCERS[id].name)
  return (
    <span
      data-testid="booth-placeholder"
      data-announcer={id}
      aria-hidden="true"
      className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-dashed border-gold/60 bg-navy/60 font-display text-xl text-gold"
    >
      {label}
    </span>
  )
}
```

and in the button body change `<Portrait id={id} />` to `<BoothPlaceholder id={id} />`.

Real names in `src/audio/announcer.ts`: "Big Red Brannigan" → `BB`, "Jack Dalton" → `JD`, "Quiet Booth" → `—` (quiet special-case).

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/features/home && npx oxlint src/features/home`
Expected: PASS; lint clean (no unused `BoothPortrait` import).

- [ ] **Step 5: Commit**

```bash
git add src/features/home/AnnouncerPicker.tsx src/features/home/AnnouncerPicker.test.tsx
git commit -m "feat(home): neutral booth placeholders replace pixel announcer portraits"
```

---

### Task 6: ChildHomePage in the shell

**Files:**
- Modify: `src/features/home/ChildHomePage.tsx` (imports + JSX return blocks only; data/effects/handlers unchanged)
- Test: `src/features/home/ChildHomePage.test.tsx`

**Interfaces:**
- Consumes: `BallparkShell`, `StadiumStill`, `AnnouncerPicker` (Task 5).
- Produces: hero has `data-testid="ballpark-hero"` containing the stadium still and the `PlayerPreview`; Play CTA is a `<button class="btn-gold …">` named "Play this week's game".

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/home/ChildHomePage.test.tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { vi } from 'vitest'
import { ChildHomePage } from './ChildHomePage'

const store = {
  listWordLists: vi.fn(async () => [{ id: 'l1', isActive: true }]),
  listGames: vi.fn(async () => []),
}
vi.mock('../../data/store', () => ({ useStore: () => store }))
vi.mock('../players/usePlayers', () => ({
  usePlayer: () => ({ id: 'a', name: 'Cooper', teamName: 'Sluggers', jerseyNumber: 7, hand: 'L', appearance: {}, createdAt: '' }),
}))
vi.mock('../players/PlayerPreview', () => ({ PlayerPreview: () => <div data-testid="batter" /> }))
vi.mock('../game/startGame', () => ({ resumeOrNull: async () => null, startMissedWordsGame: vi.fn(), startWeeklyGame: vi.fn() }))
vi.mock('../../audio/preload', () => ({ preloadAudio: async () => {} }))
vi.mock('../../engine/season', () => ({ seasonRecord: () => ({}), recordLine: () => '3-1' }))
vi.mock('./useGuardedStart', () => ({ useGuardedStart: () => ({ start: vi.fn(), modal: null }) }))

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/play/a']}>
      <Routes><Route path="/play/:playerId" element={<ChildHomePage />} /></Routes>
    </MemoryRouter>,
  )
}

it('renders in the ballpark shell with the batter in front of a stadium still', async () => {
  renderHome()
  const hero = await screen.findByTestId('ballpark-hero')
  expect(screen.getByRole('main')).toHaveAttribute('data-shell', 'ballpark')
  expect(hero).toContainElement(screen.getByRole('img', { name: 'The cartoon baseball stadium' }))
  expect(hero).toContainElement(screen.getByTestId('batter'))
})

it('keeps season W/L prominent and makes Play this week the gold CTA', async () => {
  renderHome()
  expect(await screen.findByTestId('season-record')).toHaveTextContent('3-1')
  expect(screen.getByRole('button', { name: /play this week/i })).toHaveClass('btn-gold')
  expect(screen.getByRole('link', { name: 'Practice' })).toHaveClass('btn-cream')
  expect(screen.getByRole('button', { name: 'Missed words' })).toHaveClass('btn-cream')
  expect(screen.getByRole('link', { name: 'Past weeks' })).toHaveClass('btn-cream')
})

it('announcer row shows placeholders, not pixel portraits', async () => {
  renderHome()
  const row = await screen.findByRole('group', { name: 'Announcer' })
  expect(row.querySelectorAll('[data-testid="booth-placeholder"]')).toHaveLength(3)
  expect(row.querySelector('svg')).toBeNull()
})
```

If `useAudioSettings` throws outside a provider, add `vi.mock('../../audio/settings', () => ({ useAudioSettings: () => ({ announcer: 'bigRed', set: vi.fn() }) }))`. Check first with `grep -n "export function useAudioSettings" -A5 src/audio/settings.ts*`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/home/ChildHomePage.test.tsx`
Expected: FAIL — `ballpark-hero` not found.

- [ ] **Step 3: Write minimal implementation** — in `ChildHomePage.tsx`:

Imports: replace `import { Button } from '../../components/Button'` and `import { Stadium } from '../../components/Page'` with

```tsx
import { BallparkShell } from '../../components/BallparkShell'
import { StadiumStill } from '../../components/StadiumStill'
```

Loading / not-found returns:

```tsx
  if (player === undefined || active === undefined) return <BallparkShell className="p-8" aria-busy="true" />
  if (!player) return <BallparkShell className="p-8"><Link to="/players" className="btn-cream">Back to players</Link></BallparkShell>
```

Main return (handlers above it unchanged):

```tsx
  return (
    <BallparkShell
      className="px-4 py-6"
      hero={
        <div className="relative">
          <StadiumStill />
          <div className="absolute inset-x-0 bottom-0 flex justify-center">
            <PlayerPreview appearance={player.appearance} hand={player.hand} jerseyNumber={player.jerseyNumber} size={180} />
          </div>
        </div>
      }
    >
      <div className="mx-auto max-w-3xl">
        <header className="mt-4 flex items-center justify-between gap-3">
          <Link to="/players" className="btn-cream min-h-11 text-base">Switch player</Link>
          <Link to="/parent" className="btn-cream min-h-11 text-base">Parent zone</Link>
        </header>

        <div className="mt-4 text-center">
          <h1 className="board-text text-gold text-3xl leading-tight">{player.name}</h1>
          <p className="mt-1 text-chalk/70">{player.teamName || 'Grand Slammers'} · #{player.jerseyNumber}</p>
          {record ? <p className="mt-2 font-display text-3xl text-gold" data-testid="season-record">{record}</p> : null}
        </div>

        {resume ? (
          <div className="mt-6 rounded-3xl bg-gold text-navy p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-2xl">Finish your game</p>
              <p>Word {Math.min(resume.attempts.filter((a) => a.outcome).length + 1, resume.words.length)} of {resume.words.length}</p>
            </div>
            <Link to={`/game/${resume.id}`} className="btn-primary" onClick={() => { primeSpeech(); sfx.unlock() }}>Keep playing</Link>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3">
          {active ? (
            <button type="button" className="btn-gold min-h-16 text-2xl px-8 py-4" onClick={() => void playWeek()}>Play this week&apos;s game</button>
          ) : (
            <div className="ballpark-card border-dashed p-5 text-center">
              <p className="font-display text-2xl">No words yet</p>
              <p className="text-chalk/70">Ask a grown-up to add this week&apos;s words in the parent zone.</p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <Link to={`/play/${playerId}/pick/practice`} className="btn-cream flex-col py-4">Practice</Link>
            <button type="button" className="btn-cream py-4" onClick={() => void playMissed()}>Missed words</button>
            <Link to={`/play/${playerId}/pick/previous`} className="btn-cream flex-col py-4">Past weeks</Link>
          </div>
          {notice ? <p className="text-center text-gold">{notice}</p> : null}
        </div>

        <section aria-label="Announcer booth" className="mt-8">
          <BoothHeading />
          <AnnouncerPicker value={audio.announcer} onChange={(id) => { primeSpeech(); sfx.unlock(); audio.set({ announcer: id }) }} />
        </section>
      </div>
      {modal}
    </BallparkShell>
  )
```

(The section label changes to "Announcer booth" so `getByRole('group', { name: 'Announcer' })` matches only the picker. Before committing run `grep -rn "'Announcer'\|\"Announcer\"" e2e` — if an e2e step targets the region by name "Announcer", point it at the group role instead.)

"Now batting" is removed from Child home as well (it was broadcast chrome; spec bans it on Welcome and the shell look drops it everywhere).

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/features/home && npm run typecheck && npm run lint`
Expected: PASS; typecheck and lint exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/features/home/ChildHomePage.tsx src/features/home/ChildHomePage.test.tsx e2e
git commit -m "feat(home): ballpark shell hero behind batter, gold Play CTA, cream secondaries"
```

---

### Task 7: Parent zone light match

**Files:**
- Modify: `src/features/parent/ParentLayout.tsx` (both components)
- Modify: `src/features/parent/ParentGate.tsx` (the `Paper` import and the two `Paper` usages only)
- Test: `src/features/parent/ParentLayout.test.tsx`

**Interfaces:**
- Consumes: `BallparkShell` with `variant="parent"`, no hero.
- Produces: Outlet content sits in `<div class="parent-panel bg-paper text-ink rounded-3xl …" data-testid="parent-panel">` so existing child pages (navy/ink text) stay readable. Tabs, `Managing` select, Account link, routes, and `Outlet context={{ player }}` unchanged.

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/parent/ParentLayout.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useOutletContext } from 'react-router'
import { vi } from 'vitest'
import { ParentLayout } from './ParentLayout'

vi.mock('../players/usePlayers', () => ({
  usePlayers: () => ({ loading: false, players: [
    { id: 'a', name: 'Cooper', teamName: '', jerseyNumber: 7, hand: 'L', appearance: {}, createdAt: '' },
    { id: 'b', name: 'Mia', teamName: '', jerseyNumber: 3, hand: 'R', appearance: {}, createdAt: '' },
  ] }),
}))

function Child() {
  const { player } = useOutletContext<{ player: { name: string } }>()
  const loc = useLocation()
  return <p>child:{player.name}:{loc.pathname}</p>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/parent/players/:playerId" element={<ParentLayout />}>
          <Route path=":tab" element={<Child />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

it('wraps the parent zone in the parent-variant ballpark shell with a light content panel', () => {
  renderAt('/parent/players/a/lists')
  const main = screen.getByRole('main')
  expect(main).toHaveAttribute('data-shell', 'ballpark')
  expect(main).toHaveAttribute('data-variant', 'parent')
  expect(screen.queryByTestId('ballpark-hero')).toBeNull()
  expect(screen.getByTestId('parent-panel')).toHaveTextContent('child:Cooper:/parent/players/a/lists')
})

it('keeps tabs, Managing, and Account exactly as before', async () => {
  renderAt('/parent/players/a/lists')
  expect(screen.getByRole('link', { name: 'Word lists' })).toHaveAttribute('href', '/parent/players/a/lists')
  expect(screen.getByRole('link', { name: 'Game history' })).toHaveAttribute('href', '/parent/players/a/history')
  expect(screen.getByRole('link', { name: 'Progress' })).toHaveAttribute('href', '/parent/players/a/stats')
  expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/parent/account')
  await userEvent.selectOptions(screen.getByLabelText('Managing'), 'b')
  expect(await screen.findByText('child:Mia:/parent/players/b/lists')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/parent/ParentLayout.test.tsx`
Expected: FAIL on the first test (`data-shell` missing); second test passes already (behavior guard).

- [ ] **Step 3: Write minimal implementation**

`src/features/parent/ParentLayout.tsx`: replace `import { Paper } from '../../components/Page'` with `import { BallparkShell } from '../../components/BallparkShell'`. In `ParentIndex` and the loading branch of `ParentLayout`, replace `<Paper className="p-8" aria-busy="true" />` with `<BallparkShell variant="parent" className="p-8" aria-busy="true" />`. Replace the `ParentLayout` return with:

```tsx
  return (
    <BallparkShell variant="parent">
      <header className="border-b border-gold/30">
        <div className="mx-auto max-w-5xl px-4 py-3 flex flex-wrap items-center gap-3">
          <Link to="/players" className="board-text text-gold text-sm">← Players</Link>
          <label className="ml-auto flex items-center gap-2 text-sm text-chalk/80">
            Managing
            <select
              className="rounded-lg border border-gold/40 bg-chalk px-2 py-1 font-display text-navy text-base"
              value={player.id}
              onChange={(e) => navigate(`/parent/players/${e.target.value}/lists`)}
            >
              {players!.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <NavLink to="/parent/account" className="text-sm underline text-chalk/70">Account</NavLink>
        </div>
        <nav className="mx-auto max-w-5xl px-4 flex gap-1 overflow-x-auto">
          {tabs.map(([slug, label]) => (
            <NavLink
              key={slug}
              to={`/parent/players/${player.id}/${slug}`}
              className={({ isActive }) =>
                `whitespace-nowrap px-4 py-2 font-display text-lg border-b-4 ${isActive ? 'border-gold text-gold' : 'border-transparent text-chalk/60 hover:text-chalk'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="parent-panel bg-paper text-ink rounded-3xl p-4 sm:p-6" data-testid="parent-panel">
          <Outlet context={{ player }} />
        </div>
      </div>
    </BallparkShell>
  )
```

`src/features/parent/ParentGate.tsx`: replace `import { Paper } from '../../components/Page'` with `import { BallparkShell } from '../../components/BallparkShell'`; replace `<Paper className="p-8" aria-busy="true" />` with `<BallparkShell variant="parent" className="p-8" aria-busy="true" />`; replace the outer `<Paper className="flex flex-col items-center justify-center px-4 py-10">` … `</Paper>` with `<BallparkShell variant="parent" className="flex flex-col items-center justify-center px-4 py-10">` … `</BallparkShell>`. The `Card`, PIN logic, copy, and heading stay byte-for-byte the same.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/features/parent && npm run typecheck`
Expected: PASS (all parent tests incl. PinPad); typecheck 0.

- [ ] **Step 5: Commit**

```bash
git add src/features/parent/ParentLayout.tsx src/features/parent/ParentGate.tsx src/features/parent/ParentLayout.test.tsx
git commit -m "feat(parent): light ballpark shell match; PIN, tabs, Managing unchanged"
```

---

### Task 8: Shell contract test + scope guard

**Files:**
- Create: `src/components/ballpark.contract.test.ts`

**Interfaces:**
- Consumes: file paths from Tasks 3–7.
- Produces: a fast static guard Martin and CI can rely on.

- [ ] **Step 1: Write the test**

```ts
// src/components/ballpark.contract.test.ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')

const SURFACES = [
  'src/features/welcome/WelcomePage.tsx',
  'src/features/players/PlayersPage.tsx',
  'src/features/home/ChildHomePage.tsx',
  'src/features/parent/ParentLayout.tsx',
  'src/features/parent/ParentGate.tsx',
]

describe('ballpark menu contract', () => {
  it.each(SURFACES)('%s renders inside BallparkShell, not Stadium/Paper', (file) => {
    const src = read(file)
    expect(src).toMatch(/import \{ BallparkShell \} from '..\/..\/components\/BallparkShell'/)
    expect(src).toMatch(/<BallparkShell[\s>]/)
    expect(src).not.toMatch(/components\/Page'/)
  })

  it.each([...SURFACES, 'src/components/BallparkShell.tsx', 'src/components/StadiumStill.tsx', 'src/features/home/AnnouncerPicker.tsx'])(
    '%s never mounts the live CartoonScene or the pixel booth portraits',
    (file) => {
      const src = read(file)
      expect(src).not.toMatch(/CartoonScene/)
      expect(src).not.toMatch(/BoothPortrait/)
    },
  )

  it('Welcome has no broadcast chrome', () => {
    const src = read('src/features/welcome/WelcomePage.tsx')
    expect(src).not.toMatch(/On air|Now batting|on-air-tag|live-dot/)
  })
})
```

- [ ] **Step 2: Run it**

Run: `npx vitest run src/components/ballpark.contract.test.ts`
Expected: PASS after Tasks 3–7 (if run before them it FAILS on each surface — that is the intended red when done out of order).

- [ ] **Step 3: Scope guard (no commit content — verification)**

Run:
```bash
git diff --name-only c65fb28...HEAD | grep -E '^(server/|src/features/game/|src/features/auth/|src/audio/|src/engine/|public/art/|art-src/|.*migrat)' ; echo "exit=$?"
```
Expected: no file names printed and `exit=1` (grep found nothing). Any hit is a FAIL — revert that file.

- [ ] **Step 4: Full suite**

Run: `npm test && npm run typecheck && npm run lint && npx playwright test --project=desktop --project=iphone`
Expected: vitest all pass (461 baseline + new tests); typecheck/lint 0; Playwright desktop + iphone pass. (The 2 known `api`-project e2e failures from Phase 4 are not in these projects.)

- [ ] **Step 5: Commit**

```bash
git add src/components/ballpark.contract.test.ts
git commit -m "test(menus): contract that menu surfaces use BallparkShell and no live scene"
```

---

### Task 9: Booth-art prompts + Brandon handoff doc

**Files:**
- Modify: `docs/art/nano-banana-prompts.md` (append section B10 after B9)
- Create: `docs/art/ballpark-menu-art-handoff.md`

**Interfaces:**
- Produces: prompts and target filenames only. No code reads these files in this PR. No PNGs are added by any bot.

- [ ] **Step 1: Append B10 to `docs/art/nano-banana-prompts.md`**

````markdown
### B10. Menu booth portraits (one chat, upload the style sheet first)

Used on the kid home "In the booth tonight" row. Square, friendly, waving from the broadcast booth window. Brandon generates these; bots never do.

**B10.1** File: `art-src/booth/menu-bigRed.png`
```
Match this style exactly. Cartoon baseball radio announcer Big Red Brannigan leaning out of a little stadium broadcast booth window, waving at the viewer: big friendly man in his sixties, round red face, thick red mustache, red hair under a flat cap, headset with microphone, bow tie, wide grin. Booth window frame in navy and gold. Thick black outlines, flat fills. Square image, flat solid #00FF00 background. No text, no logos.
```

**B10.2** File: `art-src/booth/menu-jackDalton.png`
```
Match this style exactly. Cartoon baseball announcer Jack Dalton leaning on the sill of a little stadium broadcast booth window, giving a thumbs up: calm man in his forties, dark skin, short black hair, neat beard, purple cap, headset with microphone, open collar shirt, small confident smile. Booth window frame in navy and gold. Thick black outlines, flat fills. Square image, flat solid #00FF00 background. No text, no logos.
```

**B10.3** File: `art-src/booth/menu-quiet.png`
```
Match this style exactly. An empty cartoon stadium broadcast booth window at night, microphone on its stand with a small "off" switch, headset hanging on a hook, navy and gold frame. Thick black outlines, flat fills. Square image, flat solid #00FF00 background. No text, no logos, no people.
```

Big Red and Jack are original characters. Reject anything that looks like a real announcer.
````

- [ ] **Step 2: Create `docs/art/ballpark-menu-art-handoff.md`**

```markdown
# Ballpark menu booth art — handoff for Brandon

The menu PR ships neutral placeholders in the kid-home announcer row. Final art is a separate, art-only PR.

## Your choice first
`public/art/booth/` already has packed B9 portraits (`bigRed-*`, `jackDalton-*`, mouth open/closed) that nothing on the menus uses yet. Tell Grand Slam Spelling one of:
1. **Reuse B9** — no new images; the follow-up PR wires the existing mouth-closed portraits into the booth row (Quiet keeps its placeholder or gets B10.3).
2. **New B10** — generate the three B10 images below.

## Steps for B10
1. Open a new Gemini (Nano Banana) chat. Upload `art-src/style-sheet.png` first.
2. Paste prompt B10.1 from `docs/art/nano-banana-prompts.md`, then B10.2, then B10.3, in the same chat.
3. Save each result with the exact filename: `art-src/booth/menu-bigRed.png`, `art-src/booth/menu-jackDalton.png`, `art-src/booth/menu-quiet.png`. Reject anything with text, logos, or a real-person look.
4. Hand the files to Grand Slam Spelling (drop them in the chat or commit to a branch). GSS adds them to `pack-art` (`scripts/pack-art/index.mjs` booth step, 512×512 contain) and swaps `BoothPlaceholder` for the packed image in an art-only PR.
5. Martin QAs that PR; you say yes before merge/publish.
```

- [ ] **Step 3: Verify no art binaries were added**

Run: `git status --porcelain | grep -E '\.(png|jpg|webp)$'; echo "exit=$?"`
Expected: `exit=1` (no image files).

- [ ] **Step 4: Commit**

```bash
git add docs/art/nano-banana-prompts.md docs/art/ballpark-menu-art-handoff.md
git commit -m "docs(art): B10 menu booth prompts and Brandon Gemini handoff"
```

---

### Task 10: Phone/desktop visual check, PR, and QA handoff

**Files:** none changed (unless fixes are needed; fixes go in the task they belong to).

- [ ] **Step 1: Screenshots**

Run: `npm run build && npx vite preview --port 4173 &` then capture Welcome (`/`), Players (`/players`), Child home (`/play/<id>`), Parent gate (`/parent`), Parent lists at 390×844 and 1280×800 with Playwright (`npx playwright screenshot --viewport-size=390,844 http://localhost:4173/ welcome-phone.png`, and likewise per route after signing in with the e2e fixture account from `e2e/helpers.ts`). Expected: hero still visible without horizontal scroll on phone; Fredoka titles legible; parent panel text readable.

- [ ] **Step 2: Push and open PR**

```bash
git push -u origin feat/ballpark-home-menu
gh pr create --base main --title "Ballpark home & menu redesign (shared BallparkShell)" --body-file - <<'MD'
Implements docs/superpowers/specs/2026-10-30-ballpark-home-menu-design.md via docs/superpowers/plans/2026-10-30-ballpark-home-menu.md.
Placeholders in the booth row; art follow-up per docs/art/ballpark-menu-art-handoff.md.
No schema / game / results / CartoonScene / SequenceSfx / audio / auth changes.
Screenshots: phone + desktop attached.
MD
```

- [ ] **Step 3: Send Martin the QA checklist** (do not ask Brandon to merge yet)

1. All four surfaces (+ ParentGate) render inside `BallparkShell`; contract test passes.
2. Welcome, Players, Child home show a stadium still built only from existing `public/art/stadium/` layers; no live `CartoonScene` on menus.
3. "On air" and "Now batting" gone from Welcome.
4. Child home announcer row shows placeholders, no pixel portraits; `Broadcast.tsx` untouched.
5. Parent PIN, tabs, Managing, Account, and auth pages work as before.
6. Scope guard (Task 8 Step 3) prints nothing.
7. `npm test`, typecheck, lint, Playwright desktop + iphone pass.
8. No PNG/art binaries in the PR.

Merge and publish to Replit only after Martin PASS **and** Brandon's explicit yes.

---

## Self-Review (against spec)

| Spec item | Task |
|---|---|
| Shared `BallparkShell`: dark gradient, optional framed still, Fredoka `.board-text`, gold/cream buttons | 1, 2 |
| Still uses only existing stadium layers; no new art | 1 (file-existence test), 8 step 3 |
| No live `CartoonScene` on menus | 2, 8 |
| Welcome: big hero, remove On air / Now batting, pitch + legend, gold Create account / Sign in | 3, 8 |
| Players: shell, darker cards keeping figure/team/Play/Edit, ballpark Parent zone + Share | 4 |
| Child home: still behind batter, W/L prominent, gold Play CTA, secondary Practice/Missed/Past | 6 |
| Announcer placeholders, pixel portraits removed from Child home | 5, 6, 8 |
| Parent zone: dark shell + Fredoka titles, no hero, PIN/tabs/Managing unchanged; auth unchanged | 7, 8 step 3 |
| Art: GSS prompts in `docs/art/nano-banana-prompts.md`; Brandon generates into `art-src/`; ships via `pack-art`; follow-up art-only PR | 9 |
| Roles: GSS implements, Martin QA, Ballpark Sound not needed | Roles, 10 |
| No schema/migration, game, results, CartoonScene, SequenceSfx changes | Global Constraints, 8 step 3 |
| Test that each surface renders inside `BallparkShell` | 3, 4, 6, 7 (render) + 8 (static) |
| Phone + desktop pass | 8 step 4, 10 step 1 |
| Acceptance 1–5 | 10 step 3 checklist |

Placeholder scan: no TBD/TODO. A few steps include a one-line grep of a real repo name (auth hook path, `useAudioSettings` provider, e2e selectors) with the exact fallback to apply.

Type consistency: `BallparkShell` props (`variant`, `hero`), `data-shell="ballpark"`, `data-variant`, `data-testid="ballpark-hero"`, `STADIUM_STILL_LAYERS`, `StadiumStill`, `BoothPlaceholder`, `data-testid="booth-placeholder"`, `data-testid="parent-panel"`, `data-testid="share-control"`, `.btn-gold` / `.btn-cream` / `.ballpark-card` are defined in Tasks 1, 2, 4, 5, 7 and used with the same names later.
