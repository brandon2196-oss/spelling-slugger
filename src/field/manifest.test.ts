import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DEFAULT_COORDS, parseManifest } from './manifest'

describe('parseManifest', () => {
  it('uses defaults for the Phase 0 manifest and lists every missing asset', () => {
    const raw = JSON.parse(readFileSync('public/art/manifest.json', 'utf8'))
    const m = parseManifest(raw)
    expect(m.width).toBe(1280)
    expect(m.coords.homePlate).toEqual(DEFAULT_COORDS.homePlate)
    expect(m.coords.fielders).toHaveLength(7)
    expect(m.missing).toContain('art/stadium/sky.png')
    expect(m.missing).not.toContain('art/stadium/foreground-fence.png')
  })
  it('takes real coordinates when present', () => {
    const m = parseManifest({ coordinates: { homePlate: { x: 1, y: 2 }, outfieldWallTop: [{ x: 0, y: 300 }, { x: 9, y: 280 }] } })
    expect(m.coords.homePlate).toEqual({ x: 1, y: 2 })
    expect(m.coords.wallY).toBe(280)
  })
  it('survives null', () => {
    expect(parseManifest(null).missing).toEqual([])
  })
})
