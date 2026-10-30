import { afterEach, beforeEach } from 'vitest'
import { setManifestForTests, type Manifest } from './manifest'
import type { ClipPlayer } from './clips'
import { ANNOUNCERS, ANNOUNCE_EVENTS, announcerState, lineFor, pickAnnouncerVoice, pickLineIndex, previewLine, sayAs, setAnnouncerPlayerForTests, type AnnounceEvent, type AnnouncerId, type CommentaryContext } from './announcer'

type Utter = { text: string; rate: number; pitch: number; volume: number; voice: unknown; onstart: null | (() => void); onend: null | (() => void); onerror: null | ((e: unknown) => void) }

function installFakeSpeech(voices: Array<{ name: string; lang: string }> = []) {
  const spoken: Utter[] = []
  const synth = { cancel: vi.fn(), speak: vi.fn((u: Utter) => spoken.push(u)), getVoices: () => voices, speaking: false }
  class FakeUtterance {
    text: string
    rate = 1
    pitch = 1
    volume = 1
    lang = ''
    voice: unknown = null
    onstart: null | (() => void) = null
    onend: null | (() => void) = null
    onerror: null | ((e: unknown) => void) = null
    constructor(text: string) { this.text = text }
  }
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true, writable: true })
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: FakeUtterance, configurable: true, writable: true })
  return { synth, spoken }
}
function removeSpeech() {
  Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true, writable: true })
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: undefined, configurable: true, writable: true })
}

const ctx: CommentaryContext = { runs: 2, inning: 3, word: 'giraffe' }
const talkers: AnnouncerId[] = ['bigRed', 'smoothEddie']

describe('ANNOUNCERS', () => {
  it('lists every event for every persona', () => {
    for (const id of Object.keys(ANNOUNCERS) as AnnouncerId[]) {
      for (const evt of ANNOUNCE_EVENTS) expect(Array.isArray(ANNOUNCERS[id].lines[evt])).toBe(true)
    }
  })
  it.each(talkers)('%s has at least 5 distinct lines for every event', (id) => {
    for (const evt of ANNOUNCE_EVENTS) {
      const lines = ANNOUNCERS[id].lines[evt]
      expect(lines.length, `${id}.${evt}`).toBeGreaterThanOrEqual(5)
      expect(new Set(lines).size, `${id}.${evt} duplicates`).toBe(lines.length)
    }
  })
  it('the quiet booth has no lines at all', () => {
    for (const evt of ANNOUNCE_EVENTS) expect(ANNOUNCERS.quiet.lines[evt]).toEqual([])
  })
  it('each talker has his catchphrase somewhere', () => {
    const all = (id: AnnouncerId) => ANNOUNCE_EVENTS.flatMap((e) => ANNOUNCERS[id].lines[e]).join(' ')
    expect(all('bigRed')).toContain('OH MY STARS!')
    expect(all('smoothEddie').toLowerCase()).not.toContain('easy breezy')
    expect(ANNOUNCERS.smoothEddie.name).toBe('Jack Dalton')
  })
  it('never speaks the live {word} (baked clips cannot know it)', () => {
    for (const id of talkers) for (const evt of ANNOUNCE_EVENTS) for (const line of ANNOUNCERS[id].lines[evt]) expect(line, line).not.toContain('{word}')
  })
  it('only uses known placeholders', () => {
    for (const id of talkers) for (const evt of ANNOUNCE_EVENTS) for (const line of ANNOUNCERS[id].lines[evt]) {
      const leftovers = line.replace(/\{(runs|inning|word)\}/g, '')
      expect(leftovers, line).not.toMatch(/[{}]/)
    }
  })
  it('carries the voice settings from the spec', () => {
    expect(ANNOUNCERS.bigRed.voice).toMatchObject({ rate: 0.95, pitch: 0.7 })
    expect(ANNOUNCERS.smoothEddie.voice).toMatchObject({ rate: 0.85, pitch: 0.8 })
  })
})

