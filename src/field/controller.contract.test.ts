/**
 * Every FieldController method resolves on both scenes, at motionScale 0, against a stubbed Phaser
 * whose tweens and timers complete immediately. Proves the contract, not the pixels.
 */
import { describe, expect, it, vi } from 'vitest'
import type { FieldBeat, FieldController, PlayerLook } from './controller'

vi.mock('phaser', () => {
  /** Anything: every property is itself, every call returns itself. */
  const any = (): unknown => {
    const fn = function () {} as unknown as object
    const p: unknown = new Proxy(fn, {
      get: (_t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : p),
      apply: () => p,
    })
    return p
  }
  const done = (cfg: { onComplete?: () => void }) => { cfg?.onComplete?.(); return any() }
  class Scene {
    add = any()
    make = any()
    textures = any()
    cameras = any()
    events = any()
    tweens = { add: done, killAll: () => {} }
    time = { delayedCall: (_ms: number, cb: () => void) => { cb(); return any() }, addEvent: () => any() }
    constructor(_key?: string) {}
  }
  class Image {
    scene: Scene
    x = 0; y = 0; active = true
    constructor(scene: Scene) { this.scene = scene }
    setOrigin() { return this } setTexture() { return this } setScale() { return this } setFlipX() { return this }
    setDepth() { return this } setVisible() { return this } setAlpha() { return this } setX() { return this }
    destroy() {}
  }
  const Phaser = { Scene, GameObjects: { Image }, Math: { Between: (a: number) => a } }
  return { default: Phaser, ...Phaser }
})

const { FieldScene } = await import('./FieldScene')
const { CartoonScene } = await import('./CartoonScene')

const look: PlayerLook = {
  hand: 'L', jerseyNumber: 7,
  appearance: { primaryColor: '#d7263d', secondaryColor: '#fff', jerseyColor: '#d7263d', pantsColor: '#fff', hatColor: '#123', skinTone: '#d9a066', hairColor: '#000', hairstyle: 'short' },
}
const empty = { first: false, second: false, third: false }
const loaded = { first: true, second: true, third: false }

type Scene = FieldController & { create(): void; ready: Promise<void> }
const scenes: [string, () => Scene][] = [
  ['pixel', () => new FieldScene({ look, bases: empty, motion: 0 }) as unknown as Scene],
  ['cartoon', () => new CartoonScene({ look, bases: empty, motion: 0 }) as unknown as Scene],
]

describe.each(scenes)('FieldController contract: %s', (_name, make) => {
  it('every method resolves', async () => {
    const s = make()
    s.create()
    await s.ready
    s.setPlayer({ ...look, hand: 'R' })
    s.setBases(loaded)
    await s.playPitch()
    await s.playStrike(1)
    await s.playStrike(2)
    await s.playStrike(3)
    await s.playHit('single', empty, { ...empty, first: true }, 0)
    await s.playHit('double', loaded, { first: false, second: true, third: false }, 2)
    await s.playHit('homeRun', loaded, empty, 3)
    await s.playWalk(empty, { ...empty, first: true }, 0)
    await s.playInningEnd(2)
    await s.playGameOver(4)
    await s.banner('RUN SCORED', 10)
  })
})

describe('cartoon beats', () => {
  it('fires the Phase 2 timing points', async () => {
    const s = new CartoonScene({ look, bases: empty, motion: 0 })
    const beats: FieldBeat[] = []
    s.onBeat = (b) => beats.push(b)
    s.create()
    await s.playPitch()
    await s.playHit('double', { ...empty, second: true }, { ...empty, second: true }, 1)
    await s.playHit('homeRun', { ...empty, first: true }, empty, 2)
    expect(beats.filter((b) => b === 'runScored')).toHaveLength(3)
    expect(beats).toContain('pitchArrival')
    expect(beats).toContain('wall')
    expect(beats).toContain('leavesYard')
    expect(beats.filter((b) => b === 'contact')).toHaveLength(2)
  })
  it('a throwing hook never breaks a play', async () => {
    const s = new CartoonScene({ look, bases: empty, motion: 0 })
    s.onBeat = () => { throw new Error('boom') }
    s.create()
    await expect(s.playPitch()).resolves.toBeUndefined()
  })
})
