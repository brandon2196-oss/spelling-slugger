import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Stadium } from '../../components/Page'
import { useStore } from '../../data/store'
import type { GameRecord, WordList } from '../../data/types'
import { prettyDate } from '../parent/dates'
import { startPracticeGame, startWeeklyGame } from '../game/startGame'
import { useGuardedStart } from './useGuardedStart'

/** Pick a saved list to practice (`practice`) or to replay as an official week (`previous`). */
export function ListPickerPage() {
  const { playerId = '', mode = 'practice' } = useParams()
  const store = useStore()
  const [lists, setLists] = useState<WordList[] | null>(null)
  const [games, setGames] = useState<GameRecord[]>([])
  const { start, modal, error } = useGuardedStart(playerId)
  const gameMode = mode === 'previous' ? 'weekly' : 'practice'

  useEffect(() => {
    store.listWordLists(playerId).then(setLists)
    store.listGames(playerId, { mode: gameMode, status: 'complete' }).then(setGames)
  }, [store, playerId, gameMode])

  if (!lists) return <Stadium className="p-8" aria-busy="true" />

  const bestFor = (listId: string): number | null => {
    const runs = games.filter((g) => g.listId === listId).map((g) => g.summary?.runs ?? 0)
    return runs.length ? Math.max(...runs) : null
  }

  return (
    <Stadium className="px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <Link to={`/play/${playerId}`} className="text-chalk/70 underline underline-offset-4">← Back</Link>
        <h1 className="mt-3 font-display text-4xl">{mode === 'previous' ? 'Play a past week' : 'Practice a list'}</h1>
        <p className="text-chalk/70">
          {mode === 'previous'
            ? 'Counts like a real weekly game, with review words from the week before it.'
            : 'Just the words on that list, mixed up. Practice never changes your weekly scores.'}
        </p>

        {lists.length === 0 ? (
          <p className="mt-8 text-xl">No lists yet. Ask a grown-up to add some words.</p>
        ) : (
          <ul className="mt-6 grid gap-3">
            {lists.map((l) => {
              const best = bestFor(l.id)
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => void start(() => (gameMode === 'weekly' ? startWeeklyGame(store, playerId, l.id) : startPracticeGame(store, playerId, l.id)))}
                    className="w-full rounded-3xl bg-chalk text-ink p-4 text-left shadow-[0_6px_0_rgba(0,0,0,0.18)] active:translate-y-[3px] active:shadow-none focus-visible:outline-4 focus-visible:outline-gold"
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-display text-2xl text-navy">{l.title}</span>
                      {l.isActive ? <span className="rounded-full bg-grass text-chalk text-xs font-bold px-2 py-0.5">This week</span> : null}
                    </span>
                    <span className="block text-ink/70">
                      Week of {prettyDate(l.weekStart)} · {l.words.length} words
                      {best !== null ? ` · Best: ${best} run${best === 1 ? '' : 's'}` : ''}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {error ? <p className="mt-4 text-gold">{error}</p> : null}
      </div>
      {modal}
    </Stadium>
  )
}