describe('lineFor', () => {
  it('never repeats a line back to back', () => {
    let prev = lineFor('bigRed', 'double', ctx)
    for (let i = 0; i < 50; i++) {
      const cur = lineFor('bigRed', 'double', ctx)
      expect(cur).not.toBe(prev)
      prev = cur
    }
  })
  it('fills the placeholders from the context', () => {
    for (let i = 0; i < 40; i++) {
      for (const evt of ANNOUNCE_EVENTS) {
        const line = lineFor('smoothEddie', evt, ctx)
        expect(line).not.toMatch(/[{}]/)
      }
    }
    const runsLines = ANNOUNCERS.bigRed.lines.runs.filter((l) => l.includes('{runs}'))
    expect(runsLines.length).toBeGreaterThan(0)
    const seen: string[] = []
    for (let i = 0; i < 40; i++) seen.push(lineFor('bigRed', 'runs', { runs: 4, inning: 1 }))
    expect(seen.some((l) => l.includes('4'))).toBe(true)
  })
  it('skips lines that need the word when no word is in the context', () => {
    for (let i = 0; i < 40; i++) {
      const line = lineFor('bigRed', 'double', { runs: 0, inning: 1 })
      expect(line).not.toMatch(/[{}]/)
      expect(line).not.toContain('undefined')
    }
  })
  it('returns an empty string for the quiet booth', () => {
    expect(lineFor('quiet', 'double', ctx)).toBe('')
  })
})

describe('pickAnnouncerVoice', () => {
  const voices = [
    { name: 'Samantha', lang: 'en-US' },
    { name: 'Daniel', lang: 'en-GB' },
    { name: 'Rocko (English (US))', lang: 'en-US' },
    { name: 'Thomas', lang: 'fr-FR' },
  ]
  it('prefers the persona regex among English voices', () => {
    expect(pickAnnouncerVoice(voices, 'bigRed')?.name).toBe('Daniel')
    expect(pickAnnouncerVoice(voices, 'smoothEddie')?.name).toBe('Rocko (English (US))')
  })
  it('falls back to en-US, then any English', () => {
    expect(pickAnnouncerVoice([{ name: 'Zed', lang: 'en-US' }, { name: 'Daniel', lang: 'fr-FR' }], 'bigRed')?.name).toBe('Zed')
    expect(pickAnnouncerVoice([{ name: 'Moira', lang: 'en-IE' }, { name: 'Thomas', lang: 'fr-FR' }], 'bigRed')?.name).toBe('Moira')
  })
  it('returns null when there is no English voice', () => {
    expect(pickAnnouncerVoice([{ name: 'Thomas', lang: 'fr-FR' }], 'bigRed')).toBeNull()
    expect(pickAnnouncerVoice([], 'smoothEddie')).toBeNull()
  })
})

describe('pickLineIndex', () => {
  it('returns an index whose filled line matches the text, never repeating', () => {
    let prev = -1
    for (let i = 0; i < 40; i++) {
      const p = pickLineIndex('bigRed', 'double', ctx)!
      expect(p.index).not.toBe(prev)
      expect(p.text).toBe(ANNOUNCERS.bigRed.lines.double[p.index]!.replace('{word}', 'giraffe'))
      prev = p.index
    }
  })
  it('skips {word} lines without a word, and is null for quiet', () => {
    for (let i = 0; i < 30; i++) {
      const p = pickLineIndex('bigRed', 'double', { runs: 0, inning: 1 })!
      expect(ANNOUNCERS.bigRed.lines.double[p.index]).not.toContain('{word}')
    }
    expect(pickLineIndex('quiet', 'double', ctx)).toBeNull()
  })
})

function fullManifest(): Manifest {
  const clips = {} as Manifest['clips']
  for (const id of ['bigRed', 'smoothEddie', 'quiet'] as AnnouncerId[]) {
    clips[id] = {}
    for (const evt of ANNOUNCE_EVENTS) clips[id][evt] = ANNOUNCERS[id].lines[evt].map((_, i) => `/audio/announcers/${id}/${evt}-${String(i).padStart(2, '0')}.ogg`)
  }
  return { version: 1, clips }
}

