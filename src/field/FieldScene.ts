/**
 * The stadium, drawn at 320×240 in a 16-bit style and scaled up with hard pixels. Everything is
 * placed on integer coordinates so nothing smears. Animates whatever the FieldController is asked to
 * show. Durations are multiplied by `motion` (0..1) so reduced-motion users and tests go fast.
 */
import Phaser from 'phaser'
import type { Bases } from '../engine/types'
import type { FieldController, PlayerLook } from './controller'
import { contactFlash, PixelFigure } from './figures'
import { FIELD, basePoint, basesDiff, batterPlacement, grassStripes, infieldDiamond, runnerPath, type Base, type Destination } from './layout'

export interface FieldSceneInit {
  look: PlayerLook
  bases: Bases
  motion: number
}

type RunnerBase = Exclude<Base, 'home'>

/** Sprites are 16×24; drawn at 2× they read as proper 16-bit ballplayers on the 320×240 field. */
const FIGURE_SCALE = 2

const PITCHER_LOOK: PlayerLook = {
  hand: 'R',
  jerseyNumber: 1,
  appearance: {
    primaryColor: '#8a8f98', secondaryColor: '#1b1b1f', jerseyColor: '#8a8f98', pantsColor: '#8a8f98',
    hatColor: '#8a8f98', skinTone: '#d9a066', hairColor: '#1b1b1f', hairstyle: 'short',
  },
}

// Palette
const SKY_A = 0x24427a
const SKY_B = 0x1b3566
const STANDS = 0x0b1733
const WALL = 0x1e4d2b
const GOLD = 0xf5b700
const CHALK = 0xfffaf0
const RED = 0xd7263d
const GRASS_LIGHT = 0x47a853
const GRASS_DARK = 0x3f9a4a
const DIRT = 0xc98a4b
const CROWD = [0xd7263d, 0xf5b700, 0xfffaf0, 0x1f5fd1, 0xef5da8, 0x13a89e, 0xf26b1d]

// Vertical bands (all integers)
const SKY_BOTTOM = 56
const WALL_TOP = 88
const GRASS_TOP = 100

// Depths: stadium 0 < pitcher 4 < runners 5 < batter 10 < ball 20 < flash 30 < particles 40 < banner 50
const DEPTH = { pitcher: 4, runner: 5, batter: 10, ball: 20, particles: 40, banner: 50 } as const

/** A runner's feet sit just below the base so the base peeks out behind the shoes. */
const RUNNER_FOOT = 3

