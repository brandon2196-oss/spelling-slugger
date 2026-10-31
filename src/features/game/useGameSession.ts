/**
 * The bridge between the pure engine and the Store. Loads a game, rebuilds its state from the
 * attempt log, and persists each submission. `busy` is held from a submission until the UI says
 * the play animation is finished; submissions during that window are ignored (no double scoring).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '../../data/store'
import type { GameRecord } from '../../data/types'
import { submitAnswer } from '../../engine/game'
import { rebuild } from '../../engine/replay'
import { summarize } from '../../engine/results'
import type { GameState, SubmitEvent } from '../../engine/types'

export interface GameSession {
  loading: boolean
  record: GameRecord | null
  state: GameState | null
  busy: boolean
  lastEvent: SubmitEvent | null
  submit(text: string): Promise<SubmitEvent>
  setBusy(b: boolean): void
}

export function useGameSession(gameId: string | undefined): GameSession {
  const store = useStore()
  const [record, setRecord] = useState<GameRecord | null>(null)
  const [state, setState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusyState] = useState(false)
  const [lastEvent, setLastEvent] = useState<SubmitEvent | null>(null)
  const busyRef = useRef(false)
  const stateRef = useRef<GameState | null>(null)

  const setBusy = useCallback((b: boolean) => {
    busyRef.current = b
    setBusyState(b)
  }, [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    if (!gameId) {
      setLoading(false)
      return
    }
    store.getGame(gameId).then((rec) => {
      if (!alive) return
      setRecord(rec)
      const s = rec ? rebuild(rec.words, rec.attempts, rec.id) : null
      stateRef.current = s
      setState(s)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [store, gameId])

  const submit = useCallback(
    async (text: string): Promise<SubmitEvent> => {
      const current = stateRef.current
      if (!gameId || !current) return { kind: 'ignored', reason: 'complete' }
      if (busyRef.current) return { kind: 'ignored', reason: 'busy' }
      const { state: next, event } = submitAnswer(current, text)
      if (event.kind === 'ignored') return event

      setBusy(true)
      stateRef.current = next
      setState(next)
      setLastEvent(event)

      const position = current.index
      try {
        if (event.kind === 'strike') {
          const a = event.attemptsSoFar[event.attemptsSoFar.length - 1]!
          await store.recordAttempt(gameId, { position, attemptNumber: a.attemptNumber, text: a.text, correct: false, outcome: null })
        } else {
          const a = event.attempts[event.attempts.length - 1]!
          await store.recordAttempt(gameId, { position, attemptNumber: a.attemptNumber, text: a.text, correct: a.correct, outcome: event.outcome })
          if (event.gameOver) {
            await store.completeGame(gameId, summarize(next))
            const rec = await store.getGame(gameId)
            if (rec) setRecord(rec)
          }
        }
      } catch (err) {
        // Nothing was saved (or we cannot be sure): undo the optimistic step so the screen and the
        // store agree, and let the caller tell the child to try that swing again.
        stateRef.current = current
        setState(current)
        setLastEvent(null)
        setBusy(false)
        throw new Error('SAVE_FAILED', { cause: err })
      }
      return event
    },
    [gameId, store, setBusy],
  )

  return { loading, record, state, busy, lastEvent, submit, setBusy }
}
