import { gridToImageData, paletteFor, SPRITES } from './sprites'

const look = {
  hand: 'R' as const, jerseyNumber: 7,
  appearance: {
    primaryColor: '#ff0000', secondaryColor: '#00ff00', jerseyColor: '#0000ff', pantsColor: '#ffffff',
    hatColor: '#123456', skinTone: '#f1c27d', hairColor: '#654321', hairstyle: 'short' as const,
  },
}

describe('gridToImageData', () => {
  it('turns rows of letters into RGBA pixels, dot = transparent', () => {
    const out = gridToImageData(['.a', 'b.'], { a: '#ff0000', b: '#00ff00' })
    expect(out.width).toBe(2)
    expect(out.height).toBe(2)
    expect(Array.from(out.data.slice(0, 4))).toEqual([0, 0, 0, 0])
    expect(Array.from(out.data.slice(4, 8))).toEqual([255, 0, 0, 255])
    expect(Array.from(out.data.slice(8, 12))).toEqual([0, 255, 0, 255])
  })

  it('rejects a letter the palette does not define', () => {
    expect(() => gridToImageData(['x'], {})).toThrow(/x/)
  })

  it('rejects ragged rows', () => {
    expect(() => gridToImageData(['ab', 'a'], { a: '#000', b: '#000' })).toThrow(/ragged/)
  })
})

describe('sprites', () => {
  it('every sprite uses only palette roles and is 16 wide', () => {
    const roles = new Set(Object.keys(paletteFor(look)))
    for (const [name, grid] of Object.entries(SPRITES)) {
      for (const row of grid) {
        expect(row.length, name).toBe(16)
        for (const ch of row) if (ch !== '.') expect(roles.has(ch), `${name} uses ${ch}`).toBe(true)
      }
    }
  })

  it('maps appearance colors onto sprite roles', () => {
    const p = paletteFor(look)
    expect(p.j).toBe('#0000ff')
    expect(p.p).toBe('#ffffff')
    expect(p.h).toBe('#123456')
    expect(p.s).toBe('#f1c27d')
    expect(p.k).toBe('#ff0000')
  })
})
