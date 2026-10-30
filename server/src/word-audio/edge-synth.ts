/**
 * Edge TTS synth via the unofficial Microsoft Edge "Read aloud" endpoint (`msedge-tts`, pure Node).
 * Unofficial: it can change or rate-limit without notice; the baker retries and the game falls back
 * to browser speech. To swap engines, provide another `Synth` (e.g. `edge-tts-universal`).
 */
import type { ClipProfile } from '../../../src/audio/word-audio-profile'
import type { Synth } from './baker'

const TIMEOUT_MS = 15_000

export function createEdgeSynth(): Synth {
  return async (text: string, profile: ClipProfile) => {
    const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts')
    const tts = new MsEdgeTTS()
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await tts.setMetadata(profile.voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
      const { audioStream } = tts.toStream(text, { rate: profile.rate, pitch: profile.pitch })
      const read = (async () => {
        const chunks: Buffer[] = []
        for await (const c of audioStream) chunks.push(Buffer.from(c as Uint8Array))
        return Buffer.concat(chunks)
      })()
      const timeout = new Promise<never>((_, rej) => { timer = setTimeout(() => rej(new Error('EDGE_TTS_TIMEOUT')), TIMEOUT_MS) })
      return await Promise.race([read, timeout])
    } finally {
      clearTimeout(timer)
      tts.close()
    }
  }
}
