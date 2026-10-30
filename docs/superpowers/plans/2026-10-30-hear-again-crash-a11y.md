# Hear again polish, crash screen, polite announcer

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put hear controls next to the spelling box with clearer labels, add a kid-friendly crash screen, and stop the board announcer from talking over the spoken word.

**Architecture:** Client-only. Move the existing `hear('word'|'slow'|'sentence')` buttons into `SpellingInput` as optional props so the spelling UI owns the row. Add a React class `ErrorBoundary` plus React Router `errorElement` so route and render errors show a Rain delay screen. Change `Announcement` from `aria-live="assertive"` to `polite`.

**Tech Stack:** React 19, React Router 7, Vitest, Testing Library, Vite, TypeScript.

## Global Constraints

- No schema / migration changes.
- No merge or Replit publish without Brandon's explicit yes.
- Branch: `hear-again-crash-a11y` off `main` (`4d44e04`).
- Copy stays kid-friendly, short, no emoji in new UI chrome except existing mute control.
- Keep focus on the spelling input after hear taps.
- When `onHear` is omitted, hide hear buttons (covers browsers without speech).

## File map

| File | Role |
|------|------|
| `src/features/game/SpellingInput.tsx` | Spelling field + optional Hear again / Slow / Use in a sentence |
| `src/features/game/SpellingInput.test.tsx` | Button + gating tests |
| `src/features/game/GamePage.tsx` | Pass `onHear` / `hasSentence`; remove old hear grid |
| `src/features/game/Announcement.tsx` | `aria-live="polite"`; drop remount `key` |
| `src/features/game/Announcement.test.tsx` | New: asserts polite live region |
| `src/components/ErrorBoundary.tsx` | Class boundary + Rain delay UI |
| `src/components/ErrorBoundary.test.tsx` | New: thrown child shows crash UI |
| `src/components/CrashScreen.tsx` | Shared Rain delay UI used by boundary + route `errorElement` |
| `src/App.tsx` | Wrap `RouterProvider` in `ErrorBoundary` |
| `src/routes.tsx` | Top-level and `RequireAuth` `errorElement: <CrashScreen />` |

---

### Task 1: Polite Announcement

**Files:**
- Modify: `src/features/game/Announcement.tsx`
- Create: `src/features/game/Announcement.test.tsx`

**Interfaces:**
- Consumes: `{ text: string | null }`
- Produces: same public API; live region is polite and stable (no `key={text}`)

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { Announcement } from './Announcement'

