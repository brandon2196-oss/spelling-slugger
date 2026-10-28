/**
 * Code-drawn 16-bit sprites. A sprite is rows of letters; each letter is a palette role filled from
 * the player's appearance, `.` is transparent. Nothing to license, and every player gets their own
 * colors. Sprites are drawn facing the viewer's LEFT (toward the pitcher for a righty); a lefty is
 * the same texture flipped.
 */
import type Phaser from 'phaser'
import type { PlayerLook } from './controller'

export type Role = 'h' | 's' | 'r' | 'j' | 'p' | 'k' | 'o' | 'b' | 'l' | 'e' | 'n'
export type Palette = Record<string, string>

export const SPRITE_W = 16
export const SPRITE_H = 24

export type Pose = 'stance' | 'swing' | 'runA' | 'runB' | 'pitchA' | 'pitchB'

// h hat · s skin · r hair · j jersey · p pants · k socks · o shoes · b bat handle · l bat barrel · e eye · n number
export const SPRITES: Record<Pose, string[]> = {
  stance: [
    '......hhhh......',
    '.....hhhhhh.....',
    '..hhhhhhhhhh....',
    '.....ssss.r.....',
    '.....esss.r.....',
    '.....ssss.......',
    '......ss.....l..',
    '.....jjjj....l..',
    '....jjjjjj...l..',
    '....jjjjjjs..l..',
    '....jjjjjjssb...',
    '....jjjjjjssb...',
    '....jjjjjj......',
    '....jjjjjj......',
    '.....pppp.......',
    '.....pppp.......',
    '.....pppp.......',
    '....pp..pp......',
    '....pp..pp......',
    '....pp..pp......',
    '....kk..kk......',
    '....kk..kk......',
    '...ooo..ooo.....',
    '...ooo..ooo.....',
  ],
  swing: [
    '......hhhh......',
    '.....hhhhhh.....',
    '..hhhhhhhhhh....',
    '.....ssss.r.....',
    '.....esss.r.....',
    '.....ssss.......',
    '......ss........',
    '.....jjjj.......',
    '....jjjjjj......',
    '...sjjjjjj......',
    'lllbssjjjj......',
    '....jjjjjj......',
    '....jjjjjj......',
    '....jjjjjj......',
    '.....pppp.......',
    '.....pppp.......',
    '....pppppp......',
    '...pp....pp.....',
    '...pp....pp.....',
    '...pp....pp.....',
    '...kk....kk.....',
    '...kk....kk.....',
    '..ooo....ooo....',
    '..ooo....ooo....',
  ],
  runA: [
    '......hhhh......',
    '.....hhhhhh.....',
    '..hhhhhhhhhh....',
    '.....ssss.r.....',
    '.....esss.r.....',
    '.....ssss.......',
    '......ss........',
    '.....jjjj.......',
    '...sjjjjjjs.....',
    '..s.jjjjjj.s....',
    '....jjjjjj......',
    '....jjjjjj......',
    '....jjjjjj......',
    '....jjjjjj......',
    '.....pppp.......',
    '....pppppp......',
    '...pp...ppp.....',
    '..pp.....pp.....',
    '..pp......pp....',
    '.kk........kk...',
    '.kk........kk...',
    'ooo........ooo..',
    'ooo........ooo..',
    '................',
  ],
  runB: [
    '......hhhh......',
    '.....hhhhhh.....',
    '..hhhhhhhhhh....',
    '.....ssss.r.....',
    '.....esss.r.....',
    '.....ssss.......',
    '......ss........',
    '.....jjjj.......',
    '....jjjjjj......',
    '...sjjjjjjs.....',
    '....jjjjjj......',
    '....jjjjjj......',
    '....jjjjjj......',
    '....jjjjjj......',
    '.....pppp.......',
    '.....pppp.......',
    '....pp.pp.......',
    '....pp.pp.......',
    '....pp..pp......',
    '....kk..kk......',
    '....kk..kk......',
    '...ooo..ooo.....',
    '...ooo..ooo.....',
    '................',
  ],
  pitchA: [
    '......hhhh......',
    '.....hhhhhh.....',
    '....hhhhhhhh....',
    '.....ssss.......',
    '.....e..e.......',
    '.....ssss.......',
    '......ss........',
    '.....jjjj.s.....',
    '....jjjjjjs.....',
    '...sjjjjjjs.....',
    '...sjjjjjj......',
    '....jjjjjj......',
    '....jjjjjj......',
    '....jjjjjj......',
    '.....pppp.......',
    '.....pppp.......',
    '.....pppp.......',
    '....pp..pp......',
    '....pp..pp......',
    '....pp..pp......',
    '....kk..kk......',
    '....kk..kk......',
    '...ooo..ooo.....',
    '...ooo..ooo.....',
  ],
  pitchB: [
    '......hhhh......',
    '.....hhhhhh.....',
    '....hhhhhhhh....',
    '.....ssss.......',
    '.....e..e.......',
    '.....ssss.......',
    '......ss........',
    '.....jjjj.......',
    '....jjjjjj......',
    '....jjjjjjss....',
    '....jjjjjj..ss..',
    '....jjjjjj......',
    '....jjjjjj......',
    '....jjjjjj......',
    '.....pppp.......',
    '....pppppp......',
    '...pp...pp......',
    '..pp....pp......',
    '..pp....pp......',
    '.kk.....kk......',
    '.kk.....kk......',
    'ooo....ooo......',
    'ooo....ooo......',
    '................',
  ],
}

export function paletteFor(look: PlayerLook): Record<Role, string> {
  const a = look.appearance
  return {
    h: a.hatColor, s: a.skinTone, r: a.hairColor, j: a.jerseyColor, p: a.pantsColor, k: a.primaryColor,
    o: '#1b1b1f', b: '#6b4a1e', l: '#b8803c', e: '#1b1b1f', n: a.secondaryColor,
  }
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function gridToImageData(grid: string[], palette: Palette): { width: number; height: number; data: Uint8ClampedArray<ArrayBuffer> } {
  const height = grid.length
  const width = grid[0]?.length ?? 0
  const data = new Uint8ClampedArray(width * height * 4)
  grid.forEach((row, y) => {
    if (row.length !== width) throw new Error(`ragged sprite row ${y}`)
    for (let x = 0; x < width; x++) {
      const ch = row[x]!
      if (ch === '.') continue
      const color = palette[ch]
      if (!color) throw new Error(`no palette color for "${ch}"`)
      const [r, g, b] = hexToRgb(color)
      const i = (y * width + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = 255
    }
  })
  return { width, height, data }
}

/** Builds (once) a canvas texture for a grid + palette. Returns the key. */
export function ensureTexture(scene: Phaser.Scene, key: string, grid: string[], palette: Palette): string {
  if (scene.textures.exists(key)) return key
  const { width, height, data } = gridToImageData(grid, palette)
  const tex = scene.textures.createCanvas(key, width, height)
  if (!tex) return key
  const ctx = tex.getContext()
  ctx.putImageData(new ImageData(data, width, height), 0, 0)
  tex.refresh()
  return key
}

export function textureKeys(scene: Phaser.Scene, palette: Palette): Record<Pose, string> {
  const id = Object.values(palette).join('')
  const out = {} as Record<Pose, string>
  for (const pose of Object.keys(SPRITES) as Pose[]) out[pose] = ensureTexture(scene, `fig:${id}:${pose}`, SPRITES[pose], palette)
  return out
}
