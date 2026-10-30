/**
 * Batter rig. Stub until the layered atlas lands: the real rig builds one RenderTexture per clip per
 * appearance, cached by `lookKey`, lefties flipped. Placeholders only need the colors.
 */
import type { PlayerLook } from './controller'

export function lookKey(look: PlayerLook): string {
  const a = look.appearance
  return [a.jerseyColor, a.pantsColor, a.hatColor, a.skinTone, a.hairColor, a.hairstyle, look.jerseyNumber].join('|')
}

export const hex = (c: string): number => {
  const n = parseInt(c.replace('#', ''), 16)
  return Number.isNaN(n) ? 0xffffff : n
}

export function placeholderColors(look: PlayerLook): { jersey: number; pants: number; hat: number; skin: number } {
  const a = look.appearance
  return { jersey: hex(a.jerseyColor), pants: hex(a.pantsColor), hat: hex(a.hatColor), skin: hex(a.skinTone) }
}
