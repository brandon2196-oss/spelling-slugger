# Ballpark Sound Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Kenney UI and jingle clips with real CC0 ballpark sound (bat, mitt, umpire, crowd, organ, ambience) and add a four-bus mixer that ducks crowd and music under every voice so each spelling word stays clear.

**Architecture:** `ClipPlayer` in `src/audio/clips.ts` keeps its one `AudioContext` and master gain and grows four bus gains (`sfx`, `crowd`, `music`, `voice`), a 12 percent wet convolver on `voice`, looped clips, and a reference-counted ducker that lives in the new `src/audio/mixer.ts`. `src/audio/layering.ts` turns one `SubmitEvent` into a timed list of cues (pure, reusable by Phase 3), and `playSequence.ts` stays the single place that fires sound and motion. Baked word MP3s and booth lines play on the `voice` bus through `ClipPlayer`; the `speechSynthesis` fallback only triggers the duck.

**Tech Stack:** TypeScript, React 19, Vite, Vitest (jsdom, `npm test` = `vitest run`), Playwright (`npm run e2e`), oxlint (`npm run lint`), Web Audio API, Node 22 plus system `ffmpeg` for `scripts/process-audio.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-30-ballpark-sound-design.md` (approved by Brandon, sections 1 to 3, 2026-10-30).

**Brief:** `docs/superpowers/specs/2026-10-30-fun-overhaul-grok-brief.md` section 5 and section 8.

**Branch:** `feat/ballpark-sound`, cut from `feat/cartoon-stadium` (Phase 1, draft PR #12), or rebased onto it before Martin QA. `FieldBeat` and `onBeat?: (beat: FieldBeat) => void` already exist on `FieldController` and `CartoonScene` there; import that type instead of redeclaring it, and do Task 9 Step 4's wiring as soon as the branch is cut.

## Global Constraints

- Never change grading, strikes, outs, innings, the difficulty ladder, word selection, the parent zone, accounts or family isolation (brief 8.6). No Store, API, or engine changes.
- Voices stay Edge TTS. No rebake of booth or word clips. Do not touch `scripts/bake-audio.mjs`.
- Never generate, buy or scrape character or stadium art (brief 8.7).
- CC0 only (Brandon, 2026-10-30). No paid packs. Not allowed: CC-BY-NC, attribution-in-UI licenses, anything ripped from video, real broadcast or real stadium PA recordings.
- If no free clip is good enough for a pool, that pool ships as a stub: zero files, plays nothing, no error, no fallback beep.
- `ping` (aluminum bat) is not added in this plan. It stays off until Brandon says yes.
- Duck: `crowd` drops 15 dB and `music` drops 18 dB over 80 ms when any voice starts, recover over 400 ms after the last voice ends.
- Voice reverb: CC0 short stadium IR at 12 percent wet. No IR found means a dry voice bus, noted in the PR.
- Processing: trim leading silence, loudnorm to about -16 LUFS, mono, Ogg Vorbis q5. `npm run process-audio` regenerates everything from `audio-src/`.
- `public/audio/sfx/` stays under 4 MB total.
- One cheer per play, at most. `cheer-big` or `cheer-hr` only on a home run or 2+ runs; a single run, or a hit with no runs, gets `cheer-small`.
- Keep `playSequence.ts` the single choke point for motion and sound. No sound calls from field components (brief 8.8). Ambience lifecycle lives in `GamePage` session hooks only.
- Every duration goes through `motionScale` (brief 8.9). Tests run with `VITE_NO_ANIMATION=1` and must not slow down.
- Quiet Booth keeps ambience and SFX, removes only voices. Speaker mute silences everything, ambience included.
- No em dashes or en dashes in any document, PR body, code comment or UI copy (brief 8.11).
- Never push to `main`, never deploy to Replit, never touch App Storage (brief 8.5). Every PR goes to Martin with link and checklist first; merge and publish only on Martin's go.

---

## File map

| Path | Status | Responsibility |
| --- | --- | --- |
| `src/audio/mixer.ts` | Create | Bus names, duck and reverb constants, `createDucker` |
| `src/audio/mixer.test.ts` | Create | Duck curve and reference counting with fake `AudioParam`s |
| `src/audio/clips.ts` | Modify | Bus graph, voice reverb, `play(url, { bus, gain })`, `loop()`, `stopBus()`, `duckStart()`, `duckEnd()` |
| `src/audio/clips.test.ts` | Modify | Fake `AudioContext` with per-node gains; routing, duck, reverb, loop tests |
| `src/test/fakeClipPlayer.ts` | Create | Shared fake `ClipPlayer` for unit tests |
| `src/audio/sfx.ts` | Rewrite | `POOL_SPEC` (variant counts and bus per pool), new cue methods, stub handling, ambience start/stop/intensity |
| `src/audio/sfx.test.ts` | Rewrite | Pools, buses, stubs, no-repeat, ambience switching |
| `src/audio/layering.ts` | Create | `CUES`, `SequenceSfx`, `layersFor`, `scheduleLayers`, `pickPitchCall`, `ambienceFor`, `OFFSETS` |
| `src/audio/layering.test.ts` | Create | Stack order, offsets, `motionScale` scaling, one-cheer rule, ambience level |
| `src/features/game/playSequence.ts` | Modify | Re-export `SequenceSfx` from layering, mitt vs whiff decision, call `scheduleLayers` |
| `src/features/game/playSequence.test.ts` | Modify | Test double generated from `CUES`, new expected sequences |
| `src/audio/word-audio.ts` | Modify | Baked words through `ClipPlayer` on the `voice` bus; wires speech ducker |
| `src/audio/word-audio.test.ts` | Modify | Uses `fakeClipPlayer` |
| `src/audio/speech.ts` | Modify | `setSpeechDucker`; duck start on `onstart`, end on finish |
| `src/audio/speech.test.ts` | Modify | Duck start/end around an utterance |
| `src/audio/announcer.ts` | Modify | `sayAs` plays on the `voice` bus with `ANNOUNCER_GAIN_DB` |
| `src/audio/announcer.test.ts` | Modify | Fake player from helper; asserts voice bus and gain |
| `src/audio/preload.ts`, `src/audio/preload.test.ts` | Modify | Preload new pools, ambience and IR |
| `src/audio/settings.ts`, `src/audio/settings.test.ts` | Modify | Export `applyAudioSettings`; mute vs Quiet Booth behavior |
| `src/features/game/GamePage.tsx`, `src/features/game/GamePage.test.tsx` | Modify | Ambience low/high from `fieldBases`, off on unmount |
| `src/features/home/ListPickerPage.test.tsx` | Modify | Add `setSpeechDucker` to its `speech` mock |
| `scripts/process-audio.mjs` | Create | Regenerate `public/audio/sfx/` and `public/audio/ir/` from `audio-src/`; `--dry-run`, `--measure` |
| `src/audio/process-audio.test.ts` | Create | Dry-run job planning |
| `package.json` | Modify | `"process-audio": "node scripts/process-audio.mjs"` |
| `audio-src/README.md` | Create | Master layout and naming rules |
| `audio-src/sfx/<pool>/*`, `audio-src/ir/stadium.wav` | Create | CC0 masters |
| `public/audio/sfx/**`, `public/audio/ir/stadium.ogg` | Replace | Processed clips; Kenney and old cheer/groan files deleted |
| `AUDIO-CREDITS.md` | Rewrite | One row per file, stubs listed as pending |
| `src/audio/sfx-files.test.ts` | Create | Files on disk match `POOL_SPEC`, credits rows, 4 MB cap, no Kenney |
| `src/features/game/ballparkSound.test.ts` | Create | Integration: real `Sfx` plus real `ClipPlayer` graph through `playSequence` |

Intentional deviations from the spec wording, all inside the approved design:

- The spec writes `play(url, { bus, loop })` returning a stop handle. A looped clip never ends, so `play()` keeps returning `Promise<void>` (callers await it today) and looping is a separate `loop(url, { bus, gain })` returning `Promise<LoopHandle | null>`.
- `organ-charge` stays at the "run scored" moment in `playSequence` (where it fires today) instead of inside the contact stack, so it never fires before the runner crosses the plate. `layersFor` covers the contact stack only.
- If a home run ends the game, the game-over `fanfare` is skipped because the home-run stack already played one.
- Offsets the spec leaves open are fixed here in `OFFSETS`: umpire call +250 ms after mitt or whiff, groan +300 ms after the strike three call.

---

### Task 1: Mixer constants, ClipPlayer buses, voice reverb, ducking

**Files:**
- Create: `src/audio/mixer.ts`
- Create: `src/audio/mixer.test.ts`
- Modify: `src/audio/clips.ts` (whole file)
- Modify: `src/audio/clips.test.ts` (whole file)
- Modify: `src/audio/sfx.test.ts`, `src/audio/announcer.test.ts` (fake players gain two methods)

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `src/audio/mixer.ts`: `BUSES: readonly ['sfx','crowd','music','voice']`, `type Bus`, `DUCKED_BUSES: readonly Bus[]`, `DUCK_DB_CROWD = -15`, `DUCK_DB_MUSIC = -18`, `DUCK_GAIN: Record<DuckedBus, number>`, `DUCK_ATTACK_S = 0.08`, `DUCK_RELEASE_S = 0.4`, `REVERB_WET = 0.12`, `REVERB_IR_URL = '/audio/ir/stadium.ogg'`, `interface DuckParam`, `interface Ducker { start(): void; end(): void; readonly holds: number }`, `createDucker(params: () => DuckParam[], now: () => number): Ducker`.
  - `src/audio/clips.ts`: `interface PlayOptions { bus?: Bus }`, `ClipPlayer.play(url: string, opts?: PlayOptions): Promise<void>` (default bus `sfx`), `ClipPlayer.duckStart(): void`, `ClipPlayer.duckEnd(): void`. Playing on `voice` holds the duck for the clip's lifetime.

- [ ] **Step 1: Write the failing mixer test**

Create `src/audio/mixer.test.ts`:

```ts
import { DUCK_ATTACK_S, DUCK_GAIN, DUCK_RELEASE_S, createDucker, type DuckParam } from './mixer'

function param(): DuckParam & { calls: Array<[string, number, number?]> } {
  const calls: Array<[string, number, number?]> = []
  return {
    value: 1,
    calls,
    cancelScheduledValues: (t: number) => { calls.push(['cancel', t]) },
    setValueAtTime: (v: number, t: number) => { calls.push(['set', v, t]) },
    linearRampToValueAtTime: (v: number, t: number) => { calls.push(['ramp', v, t]) },
  }
}

describe('createDucker', () => {
  it('DUCK_GAIN is 9 dB down', () => {
    expect(20 * Math.log10(DUCK_GAIN)).toBeCloseTo(-9, 5)
  })

  it('ramps every target down over 80 ms on the first start', () => {
    const a = param(); const b = param()
    const d = createDucker(() => [a, b], () => 10)
    d.start()
    for (const p of [a, b]) {
      expect(p.calls).toEqual([['cancel', 10], ['set', 1, 10], ['ramp', DUCK_GAIN, 10 + DUCK_ATTACK_S]])
    }
    expect(d.holds).toBe(1)
  })

  it('holds the duck while voices overlap and recovers over 400 ms after the last ends', () => {
    const a = param()
    let t = 0
    const d = createDucker(() => [a], () => t)
    d.start(); t = 1; d.start(); t = 2; d.end()
    expect(a.calls.filter((c) => c[0] === 'ramp')).toHaveLength(1)
    t = 3; d.end()
    expect(a.calls.at(-1)).toEqual(['ramp', 1, 3 + DUCK_RELEASE_S])
    expect(d.holds).toBe(0)
  })

  it('ignores an unmatched end', () => {
    const a = param()
    const d = createDucker(() => [a], () => 0)
    d.end()
    expect(a.calls).toEqual([])
    expect(d.holds).toBe(0)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/audio/mixer.test.ts`
Expected: FAIL, `Failed to resolve import "./mixer"`.

- [ ] **Step 3: Write `src/audio/mixer.ts`**

```ts
/**
 * Mixer constants and the duck scheduler (brief 5.3). The bus GainNodes live on ClipPlayer; this file
 * owns the names and the curve so a test can assert it without a real AudioContext.
 */
export const BUSES = ['sfx', 'crowd', 'music', 'voice'] as const
export type Bus = (typeof BUSES)[number]

/** Buses that drop while anything plays on `voice`. */
export const DUCKED_BUSES: readonly Bus[] = ['crowd', 'music']
export const DUCK_DB = -9
export const DUCK_GAIN = 10 ** (DUCK_DB / 20)
export const DUCK_ATTACK_S = 0.08
export const DUCK_RELEASE_S = 0.4

/** Wet level of the stadium impulse response on the voice bus. */
export const REVERB_WET = 0.12
export const REVERB_IR_URL = '/audio/ir/stadium.ogg'

/** The slice of AudioParam the ducker uses. */
export interface DuckParam {
  value: number
  cancelScheduledValues(t: number): unknown
  setValueAtTime(v: number, t: number): unknown
  linearRampToValueAtTime(v: number, t: number): unknown
}

export interface Ducker {
  start(): void
  end(): void
  /** Voices currently holding the duck. */
  readonly holds: number
}

/** Reference-counted duck: the first start ramps down, the last end ramps back up. */
export function createDucker(params: () => DuckParam[], now: () => number): Ducker {
  let holds = 0
  const ramp = (to: number, over: number) => {
    const t = now()
    for (const p of params()) {
      p.cancelScheduledValues(t)
      p.setValueAtTime(p.value, t)
      p.linearRampToValueAtTime(to, t + over)
    }
  }
  return {
    get holds() {
      return holds
    },
    start() {
      holds++
      if (holds === 1) ramp(DUCK_GAIN, DUCK_ATTACK_S)
    },
    end() {
      if (holds === 0) return
      holds--
      if (holds === 0) ramp(1, DUCK_RELEASE_S)
    },
  }
}
```

- [ ] **Step 4: Run the mixer test to verify it passes**

Run: `npx vitest run src/audio/mixer.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the failing ClipPlayer bus tests**

Replace `src/audio/clips.test.ts` with:

```ts
import { describe, expect, it, vi } from 'vitest'
import { createClipPlayer } from './clips'
import { DUCK_GAIN, REVERB_IR_URL, REVERB_WET } from './mixer'

type Param = { value: number; calls: Array<[string, number, number?]>; cancelScheduledValues: (t: number) => void; setValueAtTime: (v: number, t: number) => void; linearRampToValueAtTime: (v: number, t: number) => void }
type Node = { kind: string; gain: Param; connects: unknown[]; connect: (n: unknown) => void; buffer?: unknown }
type Src = { buffer: unknown; loop: boolean; onended: null | (() => void); connects: unknown[]; connect: (n: unknown) => void; start: () => void; stop: () => void }

function fakeCtx(opts: { endAfterMs?: number | null } = {}) {
  const endAfter = opts.endAfterMs === undefined ? 5 : opts.endAfterMs
  const started: unknown[] = []
  const gains: Node[] = []
  const convolvers: Node[] = []
  const sources: Src[] = []
  const mkParam = (): Param => {
    const p: Param = {
      value: 1, calls: [],
      cancelScheduledValues: (t) => { p.calls.push(['cancel', t]) },
      setValueAtTime: (v, t) => { p.calls.push(['set', v, t]) },
      linearRampToValueAtTime: (v, t) => { p.calls.push(['ramp', v, t]); p.value = v },
    }
    return p
  }
  const mkNode = (kind: string): Node => {
    const n: Node = { kind, gain: mkParam(), connects: [], connect: (to) => { n.connects.push(to) } }
    return n
  }
  const ctx = {
    state: 'running',
    currentTime: 0,
    destination: { kind: 'destination' },
    resume: vi.fn(async () => {}),
    createGain: () => { const g = mkNode('gain'); gains.push(g); return g },
    createConvolver: () => { const c = mkNode('convolver'); convolvers.push(c); return c },
    decodeAudioData: vi.fn(async (_b: ArrayBuffer) => ({ duration: 0.01 })),
    createBufferSource: () => {
      const src: Src = {
        buffer: null, loop: false, onended: null, connects: [],
        connect: (to) => { src.connects.push(to) },
        start: () => { started.push(src.buffer); if (endAfter !== null && !src.loop) setTimeout(() => src.onended?.(), endAfter) },
        stop: () => { src.onended?.() },
      }
      sources.push(src)
      return src
    },
  }
  /** gains[0] is master; gains[1..4] are the buses in BUSES order. */
  const bus = (name: 'sfx' | 'crowd' | 'music' | 'voice') => gains[1 + ['sfx', 'crowd', 'music', 'voice'].indexOf(name)]!
  return { ctx: ctx as unknown as AudioContext, started, gains, convolvers, sources, bus }
}

const okFetch = vi.fn(async (url: string) =>
  url.includes('missing') ? new Response('nope', { status: 404 }) : new Response(new ArrayBuffer(8)),
) as unknown as typeof fetch
const noIrFetch = vi.fn(async (url: string) =>
  url === REVERB_IR_URL || url.includes('missing') ? new Response('nope', { status: 404 }) : new Response(new ArrayBuffer(8)),
) as unknown as typeof fetch
const flush = () => new Promise((r) => setTimeout(r, 0))

describe('ClipPlayer', () => {
  it('loads and plays, resolving when the clip ends', async () => {
    const f = fakeCtx()
    const p = createClipPlayer({ fetchImpl: noIrFetch, createContext: () => f.ctx })
    await p.load('/a.mp3')
    await p.play('/a.mp3')
    expect(f.started).toHaveLength(1)
  })

  it('skips audio when muted or volume 0', async () => {
    const f = fakeCtx()
    const p = createClipPlayer({ fetchImpl: noIrFetch, createContext: () => f.ctx })
    p.setMuted(true)
    await p.play('/a.mp3')
    p.setMuted(false)
    p.setVolume(0)
    await p.play('/a.mp3')
    expect(f.started).toHaveLength(0)
  })

  it('rejects load for a missing URL but play resolves without throwing', async () => {
    const f = fakeCtx()
    const p = createClipPlayer({ fetchImpl: noIrFetch, createContext: () => f.ctx })
    await expect(p.load('/missing.mp3')).rejects.toThrow()
    await expect(p.play('/missing.mp3')).resolves.toBeUndefined()
    expect(f.started).toHaveLength(0)
  })

  it('preload caches so each URL is fetched once', async () => {
    const fetchImpl = vi.fn(noIrFetch)
    const f = fakeCtx()
    const p = createClipPlayer({ fetchImpl: fetchImpl as unknown as typeof fetch, createContext: () => f.ctx })
    await p.preload(['/a.mp3', '/b.mp3', '/missing.mp3'])
    await p.play('/a.mp3')
    await p.play('/b.mp3')
    const clipFetches = fetchImpl.mock.calls.filter(([u]) => u !== REVERB_IR_URL)
    expect(clipFetches).toHaveLength(3)
    expect(f.started).toHaveLength(2)
  })

  it('caps the wait so a stuck clip cannot lock play', async () => {
    vi.useFakeTimers()
    const f = fakeCtx({ endAfterMs: null })
    const p = createClipPlayer({ fetchImpl: noIrFetch, createContext: () => f.ctx })
    await p.load('/a.mp3')
    let done = false
    const run = p.play('/a.mp3').then(() => { done = true })
    await vi.advanceTimersByTimeAsync(6900)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(200)
    await run
    expect(done).toBe(true)
    vi.useRealTimers()
  })

  it('builds four buses into master and routes clips to their bus (sfx by default)', async () => {
    const f = fakeCtx()
    const p = createClipPlayer({ fetchImpl: noIrFetch, createContext: () => f.ctx })
    await p.play('/a.ogg')
    await p.play('/b.ogg', { bus: 'crowd' })
    const master = f.gains[0]!
    for (const b of ['sfx', 'crowd', 'music', 'voice'] as const) expect(f.bus(b).connects).toContain(master)
    expect(f.sources[0]!.connects).toEqual([f.bus('sfx')])
    expect(f.sources[1]!.connects).toEqual([f.bus('crowd')])
  })

  it('a voice clip ducks crowd and music 9 dB, then recovers when it ends', async () => {
    const f = fakeCtx()
    const p = createClipPlayer({ fetchImpl: noIrFetch, createContext: () => f.ctx })
    await p.load('/w.mp3')
    const run = p.play('/w.mp3', { bus: 'voice' })
    await flush()
    expect(f.bus('crowd').gain.calls).toContainEqual(['ramp', DUCK_GAIN, 0.08])
    expect(f.bus('music').gain.calls).toContainEqual(['ramp', DUCK_GAIN, 0.08])
    expect(f.bus('sfx').gain.calls).toEqual([])
    await run
    expect(f.bus('crowd').gain.calls.at(-1)).toEqual(['ramp', 1, 0.4])
  })

  it('duckStart and duckEnd drive the same curve (browser speech fallback)', () => {
    const f = fakeCtx()
    const p = createClipPlayer({ fetchImpl: noIrFetch, createContext: () => f.ctx })
    p.resume()
    p.duckStart()
    expect(f.bus('music').gain.calls).toContainEqual(['ramp', DUCK_GAIN, 0.08])
    p.duckEnd()
    expect(f.bus('music').gain.calls.at(-1)).toEqual(['ramp', 1, 0.4])
  })

  it('adds a 12 percent wet convolver on the voice bus when the IR loads', async () => {
    const f = fakeCtx()
    const p = createClipPlayer({ fetchImpl: okFetch, createContext: () => f.ctx })
    p.resume()
    await flush(); await flush()
    expect(f.convolvers).toHaveLength(1)
    expect(f.bus('voice').connects).toContain(f.convolvers[0])
    const wet = f.gains.find((g) => f.convolvers[0]!.connects.includes(g))!
    expect(wet.gain.value).toBe(REVERB_WET)
    expect(wet.connects).toContain(f.gains[0])
  })

  it('keeps the voice bus dry when the IR is missing', async () => {
    const f = fakeCtx()
    const p = createClipPlayer({ fetchImpl: noIrFetch, createContext: () => f.ctx })
    p.resume()
    await flush(); await flush()
    expect(f.convolvers).toHaveLength(0)
  })
})
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run src/audio/clips.test.ts`
Expected: FAIL on the new tests (`f.bus(...)` sees no bus nodes, `p.duckStart is not a function`, no convolver).

- [ ] **Step 7: Rewrite `src/audio/clips.ts`**

```ts
/**
 * Buffer playback for pre-recorded clips (SFX pools, booth lines, baked spelling words). One shared
 * AudioContext, decoded buffers cached by URL, a master gain for volume and mute, and four buses
 * (sfx, crowd, music, voice) into master. Anything on `voice` ducks crowd and music (see mixer.ts)
 * and gets a light stadium reverb. `play` never throws and never waits more than MAX_WAIT_MS.
 */
import { BUSES, DUCKED_BUSES, REVERB_IR_URL, REVERB_WET, createDucker, type Bus } from './mixer'

export const MAX_WAIT_MS = 7000

export interface PlayOptions {
  bus?: Bus
}

export interface ClipPlayer {
  load(url: string): Promise<void>
  play(url: string, opts?: PlayOptions): Promise<void>
  preload(urls: string[]): Promise<void>
  setVolume(v: number): void
  setMuted(m: boolean): void
  /** Create/resume the AudioContext. Call from a user gesture (iOS/Safari unlock). */
  resume(): void
  /** Hold the voice duck (browser speech cannot enter the graph, so it ducks by hand). */
  duckStart(): void
  duckEnd(): void
}

export interface ClipPlayerOptions {
  fetchImpl?: typeof fetch
  /** Test seam; defaults to the browser AudioContext. */
  createContext?: () => AudioContext | null
}

interface Graph {
  ctx: AudioContext
  master: GainNode
  buses: Record<Bus, GainNode>
}

function defaultContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctx = (window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as typeof AudioContext | undefined
  return Ctx ? new Ctx() : null
}

export function createClipPlayer(opts: ClipPlayerOptions = {}): ClipPlayer {
  const fetchImpl = opts.fetchImpl ?? ((...a: Parameters<typeof fetch>) => fetch(...a))
  const makeCtx = opts.createContext ?? defaultContext
  const buffers = new Map<string, Promise<AudioBuffer>>()
  let graph: Graph | null = null
  let volume = 1
  let muted = false

  const level = () => (muted ? 0 : volume)
  const ducker = createDucker(
    () => (graph ? DUCKED_BUSES.map((b) => graph!.buses[b].gain) : []),
    () => graph?.ctx.currentTime ?? 0,
  )

  function context(): Graph | null {
    if (!graph) {
      const ctx = makeCtx()
      if (!ctx) return null
      const master = ctx.createGain()
      master.gain.value = level()
      master.connect(ctx.destination)
      const buses = Object.fromEntries(
        BUSES.map((b) => {
          const g = ctx.createGain()
          g.gain.value = 1
          g.connect(master)
          return [b, g]
        }),
      ) as Record<Bus, GainNode>
      graph = { ctx, master, buses }
      void attachReverb(graph)
    }
    if (graph.ctx.state === 'suspended') void graph.ctx.resume().catch(() => {})
    return graph
  }

  /** Voice bus: dry into master (already wired) plus a convolver at REVERB_WET. No IR means dry only. */
  async function attachReverb(g: Graph): Promise<void> {
    if (typeof g.ctx.createConvolver !== 'function') return
    try {
      await load(REVERB_IR_URL)
      const conv = g.ctx.createConvolver()
      conv.buffer = await buffers.get(REVERB_IR_URL)!
      const wet = g.ctx.createGain()
      wet.gain.value = REVERB_WET
      g.buses.voice.connect(conv)
      conv.connect(wet)
      wet.connect(g.master)
    } catch {
      /* spec open question 3: ship a dry voice bus */
    }
  }

  function load(url: string): Promise<void> {
    let p = buffers.get(url)
    if (!p) {
      p = (async () => {
        const c = context()
        if (!c) throw new Error('no AudioContext')
        const res = await fetchImpl(url)
        if (!res.ok) throw new Error(`clip ${url}: HTTP ${res.status}`)
        return c.ctx.decodeAudioData(await res.arrayBuffer())
      })()
      buffers.set(url, p)
      p.catch(() => buffers.delete(url)) // allow a later retry
    }
    return p.then(() => undefined)
  }

  async function play(url: string, o: PlayOptions = {}): Promise<void> {
    if (level() <= 0) return
    const bus = o.bus ?? 'sfx'
    let buffer: AudioBuffer
    try {
      await load(url)
      buffer = await buffers.get(url)!
    } catch {
      return
    }
    const c = context()
    if (!c) return
    await new Promise<void>((resolve) => {
      const src = c.ctx.createBufferSource()
      src.buffer = buffer
      src.connect(c.buses[bus])
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        if (bus === 'voice') ducker.end()
        resolve()
      }
      const timer = setTimeout(() => {
        try { src.stop() } catch { /* already stopped */ }
        finish()
      }, MAX_WAIT_MS)
      src.onended = finish
      if (bus === 'voice') ducker.start()
      try { src.start() } catch { finish() }
    })
  }

  return {
    load,
    play,
    async preload(urls) {
      await Promise.allSettled(urls.map(load))
    },
    setVolume(v) {
      volume = Math.max(0, Math.min(1, v))
      if (graph) graph.master.gain.value = level()
    },
    setMuted(m) {
      muted = m
      if (graph) graph.master.gain.value = level()
    },
    resume() {
      context()
    },
    duckStart() {
      context()
      ducker.start()
    },
    duckEnd() {
      ducker.end()
    },
  }
}

