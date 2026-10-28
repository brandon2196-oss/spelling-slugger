/**
 * Synthesized sound effects. No audio files, nothing to license: noise bursts, filtered swells and
 * little square/triangle-wave arpeggios built on one lazily created AudioContext.
 *
 * Every effect draws from a pool of variants (filter, pitch, length, decay, arpeggio shape) and never
 * plays the same variant twice in a row, so a long game doesn't sound like a loop.
 */
import { createPicker } from './pool'

export type OrganRiff = 'charge' | 'inning' | 'walkup'

type Variant = () => void

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

  // ---- building blocks -------------------------------------------------------------------------

  private noise(duration: number, gainPeak: number, filterHz: number, decay = 0.9, q = 0.8): void {
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
    filter.Q.value = q
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(gainPeak, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
    src.connect(filter).connect(gain).connect(master)
    src.start()
  }

  /** Band-passed noise that swells in, then fades, while the band centre slides from one pitch to another. */
  private swell(duration: number, peak: number, fromHz: number, toHz: number, attack = 0.3, q = 1.5): void {
    const o = this.out
    if (!o) return
    const { ctx, master } = o
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.Q.value = q
    const t0 = ctx.currentTime
    filter.frequency.setValueAtTime(fromHz, t0)
    filter.frequency.exponentialRampToValueAtTime(toHz, t0 + duration)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(peak, t0 + duration * attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
    src.connect(filter).connect(gain).connect(master)
    src.start()
  }

  private tone(freq: number, start: number, duration: number, type: OscillatorType = 'triangle', peak = 0.25, glideTo?: number): void {
    const o = this.out
    if (!o) return
    const { ctx, master } = o
    const osc = ctx.createOscillator()
    osc.type = type
    const t0 = ctx.currentTime + start
    osc.frequency.setValueAtTime(freq, t0)
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + duration)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
    osc.connect(gain).connect(master)
    osc.start(t0)
    osc.stop(t0 + duration + 0.05)
  }

  /** Ballpark organ: a square wave with a quieter triangle an octave up, held flat then released. */
  private organNote(freq: number, start: number, duration: number, peak = 0.16): void {
    const o = this.out
    if (!o) return
    const { ctx, master } = o
    const t0 = ctx.currentTime + start
    const voices: Array<[OscillatorType, number, number]> = [['square', freq, peak], ['triangle', freq * 2, peak * 0.5]]
    for (const [type, f, p] of voices) {
      const osc = ctx.createOscillator()
      osc.type = type
      osc.frequency.setValueAtTime(f, t0)
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(p, t0 + 0.015)
      gain.gain.setValueAtTime(p, t0 + duration * 0.8)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
      osc.connect(gain).connect(master)
      osc.start(t0)
      osc.stop(t0 + duration + 0.05)
    }
  }

  private arpeggio(notes: number[], step: number, noteLen: number, type: OscillatorType = 'triangle', peak = 0.25): void {
    notes.forEach((f, i) => this.tone(f, i * step, noteLen, type, peak))
  }

  // ---- pools -----------------------------------------------------------------------------------

  private readonly pickCrack = createPicker<Variant>([
    () => { this.noise(0.12, 0.9, 1800, 0.4); this.tone(180, 0, 0.08, 'square', 0.15) },
    () => { this.noise(0.1, 0.95, 2300, 0.35); this.tone(220, 0, 0.07, 'square', 0.13) },
    () => { this.noise(0.15, 0.85, 1400, 0.5); this.tone(150, 0, 0.1, 'square', 0.17) },
    () => { this.noise(0.11, 0.9, 2000, 0.3, 1.2); this.tone(200, 0, 0.06, 'sawtooth', 0.1) },
  ])
  private readonly pickWhiff = createPicker<Variant>([
    () => this.noise(0.25, 0.25, 600, 1.5),
    () => this.noise(0.3, 0.22, 450, 1.8),
    () => this.noise(0.2, 0.28, 800, 1.2),
    () => this.swell(0.28, 0.22, 900, 400, 0.4, 0.9),
  ])
  private readonly pickCheer = createPicker<Array<(d: number) => void>>([
    [(d) => this.noise(d, 0.5, 900, 0.3), (d) => this.noise(d * 0.8, 0.3, 2400, 0.5)],
    [(d) => this.swell(d, 0.5, 700, 1100, 0.25), (d) => this.noise(d * 0.7, 0.28, 2800, 0.6)],
    [(d) => this.noise(d * 1.1, 0.45, 1100, 0.25), (d) => this.swell(d * 0.9, 0.3, 1800, 2600, 0.2)],
  ])
  private readonly pickWalkChime = createPicker<Variant>([
    () => { this.tone(523, 0, 0.18); this.tone(659, 0.15, 0.25) },
    () => { this.tone(587, 0, 0.16); this.tone(784, 0.14, 0.28) },
    () => { this.tone(494, 0, 0.14); this.tone(587, 0.12, 0.14); this.tone(740, 0.24, 0.3) },
  ])
  private readonly pickStrikeBuzz = createPicker<Variant>([
    () => this.tone(160, 0, 0.22, 'sawtooth', 0.18),
    () => this.tone(140, 0, 0.28, 'sawtooth', 0.16, 110),
    () => this.tone(180, 0, 0.18, 'square', 0.15, 150),
  ])
  private readonly pickFanfare = createPicker<Variant>([
    () => { this.arpeggio([523, 659, 784, 1047], 0.11, 0.22); this.tone(1047, 0.5, 0.5) },
    () => { this.arpeggio([587, 740, 880, 1175], 0.1, 0.2); this.tone(880, 0.45, 0.25); this.tone(1175, 0.65, 0.55) },
    () => { this.arpeggio([392, 523, 659, 784, 1047], 0.09, 0.18); this.tone(1047, 0.5, 0.6, 'square', 0.14) },
  ])
  private readonly pickGroan = createPicker<Variant>([
    () => { this.swell(1.1, 0.4, 420, 180, 0.3); this.tone(220, 0.05, 0.9, 'triangle', 0.08, 150) },
    () => { this.swell(1.3, 0.35, 360, 150, 0.35, 2); this.tone(196, 0.1, 1.0, 'triangle', 0.07, 130) },
    () => { this.swell(0.9, 0.45, 500, 220, 0.25); this.tone(247, 0.05, 0.7, 'sine', 0.08, 165) },
  ])

  // ---- public effects --------------------------------------------------------------------------

  /** Bat on ball. */
  crack(): void { this.pickCrack()() }
  /** Swing and a miss. */
  whiff(): void { this.pickWhiff()() }
  /** Crowd roar that swells and fades. */
  cheer(durationMs = 1400): void {
    const d = durationMs / 1000
    for (const layer of this.pickCheer()) layer(d)
  }
  /** Ball four / take your base. */
  walkChime(): void { this.pickWalkChime()() }
  /** Strike buzzer. */
  strikeBuzz(): void { this.pickStrikeBuzz()() }
  /** Run scored / game over fanfare. */
  fanfare(): void { this.pickFanfare()() }
  /** Crowd "aww": a low noise swell that sinks in pitch. */
  groan(): void { this.pickGroan()() }

  /** Ballpark organ riffs (original melodies). */
  organ(riff: OrganRiff): void {
    switch (riff) {
      case 'charge': {
        // The classic charge rhythm: three quick pickups, two mid notes, one held top note.
        const notes: Array<[number, number, number]> = [
          [523, 0, 0.13], [659, 0.13, 0.13], [784, 0.26, 0.15],
          [880, 0.44, 0.18], [784, 0.64, 0.18], [1047, 0.84, 0.6],
        ]
        for (const [f, t, d] of notes) this.organNote(f, t, d)
        break
      }
      case 'inning': {
        const notes: Array<[number, number, number]> = [[659, 0, 0.14], [784, 0.14, 0.14], [587, 0.28, 0.14], [784, 0.42, 0.4]]
        for (const [f, t, d] of notes) this.organNote(f, t, d, 0.14)
        break
      }
      case 'walkup': {
        const notes = [392, 440, 523, 587, 659]
        notes.forEach((f, i) => this.organNote(f, i * 0.12, i === notes.length - 1 ? 0.4 : 0.12, 0.14))
        break
      }
    }
  }
}

export const sfx = new Sfx()
