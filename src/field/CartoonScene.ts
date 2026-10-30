/**
 * The cartoon stadium at 1280x960, smooth rendering. Runs on labeled placeholder shapes until the
 * art in public/art/ is marked ready. Animates what the engine already decided; never plays sound.
 * Timing points are reported through `onBeat` so Phase 2 can wire SFX in playSequence.
 * Durations are multiplied by `motion` (motionScale).
 */
import Phaser from 'phaser'
import type { Bases } from '../engine/types'
import { FieldCamera } from './camera'
import type { FieldBeat, FieldController, PlayerLook } from './controller'
import { basesDiff, type Base, type Destination, type Point } from './layout'
import { DEFAULT_COORDS, parseManifest, type Coordinates, type FieldManifest } from './manifest'
import { placeholderColors } from './rig'

export interface CartoonSceneInit {
  look: PlayerLook
  bases: Bases
  motion: number
  manifest?: FieldManifest
}

type RunnerBase = Exclude<Base, 'home'>
type Fig = Phaser.GameObjects.Container

export const CARTOON = { width: 1280, height: 960 } as const
const DEPTH = { fielder: 4, runner: 5, batter: 10, ball: 20, flash: 30, particles: 40, banner: 50 } as const
const GRAY = 0x8a8f98
const GOLD = 0xf5b700
const CHALK = 0xfffaf0
const RED = 0xd7263d
const NAVY = 0x0a1630

export class CartoonScene extends Phaser.Scene implements FieldController {
  onBeat?: (beat: FieldBeat) => void
  private look: PlayerLook
  private bases: Bases
  private motion: number
  private manifest: FieldManifest
  private c: Coordinates
  private camera!: FieldCamera
  private batter!: Fig
  private pitcher!: Fig
  private fielders: Fig[] = []
  private ball!: Phaser.GameObjects.Arc
  private shadow!: Phaser.GameObjects.Ellipse
  private runners: Record<RunnerBase, Fig | null> = { first: null, second: null, third: null }
  private readyResolve!: () => void
  readonly ready: Promise<void>

  constructor(init: CartoonSceneInit) {
    super('cartoon-field')
    this.look = init.look
    this.bases = init.bases
    this.motion = init.motion
    this.manifest = init.manifest ?? parseManifest(null)
    this.c = this.manifest.coords ?? DEFAULT_COORDS
    this.ready = new Promise((r) => (this.readyResolve = r))
  }

  private beat(b: FieldBeat): void {
    try { this.onBeat?.(b) } catch { /* a hook must never break a play */ }
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
    this.camera = new FieldCamera(this, this.motion)
    this.drawStadium()
    this.pitcher = this.person(this.c.mound, GRAY, 'P').setDepth(DEPTH.fielder)
    this.person(this.c.catcher, GRAY, 'C').setDepth(DEPTH.fielder)
    this.fielders = this.c.fielders.map((p, i) => this.person(p, GRAY, String(i + 3)).setDepth(DEPTH.fielder))
    this.shadow = this.add.ellipse(0, 0, 28, 10, 0x000000, 0.3).setVisible(false).setDepth(DEPTH.ball - 1)
    this.ball = this.add.circle(0, 0, 10, 0xffffff).setStrokeStyle(2, 0xcccccc).setVisible(false).setDepth(DEPTH.ball)
    this.setPlayer(this.look)
    this.setBases(this.bases)
    this.events.once('shutdown', () => this.tweens.killAll())
    this.readyResolve()
  }

