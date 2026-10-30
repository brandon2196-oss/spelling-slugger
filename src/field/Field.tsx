import Phaser from 'phaser'
import { useEffect, useRef, useState, type RefObject } from 'react'
import type { Bases } from '../engine/types'
import { motionScale } from '../features/game/timing'
import type { FieldController, PlayerLook } from './controller'
import { CartoonScene, CARTOON } from './CartoonScene'
import { readFieldKind } from './fieldChoice'
import { FieldScene } from './FieldScene'
import { loadManifest } from './manifest'
import { FIELD } from './layout'

export type { FieldController, PlayerLook } from './controller'

export interface FieldProps {
  look: PlayerLook
  bases: Bases
  /** Filled with the controller once the scene is ready. */
  controllerRef?: RefObject<FieldController | null>
}

/** Mounts one Phaser game into a 4:3 box; keeps the batter and bases in sync with props. */
export function Field({ look, bases, controllerRef }: FieldProps) {
  const host = useRef<HTMLDivElement>(null)
  const scene = useRef<FieldScene | CartoonScene | null>(null)
  const kind = useRef(readFieldKind())
  const game = useRef<Phaser.Game | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!host.current || game.current) return
    const parent = host.current
    const cartoon = kind.current === 'cartoon'
    let cancelled = false
    const start = (s: FieldScene | CartoonScene) => {
      scene.current = s
      game.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        width: cartoon ? CARTOON.width : FIELD.width,
        height: cartoon ? CARTOON.height : FIELD.height,
        backgroundColor: '#142850',
        transparent: false,
        // Pixel: true 16-bit at 320x240 with nearest-neighbour, FIT scales it up. Cartoon: smooth 1280x960.
        pixelArt: !cartoon,
        roundPixels: !cartoon,
        render: { antialias: cartoon },
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: s,
        audio: { noAudio: true },
        banner: false,
      })
      void s.ready.then(() => {
        if (scene.current !== s) return // StrictMode double-mount: this scene was already torn down
        if (controllerRef) controllerRef.current = s
        setReady(true)
      })
    }
    if (cartoon) {
      void loadManifest().then((manifest) => {
        if (!cancelled) start(new CartoonScene({ look, bases, motion: motionScale(), manifest }))
      })
    } else {
      start(new FieldScene({ look, bases, motion: motionScale() }))
    }
    return () => {
      cancelled = true
      game.current?.destroy(true)
      game.current = null
      scene.current = null
      if (controllerRef) controllerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const s = scene.current
    if (!s) return
    void s.ready.then(() => scene.current === s && s.setPlayer(look))
  }, [look.hand, look.jerseyNumber, look.appearance]) // eslint-disable-line react-hooks/exhaustive-deps

  // `bases` is what the stadium should show when nothing is animating: on mount/resume, and after a
  // play has finished. The scene moves runners itself during a play (FieldScene.moveRunners).
  useEffect(() => {
    const s = scene.current
    if (!s) return
    void s.ready.then(() => scene.current === s && s.setBases(bases))
  }, [bases])

  return (
    <div
      ref={host}
      data-field-ready={ready ? '1' : undefined}
      data-field-kind={kind.current}
      className={`aspect-[4/3] w-full overflow-hidden rounded-3xl bg-navy [&>canvas]:block [&>canvas]:w-full [&>canvas]:h-full ${kind.current === 'pixel' ? '[&>canvas]:[image-rendering:pixelated]' : ''}`}
      aria-hidden="true"
    />
  )
}
