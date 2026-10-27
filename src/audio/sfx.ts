/**
 * Synthesized sound effects. No audio files, nothing to license: noise bursts, filtered swells and
 * little triangle-wave arpeggios built on one lazily created AudioContext.
 */
export class Sfx {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private volume = 0.8
  enabled = true

  /** Create (or resume) the context. Call from a user gesture. */
  unlock(): void {
    const Ctx = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as typeof AudioContext | undefined
    if (!Ctx) return
    if (!this.ctx) {
      this.ctx = new Ctx()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.volume
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v))
    if (this.master) this.master.gain.value = this.volume
  }

  private get out(): { ctx: AudioContext; master: GainNode } | null {
    if (!this.enabled) return null
    this.unlock()
    return this.ctx && this.master ? { ctx: this.ctx, master: this.master } : null
  }

  private noise(duration: number, gainPeak: number, filterHz: number, decay = 0.9): void {
    const o = this.out
    if (!o) return
    const { ctx, master } = o
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, decay)
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = filterHz
    filter.Q.value = 0.8
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(gainPeak, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
    src.connect(filter).connect(gain).connect(master)
    src.start()
  }

  private tone(freq: number, start: number, duration: number, type: OscillatorType = 'triangle', peak = 0.25): void {
    const o = this.out
    if (!o) return
    const { ctx, master } = o
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.value = freq
    const gain = ctx.createGain()
    const t0 = ctx.currentTime + start
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
    osc.connect(gain).connect(master)
    osc.start(t0)
    osc.stop(t0 + duration + 0.05)
  }

  /** Bat on ball. */
  crack(): void {
    this.noise(0.12, 0.9, 1800, 0.4)
    this.tone(180, 0, 0.08, 'square', 0.15)
  }
  /** Swing and a miss. */
  whiff(): void {
    this.noise(0.25, 0.25, 600, 1.5)
  }
  /** Crowd roar that swells and fades. */
  cheer(durationMs = 1400): void {
    const o = this.out
    if (!o) return
    const d = durationMs / 1000
    this.noise(d, 0.5, 900, 0.3)
    this.noise(d * 0.8, 0.3, 2400, 0.5)
  }
  /** Ball four / take your base. */
  walkChime(): void {
    this.tone(523, 0, 0.18)
    this.tone(659, 0.15, 0.25)
  }
  /** Strike buzzer. */
  strikeBuzz(): void {
    this.tone(160, 0, 0.22, 'sawtooth', 0.18)
  }
  /** Run scored / game over fanfare. */
  fanfare(): void {
    const notes = [523, 659, 784, 1047]
    notes.forEach((f, i) => this.tone(f, i * 0.11, 0.22))
    this.tone(1047, 0.5, 0.5)
  }
}

export const sfx = new Sfx()
