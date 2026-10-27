import type { Appearance, Hairstyle } from '../../data/types'

export const PALETTE: { name: string; hex: string }[] = [
  { name: 'Red', hex: '#d7263d' },
  { name: 'Navy', hex: '#142850' },
  { name: 'Royal blue', hex: '#1f5fd1' },
  { name: 'Sky', hex: '#5bb5f0' },
  { name: 'Green', hex: '#2e8b57' },
  { name: 'Gold', hex: '#f5b700' },
  { name: 'Orange', hex: '#f26b1d' },
  { name: 'Purple', hex: '#6a3fb5' },
  { name: 'Pink', hex: '#ef5da8' },
  { name: 'Teal', hex: '#13a89e' },
  { name: 'Black', hex: '#1b1b1f' },
  { name: 'White', hex: '#f7f7f2' },
  { name: 'Gray', hex: '#8a8f98' },
  { name: 'Maroon', hex: '#7a1f2b' },
]

export const SKIN_TONES: string[] = ['#f6dcc5', '#f1c27d', '#d9a066', '#b97a4b', '#8d5524', '#5c3a1e']
export const HAIR_COLORS: string[] = ['#1b1b1f', '#4a2c0a', '#8b5a2b', '#c68642', '#e0b36a', '#b22222']
export const HAIRSTYLES: Hairstyle[] = ['short', 'buzz', 'curly', 'long', 'ponytail', 'afro']
export const HAIRSTYLE_LABELS: Record<Hairstyle, string> = {
  short: 'Short', buzz: 'Buzz cut', curly: 'Curly', long: 'Long', ponytail: 'Ponytail', afro: 'Afro',
}

export const DEFAULT_APPEARANCE: Appearance = {
  primaryColor: '#d7263d',
  secondaryColor: '#142850',
  jerseyColor: '#f7f7f2',
  pantsColor: '#f7f7f2',
  hatColor: '#142850',
  skinTone: '#f1c27d',
  hairColor: '#4a2c0a',
  hairstyle: 'short',
}

export function isValidJersey(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= 99
}
