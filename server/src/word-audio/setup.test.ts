// @vitest-environment node
import { setupWordAudio } from './setup'

// Mirrors @replit/object-storage: the constructor fires init as a floating promise.
vi.mock('@replit/object-storage', () => ({
  Client: class {
    private promise: Promise<never>
    constructor() {
      this.promise = Promise.reject(new Error('no default bucket'))
    }
    getBucket() { return this.promise }
  },
}))

describe('setupWordAudio', () => {
  it('is off when WORD_AUDIO=off', async () => expect(await setupWordAudio({ WORD_AUDIO: 'off' })).toBeUndefined())
  it('uses a directory when WORD_AUDIO_DIR is set', async () => {
    const b = await setupWordAudio({ WORD_AUDIO_DIR: '/tmp/word-audio-test' })
    expect(await b!.storage.has('0'.repeat(64))).toBe(false)
  })
  it('falls back to browser speech when the App Storage bucket is missing', async () => {
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    try {
      expect(await setupWordAudio({ REPL_ID: 'x' })).toBeUndefined()
      await new Promise((r) => setTimeout(r, 10))
      expect(unhandled).not.toHaveBeenCalled()
    } finally {
      process.off('unhandledRejection', unhandled)
    }
  })
})