/** The app-wide player shared by SFX, the booth and baked words; settings drive its volume/mute. */
export const clips = createClipPlayer()
```

- [ ] **Step 8: Add the two new methods to every existing fake `ClipPlayer`**

`src/audio/sfx.test.ts` (`fakePlayer`) and `src/audio/announcer.test.ts` (the `player = { ... }` literal in `beforeEach`) build `ClipPlayer` literals. Add `duckStart: vi.fn(), duckEnd: vi.fn(),` to each so typecheck passes. Task 2 replaces both with a shared helper.

- [ ] **Step 9: Run tests and typecheck to verify they pass**

Run: `npx vitest run src/audio/mixer.test.ts src/audio/clips.test.ts src/audio/sfx.test.ts src/audio/announcer.test.ts && npm run typecheck`
Expected: PASS, no type errors.

- [ ] **Step 10: Commit**

```bash
git add src/audio/mixer.ts src/audio/mixer.test.ts src/audio/clips.ts src/audio/clips.test.ts src/audio/sfx.test.ts src/audio/announcer.test.ts
git commit -m "feat(audio): four-bus mixer with voice ducking and stadium reverb"
```

---

### Task 2: Looped clips, per-clip gain, stopBus, shared fake player

**Files:**
- Modify: `src/audio/clips.ts`
- Modify: `src/audio/clips.test.ts`
- Create: `src/test/fakeClipPlayer.ts`
- Modify: `src/audio/sfx.test.ts`, `src/audio/announcer.test.ts` (use the helper)

**Interfaces:**
- Consumes: `Bus` from `src/audio/mixer.ts`; `createClipPlayer`, `PlayOptions` from Task 1.
- Produces:
  - `PlayOptions` becomes `{ bus?: Bus; gain?: number }` (linear, default 1).
  - `interface LoopOptions { bus: Bus; gain?: number }`, `interface LoopHandle { stop(): void }`.
  - `ClipPlayer.loop(url: string, opts: LoopOptions): Promise<LoopHandle | null>`: starts a looping source regardless of volume or mute (master gain silences it, so unmuting brings ambience back). Resolves `null` if the clip cannot load.
  - `ClipPlayer.stopBus(bus: Bus): void`: stops every one-shot and loop currently on that bus.
  - `src/test/fakeClipPlayer.ts`: `fakeClipPlayer(opts?: { missing?: (url: string) => boolean; hold?: boolean }): FakeClipPlayer` with `played: Array<{ url: string; bus: Bus; gain: number }>`, `loops: Array<{ url: string; bus: Bus; gain: number; stopped: boolean }>`, `finish: Array<() => void>` (pending plays when `hold` is true), and `vi.fn` spies for every method.

- [ ] **Step 1: Write the failing tests**

Append inside the `describe('ClipPlayer', ...)` block in `src/audio/clips.test.ts`:

```ts
  it('loop() starts a looping source on its bus with a gain node, and stop() ends it', async () => {
    const f = fakeCtx()
    const p = createClipPlayer({ fetchImpl: noIrFetch, createContext: () => f.ctx })
    const h = await p.loop('/amb.ogg', { bus: 'crowd', gain: 0.5 })
    expect(h).not.toBeNull()
    const src = f.sources.at(-1)!
    expect(src.loop).toBe(true)
    const g = src.connects[0] as { gain: { value: number }; connects: unknown[] }
    expect(g.gain.value).toBe(0.5)
    expect(g.connects).toEqual([f.bus('crowd')])
    const stop = vi.spyOn(src, 'stop')
    h!.stop()
    expect(stop).toHaveBeenCalled()
  })

  it('loop() still starts while muted (master gain silences it) and is null for a missing clip', async () => {
    const f = fakeCtx()
    const p = createClipPlayer({ fetchImpl: noIrFetch, createContext: () => f.ctx })
    p.setMuted(true)
    expect(await p.loop('/amb.ogg', { bus: 'crowd' })).not.toBeNull()
    expect(f.gains[0]!.gain.value).toBe(0)
    expect(await p.loop('/missing.ogg', { bus: 'crowd' })).toBeNull()
  })

  it('stopBus stops everything on that bus only', async () => {
    const f = fakeCtx({ endAfterMs: null })
    const p = createClipPlayer({ fetchImpl: noIrFetch, createContext: () => f.ctx })
    await p.load('/w.mp3'); await p.load('/c.ogg')
    const word = p.play('/w.mp3', { bus: 'voice' })
    void p.play('/c.ogg', { bus: 'sfx' })
    await flush()
    const [voiceSrc, sfxSrc] = f.sources
    const vStop = vi.spyOn(voiceSrc!, 'stop'); const sStop = vi.spyOn(sfxSrc!, 'stop')
    p.stopBus('voice')
    await word
    expect(vStop).toHaveBeenCalled()
    expect(sStop).not.toHaveBeenCalled()
  })

  it('play() applies a per-clip gain when given', async () => {
    const f = fakeCtx()
    const p = createClipPlayer({ fetchImpl: noIrFetch, createContext: () => f.ctx })
    await p.play('/b.ogg', { bus: 'voice', gain: 0.8 })
    const g = f.sources.at(-1)!.connects[0] as { gain: { value: number }; connects: unknown[] }
    expect(g.gain.value).toBe(0.8)
    expect(g.connects).toEqual([f.bus('voice')])
  })
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/audio/clips.test.ts`
Expected: FAIL, `p.loop is not a function`, `p.stopBus is not a function`, per-clip gain test sees the bus as the first connect.

- [ ] **Step 3: Implement in `src/audio/clips.ts`**

Change `PlayOptions` and add the loop types:

```ts
export interface PlayOptions {
  bus?: Bus
  /** Linear gain for this clip only (booth level match). Default 1. */
  gain?: number
}

