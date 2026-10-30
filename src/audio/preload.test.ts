import { clips } from './clips'
import { setManifestForTests } from './manifest'
import { preloadAudio } from './preload'
import { REVERB_IR_URL } from './mixer'
import { ALL_SFX_URLS } from './sfx'

describe('preloadAudio', () => {
  afterEach(() => { setManifestForTests(null); vi.restoreAllMocks() })

  it('preloads SFX only when the manifest fetch fails', async () => {
    const spy = vi.spyOn(clips, 'preload').mockResolvedValue(undefined as never)
    await expect(preloadAudio('bigRed', (() => Promise.reject(new Error('offline'))) as typeof fetch)).resolves.toBeUndefined()
    expect(spy).toHaveBeenCalledWith([...ALL_SFX_URLS, REVERB_IR_URL])
  })

  it('adds the selected announcer clips', async () => {
    const spy = vi.spyOn(clips, 'preload').mockResolvedValue(undefined as never)
    setManifestForTests({ version: 1, clips: { bigRed: { homeRun: ['/a.mp3'] } as never, smoothEddie: { homeRun: ['/b.mp3'] } as never, quiet: {} } })
    await preloadAudio('bigRed')
    expect(spy).toHaveBeenCalledWith([...ALL_SFX_URLS, REVERB_IR_URL, '/a.mp3'])
  })
})