describe('sayAs', () => {
  let played: string[]
  let finish: Array<() => void>
  let player: ClipPlayer
  let fake: ReturnType<typeof installFakeSpeech>
  beforeEach(() => {
    played = []
    finish = []
    player = {
      load: vi.fn(async () => {}), preload: vi.fn(async () => {}), setVolume: vi.fn(), setMuted: vi.fn(), resume: vi.fn(), duckStart: vi.fn(), duckEnd: vi.fn(),
      play: vi.fn((url: string) => { played.push(url); return new Promise<void>((r) => finish.push(r)) }),
    }
    setAnnouncerPlayerForTests(player)
    setManifestForTests(fullManifest())
    fake = installFakeSpeech([{ name: 'Daniel', lang: 'en-GB' }])
  })
  afterEach(() => { setAnnouncerPlayerForTests(null); setManifestForTests(null); removeSpeech() })
  const flush = () => new Promise((r) => setTimeout(r, 0))

  it('plays the baked clip matching the picked line', async () => {
    const states: Array<{ speaking: boolean; line: string | null }> = []
    const unsub = announcerState.subscribe((s) => states.push(s))
    const p = sayAs('bigRed', 'strikeout', ctx)
    await flush()
    expect(played).toHaveLength(1)
    const m = /bigRed\/strikeout-(\d\d)\.ogg$/.exec(played[0]!)
    expect(m).not.toBeNull()
    const line = ANNOUNCERS.bigRed.lines.strikeout[Number(m![1])]!.replace('{word}', 'giraffe')
    expect(states.at(-1)).toEqual({ speaking: true, line })
    finish[0]!()
    await p
    expect(states.at(-1)).toEqual({ speaking: false, line: null })
    expect(fake.synth.speak).not.toHaveBeenCalled()
    unsub()
  })
  it('stays quiet (no TTS) when the clip is missing', async () => {
    setManifestForTests({ version: 1, clips: { bigRed: {}, smoothEddie: {}, quiet: {} } })
    const states: unknown[] = []
    const unsub = announcerState.subscribe((s) => states.push(s))
    await sayAs('bigRed', 'double', ctx)
    expect(player.play).not.toHaveBeenCalled()
    expect(fake.synth.speak).not.toHaveBeenCalled()
    expect(states).toEqual([])
    unsub()
  })
  it('says nothing for the quiet booth', async () => {
    await sayAs('quiet', 'double', ctx)
    expect(player.play).not.toHaveBeenCalled()
    expect(fake.synth.speak).not.toHaveBeenCalled()
  })
  it('resolves as soon as the player does (muted player resolves immediately)', async () => {
    player.play = vi.fn(async () => {})
    await expect(sayAs('smoothEddie', 'single', ctx)).resolves.toBeUndefined()
    expect(announcerState.get()).toEqual({ speaking: false, line: null })
  })
  it('clears speaking state if play rejects', async () => {
    player.play = vi.fn(async () => { throw new Error('boom') })
    await sayAs('bigRed', 'walk', ctx)
    expect(announcerState.get()).toMatchObject({ speaking: false })
  })
  it('previewLine plays a game-start clip', async () => {
    const p = previewLine('smoothEddie')
    await flush()
    expect(played[0]).toMatch(/smoothEddie\/gameStart-\d\d\.ogg$/)
    finish[0]!()
    await p
  })
  it('previewLine is a no-op for the quiet booth', async () => {
    await previewLine('quiet')
    expect(player.play).not.toHaveBeenCalled()
  })
})

// Type-level check: AnnounceEvent is the closed list the sequence player relies on.
const _evt: AnnounceEvent = 'gameStart'
void _evt

describe('pickAnnouncerVoice preference order', () => {
  it('walks the persona preferences in order, not the system list order', () => {
    // Big Red's preference list names daniel before fred; the system lists Fred first.
    expect(ANNOUNCERS.bigRed.voice.prefer.source.indexOf('daniel')).toBeLessThan(ANNOUNCERS.bigRed.voice.prefer.source.indexOf('fred'))
    const voices = [{ name: 'Fred', lang: 'en-US' }, { name: 'Daniel', lang: 'en-GB' }]
    expect(pickAnnouncerVoice(voices, 'bigRed')?.name).toBe('Daniel')
  })
})

