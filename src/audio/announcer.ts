/**
 * The booth. Two original announcer characters (plus a quiet booth) with rotating, G-rated lines
 * per game event. Lines play as pre-baked clips (see manifest.ts) through the shared ClipPlayer; a line
 * with no baked clip stays quiet (never robotic browser TTS). Lines never repeat back to back; placeholders `{runs}`, `{inning}`, `{word}` are filled
 * from the commentary context.
 */
import { createPicker } from './pool'
import { clips as defaultClips, type ClipPlayer } from './clips'
import { clipUrlFor, loadManifest } from './manifest'
import LINES_JSON from './announcer-lines.json'

export const ANNOUNCE_EVENTS = [
  'gameStart', 'homeRun', 'double', 'single', 'walk', 'strike1', 'strike2', 'strikeout', 'run', 'runs', 'inningEnd', 'gameOver',
] as const
export type AnnounceEvent = (typeof ANNOUNCE_EVENTS)[number]

/**
 * `runs`: runs scored on the play. `inning`: the inning about to be played (after an inning end,
 * the new one; 0 when unknown, e.g. on a strike). `word`: the word just spelled, when there is one.
 */
export interface CommentaryContext {
  runs: number
  inning: number
  word?: string
}

export type AnnouncerId = 'bigRed' | 'smoothEddie' | 'quiet'

/** Line text lives in announcer-lines.json (also read by scripts/bake-audio.mjs). */
const LINES = LINES_JSON as Record<'bigRed' | 'smoothEddie', Record<AnnounceEvent, string[]>>

export interface Announcer {
  id: AnnouncerId
  name: string
  tagline: string
  portrait: 'bigRed' | 'smoothEddie' | 'quiet'
  voice: { rate: number; pitch: number; prefer: RegExp }
  lines: Record<AnnounceEvent, string[]>
}

const bigRed: Announcer = {
  id: 'bigRed',
  name: 'Big Red Brannigan',
  tagline: 'Old-school booth. Big voice. "OH MY STARS!"',
  portrait: 'bigRed',
  voice: { rate: 0.95, pitch: 0.7, prefer: /daniel|fred|aaron|alex|google uk english male|david|mark/i },
  lines: LINES.bigRed,
}

const smoothEddie: Announcer = {
  id: 'smoothEddie',
  name: 'Jack Dalton',
  tagline: 'Calm, classic play-by-play. Straight calls.',
  portrait: 'smoothEddie',
  voice: { rate: 0.85, pitch: 0.8, prefer: /rocko|eddy|reed|google us english|guy|james|aaron/i },
  lines: LINES.smoothEddie,
}

const quiet: Announcer = {
  id: 'quiet',
  name: 'Quiet Booth',
  tagline: 'Sounds only. No talking.',
  portrait: 'quiet',
  voice: { rate: 1, pitch: 1, prefer: /$^/ },
  lines: { gameStart: [], homeRun: [], double: [], single: [], walk: [], strike1: [], strike2: [], strikeout: [], run: [], runs: [], inningEnd: [], gameOver: [] },
}

export const ANNOUNCERS: Record<AnnouncerId, Announcer> = { bigRed, smoothEddie, quiet }

// ---- line rotation -----------------------------------------------------------------------------

const pickers = new Map<string, () => number>()

function picker(id: AnnouncerId, event: AnnounceEvent, withWord: boolean, rng?: () => number): (() => number) | null {
  const key = `${id}:${event}:${withWord ? 'w' : 'nw'}`
  let p = pickers.get(key)
  if (!p) {
    const all = ANNOUNCERS[id].lines[event]
    const idx = all.map((_, i) => i).filter((i) => withWord || !all[i]!.includes('{word}'))
    if (idx.length === 0) return null
    p = createPicker(idx, rng)
    pickers.set(key, p)
  }
  return p
}

function fill(line: string, ctx: CommentaryContext): string {
  return line
    .replace(/\{runs\}/g, String(ctx.runs))
    .replace(/\{inning\}/g, String(ctx.inning))
    .replace(/\{word\}/g, ctx.word ?? '')
}

/**
 * Index (into `ANNOUNCERS[id].lines[event]`) and filled text of the next line, never the same as the
 * previous one for that (announcer, event). null for quiet / no eligible lines.
 */
export function pickLineIndex(id: AnnouncerId, event: AnnounceEvent, ctx: CommentaryContext, rng?: () => number): { index: number; text: string } | null {
  const p = picker(id, event, ctx.word !== undefined && ctx.word !== '', rng)
  if (!p) return null
  const index = p()
  return { index, text: fill(ANNOUNCERS[id].lines[event][index]!, ctx) }
}

/** One line for the event (board text). '' for quiet. */
export function lineFor(id: AnnouncerId, event: AnnounceEvent, ctx: CommentaryContext, rng?: () => number): string {
  return pickLineIndex(id, event, ctx, rng)?.text ?? ''
}

// ---- voice -------------------------------------------------------------------------------------

/** The persona's preferred English voice, else any en-US, else any English voice, else null. */
export function pickAnnouncerVoice<V extends { name: string; lang: string }>(voices: V[], id: AnnouncerId): V | null {
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith('en'))
  // Walk the persona's preferences in order (the regex lists best first), not the system's order.
  for (const alt of ANNOUNCERS[id].voice.prefer.source.split('|')) {
    const re = new RegExp(alt, 'i')
    const hit = en.find((v) => re.test(v.name))
    if (hit) return hit
  }
  return en.find((v) => v.lang.toLowerCase() === 'en-us') ?? en[0] ?? null
}

// ---- speaking state ----------------------------------------------------------------------------

export interface AnnouncerSpeaking {
  speaking: boolean
  line: string | null
}

type Listener = (s: AnnouncerSpeaking) => void
const listeners = new Set<Listener>()
let current: AnnouncerSpeaking = { speaking: false, line: null }

function emit(s: AnnouncerSpeaking): void {
  current = s
  for (const cb of listeners) cb(s)
}

export const announcerState = {
  get: (): AnnouncerSpeaking => current,
  subscribe(cb: Listener): () => void {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  },
}

// ---- speaking ----------------------------------------------------------------------------------

let player: ClipPlayer = defaultClips

/** Test seam: swap the clip player (null restores the shared one). */
export function setAnnouncerPlayerForTests(p: ClipPlayer | null): void {
  player = p ?? defaultClips
}

/**
 * Play one baked line for the event as the given announcer. Resolves when done. Quiet booth, missing
 * clip, or muted player all resolve without sound (and without falling back to browser TTS).
 */
export async function sayAs(id: AnnouncerId, event: AnnounceEvent, ctx: CommentaryContext): Promise<void> {
  if (id === 'quiet') return
  const pick = pickLineIndex(id, event, ctx)
  if (!pick) return
  await loadManifest()
  const url = clipUrlFor(id, event, pick.index)
  if (!url) return
  emit({ speaking: true, line: pick.text })
  try {
    await player.play(url)
  } catch {
    /* play never throws, but never leave the booth stuck "speaking" */
  } finally {
    emit({ speaking: false, line: null })
  }
}

/** A sample game-start line, for the picker on the home screen. */
export function previewLine(id: AnnouncerId): Promise<void> {
  return sayAs(id, 'gameStart', { runs: 0, inning: 1 })
}
