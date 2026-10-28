/** A ballplayer on the field: one image whose texture swaps between poses. Feet at (x, y). */
import Phaser from 'phaser'
import type { PlayerLook } from './controller'
import { paletteFor, textureKeys, type Pose } from './sprites'

export class PixelFigure extends Phaser.GameObjects.Image {
  private keys: Record<Pose, string>
  private runTimer: Phaser.Time.TimerEvent | null = null

  constructor(scene: Phaser.Scene, look: PlayerLook, pose: Pose, x = 0, y = 0) {
    const keys = textureKeys(scene, paletteFor(look))
    super(scene, x, y, keys[pose])
    this.keys = keys
    this.setOrigin(0.5, 1)
    scene.add.existing(this)
  }

  setPose(pose: Pose): this {
    this.setTexture(this.keys[pose])
    return this
  }

  /** Alternate the two run frames until `stopRunning`. */
  startRunning(ms: number): void {
    this.stopRunning()
    let a = true
    this.setPose('runA')
    this.runTimer = this.scene.time.addEvent({ delay: Math.max(1, ms), loop: true, callback: () => { a = !a; this.setPose(a ? 'runA' : 'runB') } })
  }

  stopRunning(): void {
    this.runTimer?.remove()
    this.runTimer = null
  }

  override destroy(fromScene?: boolean): void {
    this.stopRunning()
    super.destroy(fromScene)
  }
}

/** A quick 16-bit star where the bat meets the ball. */
export function contactFlash(scene: Phaser.Scene, x: number, y: number): void {
  const g = scene.add.graphics().setDepth(30)
  g.fillStyle(0xffffff)
  g.fillRect(x - 1, y - 4, 2, 8)
  g.fillRect(x - 4, y - 1, 8, 2)
  g.fillStyle(0xf5b700)
  g.fillRect(x - 3, y - 3, 2, 2)
  g.fillRect(x + 1, y + 1, 2, 2)
  g.fillRect(x + 1, y - 3, 2, 2)
  g.fillRect(x - 3, y + 1, 2, 2)
  scene.tweens.add({ targets: g, alpha: 0, scale: 1.8, duration: 200, onComplete: () => g.destroy() })
}
