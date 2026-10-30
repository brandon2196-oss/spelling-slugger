/**
 * Spelling-word playback: the server's baked Edge TTS clip first (on the mixer's voice bus, so the
 * crowd ducks under it and it gets the stadium reverb), the browser's voice as fallback (duck only).
 * Only the API backend has clips; local mode leaves this disabled and always uses browser speech.
 */
import { clips, type ClipPlayer } from './clips'
import { getSpeechVolume, setSpeechDucker, speakSentence, speakSlowly, speakWord, stopSpeech } from './speech'
import { clipHash, clipUrl, type ClipKind } from './word-audio-profile'

setSpeechDucker(clips)

let enabled = false
let player: ClipPlayer = clips
/** Hashes the server said it doesn't have yet; retried after a while (they may be baking). */
const missing = new Map<string, number>()
const MISSING_RETRY_MS = 60_000
/** A clip that never reports ended can't lock the input. */
export const MAX_CLIP_MS = 10_000

export function enableBakedWordAudio(on: boolean, p?: ClipPlayer): void {
  enabled = on
  if (p) player = p
  missing.clear()
}

const fallback: Record<ClipKind, (t: string) => Promise<void>> = { word: speakWord, slow: speakSlowly, sentence: speakSentence }

/** True if the clip loaded and played (or hit the cap); false if it is missing or undecodable. */
async function playClip(url: string): Promise<boolean> {
  player.stopBus('voice') // a repeat tap cuts the previous word (and any booth line) so words stay clear
  try {
    await player.load(url)
  } catch {
    return false
  }
  await Promise.race([player.play(url, { bus: 'voice' }), new Promise<void>((r) => setTimeout(r, MAX_CLIP_MS))])
  return true
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
      /* no Web Crypto (insecure origin): fall through */
    }
  }
  return fallback[kind](text).catch(() => undefined)
}
