import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '../../components/Button'
import { Stadium } from '../../components/Page'
import { useStore } from '../../data/store'
import type { GameRecord } from '../../data/types'
import { startMissedWordsGame, startPracticeGame, startWeeklyGame } from './startGame'

export function ResultsPage() {
  const { gameId = '' } = useParams()
  const store = useStore()
  const navigate = useNavigate()
  const [record, setRecord] = useState<GameRecord | null | undefined>(undefined)
  const [best, setBest] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    store.getGame(gameId).then(async (g) => {
      setRecord(g)
      if (!g) return
      const others = (await store.listGames(g.playerId, { mode: g.mode, status: 'complete' })).filter((x) => x.id !== g.id)
      setBest(others.length ? Math.max(...others.map((x) => x.summary?.runs ?? 0)) : null)
    })
  }, [store, gameId])

  if (record === undefined) return <Stadium className="p-8" aria-busy="true" />
  if (!record || !record.summary) {
    return (
      <Stadium className="p-8 text-center">
        <p className="text-2xl">No results for that game yet.</p>
        <Link to="/players" className="btn-secondary mt-6">Back to players</Link>
      </Stadium>
    )
  }
  const s = record.summary
  const newBest = best === null ? s.runs > 0 : s.runs > best

  async function playAgain() {
    try {
      const g =
        record!.mode === 'weekly' && record!.listId ? await startWeeklyGame(store, record!.playerId, record!.listId)
        : record!.mode === 'practice' && record!.listId ? await startPracticeGame(store, record!.playerId, record!.listId)
        : await startMissedWordsGame(store, record!.playerId)
      navigate(`/game/${g.id}`)
    } catch {
      setError('That list is gone. Pick another game from the home screen.')
    }
  }
  async function practiceMissed() {
    try {
      const g = await startMissedWordsGame(store, record!.playerId)
      navigate(`/game/${g.id}`)
    } catch {
      setError('No missed words to practice. Nice!')
    }
  }

  const rows: [string, string | number][] = [
    ['Hits', s.hits], ['Doubles', s.doubles], ['Singles', s.singles], ['Walks', s.walks], ['Strikeouts', s.strikeouts],
    ['Total strikes', s.totalStrikes], ['First try', s.firstTry], ['Second try', s.secondTry], ['Third try', s.thirdTry],
    ['First-try accuracy', `${s.firstTryAccuracy}%`],
  ]

  return (
    <Stadium className="px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-gold font-display text-xl">{newBest ? 'New personal best!' : 'Final score'}</p>
        <h1 className="font-display leading-none text-7xl sm:text-8xl">{s.runs} <span className="text-4xl text-chalk/70">run{s.runs === 1 ? '' : 's'}</span></h1>
        {best !== null ? <p className="mt-2 text-chalk/70">Personal best before today: {best}</p> : null}

        <dl className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-2">
          {rows.map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-navy/60 border border-chalk/15 p-3">
              <dt className="text-xs uppercase tracking-wider text-chalk/60">{k}</dt>
              <dd className="font-display text-3xl text-gold">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 grid sm:grid-cols-2 gap-3">
          <Breakdown title="This week's words" b={s.current} />
          {s.review.total > 0 ? <Breakdown title="Review words" b={s.review} /> : null}
        </div>

        {s.missedWords.length ? (
          <section className="mt-6">
            <h2 className="font-display text-2xl">Words to work on</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {s.missedWords.map((w) => <li key={w} className="rounded-full bg-red/80 px-3 py-1 font-display text-lg">{w}</li>)}
            </ul>
          </section>
        ) : (
          <p className="mt-6 text-xl">No words missed. Perfect game!</p>
        )}

        {error ? <p className="mt-4 text-gold">{error}</p> : null}

        <div className="mt-8 grid grid-cols-2 gap-3">
          <Button size="lg" onClick={() => void playAgain()}>Play again</Button>
          <Button size="lg" variant="secondary" onClick={() => void practiceMissed()} disabled={s.missedWords.length === 0}>Practice missed words</Button>
          <Link to={`/parent/players/${record.playerId}/stats`} className="btn-secondary">View stats</Link>
          <Link to={`/play/${record.playerId}`} className="btn-secondary">Home</Link>
        </div>
      </div>
    </Stadium>
  )
}

function Breakdown({ title, b }: { title: string; b: { total: number; firstTry: number; missed: number } }) {
  return (
    <div className="rounded-2xl bg-navy/60 border border-chalk/15 p-4">
      <h3 className="font-display text-xl">{title}</h3>
      <p className="text-chalk/80 mt-1">{b.firstTry} of {b.total} on the first try · {b.missed} missed</p>
    </div>
  )
}
