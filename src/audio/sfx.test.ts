import { vi } from 'vitest'
import type { ClipPlayer } from './clips'
import { SFX_POOLS, Sfx } from './sfx'

function fakePlayer() {
  const played: string[] = []
  const player: ClipPlayer & { resume: () => void } = {
    load: vi.fn(async () => {}),
    play: vi.fn(async (url: string) => { played.push(url) }),
    preload: vi.fn(async () => {}),
    setVolume: vi.fn(),
    setMuted: vi.fn(),
    resume: vi.fn(),
  }
  return { player, played }
}

describe('Sfx (clip pools)', () => {
  it('crack() plays a clip from the crack pool', () => {
    const { player, played } = fakePlayer()
    new Sfx(player).crack()
    expect(played).toHaveLength(1)
    expect(played[0]).toMatch(/^\/audio\/sfx\/crack\/.+\.ogg$/)
  })

  it('every effect plays from its own folder', () => {
    const { player, played } = fakePlayer()
    const s = new Sfx(player)
    s.whiff(); s.cheer(); s.walkChime(); s.strikeBuzz(); s.fanfare(); s.groan()
    expect(played.map((u) => u.split('/')[3])).toEqual(['whiff', 'cheer', 'walkChime', 'strikeBuzz', 'fanfare', 'groan'])
  })

  it('organ riffs map to organ-charge / organ-inning / organ-walkup', () => {
    const { player, played } = fakePlayer()
    const s = new Sfx(player)
    s.organ('charge'); s.organ('inning'); s.organ('walkup')
    expect(played.map((u) => u.split('/')[3])).toEqual(['organ-charge', 'organ-inning', 'organ-walkup'])
  })

  it('plays nothing when disabled', () => {
    const { player, played } = fakePlayer()
    const s = new Sfx(player)
    s.enabled = false
    s.crack(); s.cheer(2000); s.organ('charge')
    expect(played).toEqual([])
  })

  it('never repeats the same variant back to back', () => {
    const { player, played } = fakePlayer()
    const s = new Sfx(player, () => 0) // rng pinned low: a naive picker would repeat index 0
    for (let i = 0; i < 10; i++) s.crack()
    for (let i = 1; i < played.length; i++) expect(played[i]).not.toBe(played[i - 1])
  })

  it('every pool has at least 3 variants', () => {
    for (const urls of Object.values(SFX_POOLS)) expect(urls.length).toBeGreaterThanOrEqual(3)
  })

  it('setVolume forwards to the clip player; unlock resumes it', () => {
    const { player } = fakePlayer()
    const s = new Sfx(player)
    s.setVolume(0.4)
    expect(player.setVolume).toHaveBeenCalledWith(0.4)
    s.unlock()
    expect(player.resume).toHaveBeenCalled()
  })
})
