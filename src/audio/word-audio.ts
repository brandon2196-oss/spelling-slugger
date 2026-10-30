/**
 * Spelling-word playback: the server's baked Edge TTS clip first, the browser's voice as fallback.
 * Only the API backend has clips; local mode leaves this disabled and always uses browser speech.
 */
import { getSpeechVolume, speakSentence, speakSlowly, speakWord, stopSpeech } from './speech'
import { clipHash, clipUrl, type ClipKind } from './word-audio-profile'

/** The slice of HTMLAudioElement we use (injectable for tests). */
export interface ClipPlayer {
  volume: number
  play(): Promise<void>
  pause(): void
  addEventListener(type: 'ended' | 'error', fn: () => void, opts?: { once?: boolean }): void
}
type MakePlayer = (url: string) => ClipPlayer

let enabled = false
let makePlayer: MakePlayer = (url) => new Audio(url)
let current: ClipPlayer | null = null
/** Hashes the server said it doesn't have yet; retried after a while (they may be baking). */
const missing = new Map<string, number>()
const MISSING_RETRY_MS = 60_000
/** A clip that never reports ended can't lock the input. */
export const MAX_CLIP_MS = 10_000

export function enableBakedWordAudio(on: boolean, player?: MakePlayer): void {
  enabled = on
  if (player) makePlayer = player
  missing.clear()
}

const fallback: Record<ClipKind, (t: string) => Promise<void>> = { word: speakWord, slow: speakSlowly, sentence: speakSentence }

function playClip(url: string): Promise<boolean> {
  current?.pause()
  const a = makePlayer(url)
  current = a
  a.volume = getSpeechVolume()
  return new Promise<boolean>((resolve) => {
    let settled = false
    const done = (ok: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (current === a) current = null
      resolve(ok)
    }
    const timer = setTimeout(() => done(true), MAX_CLIP_MS)
    a.addEventListener('ended', () => done(true), { once: true })
    a.addEventListener('error', () => done(false), { once: true })
    a.play().catch(() => done(false)) // 404, decode failure, or autoplay block
  })
}

/** Say a spelling word (normal or slow) or its sentence. Resolves when playback ends. */
export async function sayWord(kind: ClipKind, text: string): Promise<void> {
  if (enabled && getSpeechVolume() > 0) {
    try {
      const hash = await clipHash(kind, text)
      const missedAt = missing.get(hash)
      if (missedAt === undefined || Date.now() - missedAt > MISSING_RETRY_MS) {
        stopSpeech()
        if (await playClip(clipUrl(hash))) {
          missing.delete(hash)
          return
        }
        missing.set(hash, Date.now())
      }
    } catch {
      /* no Web Crypto (insecure origin) or no Audio: fall through */
    }
  }
  return fallback[kind](text).catch(() => undefined)
}
