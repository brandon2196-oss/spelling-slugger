import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DEFAULT_COORDS, parseManifest } from './manifest'

describe('parseManifest', () => {
  it('reads the packed manifest: stadium ready, real coordinates, chrome still missing', () => {
    const raw = JSON.parse(readFileSync('public/art/manifest.json', 'utf8'))
    const m = parseManifest(raw)
    expect(m.width).toBe(1280)
    expect(m.ready.has('art/stadium/sky.png')).toBe(true)
    expect(m.ready.has('art/pitcher.json')).toBe(true)
    expect(m.missing).not.toContain('art/stadium/sky.png')
    expect(m.missing).toContain('art/chrome/score-bug.svg')
    expect(m.missing).not.toContain('art/stadium/foreground-fence.png')
    expect(m.coords.fielders).toHaveLength(7)
    // Measured from the art, so home sits below second and between third and first.
    expect(m.coords.homePlate.y).toBeGreaterThan(m.coords.second.y)
    expect(m.coords.third.x).toBeLessThan(m.coords.homePlate.x)
    expect(m.coords.first.x).toBeGreaterThan(m.coords.homePlate.x)
  })
  it('exposes the packed batter swing', () => {
    const m = parseManifest(JSON.parse(readFileSync('public/art/manifest.json', 'utf8')))
    expect(m.batterSwing?.frames).toBeGreaterThanOrEqual(8)
    expect(m.batterSwing?.layers).toContain('outline')
    expect(m.batterSwing?.layers).toContain('jersey')
    expect(m.batterSwing?.file(3, 'jersey')).toBe('art/batter/swing-contact/03-jersey.png')
  })
  it('exposes every packed batter clip and which frame layers exist', () => {
    const m = parseManifest(JSON.parse(readFileSync('public/art/manifest.json', 'utf8')))
    expect(Object.keys(m.batterClips).sort()).toEqual(['celebrate', 'run', 'stance-idle', 'strikeout-slump', 'swing-contact', 'swing-miss', 'take-walk', 'trot'])
    expect(m.batterClips['stance-idle']?.frames).toBe(4)
    expect(m.batterClips['stance-idle']?.has(0, 'outline')).toBe(true)
    expect(m.batterClips['stance-idle']?.has(0, 'number')).toBe(false)
    expect(m.batterClips['stance-idle']?.layers).toContain('hair-curly')
  })
  it('uses defaults when nothing is delivered', () => {
    const m = parseManifest({ coordinates: { homePlate: null } })
    expect(m.coords.homePlate).toEqual(DEFAULT_COORDS.homePlate)
    expect(m.batterSwing).toBeNull()
    expect(m.batterClips).toEqual({})
    expect(m.ready.size).toBe(0)
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
