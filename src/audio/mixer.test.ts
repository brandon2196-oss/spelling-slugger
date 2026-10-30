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
  it('DUCK_GAIN is 9 dB down', () => {
    expect(20 * Math.log10(DUCK_GAIN)).toBeCloseTo(-9, 5)
  })

  it('ramps every target down over 80 ms on the first start', () => {
    const a = param(); const b = param()
    const d = createDucker(() => [a, b], () => 10)
    d.start()
    for (const p of [a, b]) {
      expect(p.calls).toEqual([['cancel', 10], ['set', 1, 10], ['ramp', DUCK_GAIN, 10 + DUCK_ATTACK_S]])
    }
    expect(d.holds).toBe(1)
  })

  it('holds the duck while voices overlap and recovers over 400 ms after the last ends', () => {
    const a = param()
    let t = 0
    const d = createDucker(() => [a], () => t)
    d.start(); t = 1; d.start(); t = 2; d.end()
    expect(a.calls.filter((c) => c[0] === 'ramp')).toHaveLength(1)
    t = 3; d.end()
    expect(a.calls.at(-1)).toEqual(['ramp', 1, 3 + DUCK_RELEASE_S])
    expect(d.holds).toBe(0)
  })

  it('ignores an unmatched end', () => {
    const a = param()
    const d = createDucker(() => [a], () => 0)
    d.end()
    expect(a.calls).toEqual([])
    expect(d.holds).toBe(0)
  })
})
