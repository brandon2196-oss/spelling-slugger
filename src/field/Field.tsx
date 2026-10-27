import type { Bases } from '../engine/types'
import type { Appearance } from '../data/types'
import type { Hand } from '../engine/types'

export interface PlayerLook {
  hand: Hand
  appearance: Appearance
  jerseyNumber: number
}

/** Placeholder until the Phaser stadium lands (Task 15). */
export function Field(_props: { look: PlayerLook; bases: Bases }) {
  return <div className="aspect-[4/3] w-full rounded-3xl bg-grass-dark" aria-hidden="true" />
}
