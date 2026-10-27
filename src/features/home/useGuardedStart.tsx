import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { useStore } from '../../data/store'
import type { GameRecord } from '../../data/types'

/**
 * Starting a game while one is unfinished asks first. "Start new" abandons the old one: it stays
 * `in_progress` in the store and simply stops being the newest, so it is never resumed.
 */
export function useGuardedStart(playerId: string) {
  const store = useStore()
  const navigate = useNavigate()
  const [pending, setPending] = useState<{ existing: GameRecord; start: () => Promise<GameRecord> } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const start = useCallback(
    async (fn: () => Promise<GameRecord>) => {
      setError(null)
      const existing = await store.findInProgressGame(playerId)
      if (existing) return setPending({ existing, start: fn })
      try {
        const g = await fn()
        navigate(`/game/${g.id}`)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not start the game.')
      }
    },
    [store, playerId, navigate],
  )

  const modal = (
    <Modal open={pending !== null} onClose={() => setPending(null)} title="Finish your current game first?">
      <p>You have a game in progress at word {Math.min((pending?.existing.attempts.filter((a) => a.outcome).length ?? 0) + 1, pending?.existing.words.length ?? 1)} of {pending?.existing.words.length}.</p>
      <div className="mt-5 flex flex-wrap gap-3 justify-end">
        <Button variant="secondary" onClick={() => { const id = pending!.existing.id; setPending(null); navigate(`/game/${id}`) }}>Resume</Button>
        <Button onClick={async () => { const fn = pending!.start; setPending(null); const g = await fn(); navigate(`/game/${g.id}`) }}>Start new</Button>
      </div>
    </Modal>
  )

  return { start, modal, error }
}
