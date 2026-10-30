/** Camera moves for the cartoon stadium. Durations are multiplied by `motion` (motionScale). */
import type Phaser from 'phaser'
import type { Point } from './layout'

export class FieldCamera {
  private scene: Phaser.Scene
  private motion: number
  constructor(scene: Phaser.Scene, motion: number) {
    this.scene = scene
    this.motion = motion
  }

  private ms(n: number): number {
    return Math.max(1, Math.round(n * this.motion))
  }
  private get cam(): Phaser.Cameras.Scene2D.Camera {
    return this.scene.cameras.main
  }
  private wait(n: number): Promise<void> {
    return new Promise((r) => this.scene.time.delayedCall(this.ms(n), r))
  }

  async pushIn(target: Point, ms: number): Promise<void> {
    this.cam.pan(target.x, target.y, this.ms(ms), 'Sine.easeInOut')
    this.cam.zoomTo(1.25, this.ms(ms), 'Sine.easeInOut')
    await this.wait(ms)
  }
  async followBall(ball: Phaser.GameObjects.GameObject, ms: number): Promise<void> {
    this.cam.startFollow(ball, false, 0.12, 0.12)
    await this.wait(ms)
    this.cam.stopFollow()
  }
  async panToStands(target: Point, ms: number): Promise<void> {
    this.cam.pan(target.x, target.y, this.ms(ms), 'Quad.easeOut')
    this.cam.zoomTo(1.15, this.ms(ms), 'Quad.easeOut')
    await this.wait(ms)
  }
  async reset(ms: number): Promise<void> {
    this.cam.stopFollow()
    this.cam.pan(this.cam.width / 2, this.cam.height / 2, this.ms(ms), 'Sine.easeInOut')
    this.cam.zoomTo(1, this.ms(ms), 'Sine.easeInOut')
    await this.wait(ms)
  }
  shake(ms: number): void {
    if (this.motion > 0) this.cam.shake(this.ms(ms), 0.006)
  }
}
