/**
 * Baked spelling-word audio: the voice settings and clip naming shared by the server (which bakes
 * clips with Edge TTS) and the browser (which looks them up). Changing any setting changes every
 * hash, so stale clips are simply never requested again.
 */
export const WORD_VOICE = 'en-US-JennyNeural'

export type ClipKind = 'word' | 'slow' | 'sentence'

export interface ClipProfile { voice: string; rate: string; pitch: string }

export const CLIP_PROFILES: Record<ClipKind, ClipProfile> = {
  word: { voice: WORD_VOICE, rate: '-10%', pitch: '+0Hz' },
  slow: { voice: WORD_VOICE, rate: '-45%', pitch: '+0Hz' },
  sentence: { voice: WORD_VOICE, rate: '-5%', pitch: '+0Hz' },
}

export const CLIP_NAME = /^[a-f0-9]{64}$/

export interface ClipSpec { kind: ClipKind; text: string; profile: ClipProfile }

const normalize = (text: string) => text.trim().replace(/\s+/g, ' ')

/** sha256("voice|rate|pitch|text") as lowercase hex. Web Crypto works in browsers and Node 22. */
export async function clipHash(kind: ClipKind, text: string): Promise<string> {
  const p = CLIP_PROFILES[kind]
  const data = new TextEncoder().encode(`${p.voice}|${p.rate}|${p.pitch}|${normalize(text)}`)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export const clipUrl = (hash: string) => `/audio/words/${hash}.mp3`

/** The clips one list word needs: normal, slow, and its sentence when it has one. */
export function clipsForWord(w: { text: string; sentence?: string | null }): ClipSpec[] {
  const out: ClipSpec[] = [
    { kind: 'word', text: normalize(w.text), profile: CLIP_PROFILES.word },
    { kind: 'slow', text: normalize(w.text), profile: CLIP_PROFILES.slow },
  ]
  if (w.sentence && normalize(w.sentence)) out.push({ kind: 'sentence', text: normalize(w.sentence), profile: CLIP_PROFILES.sentence })
  return out.filter((c) => c.text.length > 0)
}