export interface LoopOptions {
  bus: Bus
  gain?: number
}

export interface LoopHandle {
  stop(): void
}
```

Add to `interface ClipPlayer`:

```ts
  /** Start a seamless loop (ambience). Starts even while muted; master gain silences it. Null if unloadable. */
  loop(url: string, opts: LoopOptions): Promise<LoopHandle | null>
  /** Stop every clip and loop currently on the bus. */
  stopBus(bus: Bus): void
```

Inside `createClipPlayer`, after `const ducker = ...`, add the active-source registry and a routing helper:

```ts
  const active: Record<Bus, Set<AudioBufferSourceNode>> = { sfx: new Set(), crowd: new Set(), music: new Set(), voice: new Set() }

  /** Source into the bus, through its own gain node when gain is not 1. */
  function route(c: Graph, src: AudioBufferSourceNode, bus: Bus, gain = 1): void {
    if (gain === 1) {
      src.connect(c.buses[bus])
      return
    }
    const g = c.ctx.createGain()
    g.gain.value = gain
    src.connect(g)
    g.connect(c.buses[bus])
  }
```

In `play`, replace `src.connect(c.buses[bus])` with:

```ts
      route(c, src, bus, o.gain)
      active[bus].add(src)
```

and inside `finish`, right after `settled = true`, add `active[bus].delete(src)`.

Add these two functions after `play`:

```ts
  async function loop(url: string, o: LoopOptions): Promise<LoopHandle | null> {
    let buffer: AudioBuffer
    try {
      await load(url)
      buffer = await buffers.get(url)!
    } catch {
      return null
    }
    const c = context()
    if (!c) return null
    const src = c.ctx.createBufferSource()
    src.buffer = buffer
    src.loop = true
    route(c, src, o.bus, o.gain)
    active[o.bus].add(src)
    try {
      src.start()
    } catch {
      active[o.bus].delete(src)
      return null
    }
    return {
      stop() {
        active[o.bus].delete(src)
        try { src.stop() } catch { /* already stopped */ }
      },
    }
  }

  function stopBus(bus: Bus): void {
    for (const src of [...active[bus]]) {
      active[bus].delete(src)
      try { src.stop() } catch { /* already stopped */ }
    }
  }
```

Add `loop,` and `stopBus,` to the returned object.

- [ ] **Step 4: Create `src/test/fakeClipPlayer.ts`**

```ts
import { vi } from 'vitest'
import type { ClipPlayer, LoopHandle, LoopOptions, PlayOptions } from '../audio/clips'
import type { Bus } from '../audio/mixer'

export interface FakeClipPlayer extends ClipPlayer {
  played: Array<{ url: string; bus: Bus; gain: number }>
  loops: Array<{ url: string; bus: Bus; gain: number; stopped: boolean }>
  /** Resolvers for plays still in flight when `hold` is true. */
  finish: Array<() => void>
}

/** A ClipPlayer that records instead of playing. `missing` URLs reject load and never play. */
export function fakeClipPlayer(opts: { missing?: (url: string) => boolean; hold?: boolean } = {}): FakeClipPlayer {
  const missing = opts.missing ?? (() => false)
  const played: FakeClipPlayer['played'] = []
  const loops: FakeClipPlayer['loops'] = []
  const finish: Array<() => void> = []
  return {
    played,
    loops,
    finish,
    load: vi.fn(async (url: string) => {
      if (missing(url)) throw new Error(`missing ${url}`)
    }),
    play: vi.fn((url: string, o: PlayOptions = {}) => {
      if (missing(url)) return Promise.resolve()
      played.push({ url, bus: o.bus ?? 'sfx', gain: o.gain ?? 1 })
      return opts.hold ? new Promise<void>((r) => finish.push(r)) : Promise.resolve()
    }),
    loop: vi.fn(async (url: string, o: LoopOptions): Promise<LoopHandle | null> => {
      if (missing(url)) return null
      const entry = { url, bus: o.bus, gain: o.gain ?? 1, stopped: false }
      loops.push(entry)
      return { stop: () => { entry.stopped = true } }
    }),
    stopBus: vi.fn(),
    preload: vi.fn(async () => {}),
    setVolume: vi.fn(),
    setMuted: vi.fn(),
    resume: vi.fn(),
    duckStart: vi.fn(),
    duckEnd: vi.fn(),
  }
}
```

- [ ] **Step 5: Point the existing fakes at the helper**

In `src/audio/sfx.test.ts`, replace the `ClipPlayer` import and the whole `fakePlayer` function with:

```ts
import { fakeClipPlayer } from '../test/fakeClipPlayer'

function fakePlayer() {
  const player = fakeClipPlayer()
  const played: string[] = []
  vi.mocked(player.play).mockImplementation(async (url: string) => { played.push(url) })
  return { player, played }
}
```

In `src/audio/announcer.test.ts`, add `import { fakeClipPlayer } from '../test/fakeClipPlayer'` and replace the `player = { ... }` literal in `beforeEach` with:

```ts
    player = fakeClipPlayer()
    vi.mocked(player.play).mockImplementation((url: string) => { played.push(url); return new Promise<void>((r) => finish.push(r)) })
```

Remove the `duckStart`/`duckEnd` lines added in Task 1 Step 8; the helper provides them.

- [ ] **Step 6: Run tests and typecheck to verify they pass**

Run: `npx vitest run src/audio/clips.test.ts src/audio/sfx.test.ts src/audio/announcer.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/audio/clips.ts src/audio/clips.test.ts src/test/fakeClipPlayer.ts src/audio/sfx.test.ts src/audio/announcer.test.ts
git commit -m "feat(audio): looped clips, per-clip gain and stopBus on ClipPlayer"
```

---

### Task 3: New SFX pools, cue methods, stub pools, ambience API, SequenceSfx surface

**Files:**
- Rewrite: `src/audio/sfx.ts`
- Rewrite: `src/audio/sfx.test.ts`
- Modify: `src/features/game/playSequence.ts` (interface and minimal call-site mapping)
- Modify: `src/features/game/playSequence.test.ts` (test double and expected names)

**Interfaces:**
- Consumes: `ClipPlayer.play(url, { bus })`, `ClipPlayer.loop(url, { bus, gain })`, `LoopHandle` (Task 2); `Bus` (Task 1); `createPicker` from `src/audio/pool.ts` (unchanged).
- Produces:
  - `POOL_SPEC` (`n = 0` means stub), `type SfxPool`, `type PoolSpec = Record<SfxPool, { n: number; bus: Bus }>`, `SFX_POOLS: Record<SfxPool, string[]>`, `AMBIENCE_URLS: { low: string; high: string }`, `AMBIENCE_GAIN = 0.5`, `ALL_SFX_URLS: string[]` (pools plus ambience), `type OrganRiff`, `type AmbienceLevel = 'off' | 'low' | 'high'`.
  - `class Sfx` with `enabled` (getter/setter that also syncs ambience), `unlock()`, `setVolume(v)`, cue methods `crack() crackHomeRun() whiff() mitt() umpStrike() umpStrike3() umpBall4() ballWall() cheerSmall() cheerBig() cheerHr() fanfare() groan() organ(riff)`, `ambience(level: AmbienceLevel): void`, `readonly ambienceLevel: AmbienceLevel`. Constructor `(player = clips, rng = Math.random, spec: PoolSpec = POOL_SPEC)`.
  - `SequenceSfx` in `playSequence.ts` has exactly the cue methods above plus `organ(riff)`. `cheer`, `walkChime`, `strikeBuzz` are gone. (Grand Slam Spelling confirmed Phase 1 leaves `SequenceSfx` untouched on `feat/cartoon-stadium`, so this is the only change to it.)

- [ ] **Step 1: Write the failing SFX test**

Replace `src/audio/sfx.test.ts` with:

```ts
import { fakeClipPlayer } from '../test/fakeClipPlayer'
import { AMBIENCE_GAIN, AMBIENCE_URLS, ALL_SFX_URLS, POOL_SPEC, SFX_POOLS, Sfx, type PoolSpec } from './sfx'

const folder = (url: string) => url.split('/')[3]
const flush = () => new Promise((r) => setTimeout(r, 0))

