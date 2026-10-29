import { afterEach } from 'vitest'
import { clipUrlFor, loadManifest, MANIFEST_URL, setManifestForTests } from './manifest'

afterEach(() => setManifestForTests(null))

const body = { version: 1, clips: { bigRed: { double: ['/audio/announcers/bigRed/double-00.ogg'] }, smoothEddie: {}, quiet: {} } }
const ok = (b: unknown) => vi.fn(async () => ({ ok: true, json: async () => b }) as unknown as Response)

describe('manifest', () => {
  it('fetches once and caches', async () => {
    const f = ok(body)
    await loadManifest(f)
    await loadManifest(f)
    expect(f).toHaveBeenCalledTimes(1)
    expect(f).toHaveBeenCalledWith(MANIFEST_URL)
    expect(clipUrlFor('bigRed', 'double', 0)).toBe('/audio/announcers/bigRed/double-00.ogg')
  })
  it('returns null for missing clips', async () => {
    await loadManifest(ok(body))
    expect(clipUrlFor('bigRed', 'double', 3)).toBeNull()
    expect(clipUrlFor('smoothEddie', 'single', 0)).toBeNull()
    expect(clipUrlFor('quiet', 'double', 0)).toBeNull()
  })
  it('returns null before load', () => {
    expect(clipUrlFor('bigRed', 'double', 0)).toBeNull()
  })
  it('falls back to empty on fetch failure or bad shape', async () => {
    const m = await loadManifest(vi.fn(async () => { throw new Error('offline') }))
    expect(m.clips.bigRed).toEqual({})
    setManifestForTests(null)
    const m2 = await loadManifest(ok({ version: 9 }))
    expect(m2.clips.smoothEddie).toEqual({})
  })
  it('the placeholder manifest file is valid', async () => {
    const fs = await import('node:fs')
    const raw = JSON.parse(fs.readFileSync('public/audio/announcer-manifest.json', 'utf8'))
    expect(raw.version).toBe(1)
  })
})