export class FieldScene extends Phaser.Scene implements FieldController {
  private look: PlayerLook
  private bases: Bases
  private motion: number
  private batter!: PixelFigure
  private pitcher!: PixelFigure
  private ball!: Phaser.GameObjects.Rectangle
  private runners: Record<RunnerBase, PixelFigure | null> = { first: null, second: null, third: null }
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
    this.pitcher = new PixelFigure(this, PITCHER_LOOK, 'pitchA', FIELD.mound.x, FIELD.mound.y + 1).setScale(FIGURE_SCALE).setDepth(DEPTH.pitcher)
    this.ball = this.add.rectangle(0, 0, 2, 2, 0xffffff).setVisible(false).setDepth(DEPTH.ball)
    this.setPlayer(this.look)
    this.setBases(this.bases)
    this.readyResolve()
  }

  private drawStadium(): void {
    const g = this.add.graphics()
    // dithered night sky: alternating rows of two blues
    for (let y = 0; y < SKY_BOTTOM; y++) {
      g.fillStyle(y % 2 === 0 ? SKY_A : SKY_B)
      g.fillRect(0, y, FIELD.width, 1)
    }
    // light towers: pole, yellow lamp bar, white lamps, faint cone
    for (const x of [40, 280]) {
      g.fillStyle(0x3b3f4a)
      g.fillRect(x - 1, 10, 2, SKY_BOTTOM - 10)
      g.fillStyle(GOLD)
      g.fillRect(x - 10, 6, 20, 5)
      g.fillStyle(CHALK)
      for (let i = 0; i < 5; i++) g.fillRect(x - 9 + i * 4, 7, 2, 2)
      g.fillStyle(0xfff3c4, 0.07)
      g.fillTriangle(x, 11, x - 70, 150, x + 70, 150)
    }
    // stands: dark band, three rows of 2×2 heads over 4×3 shirts
    g.fillStyle(STANDS)
    g.fillRect(0, SKY_BOTTOM, FIELD.width, WALL_TOP - SKY_BOTTOM)
    for (let row = 0; row < 3; row++) {
      const y = SKY_BOTTOM + 4 + row * 10
      for (let i = 0; i < 54; i++) {
        const x = 2 + i * 6 + (row % 2) * 3
        if (x + 3 > FIELD.width) break
        g.fillStyle(CROWD[(i * 5 + row * 3) % CROWD.length]!)
        g.fillRect(x, y + 2, 4, 3)
        g.fillStyle(0xf1c27d)
        g.fillRect(x + 1, y, 2, 2)
      }
    }
    // outfield wall with a gold stripe
    g.fillStyle(WALL)
    g.fillRect(0, WALL_TOP, FIELD.width, GRASS_TOP - WALL_TOP)
    g.fillStyle(GOLD)
    g.fillRect(0, WALL_TOP, FIELD.width, 2)
    // grass in mowing stripes
    for (const s of grassStripes(GRASS_TOP, FIELD.height)) {
      g.fillStyle(s.light ? GRASS_LIGHT : GRASS_DARK)
      g.fillRect(0, s.y, FIELD.width, s.h)
    }
    // dirt infield around the bases, grass inside the base paths, mound and home circles
    g.fillStyle(DIRT)
    g.fillPoints(infieldDiamond(), true)
    g.fillStyle(GRASS_DARK)
    g.fillPoints(
      [
        { x: FIELD.second.x, y: FIELD.second.y + 10 },
        { x: FIELD.first.x - 10, y: FIELD.first.y },
        { x: FIELD.home.x, y: FIELD.home.y - 12 },
        { x: FIELD.third.x + 10, y: FIELD.third.y },
      ],
      true,
    )
    g.fillStyle(DIRT)
    g.fillCircle(FIELD.mound.x, FIELD.mound.y, 7)
    g.fillCircle(FIELD.home.x, FIELD.home.y, 12)
    // pitcher's rubber
    g.fillStyle(CHALK)
    g.fillRect(FIELD.mound.x - 3, FIELD.mound.y - 1, 6, 1)
    // chalk foul lines, 1px, from the plate past first and third toward the wall
    const h = FIELD.home
    g.lineStyle(1, CHALK, 0.9)
    g.lineBetween(h.x, h.y, h.x + (FIELD.first.x - h.x) * 2.25, h.y + (FIELD.first.y - h.y) * 2.25)
    g.lineBetween(h.x, h.y, h.x + (FIELD.third.x - h.x) * 2.25, h.y + (FIELD.third.y - h.y) * 2.25)
    // bases: 3×3, home plate with a point
    g.fillStyle(CHALK)
    for (const b of ['first', 'second', 'third'] as const) {
      const p = basePoint(b)
      g.fillRect(p.x - 1, p.y - 1, 3, 3)
    }
    g.fillRect(h.x - 2, h.y - 1, 5, 2)
    g.fillRect(h.x - 1, h.y + 1, 3, 1)
    // batter's boxes, 1px outlines centred on pixel rows so they stay crisp
    g.lineStyle(1, CHALK, 0.7)
    g.strokeRect(h.x - 28 + 0.5, h.y - 14 + 0.5, 20, 24)
    g.strokeRect(h.x + 8 + 0.5, h.y - 14 + 0.5, 20, 24)
  }

  // ------------------------------------------------------------ controller API
  setPlayer(look: PlayerLook): void {
    this.look = look
    this.batter?.destroy()
    const place = batterPlacement(look.hand)
    this.batter = new PixelFigure(this, look, 'stance', place.x, place.y).setScale(FIGURE_SCALE)
    this.batter.setFlipX(place.flipX)
    this.batter.setDepth(DEPTH.batter)
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

  private makeRunner(at: { x: number; y: number }): PixelFigure {
    return new PixelFigure(this, this.look, 'runB', at.x, at.y + RUNNER_FOOT).setScale(FIGURE_SCALE).setDepth(DEPTH.runner)
  }

  private resetBall(): void {
    this.ball.setPosition(FIELD.mound.x + 6, FIELD.mound.y - 13).setVisible(true).setScale(1).setAlpha(1)
  }

  async playPitch(): Promise<void> {
    // wind-up frame, then the ball flies to the plate
    this.pitcher.setPose('pitchB')
    await this.delay(200)
    this.pitcher.setPose('pitchA')
    this.resetBall()
    await this.tween({ targets: this.ball, x: FIELD.home.x, y: FIELD.home.y - 10, duration: 520, ease: 'Sine.easeIn' })
  }

  /** Frame-swap swing: hold the swing frame briefly, then back to the stance. */
  private async swing(): Promise<void> {
    const b = this.batter
    b.setPose('swing')
    await this.delay(140)
    if (b.active) b.setPose('stance')
  }

  async playStrike(n: 1 | 2 | 3): Promise<void> {
    // the ball sails past into the catcher's glove; swing on 1 and 3, look at 2
    const miss = n !== 2
    if (miss) void this.swing()
    await this.tween({ targets: this.ball, y: FIELD.home.y + 14, alpha: 0, duration: 220 })
    this.ball.setAlpha(1).setVisible(false)
    // a one-pixel flinch, away from the plate
    const b = this.batter
    const x0 = b.x
    await this.tween({ targets: b, x: x0 + (this.look.hand === 'L' ? 1 : -1), duration: 90, yoyo: true })
    b.setX(x0)
    await this.delay(150)
  }

  private async moveRunners(moves: { from: Base; to: Destination }[]): Promise<void> {
    // The batter becomes a runner; existing runners advance. All at once, each along its own path.
    const jobs = moves.map(async ({ from, to }) => {
      let fig: PixelFigure
      if (from === 'home') {
        fig = this.makeRunner(basePoint('home'))
        this.batter.setVisible(false)
      } else {
        // If the display and the engine ever disagree, conjure the runner rather than crash the play.
        fig = this.runners[from as RunnerBase] ?? this.makeRunner(basePoint(from))
        this.runners[from as RunnerBase] = null
      }
      fig.startRunning(90)
      for (const p of runnerPath(from, to)) {
        fig.setFlipX(p.x > fig.x) // the sprite faces left; face the way we're running
        await this.tween({ targets: fig, x: p.x, y: p.y + RUNNER_FOOT, duration: 420, ease: 'Sine.easeInOut' })
      }
      fig.stopRunning()
      fig.setPose('runB')
      if (to === 'score') {
        await this.tween({ targets: fig, alpha: 0, duration: 250 })
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

  async playHit(outcome: 'single' | 'double' | 'homeRun', before: Bases, after: Bases, runs: number): Promise<void> {
    const sw = this.swing()
    await this.delay(50)
    const contact = { x: FIELD.home.x, y: FIELD.home.y - 14 }
    this.ball.setPosition(contact.x, contact.y).setVisible(true).setAlpha(1)
    contactFlash(this, contact.x, contact.y)
    // ball flight: doubles go deeper; direction is random (left/center/right)
    // home runs leave the yard over the wall
    const deep = outcome !== 'single'
    const dir = Phaser.Math.Between(-1, 1)
    const tx = FIELD.width / 2 + dir * (deep ? 110 : 70) + Phaser.Math.Between(-12, 12)
    const ty = outcome === 'homeRun' ? WALL_TOP - 30 : deep ? WALL_TOP + 4 : GRASS_TOP + 20
    const duration = outcome === 'homeRun' ? 1200 : deep ? 900 : 700
    const flight = this.tween({ targets: this.ball, x: tx, y: ty, scale: 0.5, duration, ease: 'Quad.easeOut' })
    const run = this.moveRunners(basesDiff(before, after, outcome, runs))
    await Promise.all([sw, flight, run])
    this.ball.setVisible(false)
    this.bases = after
    if (runs > 0) await this.celebrate(runs)
  }

  async playWalk(before: Bases, after: Bases, runs: number): Promise<void> {
    await this.tween({ targets: this.ball, y: FIELD.home.y + 14, alpha: 0, duration: 220 })
    this.ball.setAlpha(1).setVisible(false)
    await this.moveRunners(basesDiff(before, after, 'walk', runs))
    this.bases = after
    if (runs > 0) await this.celebrate(runs)
  }

  private async celebrate(runs: number): Promise<void> {
    const burst = this.add
      .particles(FIELD.home.x, FIELD.home.y - 30, this.pixelTexture(), {
        speed: { min: 50, max: 110 },
        angle: { min: 200, max: 340 },
        lifespan: 700,
        gravityY: 200,
        quantity: 18 * runs,
        alpha: { start: 1, end: 0 },
        tint: [GOLD, CHALK, RED],
        emitting: false,
      })
      .setDepth(DEPTH.particles)
    burst.explode(18 * runs)
    await this.delay(700)
    burst.destroy()
  }

  /** A 2×2 white square: the only particle shape a 16-bit stadium needs. */
  private pixelTexture(): string {
    if (!this.textures.exists('px')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false)
      g.fillStyle(0xffffff)
      g.fillRect(0, 0, 2, 2)
      g.generateTexture('px', 2, 2)
      g.destroy()
    }
    return 'px'
  }

  async playInningEnd(_nextInning: number): Promise<void> {
    const figs = Object.values(this.runners).filter((f): f is PixelFigure => f !== null)
    await Promise.all(figs.map((f) => this.tween({ targets: f, alpha: 0, duration: 350 })))
    this.setBases({ first: false, second: false, third: false })
    await this.delay(200)
  }

  async playGameOver(runs: number): Promise<void> {
    const bursts = Math.min(6, 2 + runs)
    for (let i = 0; i < bursts; i++) {
      const x = Phaser.Math.Between(50, FIELD.width - 50)
      const y = Phaser.Math.Between(24, 70)
      const p = this.add
        .particles(x, y, this.pixelTexture(), {
          speed: { min: 25, max: 90 },
          lifespan: 900,
          gravityY: 80,
          alpha: { start: 1, end: 0 },
          tint: [GOLD, CHALK, RED, 0x5bb5f0],
          emitting: false,
        })
        .setDepth(DEPTH.particles)
      p.explode(40)
      this.time.delayedCall(this.ms(1000), () => p.destroy())
      await this.delay(220)
    }
    await this.delay(600)
  }

  async banner(text: string, ms = 900): Promise<void> {
    const t = this.add
      .text(FIELD.width / 2, 44, text, {
        fontFamily: "'Press Start 2P', monospace",
        fontSize: '12px',
        color: '#f5b700',
        stroke: '#0a1630',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setScale(0.3)
      .setDepth(DEPTH.banner)
    await this.tween({ targets: t, scale: 1, duration: 250, ease: 'Back.easeOut' })
    await this.delay(ms)
    await this.tween({ targets: t, alpha: 0, duration: 200 })
    t.destroy()
  }
}
