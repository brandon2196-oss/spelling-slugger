import type { Appearance } from '../data/types'

/** Packed hair overlays (public/art/batter). Other styles fall back to short hair. */
export const PACKED_HAIR = ['short', 'buzz', 'curly', 'long'] as const

/** Hair layer for a style, falling back to the packed short hair. */
export function batterHairLayer(style: Appearance['hairstyle'], available: readonly string[] = PACKED_HAIR.map((h) => `hair-${h}`)): string {
  const want = `hair-${style}`
  return available.includes(want) ? want : 'hair-short'
}

/** CSS color each batter layer is tinted with; undefined means draw as packed (never tinted). */
export function batterLayerColor(layer: string, a: Appearance): string | undefined {
  if (layer.startsWith('hair-')) return a.hairColor
  const t: Record<string, string> = {
    skin: a.skinTone, jersey: a.jerseyColor, pants: a.pantsColor, hat: a.hatColor,
    'hat-brim': a.secondaryColor, trim: a.primaryColor,
  }
  return t[layer]
}