  // ------------------------------------------------------------ placeholders
  private label(x: number, y: number, text: string, size = 20): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, { fontFamily: 'Fredoka, sans-serif', fontSize: `${size}px`, color: '#ffffff' }).setOrigin(0.5).setAlpha(0.7)
  }

  private drawStadium(): void {
    const { width: W, height: H } = CARTOON
    const wall = this.c.wallY
    const g = this.add.graphics()
    g.fillStyle(0x5bb5f0).fillRect(0, 0, W, wall - 130)
    g.fillStyle(0x1f5fd1).fillRect(0, wall - 130, W, 100)
    g.fillStyle(0x1e4d2b).fillRect(0, wall - 30, W, 50)
    g.fillStyle(0x47a853).fillRect(0, wall + 20, W, H - wall - 20)
    const { homePlate: h, first, second, third, mound } = this.c
    g.fillStyle(0xc98a4b).fillPoints([{ x: second.x, y: second.y - 40 }, { x: first.x + 50, y: first.y }, { x: h.x, y: h.y + 50 }, { x: third.x - 50, y: third.y }], true)
    g.fillStyle(0x3f9a4a).fillPoints([{ x: second.x, y: second.y + 40 }, { x: first.x - 40, y: first.y }, { x: h.x, y: h.y - 48 }, { x: third.x + 40, y: third.y }], true)
    g.fillStyle(0xc98a4b).fillCircle(mound.x, mound.y, 28)
    g.lineStyle(4, CHALK, 0.9)
    g.lineBetween(h.x, h.y, h.x + (first.x - h.x) * 2.25, h.y + (first.y - h.y) * 2.25)
    g.lineBetween(h.x, h.y, h.x + (third.x - h.x) * 2.25, h.y + (third.y - h.y) * 2.25)
    g.fillStyle(CHALK)
    for (const p of [first, second, third]) g.fillRect(p.x - 12, p.y - 12, 24, 24)
    g.fillRect(h.x - 14, h.y - 8, 28, 16)
    const sp = this.c.scoreboardPanel
    g.fillStyle(NAVY, 0.8).fillRoundedRect(sp.x, sp.y, sp.width, sp.height, 12)
    this.label(W / 2, 40, 'sky (placeholder)')
    this.label(W / 2, wall - 80, 'stands (placeholder)')
    this.label(W / 2, wall - 5, 'outfield wall (placeholder)')
    this.label(sp.x + sp.width / 2, sp.y + sp.height / 2, 'scoreboard', 18)
  }

  private person(at: Point, color: number, tag: string, w = 44, h = 88): Fig {
    const body = this.add.graphics()
    body.fillStyle(color).fillRoundedRect(-w / 2, -h, w, h, 14)
    body.lineStyle(3, NAVY, 0.8).strokeRoundedRect(-w / 2, -h, w, h, 14)
    const t = this.add.text(0, -h / 2, tag, { fontFamily: 'Fredoka, sans-serif', fontSize: '22px', color: '#ffffff', stroke: '#0a1630', strokeThickness: 4 }).setOrigin(0.5)
    return this.add.container(at.x, at.y, [body, t])
  }

  private batterPoint(): Point {
    return this.look.hand === 'L' ? this.c.batterBoxRight : this.c.batterBoxLeft
  }

  private makeRunner(at: Point): Fig {
    const col = placeholderColors(this.look)
    const f = this.person(at, col.jersey, String(this.look.jerseyNumber), 36, 70).setDepth(DEPTH.runner)
    // 2-frame breathe loop
    this.tweens.add({ targets: f, scaleY: 1.04, duration: this.ms(500), yoyo: true, repeat: -1 })
    return f
  }

  private basePt(b: Base): Point {
    return b === 'home' ? this.c.homePlate : this.c[b]
  }
  private path(from: Base, to: Destination): Point[] {
    const order: Base[] = ['home', 'first', 'second', 'third']
    const start = order.indexOf(from)
    const end = to === 'score' ? 4 : order.indexOf(to)
    const out: Point[] = []
    for (let i = start + 1; i <= end; i++) out.push(this.basePt(order[i % 4]!))
    return out
  }

  // ------------------------------------------------------------ controller API
  setPlayer(look: PlayerLook): void {
    this.look = look
    this.batter?.destroy()
    const col = placeholderColors(look)
    this.batter = this.person(this.batterPoint(), col.jersey, String(look.jerseyNumber), 56, 110).setDepth(DEPTH.batter)
    if (look.hand === 'L') this.batter.setScale(-1, 1)
  }

  setBases(b: Bases): void {
    this.bases = b
    for (const base of ['first', 'second', 'third'] as const) {
      const want = b[base]
      const have = this.runners[base]
      if (want && !have) this.runners[base] = this.makeRunner(this.basePt(base))
      if (!want && have) {
        have.destroy()
        this.runners[base] = null
      }
    }
  }

  async playPitch(): Promise<void> {
    await this.tween({ targets: this.pitcher, angle: -12, duration: 250, yoyo: true }) // windup-throw
    const m = this.c.mound
    const h = this.c.homePlate
    this.ball.setPosition(m.x, m.y - 80).setScale(1).setVisible(true).setAlpha(1)
    this.shadow.setPosition(m.x, m.y).setVisible(true)
    await Promise.all([
      this.tween({ targets: this.ball, x: h.x, y: h.y - 60, duration: 450, ease: 'Sine.easeIn' }),
      this.tween({ targets: this.shadow, x: h.x, y: h.y, duration: 450, ease: 'Sine.easeIn' }),
    ])
    this.beat('pitchArrival')
  }

  private async swing(): Promise<void> {
    await this.tween({ targets: this.batter, angle: this.look.hand === 'L' ? 25 : -25, duration: 120, yoyo: true })
  }

  async playStrike(n: 1 | 2 | 3): Promise<void> {
    const called = Phaser.Math.Between(1, 3) === 3
    const motion = called ? this.delay(240) : this.swing()
    const into = this.tween({ targets: [this.ball, this.shadow], y: this.c.catcher.y, alpha: 0, duration: 200 })
    await Promise.all([motion, into])
    this.ball.setVisible(false)
    this.shadow.setVisible(false).setAlpha(1)
    if (n === 3) await this.tween({ targets: this.batter, scaleY: 0.85, duration: 300, yoyo: true, hold: 400 }) // strikeout-slump
    await this.banner(n === 1 ? 'STRIKE ONE' : n === 2 ? 'STRIKE TWO' : 'STRIKE THREE', 900)
  }

  private contactFlash(p: Point): void {
    const star = this.add.star(p.x, p.y, 6, 12, 34, 0xffffff).setDepth(DEPTH.flash)
    this.tweens.add({ targets: star, alpha: 0, scale: 1.8, duration: this.ms(220), onComplete: () => star.destroy() })
  }

  private async moveRunners(moves: { from: Base; to: Destination }[], legMs: number): Promise<void> {
    const jobs = moves.map(async ({ from, to }) => {
      let fig: Fig
      if (from === 'home') {
        fig = this.makeRunner(this.basePt('home'))
        this.batter.setVisible(false)
      } else {
        fig = this.runners[from as RunnerBase] ?? this.makeRunner(this.basePt(from))
        this.runners[from as RunnerBase] = null
      }
      const legs = this.path(from, to)
      const per = legMs
      for (const p of legs) await this.tween({ targets: fig, x: p.x, y: p.y, duration: per, ease: 'Sine.easeInOut' })
      if (to === 'score') {
        this.beat('runScored')
        void this.burst(this.c.homePlate, 1)
        await this.tween({ targets: fig, alpha: 0, duration: 200 })
        fig.destroy()
      } else {
        this.runners[to as RunnerBase]?.destroy()
        this.runners[to as RunnerBase] = fig
      }
    })
    try {
      await Promise.all(jobs)
    } finally {
      this.batter.setVisible(true).setAlpha(0)
      await this.tween({ targets: this.batter, alpha: 1, duration: 200 })
    }
  }

  /** Per-leg ms so the batter reaches his base in the brief's time (single 900, double 1400, HR 2200). */
  private legMs(outcome: 'single' | 'double' | 'homeRun' | 'walk'): number {
    return outcome === 'single' || outcome === 'walk' ? 900 : outcome === 'double' ? 700 : 550
  }

  async playHit(outcome: 'single' | 'double' | 'homeRun', before: Bases, after: Bases, runs: number): Promise<void> {
    const sw = this.swing()
    await this.delay(60)
    const h = this.c.homePlate
    const contact = { x: h.x, y: h.y - 60 }
    this.ball.setPosition(contact.x, contact.y).setVisible(true).setAlpha(1).setScale(1)
    this.shadow.setVisible(false)
    this.contactFlash(contact)
    this.beat('contact')
    const side = Phaser.Math.Between(0, 1) === 0 ? -1 : 1
    let target: Point
    let flightMs: number
    if (outcome === 'homeRun') {
      target = this.c.ballLeavesYard
      flightMs = 1200
    } else if (outcome === 'double') {
      target = { x: CARTOON.width / 2 + side * 380, y: this.c.wallY + 10 }
      flightMs = 900
    } else {
      target = { x: CARTOON.width / 2 + side * 280, y: this.c.wallY + 160 }
      flightMs = 700
    }
    const fielder = this.fielders[side < 0 ? 4 : 6]
    const flight = this.tween({ targets: this.ball, x: target.x, y: target.y, scale: outcome === 'homeRun' ? 0.4 : 0.6, duration: flightMs, ease: 'Quad.easeOut' })
      .then(() => {
        if (outcome === 'homeRun') this.beat('leavesYard')
        else if (outcome === 'double') this.beat('wall')
      })
    const chase = fielder && outcome !== 'homeRun' ? this.tween({ targets: fielder, x: target.x, y: target.y + 30, duration: flightMs + 200 }) : Promise.resolve()
    const cam = outcome === 'homeRun'
      ? this.camera.panToStands(this.c.ballLeavesYard, 900).then(() => this.camera.reset(500))
      : this.camera.followBall(this.ball, outcome === 'double' ? 900 : 600).then(() => this.camera.reset(300))
    const run = this.moveRunners(basesDiff(before, after, outcome, runs), this.legMs(outcome))
    await Promise.all([sw, flight, chase, cam, run])
    this.ball.setVisible(false)
    if (fielder) this.fielders.forEach((f, i) => f.setPosition(this.c.fielders[i]!.x, this.c.fielders[i]!.y))
    this.bases = after
    if (outcome === 'homeRun') this.camera.shake(300)
    await this.banner(outcome === 'single' ? 'BASE HIT' : outcome === 'double' ? 'DOUBLE' : 'HOME RUN', 900)
  }

  async playWalk(before: Bases, after: Bases, runs: number): Promise<void> {
    await this.tween({ targets: [this.ball, this.shadow], y: this.c.catcher.y, alpha: 0, duration: 200 })
    this.ball.setVisible(false).setAlpha(1)
    this.shadow.setVisible(false).setAlpha(1)
    await this.moveRunners(basesDiff(before, after, 'walk', runs), this.legMs('walk'))
    this.bases = after
    await this.banner('BALL FOUR', 900)
  }

  private async burst(at: Point, runs: number): Promise<void> {
    const pieces = Array.from({ length: 12 * runs }, () => {
      const p = this.add.circle(at.x, at.y - 60, 6, [GOLD, CHALK, RED][Phaser.Math.Between(0, 2)]).setDepth(DEPTH.particles)
      this.tweens.add({
        targets: p, x: at.x + Phaser.Math.Between(-140, 140), y: at.y - Phaser.Math.Between(80, 220), alpha: 0,
        duration: this.ms(700), onComplete: () => p.destroy(),
      })
      return p
    })
    await this.delay(700)
    void pieces
  }

  async playInningEnd(_nextInning: number): Promise<void> {
    const figs = [...Object.values(this.runners).filter((f): f is Fig => f !== null), ...this.fielders]
    await Promise.all(figs.map((f) => this.tween({ targets: f, alpha: 0, duration: 350 })))
    this.setBases({ first: false, second: false, third: false })
    await this.banner('THREE OUTS', 700)
    await this.banner('NEW INNING', 700)
    await Promise.all(this.fielders.map((f) => this.tween({ targets: f, alpha: 1, duration: 300 })))
  }

  async playGameOver(runs: number): Promise<void> {
    // Before Phase 3, any game counts as a win: celebrate at home.
    this.batter.setPosition(this.c.homePlate.x, this.c.homePlate.y)
    const hop = this.tween({ targets: this.batter, y: this.c.homePlate.y - 40, duration: 220, yoyo: true, repeat: 2 })
    await Promise.all([hop, this.burst(this.c.homePlate, Math.min(4, 1 + runs))])
    this.batter.setPosition(this.batterPoint().x, this.batterPoint().y)
    await this.banner('GAME OVER', 1200)
  }

  async banner(text: string, ms = 900): Promise<void> {
    const panel = this.add.graphics()
    panel.fillStyle(NAVY, 0.9).fillRoundedRect(-300, -50, 600, 100, 24)
    panel.lineStyle(6, GOLD).strokeRoundedRect(-300, -50, 600, 100, 24)
    const t = this.add.text(0, 0, text, { fontFamily: 'Fredoka, sans-serif', fontSize: '56px', fontStyle: 'bold', color: '#f5b700', stroke: '#0a1630', strokeThickness: 8 }).setOrigin(0.5)
    const box = this.add.container(-400, 180, [panel, t]).setDepth(DEPTH.banner).setScrollFactor(0)
    await this.tween({ targets: box, x: CARTOON.width / 2, duration: 250, ease: 'Back.easeOut' })
    await this.delay(ms)
    await this.tween({ targets: box, alpha: 0, duration: 200 })
    box.destroy()
  }
}
