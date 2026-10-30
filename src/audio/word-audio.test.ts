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
    // clipHash uses crypto.subtle, which resolves off the fake clock; wait for play before advancing.
    await vi.waitUntil(() => vi.mocked(p.play).mock.calls.length > 0)
    await vi.advanceTimersByTimeAsync(10_001)
    await run
    expect(done).toBe(true)
    vi.useRealTimers()
  })
})