describe('Sfx (ballpark pools)', () => {
  it('each cue plays from its folder on its bus', () => {
    const p = fakeClipPlayer()
    const s = new Sfx(p)
    s.crack(); s.crackHomeRun(); s.whiff(); s.mitt(); s.umpStrike(); s.umpStrike3(); s.umpBall4(); s.ballWall()
    s.cheerSmall(); s.cheerBig(); s.cheerHr(); s.groan(); s.fanfare(); s.organ('charge'); s.organ('inning'); s.organ('walkup')
    expect(p.played.map((x) => [folder(x.url), x.bus])).toEqual([
      ['crack', 'sfx'], ['crack-hr', 'sfx'], ['whiff', 'sfx'], ['mitt', 'sfx'], ['ump-strike', 'sfx'], ['ump-strike3', 'sfx'],
      ['ump-ball4', 'sfx'], ['ball-wall', 'sfx'], ['cheer-small', 'crowd'], ['cheer-big', 'crowd'], ['cheer-hr', 'crowd'],
      ['groan', 'crowd'], ['fanfare', 'music'], ['organ-charge', 'music'], ['organ-inning', 'music'], ['organ-walkup', 'music'],
    ])
  })

  it('has no Kenney-era pools', () => {
    for (const gone of ['cheer', 'walkChime', 'strikeBuzz']) expect(Object.keys(POOL_SPEC)).not.toContain(gone)
  })

  it('pool URLs follow /audio/sfx/<pool>/<pool>-<n>.ogg and match the spec count', () => {
    for (const [pool, { n }] of Object.entries(POOL_SPEC)) {
      const urls = SFX_POOLS[pool as keyof typeof POOL_SPEC]
      expect(urls).toHaveLength(n)
      urls.forEach((u, i) => expect(u).toBe(`/audio/sfx/${pool}/${pool}-${i + 1}.ogg`))
    }
  })

  it('ALL_SFX_URLS includes every pool clip and both ambience loops', () => {
    expect(ALL_SFX_URLS).toEqual([...Object.values(SFX_POOLS).flat(), AMBIENCE_URLS.low, AMBIENCE_URLS.high])
  })

  it('a stub pool (n = 0) plays nothing and does not throw', () => {
    const p = fakeClipPlayer()
    const spec = { ...POOL_SPEC, 'ump-strike': { n: 0, bus: 'sfx' } } as PoolSpec
    const s = new Sfx(p, Math.random, spec)
    expect(() => s.umpStrike()).not.toThrow()
    expect(p.played).toEqual([])
  })

  it('plays nothing when disabled', () => {
    const p = fakeClipPlayer()
    const s = new Sfx(p)
    s.enabled = false
    s.crack(); s.cheerBig(); s.organ('charge')
    expect(p.played).toEqual([])
  })

  it('never repeats the same variant back to back', () => {
    const p = fakeClipPlayer()
    const s = new Sfx(p, () => 0)
    for (let i = 0; i < 10; i++) s.crack()
    for (let i = 1; i < p.played.length; i++) expect(p.played[i]!.url).not.toBe(p.played[i - 1]!.url)
  })

  it('setVolume forwards to the clip player; unlock resumes it', () => {
    const p = fakeClipPlayer()
    const s = new Sfx(p)
    s.setVolume(0.4)
    expect(p.setVolume).toHaveBeenCalledWith(0.4)
    s.unlock()
    expect(p.resume).toHaveBeenCalled()
  })

  describe('ambience', () => {
    it('low starts the low loop on the crowd bus at AMBIENCE_GAIN', async () => {
      const p = fakeClipPlayer()
      const s = new Sfx(p)
      s.ambience('low')
      await flush()
      expect(p.loops).toEqual([{ url: AMBIENCE_URLS.low, bus: 'crowd', gain: AMBIENCE_GAIN, stopped: false }])
      expect(s.ambienceLevel).toBe('low')
    })

    it('switching low to high stops low and starts high; the same level twice is a no-op', async () => {
      const p = fakeClipPlayer()
      const s = new Sfx(p)
      s.ambience('low'); await flush()
      s.ambience('high'); await flush()
      s.ambience('high'); await flush()
      expect(p.loops.map((l) => [l.url, l.stopped])).toEqual([[AMBIENCE_URLS.low, true], [AMBIENCE_URLS.high, false]])
    })

    it('off stops the loop', async () => {
      const p = fakeClipPlayer()
      const s = new Sfx(p)
      s.ambience('high'); await flush()
      s.ambience('off'); await flush()
      expect(p.loops[0]!.stopped).toBe(true)
      expect(s.ambienceLevel).toBe('off')
    })

    it('a switch that lands before the loop loads stops the stale loop', async () => {
      const p = fakeClipPlayer()
      const s = new Sfx(p)
      s.ambience('low'); s.ambience('high'); await flush()
      expect(p.loops.find((l) => l.url === AMBIENCE_URLS.low)!.stopped).toBe(true)
      expect(p.loops.find((l) => l.url === AMBIENCE_URLS.high)!.stopped).toBe(false)
    })

    it('disabling stops ambience and re-enabling restores the wanted level', async () => {
      const p = fakeClipPlayer()
      const s = new Sfx(p)
      s.ambience('high'); await flush()
      s.enabled = false; await flush()
      expect(p.loops[0]!.stopped).toBe(true)
      s.enabled = true; await flush()
      expect(p.loops.at(-1)).toMatchObject({ url: AMBIENCE_URLS.high, stopped: false })
    })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/audio/sfx.test.ts`
Expected: FAIL, `POOL_SPEC` and `AMBIENCE_URLS` not exported, `s.mitt is not a function`.

- [ ] **Step 3: Rewrite `src/audio/sfx.ts`**

```ts
/**
 * Ballpark sound effects from CC0 recordings (see AUDIO-CREDITS.md) under public/audio/sfx/.
 * Each cue draws from a pool via the no-repeat picker and plays on its mixer bus. A pool with n = 0
 * is a stub (CC0 search failed): its cue plays nothing. Ambience is one looped bed on the crowd bus.
 */
import { clips, type ClipPlayer, type LoopHandle } from './clips'
import type { Bus } from './mixer'
import { createPicker } from './pool'

export type OrganRiff = 'charge' | 'inning' | 'walkup'
export type AmbienceLevel = 'off' | 'low' | 'high'

/** Variants on disk per pool and the bus each plays on. Set n to 0 to stub a pool (Task 8). */
export const POOL_SPEC = {
  crack: { n: 4, bus: 'sfx' },
  'crack-hr': { n: 3, bus: 'sfx' },
  whiff: { n: 4, bus: 'sfx' },
  mitt: { n: 4, bus: 'sfx' },
  'ump-strike': { n: 4, bus: 'sfx' },
  'ump-strike3': { n: 3, bus: 'sfx' },
  'ump-ball4': { n: 3, bus: 'sfx' },
  'ball-wall': { n: 2, bus: 'sfx' },
  'cheer-small': { n: 3, bus: 'crowd' },
  'cheer-big': { n: 3, bus: 'crowd' },
  'cheer-hr': { n: 3, bus: 'crowd' },
  groan: { n: 3, bus: 'crowd' },
  fanfare: { n: 3, bus: 'music' },
  'organ-charge': { n: 3, bus: 'music' },
  'organ-walkup': { n: 4, bus: 'music' },
  'organ-inning': { n: 3, bus: 'music' },
} as const satisfies Record<string, { n: number; bus: Bus }>

export type SfxPool = keyof typeof POOL_SPEC
export type PoolSpec = Record<SfxPool, { n: number; bus: Bus }>

const urlsFor = (pool: string, n: number) => Array.from({ length: n }, (_, i) => `/audio/sfx/${pool}/${pool}-${i + 1}.ogg`)

export const SFX_POOLS = Object.fromEntries(
  (Object.keys(POOL_SPEC) as SfxPool[]).map((k) => [k, urlsFor(k, POOL_SPEC[k].n)]),
) as Record<SfxPool, string[]>

export const AMBIENCE_URLS = {
  low: '/audio/sfx/ambience/ambience-low.ogg',
  high: '/audio/sfx/ambience/ambience-high.ogg',
} as const

/** The bed sits under everything; cheers ride on top of it. */
export const AMBIENCE_GAIN = 0.5

/** Every SFX URL, for preloading. */
export const ALL_SFX_URLS: string[] = [...Object.values(SFX_POOLS).flat(), AMBIENCE_URLS.low, AMBIENCE_URLS.high]

export class Sfx {
  private _enabled = true
  private readonly player: ClipPlayer
  private readonly spec: PoolSpec
  private readonly pickers: Partial<Record<SfxPool, () => string>> = {}
  private wanted: AmbienceLevel = 'off'
  private playing: AmbienceLevel = 'off'
  private handle: LoopHandle | null = null
  private token = 0

  constructor(player: ClipPlayer = clips, rng: () => number = Math.random, spec: PoolSpec = POOL_SPEC) {
    this.player = player
    this.spec = spec
    for (const k of Object.keys(spec) as SfxPool[]) {
      if (spec[k].n > 0) this.pickers[k] = createPicker(urlsFor(k, spec[k].n), rng)
    }
  }

  get enabled(): boolean {
    return this._enabled
  }

  set enabled(on: boolean) {
    this._enabled = on
    this.syncAmbience()
  }

  /** Create (or resume) the audio context. Call from a user gesture. */
  unlock(): void {
    this.player.resume()
  }

  setVolume(v: number): void {
    this.player.setVolume(Math.max(0, Math.min(1, v)))
  }

  private fire(p: SfxPool): void {
    if (!this._enabled) return
    const pick = this.pickers[p]
    if (!pick) return // stub pool
    void this.player.play(pick(), { bus: this.spec[p].bus })
  }

  crack(): void { this.fire('crack') }
  crackHomeRun(): void { this.fire('crack-hr') }
  whiff(): void { this.fire('whiff') }
  mitt(): void { this.fire('mitt') }
  umpStrike(): void { this.fire('ump-strike') }
  umpStrike3(): void { this.fire('ump-strike3') }
  umpBall4(): void { this.fire('ump-ball4') }
  ballWall(): void { this.fire('ball-wall') }
  cheerSmall(): void { this.fire('cheer-small') }
  cheerBig(): void { this.fire('cheer-big') }
  cheerHr(): void { this.fire('cheer-hr') }
  groan(): void { this.fire('groan') }
  fanfare(): void { this.fire('fanfare') }
  organ(riff: OrganRiff): void { this.fire(`organ-${riff}`) }

  /** Crowd bed: 'low' on the game screen, 'high' with runners on, 'off' when leaving. */
  ambience(level: AmbienceLevel): void {
    this.wanted = level
    this.syncAmbience()
  }

  get ambienceLevel(): AmbienceLevel {
    return this.playing
  }

  private syncAmbience(): void {
    const target: AmbienceLevel = this._enabled ? this.wanted : 'off'
    if (target === this.playing) return
    this.handle?.stop()
    this.handle = null
    this.playing = target
    const token = ++this.token
    if (target === 'off') return
    void this.player.loop(AMBIENCE_URLS[target], { bus: 'crowd', gain: AMBIENCE_GAIN }).then((h) => {
      if (token === this.token) this.handle = h
      else h?.stop()
    })
  }
}

export const sfx = new Sfx()
```

- [ ] **Step 4: Run the SFX test to verify it passes**

Run: `npx vitest run src/audio/sfx.test.ts`
Expected: PASS.

- [ ] **Step 5: Update `SequenceSfx` and the minimal call sites in `src/features/game/playSequence.ts`**

Replace the interface:

```ts
export interface SequenceSfx {
  crack(): void
  crackHomeRun(): void
  whiff(): void
  mitt(): void
  umpStrike(): void
  umpStrike3(): void
  umpBall4(): void
  ballWall(): void
  cheerSmall(): void
  cheerBig(): void
  cheerHr(): void
  fanfare(): void
  groan(): void
  organ(riff: 'charge' | 'inning' | 'walkup'): void
}
```

Change the call sites (layering arrives in Task 4; this keeps the build green):
- strike branch: `sfx.whiff()` becomes `sfx.whiff(); sfx.umpStrike()`.
- strikeout case: `sfx.strikeBuzz()` becomes `sfx.umpStrike3()` (keep `sfx.groan()`).
- walk case: `sfx.walkChime()` becomes `sfx.mitt(); sfx.umpBall4()`.
- default case: replace `sfx.crack()` and the cheer line with:

```ts
      if (event.outcome === 'homeRun') sfx.crackHomeRun()
      else sfx.crack()
      if (event.outcome === 'homeRun') sfx.cheerHr()
      else if (event.runsScored >= 2) sfx.cheerBig()
```

- [ ] **Step 6: Update the test double and expected names in `src/features/game/playSequence.test.ts`**

Replace the `const sfx: SequenceSfx = { ... }` literal in `recorder()` with:

```ts
  const cueNames = ['crack', 'crackHomeRun', 'whiff', 'mitt', 'umpStrike', 'umpStrike3', 'umpBall4', 'ballWall', 'cheerSmall', 'cheerBig', 'cheerHr', 'fanfare', 'groan'] as const
  const sfx = {
    ...Object.fromEntries(cueNames.map((c) => [c, () => { calls.push(`sfx.${c}`) }])),
    organ: (riff: string) => { calls.push(`sfx.organ(${riff})`) },
  } as SequenceSfx
```

Update expectations:
- strikeout test: `'sfx.strikeBuzz', 'sfx.groan'` becomes `'sfx.umpStrike3', 'sfx.groan'`.
- strike test: `['playPitch', 'sfx.whiff', 'sfx.umpStrike', 'playStrike(1)', 'announce(STRIKE ONE!)', 'say(strike1)']`.
- walk test: `['playPitch', 'sfx.mitt', 'sfx.umpBall4', 'playWalk', 'announce(TAKE YOUR BASE!)', 'say(walk)']`.
- the two "crowd cheers once" tests: count `c.startsWith('sfx.cheer')` instead of `c === 'sfx.cheer'`.
- concurrency test: `not.toContain('sfx.cheer')` becomes `not.toContain('sfx.organ(charge)')`.

- [ ] **Step 7: Run tests, typecheck and lint**

Run: `npx vitest run src/audio/sfx.test.ts src/features/game/playSequence.test.ts && npm run typecheck && npm run lint`
Expected: PASS. `GamePage` passes the `sfx` singleton as `SequenceSfx`; it has every method.

- [ ] **Step 8: Commit**

```bash
git add src/audio/sfx.ts src/audio/sfx.test.ts src/features/game/playSequence.ts src/features/game/playSequence.test.ts
git commit -m "feat(audio): ballpark SFX pools, stub pools and ambience bed; new SequenceSfx"
```

---

### Task 4: layering.ts with FieldBeat sync, one-cheer rule, motionScale fallback, playSequence wiring

**Locked with Grand Slam Spelling (2026-10-30), do not invent variants:**

```ts
type FieldBeat = 'pitchArrival' | 'contact' | 'wall' | 'leavesYard' | 'runScored'
onBeat?: (beat: FieldBeat) => void
```

| Beat | Sound it drives |
| --- | --- |
| `pitchArrival` | `mitt` on a non-hit (strike with the mitt call, walk) |
| `contact` | `crack` or `crack-hr` |
| `wall` | `ball-wall` (doubles) |
| `leavesYard` | optional home-run layering hook; `fanfare` may still use its offset |
| `runScored` | `organ-charge`, once per play, only if any runs scored |

Phase 1 owns where `onBeat` is declared on the field side and when the scene calls it. Phase 2 owns what each beat plays. Until `feat/cartoon-stadium` lands (or when the field is null or never calls `onBeat`), every cue falls back to its `motionScale` time offset. A cue fires exactly once: on its beat or at its fallback offset, whichever comes first.

**Files:**
- Create: `src/audio/layering.ts`
- Create: `src/audio/layering.test.ts`
- Modify: `src/features/game/playSequence.ts`
- Modify: `src/features/game/playSequence.test.ts`

**Interfaces:**
- Consumes: `SubmitEvent`, `Bases`, `Outcome` from `src/engine/types.ts`; `motionScale()` from `src/features/game/timing.ts`; the `SequenceSfx` method set from Task 3.
- Produces (`src/audio/layering.ts`):
  - `type FieldBeat = 'pitchArrival' | 'contact' | 'wall' | 'leavesYard' | 'runScored'` (exactly the locked shape).
  - `CUES` (readonly tuple of the 13 cue method names), `type Cue`, `type OrganRiff`, `type SequenceSfx = Record<Cue, () => void> & { organ(riff: OrganRiff): void }`, `type PitchCall = 'whiff' | 'mitt'`.
  - `interface Layer { at: number; cue: Cue; beat?: FieldBeat }`: `at` is the fallback offset in ms before `motionScale`; `beat` is the field beat that fires it early.
  - `OFFSETS = { cheer: 120, cheerHr: 200, fanfare: 1200, ballWall: 700, umpCall: 250, groan: 300 }`.
  - `cheerFor(outcome: Outcome, runs: number): Cue | null`, `layersFor(event: SubmitEvent, call: PitchCall): Layer[]`, `pickPitchCall(rng?: () => number): PitchCall`, `ambienceFor(bases: Bases): 'low' | 'high'`.
  - `interface LayerDriver { onBeat(beat: FieldBeat): void; organCharge(): void }` and `driveLayers(layers: Layer[], sfx: SequenceSfx, scale: number, setTimer?: (fn: () => void, ms: number) => unknown): LayerDriver`. `organCharge()` plays `organ('charge')` at most once per driver; the `runScored` beat calls it too.
- Produces (`playSequence.ts`): `export type { FieldBeat, PitchCall, SequenceSfx } from '../../audio/layering'`, `interface SequenceOptions { pitchCall?: PitchCall; scale?: number; onBeatSink?: (onBeat: (beat: FieldBeat) => void) => void }`, `playSequence(field, sfx, announce, event, commentary, opts?: SequenceOptions)`. `SequenceSfx` itself is unchanged from Task 3.

- [ ] **Step 1: Write the failing layering test**

Create `src/audio/layering.test.ts`:

```ts
import { EMPTY_BASES } from '../engine/bases'
import type { Outcome, SubmitEvent } from '../engine/types'
import { CUES, OFFSETS, ambienceFor, cheerFor, driveLayers, layersFor, pickPitchCall, type Cue, type SequenceSfx } from './layering'

const word = { position: 0, text: 'cat', sentence: null, source: 'current' as const, sourceWordId: null, difficulty: 'medium' as const }
const done = (outcome: Outcome, runsScored = 0): SubmitEvent => ({
  kind: 'at-bat-complete', outcome, attempts: [], runsScored, basesBefore: EMPTY_BASES, basesAfter: EMPTY_BASES,
  outsAfter: 0, inningEnded: false, nextInning: 1, gameOver: false, correctSpelling: 'cat', word,
})
const strike: SubmitEvent = { kind: 'strike', strike: 1, attemptsSoFar: [] }
const cueList = (e: SubmitEvent, call: 'whiff' | 'mitt' = 'whiff') => layersFor(e, call).map((l) => l.cue)

function rec() {
  const calls: string[] = []
  const sfx = {
    ...Object.fromEntries(CUES.map((c) => [c, () => { calls.push(c) }])),
    organ: (r: string) => { calls.push(`organ(${r})`) },
  } as SequenceSfx
  return { calls, sfx }
}

describe('layersFor', () => {
  it('single: crack on contact, then cheer-small at +120', () => {
    expect(layersFor(done('single'), 'whiff')).toEqual([
      { at: 0, cue: 'crack', beat: 'contact' }, { at: OFFSETS.cheer, cue: 'cheerSmall' },
    ])
  })
  it('double adds ball-wall on the wall beat (fallback +700)', () => {
    expect(layersFor(done('double', 1), 'whiff')).toContainEqual({ at: 700, cue: 'ballWall', beat: 'wall' })
  })
  it('2+ runs on a hit gets cheer-big', () => {
    expect(cueList(done('single', 2))).toContain('cheerBig')
  })
  it('home run: crack-hr on contact, cheer-hr +200, fanfare +1200 or leavesYard', () => {
    expect(layersFor(done('homeRun', 1), 'whiff')).toEqual([
      { at: 0, cue: 'crackHomeRun', beat: 'contact' }, { at: 200, cue: 'cheerHr' }, { at: 1200, cue: 'fanfare', beat: 'leavesYard' },
    ])
  })
  it('strike with the mitt call: mitt on pitchArrival, then the umpire +250', () => {
    expect(layersFor(strike, 'mitt')).toEqual([{ at: 0, cue: 'mitt', beat: 'pitchArrival' }, { at: 250, cue: 'umpStrike' }])
  })
  it('strike with the whiff call: whiff now (no beat), then the umpire', () => {
    expect(layersFor(strike, 'whiff')).toEqual([{ at: 0, cue: 'whiff' }, { at: 250, cue: 'umpStrike' }])
  })
  it('strikeout: ump-strike3 then groan, no mitt', () => {
    expect(cueList(done('strikeout'), 'mitt')).toEqual(['umpStrike3', 'groan'])
  })
  it('walk: mitt on pitchArrival then ump-ball4', () => {
    expect(layersFor(done('walk', 1), 'whiff')).toEqual([{ at: 0, cue: 'mitt', beat: 'pitchArrival' }, { at: 250, cue: 'umpBall4' }])
  })
  it('ignored: nothing', () => {
    expect(layersFor({ kind: 'ignored', reason: 'blank' }, 'whiff')).toEqual([])
  })
  it('one-cheer rule: never more than one cheer, big sizes only on HR or 2+ runs', () => {
    for (const outcome of ['single', 'double', 'homeRun', 'walk', 'strikeout'] as Outcome[]) {
      for (let runs = 0; runs <= 4; runs++) {
        const cs = cueList(done(outcome, runs)).filter((c): c is Cue => c.startsWith('cheer'))
        expect(cs.length).toBeLessThanOrEqual(1)
        if (cs[0] === 'cheerBig' || cs[0] === 'cheerHr') expect(outcome === 'homeRun' || runs >= 2).toBe(true)
        expect(cheerFor(outcome, runs) ?? undefined).toBe(cs[0])
      }
    }
  })
})

describe('driveLayers', () => {
  it('fallback: offset 0 now, the rest after offset times scale', () => {
    vi.useFakeTimers()
    const r = rec()
    driveLayers(layersFor(done('homeRun', 1), 'whiff'), r.sfx, 1)
    expect(r.calls).toEqual(['crackHomeRun'])
    vi.advanceTimersByTime(200)
    expect(r.calls).toEqual(['crackHomeRun', 'cheerHr'])
    vi.advanceTimersByTime(1000)
    expect(r.calls).toEqual(['crackHomeRun', 'cheerHr', 'fanfare'])
    vi.useRealTimers()
  })
  it('reduced motion (0.25) shrinks offsets', () => {
    const setTimer = vi.fn()
    driveLayers(layersFor(done('homeRun', 1), 'whiff'), rec().sfx, 0.25, setTimer)
    expect(setTimer.mock.calls.map((c) => c[1])).toEqual([50, 300])
  })
  it('scale 0 (VITE_NO_ANIMATION) fires the whole stack synchronously in order', () => {
    const r = rec()
    driveLayers(layersFor(done('double', 2), 'whiff'), r.sfx, 0)
    expect(r.calls).toEqual(['crack', 'cheerBig', 'ballWall'])
  })
  it('a beat fires its cue early and the fallback timer does not fire it again', () => {
    vi.useFakeTimers()
    const r = rec()
    const d = driveLayers(layersFor(done('double'), 'whiff'), r.sfx, 1)
    vi.advanceTimersByTime(300)
    d.onBeat('wall')
    expect(r.calls.filter((c) => c === 'ballWall')).toHaveLength(1)
    vi.advanceTimersByTime(1000)
    expect(r.calls.filter((c) => c === 'ballWall')).toHaveLength(1)
    vi.useRealTimers()
  })
  it('a beat after its fallback already fired is ignored', () => {
    const r = rec()
    const d = driveLayers(layersFor(strike, 'mitt'), r.sfx, 0)
    d.onBeat('pitchArrival')
    expect(r.calls.filter((c) => c === 'mitt')).toHaveLength(1)
  })
  it('runScored plays organ-charge once; organCharge() after it is a no-op', () => {
    const r = rec()
    const d = driveLayers(layersFor(done('single', 2), 'whiff'), r.sfx, 0)
    d.onBeat('runScored')
    d.onBeat('runScored')
    d.organCharge()
    expect(r.calls.filter((c) => c === 'organ(charge)')).toHaveLength(1)
  })
  it('beats with no matching layer do nothing', () => {
    const r = rec()
    const d = driveLayers(layersFor(done('single'), 'whiff'), r.sfx, 0)
    const before = [...r.calls]
    d.onBeat('wall'); d.onBeat('leavesYard')
    expect(r.calls).toEqual(before)
  })
})

describe('pickPitchCall and ambienceFor', () => {
  it('pickPitchCall splits on 0.5', () => {
    expect(pickPitchCall(() => 0.1)).toBe('whiff')
    expect(pickPitchCall(() => 0.9)).toBe('mitt')
  })
  it('ambience is high with any runner on, low with bases empty', () => {
    expect(ambienceFor(EMPTY_BASES)).toBe('low')
    expect(ambienceFor({ first: false, second: true, third: false })).toBe('high')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/audio/layering.test.ts`
Expected: FAIL, `Failed to resolve import "./layering"`.

- [ ] **Step 3: Write `src/audio/layering.ts`**

```ts
/**
 * Timed SFX stacks per play (brief 5.3). Pure: given one SubmitEvent and the pitch call, returns the
 * cues, their fallback offsets, and the field beat (locked with Phase 1) that fires each one early.
 * Phase 3 can replay any event through driveLayers without the live game.
 */
import type { Bases, Outcome, SubmitEvent } from '../engine/types'

/** Locked with Grand Slam Spelling, 2026-10-30. The field calls onBeat(beat) when the scene hits it. */
export type FieldBeat = 'pitchArrival' | 'contact' | 'wall' | 'leavesYard' | 'runScored'

export const CUES = [
  'crack', 'crackHomeRun', 'whiff', 'mitt', 'umpStrike', 'umpStrike3', 'umpBall4', 'ballWall',
  'cheerSmall', 'cheerBig', 'cheerHr', 'fanfare', 'groan',
] as const
export type Cue = (typeof CUES)[number]
export type OrganRiff = 'charge' | 'inning' | 'walkup'
export type SequenceSfx = Record<Cue, () => void> & { organ(riff: OrganRiff): void }

/** Strike sound: decided in playSequence, never by scene animation. */
export type PitchCall = 'whiff' | 'mitt'

export interface Layer {
  /** Fallback offset in ms, before motionScale. */
  at: number
  cue: Cue
  /** Field beat that fires this cue early, when the field reports beats. */
  beat?: FieldBeat
}

export const OFFSETS = { cheer: 120, cheerHr: 200, fanfare: 1200, ballWall: 700, umpCall: 250, groan: 300 } as const

/** One-cheer rule (Jack Dalton spec): hits only; big sizes only on a home run or 2+ runs. */
export function cheerFor(outcome: Outcome, runs: number): Cue | null {
  if (outcome === 'homeRun') return 'cheerHr'
  if (outcome === 'single' || outcome === 'double') return runs >= 2 ? 'cheerBig' : 'cheerSmall'
  return null
}

export function layersFor(event: SubmitEvent, call: PitchCall): Layer[] {
  if (event.kind === 'ignored') return []
  if (event.kind === 'strike') {
    const first: Layer = call === 'mitt' ? { at: 0, cue: 'mitt', beat: 'pitchArrival' } : { at: 0, cue: 'whiff' }
    return [first, { at: OFFSETS.umpCall, cue: 'umpStrike' }]
  }
  switch (event.outcome) {
    case 'strikeout':
      return [{ at: 0, cue: 'umpStrike3' }, { at: OFFSETS.groan, cue: 'groan' }]
    case 'walk':
      return [{ at: 0, cue: 'mitt', beat: 'pitchArrival' }, { at: OFFSETS.umpCall, cue: 'umpBall4' }]
    case 'homeRun':
      return [
        { at: 0, cue: 'crackHomeRun', beat: 'contact' },
        { at: OFFSETS.cheerHr, cue: 'cheerHr' },
        { at: OFFSETS.fanfare, cue: 'fanfare', beat: 'leavesYard' },
      ]
    default: {
      const out: Layer[] = [{ at: 0, cue: 'crack', beat: 'contact' }]
      const cheer = cheerFor(event.outcome, event.runsScored)
      if (cheer) out.push({ at: OFFSETS.cheer, cue: cheer })
      if (event.outcome === 'double') out.push({ at: OFFSETS.ballWall, cue: 'ballWall', beat: 'wall' })
      return out
    }
  }
}

export interface LayerDriver {
  /** Hand this to the field. Unknown or repeated beats are ignored. */
  onBeat(beat: FieldBeat): void
  /** organ('charge') at most once per play (runScored beat or the run moment, whichever first). */
  organCharge(): void
}

/**
 * Fire each layer once: on its beat if the field reports it first, otherwise at `at * scale` ms.
 * Anything whose fallback rounds to 0 fires now, in order.
 */
export function driveLayers(
  layers: Layer[],
  sfx: SequenceSfx,
  scale: number,
  setTimer: (fn: () => void, ms: number) => unknown = setTimeout,
): LayerDriver {
  const fired = new Set<Layer>()
  let organDone = false
  const fire = (l: Layer) => {
    if (fired.has(l)) return
    fired.add(l)
    sfx[l.cue]()
  }
  for (const l of layers) {
    const ms = l.at * scale
    if (ms <= 0) fire(l)
    else setTimer(() => fire(l), ms)
  }
  const organCharge = () => {
    if (organDone) return
    organDone = true
    sfx.organ('charge')
  }
  return {
    onBeat(beat) {
      if (beat === 'runScored') return organCharge()
      for (const l of layers) if (l.beat === beat) fire(l)
    },
    organCharge,
  }
}

export function pickPitchCall(rng: () => number = Math.random): PitchCall {
  return rng() < 0.5 ? 'whiff' : 'mitt'
}

export function ambienceFor(bases: Bases): 'low' | 'high' {
  return bases.first || bases.second || bases.third ? 'high' : 'low'
}
```

`runScored` is only reported by the field when runs actually score, so the "only if any runs" rule holds on both paths: the beat path, and the existing `if (event.runsScored > 0)` run moment in `playSequence`.

- [ ] **Step 4: Run the layering test to verify it passes**

Run: `npx vitest run src/audio/layering.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing playSequence expectations**

In `src/features/game/playSequence.test.ts`:
- Add `const O = { pitchCall: 'whiff' as const, scale: 0 }` under the imports, and pass `O` as the sixth argument to every `playSequence(...)` call in the file.
- Replace the `cueNames` array from Task 3 with `import { CUES } from '../../audio/layering'` and `CUES.map(...)`.
- Add or replace these tests:

```ts
  it('a double with one run: pitch, crack, cheer-small, ball-wall, hit, organ charge', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'double', runsScored: 1 }), r.commentary, O)
    expect(r.calls).toEqual([
      'playPitch', 'sfx.crack', 'sfx.cheerSmall', 'sfx.ballWall', 'playHit', 'announce(DOUBLE!)', 'say(double)',
      'sfx.organ(charge)', 'announce(RUN SCORED!)', 'say(run)',
    ])
  })
  it('a strike never calls a hit', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, { kind: 'strike', strike: 1, attemptsSoFar: [] }, r.commentary, O)
    expect(r.calls).toEqual(['playPitch', 'sfx.whiff', 'sfx.umpStrike', 'playStrike(1)', 'announce(STRIKE ONE!)', 'say(strike1)'])
  })
  it('the pitch call picks mitt over whiff when asked', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, { kind: 'strike', strike: 2, attemptsSoFar: [] }, r.commentary, { ...O, pitchCall: 'mitt' })
    expect(r.calls.slice(0, 3)).toEqual(['playPitch', 'sfx.mitt', 'sfx.umpStrike'])
  })
  it('a home run that ends the game plays one fanfare, not two', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'homeRun', runsScored: 1, inningEnded: true, gameOver: true }), r.commentary, O)
    expect(r.calls.filter((c) => c === 'sfx.fanfare')).toHaveLength(1)
  })
  it('exactly one cheer on every hit', async () => {
    for (const outcome of ['single', 'double', 'homeRun'] as const) {
      for (const runsScored of [0, 1, 2, 4]) {
        const r = recorder()
        await playSequence(r.field, r.sfx, r.announce, done({ outcome, runsScored }), r.commentary, O)
        expect(r.calls.filter((c) => c.startsWith('sfx.cheer'))).toHaveLength(1)
      }
    }
  })
  it('hands an onBeat to the field and organ-charge plays once even if runScored also fires', async () => {
    const r = recorder()
    let onBeat: ((b: 'runScored') => void) | null = null
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'single', runsScored: 2 }), r.commentary, {
      ...O,
      onBeatSink: (fn) => { onBeat = fn; fn('runScored') },
    })
    expect(onBeat).not.toBeNull()
    expect(r.calls.filter((c) => c === 'sfx.organ(charge)')).toHaveLength(1)
  })
```

Keep the existing strikeout, walk, game-over, plural-runs, concurrency, ignored and booth-overlap tests, with `O` added.

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run src/features/game/playSequence.test.ts`
Expected: FAIL: no `sfx.cheerSmall` or `sfx.ballWall` on the double, the mitt test sees `sfx.whiff`, two fanfares on the game-ending home run, `onBeatSink` never called, and organ charge plays twice.

- [ ] **Step 7: Wire `playSequence.ts` to the layering module**

Replace the local `SequenceSfx` interface and imports:

```ts
import type { AnnounceEvent, CommentaryContext } from '../../audio/announcer'
import { driveLayers, layersFor, pickPitchCall, type FieldBeat, type PitchCall, type SequenceSfx } from '../../audio/layering'
import type { SubmitEvent } from '../../engine/types'
import type { FieldController } from '../../field/controller'
import { announcementsFor } from './announcements'
import { motionScale } from './timing'

export type { FieldBeat, PitchCall, SequenceSfx } from '../../audio/layering'

export interface SequenceOptions {
  /** Mitt or whiff on a strike. Decided here, never by the scene. */
  pitchCall?: PitchCall
  /** Multiplier for fallback offsets; defaults to motionScale(). */
  scale?: number
  /**
   * Where to hand this play's onBeat. Before Phase 1 lands nothing calls it and every cue uses its
   * fallback offset. After the rebase (Task 9 Step 4) the default hands it to the field's onBeat slot.
   */
  onBeatSink?: (onBeat: (beat: FieldBeat) => void) => void
}
```

Add `opts: SequenceOptions = {}` as the sixth parameter. After the `ignored` guard:

```ts
  const call = opts.pitchCall ?? pickPitchCall()
  let driver: ReturnType<typeof driveLayers> | null = null
  /** The contact stack for this play (layering.ts). Field beats fire cues early; offsets are the fallback. */
  const stack = () => {
    driver = driveLayers(layersFor(event, call), sfx, opts.scale ?? motionScale())
    opts.onBeatSink?.(driver.onBeat)
  }
```

Then:
- strike branch, strikeout case, walk case, default case: replace the direct `sfx.*` calls from Task 3 with `stack()`, before the `await Promise.all([...field...])` line so the field gets `onBeat` before it animates.
- run moment: replace `sfx.organ('charge')` with `driver ? driver.organCharge() : sfx.organ('charge')` (the `stack()` call always ran by then for an `at-bat-complete` event, so `driver` is set; the fallback only keeps TypeScript and future callers safe).
- game over: `if (event.outcome !== 'homeRun') sfx.fanfare()`.

Leave `sfx.organ('inning')` where it is.

- [ ] **Step 8: Run tests, typecheck, lint**

Run: `npx vitest run src/audio/layering.test.ts src/features/game/playSequence.test.ts && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/audio/layering.ts src/audio/layering.test.ts src/features/game/playSequence.ts src/features/game/playSequence.test.ts
git commit -m "feat(game): layered ballpark stacks synced to FieldBeat with motionScale fallback"
```

---

### Task 5: Baked words and booth lines on the voice bus; speechSynthesis duck-only

**Files:**
- Modify: `src/audio/word-audio.ts`, `src/audio/word-audio.test.ts`
- Modify: `src/audio/speech.ts`, `src/audio/speech.test.ts`
- Modify: `src/audio/announcer.ts`, `src/audio/announcer.test.ts`
- Modify: `src/features/game/GamePage.test.tsx`, `src/features/home/ListPickerPage.test.tsx` (speech mocks)

**Interfaces:**
- Consumes: `clips`, `ClipPlayer.load`, `ClipPlayer.play(url, { bus: 'voice', gain })`, `ClipPlayer.stopBus('voice')`, `ClipPlayer.duckStart/duckEnd` (Tasks 1 and 2); `fakeClipPlayer` (Task 2).
- Produces:
  - `word-audio.ts`: `enableBakedWordAudio(on: boolean, player?: ClipPlayer): void` where `ClipPlayer` is the one from `clips.ts` (the local HTMLAudioElement interface is deleted). `MAX_CLIP_MS` unchanged. Module init calls `setSpeechDucker(clips)`.
  - `speech.ts`: `interface SpeechDucker { duckStart(): void; duckEnd(): void }`, `setSpeechDucker(d: SpeechDucker | null): void`. `speak()` calls `duckStart()` once on the utterance's `onstart` and `duckEnd()` once when it finishes, only if it started.
  - `announcer.ts`: `ANNOUNCER_GAIN_DB: Record<'bigRed' | 'smoothEddie', number>` (both `0` until Task 7 measures); `sayAs` plays `player.play(url, { bus: 'voice', gain: 10 ** (ANNOUNCER_GAIN_DB[id] / 20) })`.

- [ ] **Step 1: Write the failing word-audio test**

Replace `src/audio/word-audio.test.ts` with:

```ts
import { fakeClipPlayer } from '../test/fakeClipPlayer'
import { clipHash } from './word-audio-profile'
import * as speech from './speech'

vi.mock('./speech', async (orig) => {
  const real = await orig<typeof import('./speech')>()
  return { ...real, speakWord: vi.fn(async () => {}), speakSlowly: vi.fn(async () => {}), speakSentence: vi.fn(async () => {}), stopSpeech: vi.fn(), setSpeechDucker: vi.fn() }
})
import { enableBakedWordAudio, sayWord } from './word-audio'

describe('sayWord', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    speech.setSpeechVolume(1)
  })

  it('plays the baked clip on the voice bus and skips browser speech', async () => {
    const p = fakeClipPlayer()
    enableBakedWordAudio(true, p)
    await sayWord('word', 'rhythm')
    expect(p.played).toEqual([{ url: `/audio/words/${await clipHash('word', 'rhythm')}.mp3`, bus: 'voice', gain: 1 }])
    expect(p.stopBus).toHaveBeenCalledWith('voice')
    expect(speech.speakWord).not.toHaveBeenCalled()
  })

  it('falls back to browser speech when the clip is missing, and does not refetch right away', async () => {
    const p = fakeClipPlayer({ missing: () => true })
    enableBakedWordAudio(true, p)
    await sayWord('slow', 'yacht')
    await sayWord('slow', 'yacht')
    expect(speech.speakSlowly).toHaveBeenCalledTimes(2)
    expect(p.load).toHaveBeenCalledTimes(1)
  })

  it('uses browser speech only in local mode', async () => {
    const p = fakeClipPlayer()
    enableBakedWordAudio(false, p)
    await sayWord('sentence', 'The cat sat.')
    expect(p.played).toHaveLength(0)
    expect(speech.speakSentence).toHaveBeenCalledWith('The cat sat.')
  })

  it('stays on the silent path when muted (browser speech handles mute)', async () => {
    speech.setSpeechVolume(0)
    const p = fakeClipPlayer()
    enableBakedWordAudio(true, p)
    await sayWord('word', 'cat')
    expect(p.played).toHaveLength(0)
    expect(speech.speakWord).toHaveBeenCalled()
  })

  it('a clip that never ends cannot lock input', async () => {
    vi.useFakeTimers()
    const p = fakeClipPlayer({ hold: true })
    enableBakedWordAudio(true, p)
    let done = false
    const run = sayWord('word', 'cat').then(() => { done = true })
    await vi.advanceTimersByTimeAsync(10_001)
    await run
    expect(done).toBe(true)
    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: Write the failing speech duck test**

Append inside `describe('speech wrapper', ...)` in `src/audio/speech.test.ts`:

```ts
  it('ducks the mixer while an utterance is actually speaking', async () => {
    const { speak, setSpeechDucker } = await import('./speech')
    const d = { duckStart: vi.fn(), duckEnd: vi.fn() }
    setSpeechDucker(d)
    const p = speak('baseball')
    expect(d.duckStart).not.toHaveBeenCalled()
    fake.spoken[0]!.onstart!()
    expect(d.duckStart).toHaveBeenCalledTimes(1)
    fake.spoken[0]!.onend!()
    await p
    expect(d.duckEnd).toHaveBeenCalledTimes(1)
  })

  it('never ends a duck it did not start (no onstart before error)', async () => {
    const { speak, setSpeechDucker } = await import('./speech')
    const d = { duckStart: vi.fn(), duckEnd: vi.fn() }
    setSpeechDucker(d)
    const p = speak('baseball')
    fake.spoken[0]!.onerror!({})
    await p
    expect(d.duckEnd).not.toHaveBeenCalled()
  })
```

- [ ] **Step 3: Write the failing announcer bus test**

Add `ANNOUNCER_GAIN_DB` to the `./announcer` import in `src/audio/announcer.test.ts`, and append inside the `sayAs` describe block (the one whose `beforeEach` builds `player`):

```ts
  it('plays booth lines on the voice bus at the announcer level-match gain', async () => {
    const p = sayAs('smoothEddie', 'double', ctx)
    await flush()
    expect(player.play).toHaveBeenCalledWith(expect.stringMatching(/smoothEddie\//), { bus: 'voice', gain: 10 ** (ANNOUNCER_GAIN_DB.smoothEddie / 20) })
    finish[0]!()
    await p
  })
```

- [ ] **Step 4: Run to verify they fail**

Run: `npx vitest run src/audio/word-audio.test.ts src/audio/speech.test.ts src/audio/announcer.test.ts`
Expected: FAIL: `enableBakedWordAudio` still builds `HTMLAudioElement` players (`p.played` empty), `setSpeechDucker is not a function`, `ANNOUNCER_GAIN_DB` not exported.

- [ ] **Step 5: Implement `speech.ts` ducking**

Add near the top of `src/audio/speech.ts`:

```ts
/** Browser speech cannot enter the WebAudio graph; it only holds the mixer duck while it talks. */
export interface SpeechDucker {
  duckStart(): void
  duckEnd(): void
}
let ducker: SpeechDucker | null = null
export function setSpeechDucker(d: SpeechDucker | null): void {
  ducker = d
}
```

In `speak()`, replace `if (opts.onStart) u.onstart = () => opts.onStart?.()` with:

```ts
    let ducked = false
    u.onstart = () => {
      if (!ducked) {
        ducked = true
        ducker?.duckStart()
      }
      opts.onStart?.()
    }
```

and inside `finish`, right after `done = true`, add:

```ts
      if (ducked) ducker?.duckEnd()
```

- [ ] **Step 6: Rewrite `src/audio/word-audio.ts`**

```ts
/**
 * Spelling-word playback: the server's baked Edge TTS clip first (on the mixer's voice bus, so the
 * crowd ducks under it and it gets the stadium reverb), the browser's voice as fallback (duck only).
 * Only the API backend has clips; local mode leaves this disabled and always uses browser speech.
 */
import { clips, type ClipPlayer } from './clips'
import { getSpeechVolume, setSpeechDucker, speakSentence, speakSlowly, speakWord, stopSpeech } from './speech'
import { clipHash, clipUrl, type ClipKind } from './word-audio-profile'

setSpeechDucker(clips)

let enabled = false
let player: ClipPlayer = clips
/** Hashes the server said it doesn't have yet; retried after a while (they may be baking). */
const missing = new Map<string, number>()
const MISSING_RETRY_MS = 60_000
/** A clip that never reports ended can't lock the input. */
export const MAX_CLIP_MS = 10_000

export function enableBakedWordAudio(on: boolean, p?: ClipPlayer): void {
  enabled = on
  if (p) player = p
  missing.clear()
}

const fallback: Record<ClipKind, (t: string) => Promise<void>> = { word: speakWord, slow: speakSlowly, sentence: speakSentence }

/** True if the clip loaded and played (or hit the cap); false if it is missing or undecodable. */
async function playClip(url: string): Promise<boolean> {
  player.stopBus('voice') // a repeat tap cuts the previous word (and any booth line) so words stay clear
  try {
    await player.load(url)
  } catch {
    return false
  }
  await Promise.race([player.play(url, { bus: 'voice' }), new Promise<void>((r) => setTimeout(r, MAX_CLIP_MS))])
  return true
}

/** Say a spelling word (normal or slow) or its sentence. Resolves when playback ends. */
export async function sayWord(kind: ClipKind, text: string): Promise<void> {
  if (enabled && getSpeechVolume() > 0) {
    try {
      const hash = await clipHash(kind, text)
      const missedAt = missing.get(hash)
      if (missedAt === undefined || Date.now() - missedAt > MISSING_RETRY_MS) {
        stopSpeech()
        if (await playClip(clipUrl(hash))) {
          missing.delete(hash)
          return
        }
        missing.set(hash, Date.now())
      }
    } catch {
      /* no Web Crypto (insecure origin): fall through */
    }
  }
  return fallback[kind](text).catch(() => undefined)
}
```

Then run `rg -n "enableBakedWordAudio" src` and confirm no production caller passes the old `(url) => HTMLAudioElement` factory; they pass only the boolean.

- [ ] **Step 7: Put booth lines on the voice bus in `src/audio/announcer.ts`**

Above `sayAs` add:

```ts
/** Per-booth trim so Big Red and Smooth Eddie sit within 1 dB of each other (measured in Task 7). */
export const ANNOUNCER_GAIN_DB: Record<Exclude<AnnouncerId, 'quiet'>, number> = { bigRed: 0, smoothEddie: 0 }
```

In `sayAs`, replace `await player.play(url)` with:

```ts
    await player.play(url, { bus: 'voice', gain: 10 ** (ANNOUNCER_GAIN_DB[id as Exclude<AnnouncerId, 'quiet'>] / 20) })
```

- [ ] **Step 8: Add `setSpeechDucker` to the other `speech` mocks**

In `src/features/game/GamePage.test.tsx` and `src/features/home/ListPickerPage.test.tsx`, add these keys to the `vi.mock('../../audio/speech', () => ({ ... }))` object where missing: `setSpeechDucker: vi.fn(),`, `getSpeechVolume: () => 1,`, `stopSpeech: vi.fn(),`. `word-audio.ts` calls `setSpeechDucker` at import, so the module mock must provide it.

- [ ] **Step 9: Run tests, typecheck, lint**

Run: `npx vitest run src/audio src/features && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/audio/word-audio.ts src/audio/word-audio.test.ts src/audio/speech.ts src/audio/speech.test.ts src/audio/announcer.ts src/audio/announcer.test.ts src/features/game/GamePage.test.tsx src/features/home/ListPickerPage.test.tsx
git commit -m "feat(audio): words and booth on the voice bus; browser speech holds the duck"
```

---

### Task 6: process-audio script, audio-src layout, credits template

**Files:**
- Create: `scripts/process-audio.mjs`
- Create: `src/audio/process-audio.test.ts`
- Create: `audio-src/README.md`
- Modify: `package.json` (scripts)
- Modify: `AUDIO-CREDITS.md` (new header and table format; legacy rows kept until Task 8)

**Interfaces:**
- Consumes: nothing at runtime. The output layout must match `SFX_POOLS`, `AMBIENCE_URLS` (Task 3) and `REVERB_IR_URL` (Task 1).
- Produces:
  - `npm run process-audio` regenerates `public/audio/sfx/<pool>/<name>.ogg` and `public/audio/ir/stadium.ogg` from `audio-src/`.
  - Flags: `--dry-run` prints the job list as JSON and writes nothing; `--src <dir>` (default `audio-src`); `--out <dir>` (default `public/audio`); `--measure <dir>` prints mean integrated LUFS per first-level subfolder as JSON and exits.
  - Job shape: `{ in: string, out: string, filters: string }`.
  - After a real run, exits 1 if `public/audio/sfx/` is 4 MB (4 * 1024 * 1024 bytes) or more.

- [ ] **Step 1: Write the failing dry-run test**

Create `src/audio/process-audio.test.ts`:

```ts
// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function tree(files: string[]): string {
  const root = mkdtempSync(join(tmpdir(), 'audio-src-'))
  for (const f of files) {
    mkdirSync(join(root, f, '..'), { recursive: true })
    writeFileSync(join(root, f), '')
  }
  return root
}
const run = (src: string, out: string) =>
  JSON.parse(execFileSync('node', ['scripts/process-audio.mjs', '--dry-run', '--src', src, '--out', out], { encoding: 'utf8' })) as Array<{ in: string; out: string; filters: string }>

describe('process-audio --dry-run', () => {
  it('maps every master to an ogg under out/sfx/<pool>/ with trim and loudnorm', () => {
    const src = tree(['sfx/crack/crack-1.wav', 'sfx/crack/crack-2.flac', 'sfx/mitt/mitt-1.wav', 'sfx/mitt/notes.txt'])
    const jobs = run(src, '/tmp/out')
    expect(jobs.map((j) => j.out)).toEqual(['/tmp/out/sfx/crack/crack-1.ogg', '/tmp/out/sfx/crack/crack-2.ogg', '/tmp/out/sfx/mitt/mitt-1.ogg'])
    for (const j of jobs) {
      expect(j.filters).toContain('silenceremove')
      expect(j.filters).toContain('loudnorm=I=-16')
    }
  })

  it('ambience keeps its loop points (no silence trim)', () => {
    const src = tree(['sfx/ambience/ambience-low.wav'])
    const [job] = run(src, '/tmp/out')
    expect(job!.out).toBe('/tmp/out/sfx/ambience/ambience-low.ogg')
    expect(job!.filters).not.toContain('silenceremove')
    expect(job!.filters).toContain('loudnorm=I=-16')
  })

  it('the stadium IR is converted without trim or loudnorm', () => {
    const src = tree(['ir/stadium.wav'])
    const [job] = run(src, '/tmp/out')
    expect(job!.out).toBe('/tmp/out/ir/stadium.ogg')
    expect(job!.filters).toBe('anull')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/audio/process-audio.test.ts`
Expected: FAIL, `Cannot find module '.../scripts/process-audio.mjs'`.

- [ ] **Step 3: Write `scripts/process-audio.mjs`**

```js
#!/usr/bin/env node
/**
 * Regenerate public/audio/sfx/ and public/audio/ir/ from CC0 masters in audio-src/ (brief 5.1).
 *
 *   audio-src/sfx/<pool>/<pool>-<n>.<wav|flac|ogg|mp3|aif|aiff>  to public/audio/sfx/<pool>/<pool>-<n>.ogg
 *   audio-src/sfx/ambience/ambience-{low,high}.<ext>              same, no silence trim (loop points)
 *   audio-src/ir/stadium.<ext>                                    to public/audio/ir/stadium.ogg, re-encode only
 *
 * Processing: trim leading silence, loudnorm to -16 LUFS, mono, 44.1 kHz, Ogg Vorbis q5.
 * Usage: npm run process-audio [-- --dry-run] [--src audio-src] [--out public/audio] [--measure <dir>]
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, extname, join, relative } from 'node:path'

const EXT = new Set(['.wav', '.flac', '.ogg', '.mp3', '.aif', '.aiff'])
const TRIM = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02'
const LOUD = 'loudnorm=I=-16:TP=-1.5:LRA=11'
const ENCODE = ['-ac', '1', '-ar', '44100', '-c:a', 'libvorbis', '-q:a', '5']
const MAX_SFX_BYTES = 4 * 1024 * 1024

const argv = process.argv.slice(2)
const flag = (name) => argv.includes(name)
const opt = (name, dflt) => {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt
}

const audioFiles = (dir) =>
  existsSync(dir) ? readdirSync(dir).sort().filter((f) => EXT.has(extname(f).toLowerCase())) : []

function plan(srcRoot, outRoot) {
  const jobs = []
  const sfxRoot = join(srcRoot, 'sfx')
  if (existsSync(sfxRoot)) {
    for (const pool of readdirSync(sfxRoot).sort()) {
      const dir = join(sfxRoot, pool)
      if (!statSync(dir).isDirectory()) continue
      for (const f of audioFiles(dir)) {
        jobs.push({
          in: join(dir, f),
          out: join(outRoot, 'sfx', pool, `${basename(f, extname(f))}.ogg`),
          filters: pool === 'ambience' ? LOUD : `${TRIM},${LOUD}`,
        })
      }
    }
  }
  const ir = audioFiles(join(srcRoot, 'ir')).find((f) => basename(f, extname(f)) === 'stadium')
  if (ir) jobs.push({ in: join(srcRoot, 'ir', ir), out: join(outRoot, 'ir', 'stadium.ogg'), filters: 'anull' })
  return jobs
}

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

const dirBytes = (dir) => (existsSync(dir) ? walk(dir).reduce((n, p) => n + statSync(p).size, 0) : 0)

/** Integrated loudness (LUFS) of one file via ffmpeg loudnorm analysis. */
function lufs(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], { encoding: 'utf8' })
  return Number(JSON.parse(r.stderr.slice(r.stderr.lastIndexOf('{'))).input_i)
}

function measure(dir) {
  const groups = {}
  for (const f of walk(dir).filter((p) => EXT.has(extname(p).toLowerCase()))) {
    const key = relative(dir, f).split('/')[0]
    ;(groups[key] ??= []).push(lufs(f))
  }
  const out = {}
  for (const [k, v] of Object.entries(groups)) out[k] = Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10
  return out
}

const measureDir = opt('--measure', null)
if (measureDir) {
  console.log(JSON.stringify(measure(measureDir), null, 2))
  process.exit(0)
}

const out = opt('--out', 'public/audio')
const jobs = plan(opt('--src', 'audio-src'), out)

if (flag('--dry-run')) {
  console.log(JSON.stringify(jobs))
  process.exit(0)
}

for (const j of jobs) {
  mkdirSync(dirname(j.out), { recursive: true })
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', j.in, '-af', j.filters, ...ENCODE, j.out], { stdio: 'inherit' })
  console.log(`ok  ${j.out}`)
}

const bytes = dirBytes(join(out, 'sfx'))
console.log(`public/audio/sfx: ${(bytes / 1024 / 1024).toFixed(2)} MB`)
if (bytes >= MAX_SFX_BYTES) {
  console.error('public/audio/sfx is 4 MB or more; shorten or drop variants')
  process.exit(1)
}
```

- [ ] **Step 4: Add the npm script**

In `package.json` `"scripts"`, after `"bake-audio"`, add:

```json
    "process-audio": "node scripts/process-audio.mjs"
```

- [ ] **Step 5: Create `audio-src/README.md`**

```markdown
# audio-src

CC0 masters for `npm run process-audio`. Never edit files in `public/audio/sfx/` by hand; change the
master here and rerun the script.

- `sfx/<pool>/<pool>-<n>.<wav|flac|ogg|mp3|aif|aiff>`: one master per variant. `<pool>` matches a key of
  `POOL_SPEC` in `src/audio/sfx.ts` and `<n>` runs from 1 to that pool's `n`.
- `sfx/ambience/ambience-low.<ext>` and `ambience-high.<ext>`: seamless 30 to 60 second loops. Cut them
  on a zero crossing; the script does not trim them.
- `ir/stadium.<ext>`: short stadium or large outdoor impulse response for the voice bus reverb.
- Every file here has a row in `/AUDIO-CREDITS.md` before it is committed.
- Slice, fade or pitch edits happen before the file lands here; record them in the credits row.
```

- [ ] **Step 6: Replace the `AUDIO-CREDITS.md` header with the new format**

Replace everything above the existing table with:

```markdown
# Audio credits

Every file in `public/audio/sfx/` and `public/audio/ir/` is CC0 1.0 or public domain. Masters live in
`audio-src/`; `npm run process-audio` regenerates the shipped files (trim leading silence, loudnorm to
-16 LUFS, mono, Ogg Vorbis q5; ambience is not trimmed; the IR is only re-encoded).

Pools marked "pending, CC0 search failed" are stubs with no files; the game skips that layer.

## Ballpark sound (Phase 2)

| Folder | File | Source file | Source URL | Author | License | Processing |
|---|---|---|---|---|---|---|

## Legacy (deleted in Phase 2 Task 8)
```

Keep the existing Kenney and OpenGameArt rows under "Legacy" until Task 8 deletes their files.

- [ ] **Step 7: Run tests and lint**

Run: `npx vitest run src/audio/process-audio.test.ts && npm run lint`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add scripts/process-audio.mjs src/audio/process-audio.test.ts audio-src/README.md package.json AUDIO-CREDITS.md
git commit -m "build(audio): npm run process-audio regenerates SFX from audio-src masters"
```

---

### Task 7: Preload, settings (mute vs Quiet Booth), GamePage ambience, booth level match

**Files:**
- Modify: `src/audio/preload.ts`, `src/audio/preload.test.ts`
- Modify: `src/audio/settings.ts`, `src/audio/settings.test.ts`
- Modify: `src/features/game/GamePage.tsx`, `src/features/game/GamePage.test.tsx`
- Modify: `src/audio/announcer.ts` (`ANNOUNCER_GAIN_DB` values)

**Interfaces:**
- Consumes: `ALL_SFX_URLS`, `sfx.ambience`, `sfx.enabled` (Task 3); `REVERB_IR_URL` (Task 1); `ambienceFor` (Task 4); `ANNOUNCER_GAIN_DB` (Task 5); `npm run process-audio -- --measure` (Task 6).
- Produces:
  - `preloadAudio` warms `[...ALL_SFX_URLS, REVERB_IR_URL, ...announcerUrls]`, and still warms the base list when the manifest fetch fails.
  - `settings.ts` exports `applyAudioSettings(s: AudioSettings): void` (the old private `apply`).
  - `GamePage` calls `sfx.ambience(ambienceFor(fieldBases ?? EMPTY_BASES))` whenever the shown bases change and `sfx.ambience('off')` on unmount. No other component calls `ambience`.

- [ ] **Step 1: Write the failing tests**

In `src/audio/preload.test.ts`, import `REVERB_IR_URL` from `./mixer` and change the two expectations to:

```ts
    expect(spy).toHaveBeenCalledWith([...ALL_SFX_URLS, REVERB_IR_URL])
```

```ts
    expect(spy).toHaveBeenCalledWith([...ALL_SFX_URLS, REVERB_IR_URL, '/a.mp3'])
```

Append to `src/audio/settings.test.ts` (add `applyAudioSettings` to the existing `./settings` import and `import { sfx } from './sfx'`):

```ts
describe('applyAudioSettings', () => {
  const base = { volume: 1, muted: false, sfx: true, announcer: 'bigRed' as const }
  it('Quiet Booth keeps SFX and ambience on', () => {
    applyAudioSettings({ ...base, announcer: 'quiet' })
    expect(sfx.enabled).toBe(true)
  })
  it('speaker mute turns SFX and ambience off', () => {
    applyAudioSettings({ ...base, muted: true })
    expect(sfx.enabled).toBe(false)
    applyAudioSettings(base)
    expect(sfx.enabled).toBe(true)
  })
})
```

Append to the `describe('GamePage', ...)` block in `src/features/game/GamePage.test.tsx` (add `cleanup` to the `@testing-library/react` import and `import { sfx } from '../../audio/sfx'`):

```ts
  it('starts the crowd bed low on mount and stops it on unmount', async () => {
    const amb = vi.spyOn(sfx, 'ambience')
    await setup(['pterodactyl', 'xylophone'])
    await screen.findByRole('textbox')
    expect(amb).toHaveBeenCalledWith('low')
    cleanup()
    expect(amb).toHaveBeenLastCalledWith('off')
    amb.mockRestore()
  })
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/audio/preload.test.ts src/audio/settings.test.ts src/features/game/GamePage.test.tsx`
Expected: FAIL: preload call lacks the IR URL, `applyAudioSettings` is not exported, `ambience` never called.

- [ ] **Step 3: Implement**

`src/audio/preload.ts`:

```ts
import type { AnnouncerId } from './announcer'
import { clips } from './clips'
import { loadManifest } from './manifest'
import { REVERB_IR_URL } from './mixer'
import { ALL_SFX_URLS } from './sfx'

/** Warm SFX, ambience, the voice IR and the chosen announcer's clips. Never rejects. */
export async function preloadAudio(announcer: AnnouncerId, fetchImpl?: typeof fetch): Promise<void> {
  const base = [...ALL_SFX_URLS, REVERB_IR_URL]
  try {
    const manifest = await loadManifest(fetchImpl)
    const announcerUrls = Object.values(manifest.clips[announcer] ?? {}).flat().filter((u): u is string => typeof u === 'string')
    await clips.preload([...base, ...announcerUrls])
  } catch {
    await clips.preload(base).catch(() => {})
  }
}
```

`src/audio/settings.ts`: rename `function apply(` to `export function applyAudioSettings(`, update the `useEffect` call to `applyAudioSettings(settings)`, and put this doc line above it:

```ts
/** Speaker mute silences everything (ambience too). Quiet Booth (announcer 'quiet') removes only voices. */
```

The body stays as is: `sfx.enabled = s.sfx && !s.muted` now also stops or restores ambience through the setter from Task 3.

`src/features/game/GamePage.tsx`: add imports

```ts
import { ambienceFor } from '../../audio/layering'
import { EMPTY_BASES } from '../../engine/bases'
```

and after the existing `useEffect` that seeds `fieldBases`, add:

```ts
  // Crowd bed: low with the bases empty, high with anyone on, off when leaving the game screen.
  useEffect(() => {
    sfx.ambience(ambienceFor(fieldBases ?? EMPTY_BASES))
  }, [fieldBases])
  useEffect(() => () => sfx.ambience('off'), [])
```

`fieldBases` updates only after the play animation finishes (see `onSubmit`), so the bed swaps when the runners land, not mid-swing. Leaving for `/game/:id/results` unmounts `GamePage`, which stops the bed.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/audio/preload.test.ts src/audio/settings.test.ts src/features/game/GamePage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Measure and level-match the booth voices**

Run: `npm run process-audio -- --measure public/audio/announcers`
Expected output shape: `{ "bigRed": -16.4, "smoothEddie": -18.1 }` (real numbers will differ).

If the two values differ by more than 1.0, raise the quieter announcer's trim to match the louder one, rounded to 0.5 dB. Example for the output above (Eddie 1.7 dB quieter):

```ts
export const ANNOUNCER_GAIN_DB: Record<Exclude<AnnouncerId, 'quiet'>, number> = { bigRed: 0, smoothEddie: 1.5 }
```

If they are within 1.0 dB, leave both at `0`.

- [ ] **Step 6: Run the audio and game suites, typecheck, lint**

Run: `npx vitest run src/audio src/features && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 7: Commit**

Put the two measured LUFS values from Step 5 in the message:

```bash
git add src/audio/preload.ts src/audio/preload.test.ts src/audio/settings.ts src/audio/settings.test.ts src/features/game/GamePage.tsx src/features/game/GamePage.test.tsx src/audio/announcer.ts
git commit -m "feat(audio): preload new pools, ambience lifecycle in GamePage, booth level match" -m "Measured: bigRed <value> LUFS, smoothEddie <value> LUFS"
```

---

### Task 8: CC0 clip sourcing, stub policy, file and credits guard

**Files:**
- Create: `src/audio/sfx-files.test.ts`
- Create: `audio-src/sfx/<pool>/*`, `audio-src/sfx/ambience/*`, `audio-src/ir/stadium.wav`
- Replace: `public/audio/sfx/**`; create `public/audio/ir/stadium.ogg`
- Delete: `public/audio/sfx/cheer/`, `public/audio/sfx/strikeBuzz/`, `public/audio/sfx/walkChime/`, and every old file under `crack/`, `whiff/`, `groan/`, `fanfare/`, `organ-charge/`, `organ-inning/`, `organ-walkup/`
- Modify: `src/audio/sfx.ts` (`POOL_SPEC` `n` values for stubs or short pools)
- Modify: `AUDIO-CREDITS.md`

**Interfaces:**
- Consumes: `POOL_SPEC`, `ALL_SFX_URLS` (Task 3); `REVERB_IR_URL` (Task 1); `npm run process-audio` (Task 6).
- Produces: files on disk that match `POOL_SPEC` exactly, and a credits table the guard test checks. A pool with `n: 0` is a stub.

- [ ] **Step 1: Write the failing guard test**

Create `src/audio/sfx-files.test.ts`:

```ts
// @vitest-environment node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { REVERB_IR_URL } from './mixer'
import { ALL_SFX_URLS, POOL_SPEC } from './sfx'

const PUBLIC = join(process.cwd(), 'public')
const SFX_DIR = join(PUBLIC, 'audio', 'sfx')
const credits = readFileSync(join(process.cwd(), 'AUDIO-CREDITS.md'), 'utf8')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}
const onDisk = () => walk(SFX_DIR).map((p) => `/${relative(PUBLIC, p).split('\\').join('/')}`).sort()

describe('shipped SFX files', () => {
  it('match POOL_SPEC and the ambience loops exactly (no strays, no gaps)', () => {
    expect(onDisk()).toEqual([...ALL_SFX_URLS].sort())
  })

  it('total under 4 MB', () => {
    const bytes = walk(SFX_DIR).reduce((n, p) => n + statSync(p).size, 0)
    expect(bytes).toBeLessThan(4 * 1024 * 1024)
  })

  it('every file has a credits row with a CC0 or public domain license', () => {
    const ir = existsSync(join(PUBLIC, REVERB_IR_URL)) ? [REVERB_IR_URL] : []
    for (const url of [...ALL_SFX_URLS, ...ir]) {
      const [folder, file] = url.split('/').slice(-2)
      const row = credits.split('\n').find((l) => l.startsWith(`| ${folder}/ | ${file} |`))
      expect(row, `credits row for ${folder}/${file}`).toBeDefined()
      expect(row).toMatch(/CC0|public domain/i)
    }
  })

  it('every stub pool is listed as pending', () => {
    for (const [pool, { n }] of Object.entries(POOL_SPEC)) {
      if (n === 0) expect(credits).toContain(`| ${pool}/ | (none) | pending, CC0 search failed |`)
    }
  })

  it('no Kenney, UI or jingle pack sources remain', () => {
    expect(credits).not.toMatch(/kenney|interface-sounds|music-jingles|## Legacy/i)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/audio/sfx-files.test.ts`
Expected: FAIL: stray `cheer/`, `strikeBuzz/`, `walkChime/` files, missing `mitt/`, `ump-*`, `cheer-*`, `ambience/` files, Kenney rows present.

- [ ] **Step 3: Source CC0 masters**

For each pool in `POOL_SPEC`, the two ambience loops and the IR, search in this order and stop at the first good clip:

1. freesound.org with the license filter set to "Creative Commons 0". Search terms: `baseball bat hit wood`, `bat crack`, `baseball glove catch`, `catcher mitt`, `bat swing whoosh`, `umpire strike`, `umpire ball four`, `stadium crowd cheer`, `crowd groan aww`, `stadium crowd ambience loop`, `hammond organ charge`, `ballpark organ`, `stadium horn`, `ball hits wall`, `stadium impulse response`, `outdoor impulse response`.
2. opengameart.org with the "CC0" license filter.
3. Sonniss GDC bundles, only where the bundle license explicitly allows redistribution inside an app.

Reject: CC-BY, CC-BY-NC, CC-BY-SA, any "attribution required" license, anything cut from video, any real broadcast or real stadium PA announcer recording, any umpire clip with words beyond the call itself.

For every accepted clip:
- Keep the original download outside the repo; its URL goes in the credits row.
- Edit (slice, fade, pitch) into `audio-src/sfx/<pool>/<pool>-<n>.wav` (or `audio-src/ir/stadium.wav`).
- Add one row to the "Ballpark sound (Phase 2)" table, for example:

```markdown
| mitt/ | mitt-1.ogg | glove_pop_03.wav (0.0 to 0.4 s) | https://freesound.org/people/<author>/sounds/<id>/ | <author> | CC0 1.0 | trim, loudnorm -16 LUFS, mono, q5 |
```

The IR row uses folder `ir/` and file `stadium.ogg`. If no CC0 IR is good enough, ship no IR (Task 1 already falls back to a dry voice bus) and say "voice bus dry, no CC0 IR found" in the PR.

- [ ] **Step 4: Apply the stub policy**

For any pool with no acceptable CC0 clip after all three sources:
- Set its `n` to `0` in `POOL_SPEC` in `src/audio/sfx.ts`.
- Add a credits row (real pool name): `| ump-strike/ | (none) | pending, CC0 search failed | searched: freesound CC0, OpenGameArt CC0, Sonniss GDC | | | |`.
- List it in the PR body under "Stubbed pools".

For a pool with fewer good variants than its target `n` (minimum 2), lower `n` to the number found. Never pad with a repeated file. Never fall back to an old Kenney clip or a synthesized beep.

- [ ] **Step 5: Delete the old files and legacy rows, then process**

```bash
git rm -r public/audio/sfx/cheer public/audio/sfx/strikeBuzz public/audio/sfx/walkChime
git rm public/audio/sfx/crack/*.ogg public/audio/sfx/whiff/*.ogg public/audio/sfx/groan/*.ogg public/audio/sfx/fanfare/*.ogg public/audio/sfx/organ-charge/*.ogg public/audio/sfx/organ-inning/*.ogg public/audio/sfx/organ-walkup/*.ogg
npm run process-audio
```

Delete the "## Legacy" heading and every row under it from `AUDIO-CREDITS.md`.

Expected: one `ok` line per master, then `public/audio/sfx: N.NN MB` with N.NN below 4.00, exit 0.

- [ ] **Step 6: Run the guard and the full suite**

Run: `npx vitest run src/audio/sfx-files.test.ts && npm test`
Expected: PASS. If the size test fails, shorten tails (cheers and organ longer than 3 s) or drop to the minimum variant counts, then rerun `npm run process-audio`.

- [ ] **Step 7: Listen**

Run `npm run dev`, start a practice game with sound on, and play at least one strike, strikeout, walk, single, double and home run. Check by ear: no clipping, no leading silence, ambience loops with no audible seam, cheers never bury the next word. Fix by editing the master in `audio-src/` and rerunning `npm run process-audio`.

- [ ] **Step 8: Commit**

```bash
git add audio-src public/audio AUDIO-CREDITS.md src/audio/sfx.ts src/audio/sfx-files.test.ts
git commit -m "feat(audio): CC0 ballpark clips replace Kenney pools; stubs listed in credits"
```

---

### Task 9: Integration tests, FieldBeat rebase, gates, Martin handoff

**Files:**
- Create: `src/features/game/ballparkSound.test.ts`
- Modify on rebase: `src/features/game/playSequence.ts` (default `onBeatSink`), `src/features/game/playSequence.test.ts`

**Interfaces:**
- Consumes: `createClipPlayer` (Tasks 1 and 2), `Sfx`, `AMBIENCE_URLS`, `POOL_SPEC` (Task 3), `playSequence`, `SequenceOptions`, `FieldBeat`, `ambienceFor` (Task 4), `DUCK_GAIN` (Task 1), `fakeClipPlayer` (Task 2). After the rebase: Phase 1's `onBeat?: (beat: FieldBeat) => void` on the field side.
- Produces: one end-to-end test file; after the rebase, `playSequence` hands its `onBeat` to the field by default.

- [ ] **Step 1: Write the integration test**

Create `src/features/game/ballparkSound.test.ts`:

```ts
import { createClipPlayer } from '../../audio/clips'
import { ambienceFor, type FieldBeat } from '../../audio/layering'
import { DUCK_GAIN } from '../../audio/mixer'
import { AMBIENCE_URLS, POOL_SPEC, Sfx } from '../../audio/sfx'
import { EMPTY_BASES } from '../../engine/bases'
import type { SubmitEvent } from '../../engine/types'
import { fakeClipPlayer } from '../../test/fakeClipPlayer'
import { playSequence } from './playSequence'

const word = { position: 0, text: 'cat', sentence: null, source: 'current' as const, sourceWordId: null, difficulty: 'medium' as const }
const done = (over: Partial<Extract<SubmitEvent, { kind: 'at-bat-complete' }>>): SubmitEvent => ({
  kind: 'at-bat-complete', outcome: 'double', attempts: [], runsScored: 0, basesBefore: EMPTY_BASES, basesAfter: EMPTY_BASES,
  outsAfter: 0, inningEnded: false, nextInning: 1, gameOver: false, correctSpelling: 'cat', word, ...over,
})
const quiet = async () => {}
const O = { pitchCall: 'mitt' as const, scale: 0 }
const folders = (p: ReturnType<typeof fakeClipPlayer>) => p.played.map((x) => x.url.split('/')[3])
const live = (pool: keyof typeof POOL_SPEC) => POOL_SPEC[pool].n > 0

describe('ballpark sound end to end', () => {
  it('home run: crack-hr, cheer-hr, fanfare, organ charge, cheers on the crowd bus', async () => {
    const p = fakeClipPlayer()
    await playSequence(null, new Sfx(p), quiet, done({ outcome: 'homeRun', runsScored: 2 }), quiet, O)
    expect(folders(p)).toEqual((['crack-hr', 'cheer-hr', 'fanfare', 'organ-charge'] as const).filter(live))
    expect(p.played.filter((x) => x.url.includes('cheer')).every((x) => x.bus === 'crowd')).toBe(true)
  })

  it('strike: mitt and umpire, never a UI beep', async () => {
    const p = fakeClipPlayer()
    await playSequence(null, new Sfx(p), quiet, { kind: 'strike', strike: 1, attemptsSoFar: [] }, quiet, O)
    expect(folders(p)).toEqual((['mitt', 'ump-strike'] as const).filter(live))
  })

  it('a stubbed umpire pool leaves the rest of the stack intact', async () => {
    const p = fakeClipPlayer()
    const spec = { ...POOL_SPEC, 'ump-strike3': { n: 0, bus: 'sfx' as const } }
    await playSequence(null, new Sfx(p, Math.random, spec), quiet, done({ outcome: 'strikeout' }), quiet, O)
    expect(folders(p)).toEqual((['groan'] as const).filter(live))
  })

  it('field beats drive the double at real speed: wall fires on the beat, not the 700 ms fallback', async () => {
    vi.useFakeTimers()
    const p = fakeClipPlayer()
    let beat: ((b: FieldBeat) => void) | null = null
    const run = playSequence(null, new Sfx(p), quiet, done({ outcome: 'double', runsScored: 1 }), quiet, {
      pitchCall: 'whiff', scale: 1, onBeatSink: (fn) => { beat = fn },
    })
    await vi.advanceTimersByTimeAsync(300)
    beat!('wall')
    beat!('runScored')
    await vi.advanceTimersByTimeAsync(1000)
    await run
    expect(folders(p).filter((f) => f === 'ball-wall')).toHaveLength(live('ball-wall') ? 1 : 0)
    expect(folders(p).filter((f) => f === 'organ-charge')).toHaveLength(live('organ-charge') ? 1 : 0)
    vi.useRealTimers()
  })

  it('ambience follows the bases and stops when sfx is disabled (mute)', async () => {
    const p = fakeClipPlayer()
    const s = new Sfx(p)
    const flush = () => new Promise((r) => setTimeout(r, 0))
    s.ambience(ambienceFor(EMPTY_BASES)); await flush()
    s.ambience(ambienceFor({ first: true, second: false, third: false })); await flush()
    s.enabled = false; await flush()
    expect(p.loops.map((l) => [l.url, l.stopped])).toEqual([[AMBIENCE_URLS.low, true], [AMBIENCE_URLS.high, true]])
  })

  it('a word on the real voice bus ducks a cheer on the crowd bus', async () => {
    type G = { gain: { value: number; calls: unknown[][]; cancelScheduledValues: (t: number) => void; setValueAtTime: (v: number, t: number) => void; linearRampToValueAtTime: (v: number, t: number) => void }; connect: () => void }
    const gains: G[] = []
    const mkGain = (): G => {
      const calls: unknown[][] = []
      const g: G = {
        gain: {
          value: 1, calls,
          cancelScheduledValues: (t) => { calls.push(['cancel', t]) },
          setValueAtTime: (v, t) => { calls.push(['set', v, t]) },
          linearRampToValueAtTime: (v, t) => { calls.push(['ramp', v, t]) },
        },
        connect: () => {},
      }
      gains.push(g)
      return g
    }
    const ctx = {
      state: 'running', currentTime: 0, destination: {}, resume: async () => {},
      createGain: mkGain,
      decodeAudioData: async () => ({ duration: 0.01 }),
      createBufferSource: () => {
        const s = { buffer: null, loop: false, onended: null as null | (() => void), connect: () => {}, start: () => { setTimeout(() => s.onended?.(), 5) }, stop: () => {} }
        return s
      },
    } as unknown as AudioContext
    const fetchImpl = (async (u: string) => (u.includes('/ir/') ? new Response('', { status: 404 }) : new Response(new ArrayBuffer(8)))) as typeof fetch
    const player = createClipPlayer({ fetchImpl, createContext: () => ctx })
    new Sfx(player).cheerBig()
    await player.play('/audio/words/abc.mp3', { bus: 'voice' })
    const crowd = gains[2]! // gains[0] master, then sfx, crowd, music, voice
    expect(crowd.gain.calls).toContainEqual(['ramp', DUCK_GAIN, 0.08])
    expect(crowd.gain.calls.at(-1)).toEqual(['ramp', 1, 0.4])
  })
})
```

- [ ] **Step 2: Run it**

Run: `npx vitest run src/features/game/ballparkSound.test.ts`
Expected: PASS (every unit it touches landed in Tasks 1 to 8). If a case fails, fix the bug in the task that owns the unit, with that task's test first.

- [ ] **Step 3: Commit**

```bash
git add src/features/game/ballparkSound.test.ts
git commit -m "test(audio): end-to-end ballpark layering, beats, stubs, ambience and ducking"
```

- [ ] **Step 4: Rebase onto Phase 1 and wire the locked FieldBeat hook**

```bash
git fetch origin
git rebase origin/feat/cartoon-stadium
```

Phase 1 leaves `SequenceSfx` untouched, so conflicts are limited to the call sites in `src/features/game/playSequence.ts`: keep Phase 1's motion calls and this plan's `stack()` calls side by side, with `stack()` first so the field has `onBeat` before it animates.

Then make the field the default beat sink. Find where Phase 1 declared `onBeat?: (beat: FieldBeat) => void` (`rg -n "onBeat" src/field src/features/game`). Phase 1 owns that declaration; if its `FieldBeat` type is declared on the field side, delete the duplicate in `src/audio/layering.ts` and import Phase 1's, keeping the exact five-member union. In `stack()` replace `opts.onBeatSink?.(driver.onBeat)` with:

```ts
    const sink = opts.onBeatSink ?? ((fn: (beat: FieldBeat) => void) => { if (field) field.onBeat = fn })
    sink(driver.onBeat)
```

and clear it when the play finishes, as the last line of `playSequence` before it returns on every path (wrap the body after `stack()` in `try { ... } finally { if (field && !opts.onBeatSink) field.onBeat = undefined }`).

Add this test to `src/features/game/playSequence.test.ts`:

```ts
  it('hands onBeat to the field by default and clears it after the play', async () => {
    const r = recorder()
    let seen: unknown = null
    r.field.playHit = vi.fn(async () => { seen = r.field.onBeat; r.field.onBeat?.('wall') })
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'double' }), r.commentary, { pitchCall: 'whiff', scale: 1 })
    expect(typeof seen).toBe('function')
    expect(r.calls.filter((c) => c === 'sfx.ballWall')).toHaveLength(1)
    expect(r.field.onBeat).toBeUndefined()
  })
```

Run: `npx vitest run src/features/game/playSequence.test.ts src/features/game/ballparkSound.test.ts`
Expected: PASS.

If Phase 1 moved the batter-change site, put the `sfx.organ('walkup')` call (spec open question 2) in `playSequence` or the single session hook Phase 1 uses, never in a component. If the onBeat slot is not where `rg` finds it, ask Grand Slam Spelling before resolving; do not invent a different shape.

```bash
git add src/features/game/playSequence.ts src/features/game/playSequence.test.ts src/audio/layering.ts
git commit -m "feat(game): playSequence hands onBeat to the Phase 1 field"
```

- [ ] **Step 5: Run every gate**

```bash
npm test
npm run typecheck
npm run lint
npm run e2e
du -sb public/audio/sfx
rg -n "[\x{2013}\x{2014}]" docs/superpowers AUDIO-CREDITS.md audio-src/README.md src/audio src/features/game scripts/process-audio.mjs
```

Expected: tests, typecheck, lint and e2e pass; `du` prints a number below 4194304; the dash check prints nothing.

- [ ] **Step 6: Hand to Martin**

Push `feat/ballpark-sound` and open a PR against `main` (never push to `main` itself). The PR body has: Summary, How to verify (for Brandon), Nicole's test list (one game with sound on: a strike sounds like a mitt and an umpire, a hit like a bat, a home run like a stadium, every spelling word clear over the crowd), Tests (the four gate commands and their results), Stubbed pools (or "none"), IR status (wet or dry), booth LUFS before and after level match, `public/audio/sfx` size, and the line "Do not merge or publish without Brandon's explicit yes." Send Martin the PR link and this checklist. Merge and publish only after Martin's go.

---

## Self-review

**Spec coverage**

| Spec item | Task |
| --- | --- |
| Four buses on `ClipPlayer`, master volume and mute unchanged | 1 |
| `mixer.ts` names, constants, duck scheduler | 1 |
| Duck crowd 9 dB, music 18 dB, 80 ms down, 400 ms up, reference counted | 1 (unit), 9 (integration) |
| Voice reverb 12 percent wet, dry fallback | 1 |
| Looping for ambience, stop handles | 2 |
| Replacement map, bus per pool, `strikeBuzz` and `walkChime` removed, `ping` absent | 3, 8 |
| `SequenceSfx` new surface and test double | 3, 4 |
| `layering.ts` stacks, offsets via `motionScale` | 4 |
| FieldBeat sync (locked shape), offset fallback until Phase 1 lands | 4, 9 Step 4 |
| One-cheer rule | 4 (unit and playSequence), 9 |
| Mitt vs whiff decided in `playSequence` | 4 |
| `organ-charge` once if any runs | 4 (`organCharge` guard), 9 |
| Booth `sayAs` and baked `sayWord` on voice bus, words off `HTMLAudioElement` | 5 |
| `speechSynthesis` duck only | 5 |
| Booth level match within 1 dB | 5 (gain seam), 7 (measure and set) |
| Ambience low, high with runners, off on results, driven from `GamePage` | 3 (API), 4 (`ambienceFor`), 7 (lifecycle) |
| Quiet Booth keeps ambience and SFX, mute silences all | 3 (`enabled` setter), 7 (settings test) |
| CC0 only, sources, rejects, stub policy | 8 |
| `audio-src/`, `npm run process-audio`, -16 LUFS mono q5, loops untrimmed | 6 |
| Credits row per file, Kenney rows deleted | 6 (format), 8 (rows and guard test) |
| Preload covers new pools | 7 |
| No-repeat picker kept | 3 (test) |
| Under 4 MB | 6 (script check), 8 (guard test), 9 (gate) |
| Gates and Martin handoff | 9 |

**Type consistency check:** `Bus`, `PlayOptions`, `LoopOptions`, `LoopHandle`, `ClipPlayer` (Tasks 1 and 2) are the only player types used in Tasks 3, 5, 7, 9. `SequenceSfx`, `Cue`, `CUES`, `FieldBeat`, `PitchCall`, `Layer`, `driveLayers`, `LayerDriver` are defined once in `layering.ts` (Task 4) and re-exported by `playSequence.ts`. `POOL_SPEC` keys use folder names (`crack-hr`); cue names use camelCase (`crackHomeRun`); `Sfx` maps between them.

**Gaps left on purpose**

- Which clips get picked, and which pools end up stubbed, is decided in Task 8 by ear and by license. The plan fixes the rules, not the outcome.
- Where Phase 1 declares `onBeat` and when the scene calls each beat belong to Phase 1. Task 9 Step 4 wires to it after the rebase; until then every cue uses its offset.
- The walk-up organ trigger depends on Phase 1's batter-change site (spec open question 2).
- `ping` is not built until Brandon says yes.
