import { clipHash } from './word-audio-profile'
import * as speech from './speech'

vi.mock('./speech', async (orig) => {
  const real = await orig<typeof import('./speech')>()
  return { ...real, speakWord: vi.fn(async () => {}), speakSlowly: vi.fn(async () => {}), speakSentence: vi.fn(async () => {}), stopSpeech: vi.fn() }
})
import { enableBakedWordAudio, sayWord, type ClipPlayer } from './word-audio'

function fakePlayers(behave: (url: string) => 'ok' | 'fail') {
  const urls: string[] = []
  const make = (url: string): ClipPlayer => {
    urls.push(url)
    const handlers: Record<string, () => void> = {}
    return {
      volume: 1,
      pause: vi.fn(),
      addEventListener: (t, fn) => { handlers[t] = fn },
      play: () => {
        if (behave(url) === 'fail') return Promise.reject(new Error('404'))
        setTimeout(() => handlers.ended?.(), 0)
        return Promise.resolve()
      },
    }
  }
  return { urls, make }
}

describe('sayWord', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    speech.setSpeechVolume(1)
  })

  it('plays the baked clip and skips browser speech', async () => {
    const say = vi.mocked(speech.speakWord)
    const p = fakePlayers(() => 'ok')
    enableBakedWordAudio(true, p.make)
    await sayWord('word', 'rhythm')
    expect(p.urls).toEqual([`/audio/words/${await clipHash('word', 'rhythm')}.mp3`])
    expect(say).not.toHaveBeenCalled()
  })

  it('falls back to browser speech when the clip is missing, and does not refetch right away', async () => {
    const slow = vi.mocked(speech.speakSlowly)
    const p = fakePlayers(() => 'fail')
    enableBakedWordAudio(true, p.make)
    await sayWord('slow', 'yacht')
    await sayWord('slow', 'yacht')
    expect(slow).toHaveBeenCalledTimes(2)
    expect(p.urls).toHaveLength(1)
  })

  it('uses browser speech only in local mode', async () => {
    const sent = vi.mocked(speech.speakSentence)
    const p = fakePlayers(() => 'ok')
    enableBakedWordAudio(false, p.make)
    await sayWord('sentence', 'The cat sat.')
    expect(p.urls).toHaveLength(0)
    expect(sent).toHaveBeenCalledWith('The cat sat.')
  })

  it('stays silent-path when muted (browser speech handles mute)', async () => {
    speech.setSpeechVolume(0)
    const say = vi.mocked(speech.speakWord)
    const p = fakePlayers(() => 'ok')
    enableBakedWordAudio(true, p.make)
    await sayWord('word', 'cat')
    expect(p.urls).toHaveLength(0)
    expect(say).toHaveBeenCalled()
  })
})
