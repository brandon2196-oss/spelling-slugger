import { DUCK_ATTACK_S, DUCK_GAIN, DUCK_RELEASE_S, createDucker, type DuckParam } from './mixer'

function param(): DuckParam & { calls: Array<[string, number, number?]> } {
  const calls: Array<[string, number, number?]> = []
  return {
    value: 1,
    calls,
    cancelScheduledValues: (t: number) => { calls.push(['cancel', t]) },
    setValueAtTime: (v: number, t: number) => { calls.push(['set', v, t]) },
    linearRampToValueAtTime: (v: number, t: number) => { calls.push(['ramp', v, t]) },
  }
}

describe('createDucker', () => {
  it('ducks crowd 9 dB and music 18 dB', () => {
    expect(20 * Math.log10(DUCK_GAIN.crowd)).toBeCloseTo(-9, 5)
    expect(20 * Math.log10(DUCK_GAIN.music)).toBeCloseTo(-18, 5)
  })

  it('ramps every target down to its own gain over 80 ms on the first start', () => {
    const a = param(); const b = param()
    const d = createDucker(() => [{ param: a, gain: DUCK_GAIN.crowd }, { param: b, gain: DUCK_GAIN.music }], () => 10)
    d.start()
    expect(a.calls).toEqual([['cancel', 10], ['set', 1, 10], ['ramp', DUCK_GAIN.crowd, 10 + DUCK_ATTACK_S]])
    expect(b.calls).toEqual([['cancel', 10], ['set', 1, 10], ['ramp', DUCK_GAIN.music, 10 + DUCK_ATTACK_S]])
    expect(d.holds).toBe(1)
  })

  it('holds the duck while voices overlap and recovers over 400 ms after the last ends', () => {
    const a = param()
    let t = 0
    const d = createDucker(() => [{ param: a, gain: 0.5 }], () => t)
    d.start(); t = 1; d.start(); t = 2; d.end()
    expect(a.calls.filter((c) => c[0] === 'ramp')).toHaveLength(1)
    t = 3; d.end()
    expect(a.calls.at(-1)).toEqual(['ramp', 1, 3 + DUCK_RELEASE_S])
    expect(d.holds).toBe(0)
  })

  it('ignores an unmatched end', () => {
    const a = param()
    const d = createDucker(() => [{ param: a, gain: 0.5 }], () => 0)
    d.end()
    expect(a.calls).toEqual([])
    expect(d.holds).toBe(0)
  })
})
