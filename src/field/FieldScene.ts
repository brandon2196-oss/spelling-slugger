/**
 * The stadium. Draws itself procedurally and animates whatever the FieldController is asked to
 * show. Durations are multiplied by `motion` (0..1) so reduced-motion users and tests go fast.
 */
import Phaser from 'phaser'
import type { Bases } from '../engine/types'
import type { FieldController, PlayerLook } from './controller'
import { contactFlash, drawFigure, type Figure } from './figures'
import { FIELD, basePoint, basesDiff, batterPlacement, runnerPath, type Base, type Destination } from './layout'

export interface FieldSceneInit {
  look: PlayerLook
  bases: Bases
  motion: number
}

type RunnerBase = Exclude<Base, 'home'>

const PITCHER_LOOK: PlayerLook = {
  hand: 'R',
  jerseyNumber: 1,
  appearance: {
    primaryColor: '#8a8f98', secondaryColor: '#1b1b1f', jerseyColor: '#8a8f98', pantsColor: '#8a8f98',
    hatColor: '#1b1b1f', skinTone: '#d9a066', hairColor: '#1b1b1f', hairstyle: 'short',
  },
}

export class FieldScene extends Phaser.Scene implements FieldController {
  private look: PlayerLook
  private bases: Bases
  private motion: number
  private batter!: Figure
  private pitcher!: Figure
  private ball!: Phaser.GameObjects.Arc
  private runners: Record<RunnerBase, Figure | null> = { first: null, second: null, third: null }
  private readyResolve!: () => void
  readonly ready: Promise<void>

  constructor(init: FieldSceneInit) {
    super('field')
    this.look = init.look
    this.bases = init.bases
    this.motion = init.motion
    this.ready = new Promise((r) => (this.readyResolve = r))
  }

  private ms(n: number): number {
    return Math.max(1, Math.round(n * this.motion))
  }

  private tween(config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((resolve) => {
      this.tweens.add({ ...config, duration: this.ms((config.duration as number) ?? 300), onComplete: () => resolve() })
    })
  }

  private delay(n: number): Promise<void> {
    return new Promise((r) => this.time.delayedCall(this.ms(n), r))
  }

  create(): void {
    this.drawStadium()
    this.pitcher = drawFigure(this, PITCHER_LOOK, 'pitch', 0.9)
    this.pitcher.setPosition(FIELD.mound.x, FIELD.mound.y + 2)
    this.ball = this.add.circle(FIELD.mound.x + 16, FIELD.mound.y - 54, 5, 0xffffff).setStrokeStyle(1.5, 0xd7263d).setVisible(false)
    this.setPlayer(this.look)
    this.setBases(this.bases)
    this.readyResolve()
  }

