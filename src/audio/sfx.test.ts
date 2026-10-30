import { fakeClipPlayer } from '../test/fakeClipPlayer'
import { AMBIENCE_GAIN, AMBIENCE_URLS, ALL_SFX_URLS, POOL_SPEC, SFX_POOLS, Sfx, type PoolSpec } from './sfx'

const folder = (url: string) => url.split('/')[3]
const flush = () => new Promise((r) => setTimeout(r, 0))

describe('Sfx (ballpark pools)', () => {
  it('each cue plays from its folder on its bus', () => {
    const p = fakeClipPlayer()
    // Every pool filled, so the cue to folder and bus mapping is checked even for shipped stubs.
    const full = Object.fromEntries(Object.entries(POOL_SPEC).map(([k, v]) => [k, { ...v, n: 2 }])) as PoolSpec
    const s = new Sfx(p, Math.random, full)
    s.crack(); s.crackHomeRun(); s.whiff(); s.mitt(); s.umpStrike(); s.umpStrike3(); s.umpBall4(); s.ballWall()
    s.cheerSmall(); s.cheerBig(); s.cheerHr(); s.groan(); s.fanfare(); s.organ('charge'); s.organ('inning'); s.organ('walkup')
    expect(p.played.map((x) => [folder(x.url), x.bus])).toEqual([
      ['crack', 'sfx'], ['crack-hr', 'sfx'], ['whiff', 'sfx'], ['mitt', 'sfx'], ['ump-strike', 'sfx'], ['ump-strike3', 'sfx'],
      ['ump-ball4', 'sfx'], ['ball-wall', 'sfx'], ['cheer-small', 'crowd'], ['cheer-big', 'crowd'], ['cheer-hr', 'crowd'],
      ['groan', 'crowd'], ['fanfare', 'music'], ['organ-charge', 'music'], ['organ-inning', 'music'], ['organ-walkup', 'music'],
    ])
  })

  it('has no Kenney-era pools', () => {
    for (const gone of ['cheer', 'walkChime', 'strikeBuzz']) expect(Object.keys(POOL_SPEC)).not.toContain(gone)
  })

  it('pool URLs follow /audio/sfx/<pool>/<pool>-<n>.ogg and match the spec count', () => {
    for (const [pool, { n }] of Object.entries(POOL_SPEC)) {
      const urls = SFX_POOLS[pool as keyof typeof POOL_SPEC]
      expect(urls).toHaveLength(n)
      urls.forEach((u, i) => expect(u).toBe(`/audio/sfx/${pool}/${pool}-${i + 1}.ogg`))
    }
  })

  it('ALL_SFX_URLS includes every pool clip and both ambience loops', () => {
    expect(ALL_SFX_URLS).toEqual([...Object.values(SFX_POOLS).flat(), AMBIENCE_URLS.low, AMBIENCE_URLS.high])
  })

  it('a stub pool (n = 0) plays nothing and does not throw', () => {
    const p = fakeClipPlayer()
    const spec = { ...POOL_SPEC, 'ump-strike': { n: 0, bus: 'sfx' } } as PoolSpec
    const s = new Sfx(p, Math.random, spec)
    expect(() => s.umpStrike()).not.toThrow()
    expect(p.played).toEqual([])
  })

  it('plays nothing when disabled', () => {
    const p = fakeClipPlayer()
    const s = new Sfx(p)
    s.enabled = false
    s.crack(); s.cheerBig(); s.organ('charge')
    expect(p.played).toEqual([])
  })

  it('never repeats the same variant back to back', () => {
    const p = fakeClipPlayer()
    const s = new Sfx(p, () => 0)
    for (let i = 0; i < 10; i++) s.crack()
    for (let i = 1; i < p.played.length; i++) expect(p.played[i]!.url).not.toBe(p.played[i - 1]!.url)
  })

  it('setVolume forwards to the clip player; unlock resumes it', () => {
    const p = fakeClipPlayer()
    const s = new Sfx(p)
    s.setVolume(0.4)
    expect(p.setVolume).toHaveBeenCalledWith(0.4)
    s.unlock()
    expect(p.resume).toHaveBeenCalled()
  })

  describe('ambience', () => {
    it('low starts the low loop on the crowd bus at AMBIENCE_GAIN', async () => {
      const p = fakeClipPlayer()
      const s = new Sfx(p)
      s.ambience('low')
      await flush()
      expect(p.loops).toEqual([{ url: AMBIENCE_URLS.low, bus: 'crowd', gain: AMBIENCE_GAIN, stopped: false }])
      expect(s.ambienceLevel).toBe('low')
    })

    it('switching low to high stops low and starts high; the same level twice is a no-op', async () => {
      const p = fakeClipPlayer()
      const s = new Sfx(p)
      s.ambience('low'); await flush()
      s.ambience('high'); await flush()
      s.ambience('high'); await flush()
      expect(p.loops.map((l) => [l.url, l.stopped])).toEqual([[AMBIENCE_URLS.low, true], [AMBIENCE_URLS.high, false]])
    })

    it('off stops the loop', async () => {
      const p = fakeClipPlayer()
      const s = new Sfx(p)
      s.ambience('high'); await flush()
      s.ambience('off'); await flush()
      expect(p.loops[0]!.stopped).toBe(true)
      expect(s.ambienceLevel).toBe('off')
    })

    it('a switch that lands before the loop loads stops the stale loop', async () => {
      const p = fakeClipPlayer()
      const s = new Sfx(p)
      s.ambience('low'); s.ambience('high'); await flush()
      expect(p.loops.find((l) => l.url === AMBIENCE_URLS.low)!.stopped).toBe(true)
      expect(p.loops.find((l) => l.url === AMBIENCE_URLS.high)!.stopped).toBe(false)
    })

    it('disabling stops ambience and re-enabling restores the wanted level', async () => {
      const p = fakeClipPlayer()
      const s = new Sfx(p)
      s.ambience('high'); await flush()
      s.enabled = false; await flush()
      expect(p.loops[0]!.stopped).toBe(true)
      s.enabled = true; await flush()
      expect(p.loops.at(-1)).toMatchObject({ url: AMBIENCE_URLS.high, stopped: false })
    })
  })
})