describe('Announcement', () => {
  it('uses a polite live region so it does not interrupt the spoken word', () => {
    render(<Announcement text="HOME RUN" />)
    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toHaveTextContent('HOME RUN')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/features/game/Announcement.test.tsx`
Expected: FAIL (assertive still present, or file missing)

- [ ] **Step 3: Write minimal implementation**

Replace `Announcement.tsx` body with:

```tsx
/** The big flash on the board. One line at a time; the parent sequences them. */
export function Announcement({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <span className="announce announce-pixel pixel-text text-center px-4 text-[clamp(1.1rem,4.5vw,3rem)] leading-tight uppercase">
        {text}
      </span>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/features/game/Announcement.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/game/Announcement.tsx src/features/game/Announcement.test.tsx
git commit -m "fix(a11y): make board announcement polite"
```

---

### Task 2: CrashScreen + ErrorBoundary

**Files:**
- Create: `src/components/CrashScreen.tsx`
- Create: `src/components/ErrorBoundary.tsx`
- Create: `src/components/ErrorBoundary.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/routes.tsx`

**Interfaces:**
- Consumes: optional `error?: unknown` for route `errorElement`
- Produces: `CrashScreen`, `ErrorBoundary` (children: `ReactNode`)

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

function Boom(): never {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  it('shows a Rain delay screen when a child throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('heading', { name: /rain delay/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    spy.mockRestore()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/ErrorBoundary.test.tsx`
Expected: FAIL (module missing)

- [ ] **Step 3: Write CrashScreen**

```tsx
import { Link } from 'react-router'
import { Button } from './Button'
import { Stadium } from './Page'

export function CrashScreen({ onReload }: { onReload?: () => void } = {}) {
  function reload() {
    if (onReload) onReload()
    else window.location.reload()
  }
  return (
    <Stadium className="p-8 text-center">
      <h1 className="font-display text-3xl text-chalk">Rain delay!</h1>
      <p className="mt-3 text-chalk/80">Something went wrong. Try again, or head home.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button type="button" size="lg" onClick={reload}>Try again</Button>
        <Link to="/players" className="btn-secondary">Home</Link>
      </div>
    </Stadium>
  )
}
```

`Stadium` lives in `src/components/Page.tsx`. Match `btn-secondary` / Link patterns from `GamePage.tsx` not-found UI.

- [ ] **Step 4: Write ErrorBoundary**

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { CrashScreen } from './CrashScreen'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Rain delay', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return <CrashScreen onReload={() => this.setState({ error: null })} />
    }
    return this.props.children
  }
}
```

- [ ] **Step 5: Wire App + routes**

In `App.tsx`, wrap `<RouterProvider router={router} />` with `<ErrorBoundary>`.

In `routes.tsx`:
- Import `CrashScreen`.
- Add `errorElement: <CrashScreen />` on the root welcome route object is not enough alone; add a pathless layout parent OR set `errorElement` on every top-level route entry and on the `RequireAuth` route object:

```tsx
{ path: '/', element: <WelcomePage />, errorElement: <CrashScreen /> },
// ...same for /login /register /forgot /reset
{
  element: <RequireAuth />,
  errorElement: <CrashScreen />,
  children: [ /* unchanged */ ],
},
```

Prefer extracting a tiny helper only if duplication is ugly; four auth pages + RequireAuth is fine duplicated once.

- [ ] **Step 6: Run tests**

Run: `npm test -- --run src/components/ErrorBoundary.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/CrashScreen.tsx src/components/ErrorBoundary.tsx src/components/ErrorBoundary.test.tsx src/App.tsx src/routes.tsx
git commit -m "feat: add Rain delay crash screen"
```

---

### Task 3: Hear controls inside SpellingInput

**Files:**
- Modify: `src/features/game/SpellingInput.tsx`
- Modify: `src/features/game/SpellingInput.test.tsx`
- Modify: `src/features/game/GamePage.tsx`

**Interfaces:**
- Consumes: existing `disabled`, `onSubmit`, `focusKey`
- Produces: optional `onHear?: (how: 'word' | 'slow' | 'sentence') => void`, `hasSentence?: boolean`

- [ ] **Step 1: Extend failing tests in SpellingInput.test.tsx**

```tsx
  it('calls onHear for Hear again, Slow, and Use in a sentence', async () => {
    const user = userEvent.setup()
    const onHear = vi.fn()
    render(
      <SpellingInput disabled={false} onSubmit={() => {}} onHear={onHear} hasSentence />,
    )
    await user.click(screen.getByRole('button', { name: /hear again/i }))
    await user.click(screen.getByRole('button', { name: /^slow$/i }))
    await user.click(screen.getByRole('button', { name: /use in a sentence/i }))
    expect(onHear).toHaveBeenCalledWith('word')
    expect(onHear).toHaveBeenCalledWith('slow')
    expect(onHear).toHaveBeenCalledWith('sentence')
  })

  it('hides hear buttons when onHear is omitted', () => {
    render(<SpellingInput disabled={false} onSubmit={() => {}} />)
    expect(screen.queryByRole('button', { name: /hear again/i })).not.toBeInTheDocument()
  })

  it('hides Use in a sentence when hasSentence is false', () => {
    render(
      <SpellingInput disabled={false} onSubmit={() => {}} onHear={() => {}} hasSentence={false} />,
    )
    expect(screen.queryByRole('button', { name: /use in a sentence/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /hear again/i })).toBeInTheDocument()
  })

  it('keeps focus on the spelling field after Hear again', async () => {
    const user = userEvent.setup()
    render(
      <SpellingInput disabled={false} onSubmit={() => {}} onHear={() => {}} hasSentence />,
    )
    const input = screen.getByRole('textbox')
    input.focus()
    await user.click(screen.getByRole('button', { name: /hear again/i }))
    expect(input).toHaveFocus()
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/features/game/SpellingInput.test.tsx`
Expected: FAIL on missing buttons / props

- [ ] **Step 3: Implement SpellingInput hear row**

Extend props and render a hear row above Swing/Clear when `onHear` is set:

```tsx
export interface SpellingInputProps {
  disabled: boolean
  onSubmit: (text: string) => void
  focusKey?: number
  onHear?: (how: 'word' | 'slow' | 'sentence') => void
  hasSentence?: boolean
}

// inside component, after the input, before Swing/Clear:
{onHear ? (
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Hear the word">
    <Button type="button" variant="secondary" disabled={disabled} onClick={() => { onHear('word'); ref.current?.focus() }}>
      Hear again
    </Button>
    <Button type="button" variant="secondary" disabled={disabled} onClick={() => { onHear('slow'); ref.current?.focus() }}>
      Slow
    </Button>
    {hasSentence ? (
      <Button type="button" variant="secondary" disabled={disabled} onClick={() => { onHear('sentence'); ref.current?.focus() }}>
        Use in a sentence
      </Button>
    ) : null}
  </div>
) : null}
```

- [ ] **Step 4: Wire GamePage**

Remove the `canSpeak` hear grid (the four buttons including Repeat). Keep the no-speech fallback block. Pass:

```tsx
<SpellingInput
  disabled={busy || !!reveal}
  onSubmit={onSubmit}
  focusKey={focusKey}
  onHear={canSpeak ? hear : undefined}
  hasSentence={Boolean(word?.sentence)}
/>
```

Leave the strikeout modal **Hear it again** as-is.

- [ ] **Step 5: Run SpellingInput + GamePage tests**

Run: `npm test -- --run src/features/game/SpellingInput.test.tsx src/features/game/GamePage.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/game/SpellingInput.tsx src/features/game/SpellingInput.test.tsx src/features/game/GamePage.tsx
git commit -m "feat: fold hear controls into spelling input"
```

---

### Task 4: Verify full suite and open PR

**Files:** none new

- [ ] **Step 1: Run full unit tests**

Run: `npm test -- --run`
Expected: PASS (fix any failures caused by this branch)

- [ ] **Step 2: Push and open PR**

```bash
git push -u origin hear-again-crash-a11y
gh pr create --base main --title "Hear again polish, Rain delay crash screen, polite announcer" --body "$(cat <<'EOF'
## Summary
- Hear again / Slow / Use in a sentence live next to the spelling box; drop duplicate Repeat
- Rain delay crash screen via ErrorBoundary + route errorElement
- Board announcement aria-live polite so it does not interrupt spoken words

## Test plan
- [ ] npm test -- --run
- [ ] Play a game: hear buttons work, sentence hidden when word has none, focus stays on input
- [ ] Force a throw in a child (dev) and confirm Rain delay + Try again / Home
- [ ] Screen reader / a11y: announcement region is polite

No schema changes. Do not merge or publish without Brandon yes.
EOF
)"
```

- [ ] **Step 3: Stop. Do not merge.**

Report PR URL to Brandon and wait for his explicit merge yes.

