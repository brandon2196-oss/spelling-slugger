import { afterEach, beforeEach } from 'vitest'

type Utter = { text: string; rate: number; pitch: number; volume: number; voice: unknown; onstart: null | (() => void); onend: null | (() => void); onerror: null | ((e: unknown) => void) }

function installFakeSpeech() {
  const spoken: Utter[] = []
  const synth = {
    cancel: vi.fn(),
    speak: vi.fn((u: Utter) => spoken.push(u)),
    getVoices: () => [],
    speaking: false,
  }
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
    constructor(text: string) {
      this.text = text
    }
  }
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true, writable: true })
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: FakeUtterance, configurable: true, writable: true })
  return { synth, spoken }
}

function removeSpeech() {
  Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true, writable: true })
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: undefined, configurable: true, writable: true })
}

describe('speech wrapper', () => {
  let fake: ReturnType<typeof installFakeSpeech>
  beforeEach(() => {
    vi.resetModules()
    fake = installFakeSpeech()
  })
  afterEach(() => removeSpeech())

  it('reports availability and resolves when the utterance ends', async () => {
    const { speechAvailable, speak } = await import('./speech')
    expect(speechAvailable()).toBe(true)
    const p = speak('baseball')
    expect(fake.synth.cancel).toHaveBeenCalled()
    expect(fake.spoken[0]!.text).toBe('baseball')
    fake.spoken[0]!.onend!()
    await expect(p).resolves.toBeUndefined()
  })

  it('speakSlowly uses a half-speed rate', async () => {
    const { speakSlowly } = await import('./speech')
    const p = speakSlowly('baseball')
    expect(fake.spoken[0]!.rate).toBe(0.5)
    fake.spoken[0]!.onend!()
    await p
  })

  it('umpire calls are lower-pitched', async () => {
    const { umpire } = await import('./speech')
    const p = umpire('Strike one!')
    expect(fake.spoken[0]!.pitch).toBeLessThan(1)
    fake.spoken[0]!.onend!()
    await p
  })

  it('uses an explicitly passed voice instead of the default pick', async () => {
    const { speak } = await import('./speech')
    const voice = { name: 'Daniel', lang: 'en-GB' } as unknown as SpeechSynthesisVoice
    const p = speak('Oh my stars', { voice })
    expect(fake.spoken[0]!.voice).toBe(voice)
    fake.spoken[0]!.onend!()
    await p
  })

  it('calls onStart when the utterance begins', async () => {
    const { speak } = await import('./speech')
    const onStart = vi.fn()
    const p = speak('hello', { onStart })
    expect(onStart).not.toHaveBeenCalled()
    fake.spoken[0]!.onstart!()
    expect(onStart).toHaveBeenCalledTimes(1)
    fake.spoken[0]!.onend!()
    await p
  })

  it('rejects, and reports unavailable, when the browser has no speech', async () => {
    removeSpeech()
    const { speechAvailable, speak } = await import('./speech')
    expect(speechAvailable()).toBe(false)
    await expect(speak('x')).rejects.toThrow()
  })
})
