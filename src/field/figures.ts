/** Procedural ballplayers drawn with Phaser graphics primitives. No sprite sheets, no licenses. */
import Phaser from 'phaser'
import type { PlayerLook } from './controller'

export type Pose = 'stance' | 'run' | 'pitch' | 'stand'

export interface Figure extends Phaser.GameObjects.Container {
  bat?: Phaser.GameObjects.Graphics
  arm?: Phaser.GameObjects.Graphics
}

const hex = (s: string): number => Phaser.Display.Color.HexStringToColor(s).color

/** Scale: a figure is ~90px tall at scale 1, feet at y=0, head above (negative y). */
export function drawFigure(scene: Phaser.Scene, look: PlayerLook, pose: Pose, scale = 1): Figure {
  const a = look.appearance
  const c = scene.add.container(0, 0) as Figure
  const g = scene.add.graphics()

  // legs
  g.fillStyle(hex(a.pantsColor))
  if (pose === 'run') {
    g.fillRoundedRect(-16, -38, 12, 34, 5)
    g.fillRoundedRect(4, -38, 12, 34, 5)
  } else {
    g.fillRoundedRect(-13, -38, 11, 36, 5)
    g.fillRoundedRect(2, -38, 11, 36, 5)
  }
  // socks + shoes
  g.fillStyle(hex(a.primaryColor))
  g.fillRect(-13, -14, 11, 5)
  g.fillRect(2, -14, 11, 5)
  g.fillStyle(0x1b1b1f)
  g.fillRoundedRect(-16, -5, 15, 6, 3)
  g.fillRoundedRect(1, -5, 15, 6, 3)
  // torso
  g.fillStyle(hex(a.jerseyColor))
  g.fillRoundedRect(-18, -72, 36, 38, 9)
  g.fillStyle(hex(a.primaryColor))
  g.fillRoundedRect(-18, -72, 36, 7, 3)
  // head + cap
  g.fillStyle(hex(a.skinTone))
  g.fillRect(-5, -80, 10, 10)
  g.fillCircle(0, -88, 13)
  g.fillStyle(hex(a.hairColor))
  g.fillRect(-12, -92, 24, 6)
  g.fillStyle(hex(a.hatColor))
  g.fillEllipse(0, -94, 28, 16)
  g.fillRect(-14, -96, 28, 6)
  g.fillRect(-24, -95, 14, 4) // brim toward the viewer's left (pitcher side for a righty)
  c.add(g)

  // number on the back/front
  const num = scene.add
    .text(0, -54, String(look.jerseyNumber), {
      fontFamily: 'Fredoka, Arial Rounded MT Bold, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: a.secondaryColor,
    })
    .setOrigin(0.5)
  c.add(num)

  // arms (one graphic so the swing can rotate them)
  const arm = scene.add.graphics()
  arm.lineStyle(9, hex(a.jerseyColor))
  if (pose === 'pitch') {
    arm.lineBetween(0, 0, 18, -26)
    arm.fillStyle(hex(a.skinTone))
    arm.fillCircle(18, -26, 5)
  } else if (pose === 'stance') {
    arm.lineBetween(0, 0, 20, 2)
    arm.fillStyle(hex(a.skinTone))
    arm.fillCircle(21, 2, 5)
    arm.fillCircle(26, -2, 5)
  } else {
    arm.lineBetween(0, 0, -12, 14)
    arm.lineBetween(0, 0, 12, 14)
  }
  arm.setPosition(0, -62)
  c.add(arm)
  c.arm = arm

  if (pose === 'stance') {
    // bat pivots at the hands, pointing up and back over the shoulder
    const bat = scene.add.graphics()
    bat.lineStyle(7, 0x6b4a1e)
    bat.lineBetween(0, 0, 0, -14)
    bat.lineStyle(9, 0xb8803c)
    bat.lineBetween(0, -14, 0, -58)
    bat.setPosition(24, -62)
    bat.setAngle(35)
    c.add(bat)
    c.bat = bat
  }

  c.setScale(scale)
  return c
}

/** A quick white flash where the bat meets the ball. */
export function contactFlash(scene: Phaser.Scene, x: number, y: number): void {
  const star = scene.add.star(x, y, 8, 6, 18, 0xffffff).setAlpha(0.95)
  scene.tweens.add({ targets: star, scale: 2.2, alpha: 0, duration: 220, onComplete: () => star.destroy() })
}
