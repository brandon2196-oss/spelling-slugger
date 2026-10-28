/**
 * Browser text-to-speech. Each call cancels whatever was playing (the child tapped Repeat) and
 * resolves when the utterance ends. `primeSpeech()` must be called from a user gesture once on iOS.
 */

export interface SpeakOptions {
  rate?: number
  pitch?: number
  volume?: number
  /** Use this voice instead of the default "clear English" pick (announcer personas). */
  voice?: SpeechSynthesisVoice | null
  /** Fired when the browser actually starts speaking (mouth animation). */
  onStart?: () => void
}

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function'
    ? window.speechSynthesis
    : null
}

export function speechAvailable(): boolean {
  return synth() !== null
}

let volume = 1
export function setSpeechVolume(v: number): void {
  volume = Math.max(0, Math.min(1, v))
}

/** The browser's voice list (empty when speech is unavailable or voices haven't loaded yet). */
export function availableVoices(): SpeechSynthesisVoice[] {
  return synth()?.getVoices?.() ?? []
}

/** Prefer a clear English voice when the browser offers several. */
function pickVoice(s: SpeechSynthesis): SpeechSynthesisVoice | null {
  const voices = s.getVoices?.() ?? []
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith('en'))
  return (
    en.find((v) => /samantha|google us english|aria|jenny|zira/i.test(v.name)) ??
    en.find((v) => v.lang.toLowerCase() === 'en-us') ??
    en[0] ??
    null
  )
}

/** Resolves the utterance currently in flight; Safari never fires onend for a cancelled one. */
let finishCurrent: (() => void) | null = null

/** Longest we wait for the browser to report an utterance finished before moving the game on. */
export const MAX_UTTERANCE_MS = 10_000

export function speak(text: string, opts: SpeakOptions = {}): Promise<void> {
  const s = synth()
  if (!s) return Promise.reject(new Error('SPEECH_UNAVAILABLE'))
  if ((opts.volume ?? volume) === 0) return Promise.resolve() // muted: nothing to wait for
  return new Promise((resolve) => {
    finishCurrent?.()
    s.cancel()
    const u = new window.SpeechSynthesisUtterance(text)
    u.rate = opts.rate ?? 0.9
    u.pitch = opts.pitch ?? 1
    u.volume = opts.volume ?? volume
    u.lang = 'en-US'
    const voice = opts.voice ?? pickVoice(s)
    if (voice) u.voice = voice
    if (opts.onStart) u.onstart = () => opts.onStart?.()
    let done = false
    const finish = () => {
      if (done) return
      done = true
      if (finishCurrent === finish) finishCurrent = null
      resolve()
    }
    finishCurrent = finish
    u.onend = finish
    u.onerror = finish
    // Some browsers never fire onend; estimate from length (~110 ms per character at these rates)
    // and never wait longer than MAX_UTTERANCE_MS so a play can't lock the input.
    setTimeout(finish, Math.min(MAX_UTTERANCE_MS, Math.max(2500, text.length * 110)))
    s.speak(u)
  })
}

export const speakWord = (word: string) => speak(word, { rate: 0.9 })
export const speakSlowly = (word: string) => speak(word, { rate: 0.5 })
export const speakSentence = (sentence: string) => speak(sentence, { rate: 0.95 })
export const umpire = (call: string) => speak(call, { pitch: 0.7, rate: 1.1 })

/** Call from the first tap/click so mobile browsers unlock speech for later, programmatic calls. */
export function primeSpeech(): void {
  const s = synth()
  if (!s) return
  try {
    const u = new window.SpeechSynthesisUtterance(' ')
    u.volume = 0
    s.speak(u)
  } catch {
    /* ignore */
  }
}
