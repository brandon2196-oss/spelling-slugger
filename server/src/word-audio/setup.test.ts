// @vitest-environment node
import { setupWordAudio } from './setup'

describe('setupWordAudio', () => {
  it('is off when WORD_AUDIO=off', async () => expect(await setupWordAudio({ WORD_AUDIO: 'off' })).toBeUndefined())
  it('uses a directory when WORD_AUDIO_DIR is set', async () => {
    const b = await setupWordAudio({ WORD_AUDIO_DIR: '/tmp/word-audio-test' })
    expect(await b!.storage.has('0'.repeat(64))).toBe(false)
  })
})
