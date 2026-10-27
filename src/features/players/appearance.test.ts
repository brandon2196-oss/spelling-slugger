import { DEFAULT_APPEARANCE, HAIRSTYLES, PALETTE, SKIN_TONES, isValidJersey } from './appearance'

describe('isValidJersey', () => {
  it('accepts whole numbers from 0 to 99', () => {
    expect(isValidJersey(0)).toBe(true)
    expect(isValidJersey(99)).toBe(true)
    expect(isValidJersey(7)).toBe(true)
  })
  it('rejects anything outside 0–99 or fractional', () => {
    expect(isValidJersey(100)).toBe(false)
    expect(isValidJersey(-1)).toBe(false)
    expect(isValidJersey(4.5)).toBe(false)
    expect(isValidJersey(Number.NaN)).toBe(false)
  })
})

describe('customization options', () => {
  it('offers a real palette and defaults drawn from it', () => {
    expect(PALETTE.length).toBeGreaterThanOrEqual(10)
    expect(SKIN_TONES.length).toBeGreaterThanOrEqual(6)
    expect(HAIRSTYLES).toContain('short')
    expect(PALETTE.map((p) => p.hex)).toContain(DEFAULT_APPEARANCE.jerseyColor)
  })
})
