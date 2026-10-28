import { afterEach, beforeEach } from 'vitest'
import { ANNOUNCERS, ANNOUNCE_EVENTS, announcerState, lineFor, pickAnnouncerVoice, previewLine, sayAs, type AnnounceEvent, type AnnouncerId, type CommentaryContext } from './announcer'

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
    expect(all('smoothEddie').toLowerCase()).toContain('easy breezy')
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

describe('sayAs', () => {
  let fake: ReturnType<typeof installFakeSpeech>
  beforeEach(() => { fake = installFakeSpeech([{ name: 'Daniel', lang: 'en-GB' }, { name: 'Samantha', lang: 'en-US' }]) })
  afterEach(() => removeSpeech())

  it('speaks one of the persona lines with its voice settings', async () => {
    const p = sayAs('bigRed', 'strikeout', ctx)
    expect(fake.spoken).toHaveLength(1)
    const u = fake.spoken[0]!
    expect(u.rate).toBe(0.95)
    expect(u.pitch).toBe(0.7)
    expect((u.voice as { name: string }).name).toBe('Daniel')
    const templates = ANNOUNCERS.bigRed.lines.strikeout.map((l) => l.replace('{word}', 'giraffe').replace('{runs}', '2').replace('{inning}', '3'))
    expect(templates).toContain(u.text)
    u.onend!()
    await expect(p).resolves.toBeUndefined()
  })
  it('says nothing for the quiet booth', async () => {
    await sayAs('quiet', 'double', ctx)
    expect(fake.synth.speak).not.toHaveBeenCalled()
  })
  it('resolves quietly when speech is unavailable', async () => {
    removeSpeech()
    await expect(sayAs('bigRed', 'double', ctx)).resolves.toBeUndefined()
  })
  it('publishes speaking state on start and end', async () => {
    const states: Array<{ speaking: boolean; line: string | null }> = []
    const unsub = announcerState.subscribe((s) => states.push(s))
    const p = sayAs('smoothEddie', 'single', ctx)
    expect(states.at(-1)).toMatchObject({ speaking: true, line: fake.spoken[0]!.text })
    fake.spoken[0]!.onend!()
    await p
    expect(states.at(-1)).toEqual({ speaking: false, line: null })
    unsub()
    const n = states.length
    void sayAs('smoothEddie', 'single', ctx)
    expect(states.length).toBe(n)
  })
  it('clears speaking state when the utterance errors', async () => {
    const states: Array<{ speaking: boolean }> = []
    const unsub = announcerState.subscribe((s) => states.push(s))
    const p = sayAs('bigRed', 'walk', ctx)
    fake.spoken[0]!.onerror!(new Error('boom'))
    await p
    expect(states.at(-1)).toMatchObject({ speaking: false })
    unsub()
  })
  it('previewLine speaks a game-start line', async () => {
    const p = previewLine('smoothEddie')
    const filled = ANNOUNCERS.smoothEddie.lines.gameStart
    expect(filled.some((l) => l.replace(/\{(runs|inning|word)\}/g, '') === fake.spoken[0]!.text.replace(/\d+/g, ''))
      || filled.includes(fake.spoken[0]!.text)).toBe(true)
    fake.spoken[0]!.onend!()
    await p
  })
  it('previewLine is a no-op for the quiet booth', async () => {
    await previewLine('quiet')
    expect(fake.synth.speak).not.toHaveBeenCalled()
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

