/**
 * The end-of-game highlight (fun-overhaul brief 6.4): the best play replayed in a small stadium with
 * the booth call, then frozen on the last frame. Reduced motion (and the test build) get a still
 * caption instead. One tap skips it; it never blocks the buttons under it.
 */
import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { sayAs, type AnnounceEvent, type CommentaryContext } from '../../audio/announcer'
import { useAudioSettings } from '../../audio/settings'
import { sfx } from '../../audio/sfx'
import type { HighlightPlay } from '../../engine/highlight'
import type { GameWord, SubmitEvent } from '../../engine/types'
import type { FieldController, PlayerLook } from '../../field/controller'
import { playSequence } from './playSequence'
import { motionScale, wait } from './timing'

const Field = lazy(() => import('../../field/Field').then((m) => ({ default: m.Field })))

const LIMIT_MS = 10_000
const OUTCOME_TEXT: Record<HighlightPlay['outcome'], string> = { homeRun: 'Home run', double: 'Double', single: 'Base hit', walk: 'Walk' }

export function highlightCaption(p: HighlightPlay): string {
  const runs = p.runs === 0 ? '' : p.runs === 1 ? ', 1 run scored' : `, ${p.runs} runs scored`
  return `${OUTCOME_TEXT[p.outcome]} on "${p.word}"${runs}`
}

/** The chosen play as the engine event it was, so playSequence drives the replay like a live play. */
export function highlightEvent(p: HighlightPlay, word: GameWord): SubmitEvent {
  return {
    kind: 'at-bat-complete', outcome: p.outcome, attempts: [], runsScored: p.runs, basesBefore: p.before, basesAfter: p.after,
    outsAfter: 0, inningEnded: false, nextInning: 0, gameOver: false, correctSpelling: p.word, word,
    visitorRunsThisInning: null, visitorsBefore: 0, homeTotal: 0, gameResult: null,
  }
}

export function Highlight({ play, word, look, animate = motionScale() === 1 }: { play: HighlightPlay; word: GameWord; look: PlayerLook; animate?: boolean }) {
  const [skipped, setSkipped] = useState(false)
  const [board, setBoard] = useState<string | null>(null)
  const fieldRef = useRef<FieldController | null>(null)
  const audio = useAudioSettings()
  const caption = highlightCaption(play)

  useEffect(() => {
    if (!animate || skipped) return
    let alive = true
    void (async () => {
      // The scene reports ready through the ref; give it a few seconds, then settle for the still.
      for (let i = 0; i < 40 && alive && !fieldRef.current; i++) await new Promise((r) => setTimeout(r, 100))
      const field = fieldRef.current
      if (!alive || !field) return
      field.setBases(play.before)
      const announce = async (t: string) => {
        if (!alive) return
        setBoard(t)
        await wait(1100)
      }
      const commentary = (e: AnnounceEvent, c: CommentaryContext) => Promise.race([sayAs(audio.announcer, e, c), wait(4000)])
      await Promise.race([playSequence(field, sfx, announce, highlightEvent(play, word), commentary), wait(LIMIT_MS)]).catch(() => undefined)
      // Freeze on the last frame: the scene stays as it ended, the board keeps the caption.
    })()
    return () => {
      alive = false
    }
  }, [animate, skipped, play, word, audio.announcer])

  if (skipped) return null
  return (
    <section aria-label="Highlight" data-testid="highlight" className="mt-6 rounded-md postgame-cell p-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="board-text text-xs uppercase text-gold">Play of the game</h2>
        <button type="button" className="underline text-sm text-chalk/80" onClick={() => setSkipped(true)}>Skip</button>
      </div>
      {animate ? (
        <div className="relative mx-auto mt-2 max-w-sm" onClick={() => setSkipped(true)}>
          <Suspense fallback={<div className="aspect-[4/3] w-full bg-grass-dark" aria-hidden="true" />}>
            <Field look={look} bases={play.before} controllerRef={fieldRef} />
          </Suspense>
          {board ? <p className="board-text absolute inset-x-0 bottom-2 text-center text-gold text-sm [text-shadow:0_2px_0_#000]">{board}</p> : null}
        </div>
      ) : null}
      <p className="mt-2 text-chalk" data-testid="highlight-caption">{caption}</p>
    </section>
  )
}
