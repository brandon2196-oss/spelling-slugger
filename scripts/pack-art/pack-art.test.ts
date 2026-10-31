/** pack-art: pixel helpers on tiny synthetic images, plus validity of the committed public/art output. */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error plain .mjs build script, no types
import { alignFrames, batterLayer, blobs, img, keyGreen, mergeSlivers, packAtlas, sliceSheet } from './lib.mjs'

type Im = { width: number; height: number; data: Uint8ClampedArray }
const solid = (w: number, h: number, rgb: [number, number, number]): Im => {
  const im = img(w, h) as Im
  for (let i = 0; i < im.data.length; i += 4) im.data.set([...rgb, 255], i)
  return im
}
const paint = (im: Im, x0: number, y0: number, w: number, h: number, rgb: [number, number, number]) => {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) im.data.set([...rgb, 255], (y * im.width + x) * 4)
}
const alpha = (im: Im, x: number, y: number) => im.data[(y * im.width + x) * 4 + 3]

describe('pack-art helpers', () => {
  it('keys #00FF00 but keeps grass green and strips spill at the edge', () => {
    const im = solid(7, 1, [10, 250, 5])
    paint(im, 1, 0, 1, 1, [120, 200, 100]) // fringe touching the key
    paint(im, 2, 0, 1, 1, [200, 50, 50])
    paint(im, 3, 0, 1, 1, [90, 190, 60]) // grass, not touching the key
    paint(im, 4, 0, 1, 1, [200, 50, 50])
    keyGreen(im)
    expect(alpha(im, 0, 0)).toBe(0)
    expect(alpha(im, 3, 0)).toBe(255)
    expect(alpha(im, 4, 0)).toBe(255)
    expect(im.data[1 * 4 + 1]).toBeLessThanOrEqual(120) // spill clamped
    expect(alpha(im, 1, 0)).toBeLessThan(255)
  })
  it('slices figures by gaps and folds a loose ball into its frame', () => {
    expect(mergeSlivers([[0, 30], [32, 34], [40, 70]])).toEqual([[0, 34], [40, 70]])
    const im = solid(40, 10, [0, 255, 0])
    paint(im, 2, 2, 8, 8, [0, 0, 0]); paint(im, 20, 1, 8, 9, [0, 0, 0])
    keyGreen(im)
    expect(sliceSheet(im, {})[0]).toHaveLength(2)
    expect(sliceSheet(im, { perRow: 4, equal: true })[0]).toHaveLength(4)
  })
  it('aligns frames on one baseline and packs a Phaser atlas', () => {
    const a = img(10, 10) as Im, b = img(10, 10) as Im
    paint(a, 1, 1, 3, 3, [1, 1, 1]); paint(b, 4, 2, 2, 6, [1, 1, 1])
    const [fa, fb] = alignFrames([a, b], 0) as Im[]
    expect(fa!.width).toBe(fb!.width)
    expect(fa!.height).toBe(6)
    const { json } = packAtlas([['x-00', fa], ['x-01', fb]], 'x.png')
    expect(Object.keys(json.frames)).toEqual(['x-00', 'x-01'])
    expect(json.frames['x-01'].frame.x).toBe(fa!.width)
  })
  it('splits batter colors into tint layers per the brief table', () => {
    expect(batterLayer(255, 0, 255, false)).toBe('jersey')
    expect(batterLayer(0, 255, 255, false)).toBe('pants')
    expect(batterLayer(255, 255, 0, true)).toBe('hat')
    expect(batterLayer(255, 128, 0, true)).toBe('hat-brim')
    expect(batterLayer(150, 90, 40, false)).toBe('shoes-bat-glove') // bat wood
    expect(batterLayer(0, 0, 255, false)).toBe('trim')
    expect(batterLayer(255, 0, 0, false)).toBe('skin')
    expect(batterLayer(128, 0, 255, true)).toBe('hair-short')
    expect(batterLayer(10, 10, 10, false)).toBe('outline')
  })
  it('finds blobs largest first', () => {
    const im = img(20, 10) as Im
    paint(im, 0, 0, 5, 5, [1, 1, 1]); paint(im, 10, 0, 3, 3, [1, 1, 1])
    expect(blobs(im, 1).map((b: { area: number }) => b.area)).toEqual([25, 9])
  })
})

