import { normalize } from '../../../engine/grade'

export interface Candidates {
  /** Words that look like list entries: pre-selected for the parent. */
  likely: string[]
  /** Other wordlike text on the page, offered unselected. */
  other: string[]
}

/** Words that appear on nearly every teacher sheet as headings, never as the week's words. */
const HEADER_WORDS = new Set([
  'spelling', 'words', 'word', 'week', 'weeks', 'name', 'date', 'list', 'lists', 'unit', 'lesson',
  'grade', 'test', 'challenge', 'bonus', 'review', 'homework', 'teacher', 'mrs', 'mr', 'ms', 'miss',
  'page', 'due', 'vocabulary', 'quiz', 'dictation', 'pretest', 'posttest',
])

const NUMBERING = /^\s*(?:\d{1,2}\s*[.):]?|[•·\-–—*>])\s+/
/** "word: meaning" or "word - meaning" lines are definitions, not columns of words. */
const DEFINITION = /[:–—]|\s-\s/
const MAX_LIST_TOKENS = 4
const MAX_WORD_LENGTH = 20

function clean(token: string): string {
  return token
    .replace(/[’‘]/g, "'")
    .replace(/^[^A-Za-z]+/, '')
    .replace(/[^A-Za-z]+$/, '')
}

function isWordlike(t: string): boolean {
  if (!t || t.length > MAX_WORD_LENGTH) return false
  if (t.length === 1) return t === 'a' || t === 'A' || t === 'I'
  return /^[A-Za-z][A-Za-z'-]*[A-Za-z]$/.test(t)
}

const isHeader = (t: string) => HEADER_WORDS.has(t.toLowerCase())

/** Split one line of page text into list entries, or null when the line reads as prose. */
function listEntries(line: string): string[] | null {
  const body = line.replace(NUMBERING, '')
  if (DEFINITION.test(body)) return null
  const pieces = body.split(/[,;\t]+/).map((p) => clean(p.trim()))
  if (pieces.length > 1 && pieces.every((p) => isWordlike(p))) return pieces
  const tokens = body.split(/\s+/).map(clean).filter(Boolean)
  if (tokens.length >= 1 && tokens.length <= MAX_LIST_TOKENS && tokens.every(isWordlike)) return tokens
  return null
}

export function extractCandidates(lines: string[]): Candidates {
  const likely: string[] = []
  const other: string[] = []

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    const entries = listEntries(line)
    if (entries) {
      if (entries.some(isHeader)) other.push(...entries.filter((t) => !isHeader(t)))
      else likely.push(...entries)
      continue
    }
    const tokens = line.replace(NUMBERING, '').split(/\s+/).map(clean).filter(isWordlike)
    const numbered = NUMBERING.test(line)
    tokens.forEach((t, i) => {
      if (isHeader(t)) return
      if (numbered && i === 0) likely.push(t)
      else other.push(t)
    })
  }

  const allCaps = likely.length >= 3 && likely.every((w) => w === w.toUpperCase())
  const cased = allCaps ? likely.map((w) => w.toLowerCase()) : likely

  const seen = new Set<string>()
  const dedupe = (ws: string[]) =>
    ws.filter((w) => {
      const k = normalize(w)
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
  return { likely: dedupe(cased), other: dedupe(other) }
}
