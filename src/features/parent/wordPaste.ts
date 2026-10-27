import { normalize } from '../../engine/grade'

/** Turn a pasted block (commas, newlines, tabs, semicolons, "1. word" numbering) into clean words. */
export function parseWordPaste(raw: string): { words: string[]; dropped: string[] } {
  const seen = new Set<string>()
  const words: string[] = []
  const dropped: string[] = []
  for (const piece of raw.split(/[,;\t\r\n]+/)) {
    const text = piece.replace(/^\s*\d+\s*[.)]?\s+/, '').trim()
    if (!text) continue
    const key = normalize(text)
    if (seen.has(key)) {
      dropped.push(text)
      continue
    }
    seen.add(key)
    words.push(text)
  }
  return { words, dropped }
}
