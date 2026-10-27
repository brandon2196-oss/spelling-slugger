/**
 * Browser text-to-speech. Each call cancels whatever was playing (the child tapped Repeat) and
 * resolves when the utterance ends. `primeSpeech()` must be called from a user gesture once on iOS.
 */

export interface SpeakOptions {
  rate?: number
  pitch?: number
  volume?: number
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

export function speak(text: string, opts: SpeakOptions = {}): Promise<void> {
  const s = synth()
  if (!s) return Promise.reject(new Error('SPEECH_UNAVAILABLE'))
  return new Promise((resolve) => {
    s.cancel()
    const u = new window.SpeechSynthesisUtterance(text)
    u.rate = opts.rate ?? 0.9
    u.pitch = opts.pitch ?? 1
    u.volume = opts.volume ?? volume
    u.lang = 'en-US'
    const voice = pickVoice(s)
    if (voice) u.voice = voice
    let done = false
    const finish = () => {
      if (done) return
      done = true
      resolve()
    }
    u.onend = finish
    u.onerror = finish
    // Some browsers never fire onend for cancelled utterances; don't hang the game.
    setTimeout(finish, Math.max(2500, text.length * 400))
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