describe('public/art output', () => {
  const m = JSON.parse(readFileSync('public/art/manifest.json', 'utf8'))
  const assets: { path: string; status: string }[] = []
  const walk = (v: unknown): void => {
    if (!v || typeof v !== 'object') return
    const a = v as { path?: unknown; status?: unknown }
    if (typeof a.path === 'string' && typeof a.status === 'string') { assets.push(a as never); return }
    Object.values(v).forEach(walk)
  }
  walk(m)
  const bytes = (d: string): number => readdirSync(d).reduce((n, e) => n + (statSync(join(d, e)).isDirectory() ? bytes(join(d, e)) : statSync(join(d, e)).size), 0)

  it('every ready asset exists and no file claims ready without one', () => {
    const ready = assets.filter((a) => a.status === 'ready')
    expect(ready.length).toBeGreaterThan(30)
    for (const a of ready) expect(existsSync(join('public', a.path)), a.path).toBe(true)
    for (const a of assets.filter((x) => x.status === 'missing')) expect(existsSync(join('public', a.path)), a.path).toBe(false)
  })
  it('statuses are only missing or ready', () => {
    for (const a of assets) expect(['missing', 'ready']).toContain(a.status)
  })
  it('stays under the size budget', () => {
    expect(bytes('public/art')).toBeLessThanOrEqual(m.sizeBudgetBytes)
  })
  it('every batter clip is packed from art-src, with files on disk and the delivered frame count', () => {
    const clips = m.batter.clips as Record<string, { status: string; frames: number; files: string[]; delivered: { frames: number }; missingLayers: string[] }>
    expect(Object.keys(clips).sort()).toEqual(['celebrate', 'run', 'stance-idle', 'strikeout-slump', 'swing-contact', 'swing-miss', 'take-walk', 'trot'])
    for (const [name, c] of Object.entries(clips)) {
      expect(c.status, name).toBe('ready')
      expect(c.delivered.frames, name).toBe(c.frames)
      for (const f of c.files) expect(existsSync(join('public', f)), f).toBe(true)
      for (const l of ['outline', 'skin', 'jersey', 'pants', 'hat', 'hair-short']) expect(c.missingLayers, `${name} ${l}`).not.toContain(l)
    }
  })
  it('hair overlays are fitted onto the side-view clips but not the front-view celebrate', () => {
    const files = (n: string) => m.batter.clips[n].files as string[]
    for (const style of ['long', 'curly', 'buzz']) {
      expect(files('stance-idle').some((f) => f.endsWith(`-hair-${style}.png`)), style).toBe(true)
      expect(files('celebrate').some((f) => f.endsWith(`-hair-${style}.png`)), style).toBe(false)
    }
  })
  it('atlas frames sit inside their sheet and follow <clip>-NN naming', () => {
    for (const name of ['pitcher', 'fielders', 'catcher-ump', 'crowd', 'mascot']) {
      const j = JSON.parse(readFileSync(`public/art/${name}.json`, 'utf8'))
      for (const [k, f] of Object.entries(j.frames) as [string, { frame: { x: number; y: number; w: number; h: number } }][]) {
        expect(k).toMatch(/-\d{2}$/)
        expect(f.frame.x + f.frame.w).toBeLessThanOrEqual(j.meta.size.w)
        expect(f.frame.y + f.frame.h).toBeLessThanOrEqual(j.meta.size.h)
      }
    }
  })
  it('chrome stays missing (only PNG concepts exist, the contract wants SVG)', () => {
    for (const a of Object.values(m.chrome) as { status: string }[]) expect(a.status).toBe('missing')
  })
})