  private drawStadium(): void {
    const g = this.add.graphics()
    // night sky
    g.fillGradientStyle(0x2a4a86, 0x2a4a86, 0x142850, 0x142850, 1)
    g.fillRect(0, 0, FIELD.width, 120)
    // stadium lights
    for (const x of [90, 710]) {
      g.fillStyle(0x3b3f4a)
      g.fillRect(x - 3, 20, 6, 110)
      g.fillStyle(0xf5b700)
      g.fillRect(x - 26, 14, 52, 14)
      g.fillStyle(0xfff3c4, 0.08)
      g.fillTriangle(x, 28, x - 220, 300, x + 220, 300)
    }
    // crowd: rows of heads
    const crowd = [0xd7263d, 0xf5b700, 0xfffaf0, 0x1f5fd1, 0xef5da8, 0x13a89e, 0xf26b1d]
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < 46; i++) {
        const x = 8 + i * 17.4 + (row % 2) * 8
        const y = 128 + row * 13
        g.fillStyle(crowd[(i * 7 + row * 3) % crowd.length]!, 0.9)
        g.fillCircle(x, y, 5)
      }
    }
    g.fillStyle(0x0b1733, 0.55)
    g.fillRect(0, 120, FIELD.width, 60)
    // outfield wall
    g.fillStyle(0x1e4d2b)
    g.fillRect(0, 178, FIELD.width, 26)
    g.fillStyle(0xf5b700)
    g.fillRect(0, 178, FIELD.width, 4)
    // grass with mowing stripes
    for (let y = 204; y < FIELD.height; y += 40) {
      g.fillStyle(((y - 204) / 40) % 2 === 0 ? 0x3f9a4a : 0x47a853)
      g.fillRect(0, y, FIELD.width, 40)
    }
    // infield dirt (rounded diamond), base paths and mound
    g.fillStyle(0xc98a4b)
    g.fillCircle(FIELD.mound.x, FIELD.mound.y - 20, 190)
    g.fillStyle(0x3f9a4a)
    g.fillPoints(
      [
        { x: FIELD.home.x, y: FIELD.home.y - 70 },
        { x: FIELD.first.x - 45, y: FIELD.first.y - 10 },
        { x: FIELD.second.x, y: FIELD.second.y + 55 },
        { x: FIELD.third.x + 45, y: FIELD.third.y - 10 },
      ],
      true,
    )
    g.fillStyle(0xc98a4b)
    g.fillCircle(FIELD.mound.x, FIELD.mound.y, 34)
    g.fillCircle(FIELD.home.x, FIELD.home.y, 52)
    // foul lines
    g.lineStyle(3, 0xfffaf0, 0.9)
    g.lineBetween(FIELD.home.x, FIELD.home.y, FIELD.first.x + 180, FIELD.first.y - 130)
    g.lineBetween(FIELD.home.x, FIELD.home.y, FIELD.third.x - 180, FIELD.third.y - 130)
    // bases
    g.fillStyle(0xfffaf0)
    for (const b of ['first', 'second', 'third'] as const) {
      const p = basePoint(b)
      g.fillPoints([{ x: p.x, y: p.y - 10 }, { x: p.x + 12, y: p.y }, { x: p.x, y: p.y + 10 }, { x: p.x - 12, y: p.y }], true)
    }
    const h = FIELD.home
    g.fillPoints([{ x: h.x - 11, y: h.y - 8 }, { x: h.x + 11, y: h.y - 8 }, { x: h.x + 11, y: h.y }, { x: h.x, y: h.y + 9 }, { x: h.x - 11, y: h.y }], true)
    // batter's boxes
    g.lineStyle(2, 0xfffaf0, 0.7)
    g.strokeRect(h.x - 70, h.y - 42, 44, 60)
    g.strokeRect(h.x + 26, h.y - 42, 44, 60)
    // pitcher's rubber
    g.fillStyle(0xfffaf0)
    g.fillRect(FIELD.mound.x - 10, FIELD.mound.y - 2, 20, 4)
  }

  // ------------------------------------------------------------ controller API
  setPlayer(look: PlayerLook): void {
    this.look = look
    this.batter?.destroy()
    const place = batterPlacement(look.hand)
    this.batter = drawFigure(this, look, 'stance', 1.05)
    this.batter.setPosition(place.x, place.y)
    this.batter.setScale(place.flipX ? -1.05 : 1.05, 1.05)
    this.batter.setDepth(10)
  }

  setBases(b: Bases): void {
    this.bases = b
    for (const base of ['first', 'second', 'third'] as const) {
      const want = b[base]
      const have = this.runners[base]
      if (want && !have) this.runners[base] = this.makeRunner(basePoint(base))
      if (!want && have) {
        have.destroy()
        this.runners[base] = null
      }
    }
  }

  private makeRunner(at: { x: number; y: number }): Figure {
    const f = drawFigure(this, this.look, 'run', 0.8)
    f.setPosition(at.x, at.y - 4)
    f.setDepth(5)
    return f
  }

  private resetBall(): void {
    this.ball.setPosition(FIELD.mound.x + 16, FIELD.mound.y - 54).setVisible(true).setScale(1).setDepth(20)
  }

  async playPitch(): Promise<void> {
    // wind-up: pitcher rocks back, then the ball flies to the plate
    await this.tween({ targets: this.pitcher, scaleX: 0.95, scaleY: 0.85, duration: 180, yoyo: true })
    this.resetBall()
    await this.tween({ targets: this.ball, x: FIELD.home.x, y: FIELD.home.y - 30, duration: 520, ease: 'Sine.easeIn' })
  }

  private async swing(): Promise<void> {
    const bat = this.batter.bat
    if (!bat) return
    bat.setAngle(35)
    await this.tween({ targets: bat, angle: -150, duration: 140, ease: 'Quad.easeIn' })
    this.time.delayedCall(this.ms(260), () => bat.setAngle(35))
  }

  async playStrike(n: 1 | 2 | 3): Promise<void> {
    // called strike: the ball sails past into the catcher's glove, the batter twitches
    const miss = n !== 2 // vary it: swing on 1 and 3, look at 2
    if (miss) void this.swing()
    await this.tween({ targets: this.ball, y: FIELD.home.y + 40, alpha: 0, duration: 220 })
    this.ball.setAlpha(1).setVisible(false)
    await this.tween({ targets: this.batter, angle: this.look.hand === 'L' ? 6 : -6, duration: 90, yoyo: true })
    this.batter.setAngle(0)
    await this.delay(150)
  }

  private async moveRunners(moves: { from: Base; to: Destination }[]): Promise<void> {
    // The batter becomes a runner; existing runners advance. All at once, each along its own path.
    const jobs = moves.map(async ({ from, to }) => {
      let fig: Figure
      if (from === 'home') {
        fig = this.makeRunner({ x: FIELD.home.x, y: FIELD.home.y })
        this.batter.setVisible(false)
      } else {
        // If the display and the engine ever disagree, conjure the runner rather than crash the play.
        fig = this.runners[from as RunnerBase] ?? this.makeRunner(basePoint(from))
        this.runners[from as RunnerBase] = null
      }
      for (const p of runnerPath(from, to)) {
        await this.tween({ targets: fig, x: p.x, y: p.y - 4, duration: 420, ease: 'Sine.easeInOut' })
      }
      if (to === 'score') {
        await this.tween({ targets: fig, alpha: 0, scale: 1.1, duration: 250 })
        fig.destroy()
      } else {
        this.runners[to as RunnerBase]?.destroy() // never leave a duplicate on the destination
        this.runners[to as RunnerBase] = fig
      }
    })
    try {
      await Promise.all(jobs)
    } finally {
      this.batter.setVisible(true)
      this.batter.setAlpha(0)
      await this.tween({ targets: this.batter, alpha: 1, duration: 200 })
    }
  }

  async playHit(outcome: 'single' | 'double', before: Bases, after: Bases, runs: number): Promise<void> {
    await this.swing()
    const contact = { x: FIELD.home.x, y: FIELD.home.y - 40 }
    this.ball.setPosition(contact.x, contact.y).setVisible(true)
    contactFlash(this, contact.x, contact.y)
    // ball flight: doubles go deeper; direction is random (left/center/right)
    const dir = Phaser.Math.Between(-1, 1)
    const tx = FIELD.width / 2 + dir * (outcome === 'double' ? 260 : 180) + Phaser.Math.Between(-30, 30)
    const ty = outcome === 'double' ? 190 : 250
    const flight = this.tween({ targets: this.ball, x: tx, y: ty, scale: 0.6, duration: outcome === 'double' ? 900 : 700, ease: 'Quad.easeOut' })
    const run = this.moveRunners(basesDiff(before, after, outcome, runs))
    await Promise.all([flight, run])
    this.ball.setVisible(false)
    this.bases = after
    if (runs > 0) await this.celebrate(runs)
  }

  async playWalk(before: Bases, after: Bases, runs: number): Promise<void> {
    await this.tween({ targets: this.ball, y: FIELD.home.y + 40, alpha: 0, duration: 220 })
    this.ball.setAlpha(1).setVisible(false)
    await this.moveRunners(basesDiff(before, after, 'walk', runs))
    this.bases = after
    if (runs > 0) await this.celebrate(runs)
  }

  private async celebrate(runs: number): Promise<void> {
    const burst = this.add.particles(FIELD.home.x, FIELD.home.y - 60, this.sparkTexture(), {
      speed: { min: 120, max: 260 },
      angle: { min: 200, max: 340 },
      lifespan: 700,
      gravityY: 500,
      quantity: 18 * runs,
      scale: { start: 1, end: 0 },
      tint: [0xf5b700, 0xfffaf0, 0xd7263d],
      emitting: false,
    })
    burst.explode(18 * runs)
    await this.delay(700)
    burst.destroy()
  }

  private sparkTexture(): string {
    if (!this.textures.exists('spark')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false)
      g.fillStyle(0xffffff)
      g.fillCircle(4, 4, 4)
      g.generateTexture('spark', 8, 8)
      g.destroy()
    }
    return 'spark'
  }

  async playInningEnd(_nextInning: number): Promise<void> {
    const figs = Object.values(this.runners).filter((f): f is Figure => f !== null)
    await Promise.all(figs.map((f) => this.tween({ targets: f, alpha: 0, duration: 350 })))
    this.setBases({ first: false, second: false, third: false })
    await this.delay(200)
  }

  async playGameOver(runs: number): Promise<void> {
    const bursts = Math.min(6, 2 + runs)
    for (let i = 0; i < bursts; i++) {
      const x = Phaser.Math.Between(120, FIELD.width - 120)
      const y = Phaser.Math.Between(60, 170)
      const p = this.add.particles(x, y, this.sparkTexture(), {
        speed: { min: 60, max: 220 },
        lifespan: 900,
        gravityY: 200,
        scale: { start: 1.2, end: 0 },
        tint: [0xf5b700, 0xfffaf0, 0xd7263d, 0x5bb5f0],
        emitting: false,
      })
      p.explode(40)
      this.time.delayedCall(this.ms(1000), () => p.destroy())
      await this.delay(220)
    }
    await this.delay(600)
  }

  async banner(text: string, ms = 900): Promise<void> {
    const t = this.add
      .text(FIELD.width / 2, 100, text, { fontFamily: 'Fredoka, sans-serif', fontSize: '56px', color: '#f5b700', stroke: '#0a1630', strokeThickness: 8 })
      .setOrigin(0.5)
      .setScale(0.3)
      .setDepth(50)
    await this.tween({ targets: t, scale: 1, duration: 250, ease: 'Back.easeOut' })
    await this.delay(ms)
    await this.tween({ targets: t, alpha: 0, duration: 200 })
    t.destroy()
  }
}
