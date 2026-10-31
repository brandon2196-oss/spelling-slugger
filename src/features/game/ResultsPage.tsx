import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '../../components/Button'
import { Stadium } from '../../components/Page'
import { useStore } from '../../data/store'
import { primeSpeech } from '../../audio/speech'
import { sfx } from '../../audio/sfx'
import type { GameRecord } from '../../data/types'
import { rebuild } from '../../engine/replay'
import { summarize } from '../../engine/results'
import type { GameSummary } from '../../engine/results'
import { startMissedWordsGame, startPracticeGame, startThisGameMissesGame, startWeeklyGame } from './startGame'

export function ResultsPage() {
  const { gameId = '' } = useParams()
  const store = useStore()
  const navigate = useNavigate()
  const [record, setRecord] = useState<GameRecord | null | undefined>(undefined)
  const [summary, setSummary] = useState<GameSummary | null>(null)
  const [best, setBest] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    store.getGame(gameId).then(async (g) => {
      setRecord(g)
      if (!g) return
      // The saved summary can lag the final attempt by a network round-trip; the attempt log is
      // the source of truth, so derive the summary from it when needed.
      if (g.summary) setSummary(g.summary)
      else {
        const rebuilt = rebuild(g.words, g.attempts, g.id)
        setSummary(rebuilt.status === 'complete' ? summarize(rebuilt) : null)
      }
      const others = (await store.listGames(g.playerId, { mode: g.mode, status: 'complete' })).filter((x) => x.id !== g.id)
      setBest(others.length ? Math.max(...others.map((x) => x.summary?.runs ?? 0)) : null)
    })
  }, [store, gameId])

  if (record === undefined) return <Stadium className="p-8" aria-busy="true" />
  if (!record || !summary) {
    return (
      <Stadium className="p-8 text-center">
        <p className="text-2xl">No results for that game yet.</p>
        <Link to="/players" className="btn-secondary mt-6">Back to players</Link>
      </Stadium>
    )
  }
  const s = summary
  const newBest = best === null ? s.runs > 0 : s.runs > best

  async function playAgain() {
    primeSpeech()
    sfx.unlock()
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
    primeSpeech()
    sfx.unlock()
    try {
      const g = await startMissedWordsGame(store, record!.playerId)
      navigate(`/game/${g.id}`)
    } catch {
      setError('No missed words to practice. Nice!')
    }
  }

  async function practiceThese() {
    primeSpeech()
    sfx.unlock()
    try {
      const g = await startThisGameMissesGame(store, record!)
      navigate(`/game/${g.id}`)
    } catch {
      setError('No missed words to practice. Nice!')
    }
  }

  const rows: [string, string | number][] = [
    ['Hits', s.hits], ['Home runs', s.homeRuns ?? 0], ['Doubles', s.doubles], ['Singles', s.singles], ['Walks', s.walks], ['Strikeouts', s.strikeouts],
    ['Total strikes', s.totalStrikes], ['First try', s.firstTry], ['Second try', s.secondTry], ['Third try', s.thirdTry],
    ['First-try accuracy', `${s.firstTryAccuracy}%`],
  ]

  return (
    <Stadium className="px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <section aria-label="Postgame show" className="postgame-panel rounded-xl p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-3">
            <span className="on-air-tag pixel-text inline-flex items-center gap-2 rounded-sm px-3 py-2 text-[10px] uppercase" aria-hidden="true">
              <span className="live-dot inline-block h-2 w-2 bg-chalk" />
              Postgame show
            </span>
            <p className="pixel-text text-gold text-xs sm:text-sm uppercase">{newBest ? 'New personal best!' : 'Final score'}</p>
          </div>
          <h1 className="pixel-text announce-pixel mt-5 leading-none text-[clamp(3rem,12vw,5.5rem)]">
            {s.runs}<span className="ml-[0.4em] text-[0.35em] text-chalk [text-shadow:none]">run{s.runs === 1 ? '' : 's'}</span>
          </h1>
          {best !== null ? <p className="mt-3 text-chalk/70">Personal best before today: {best}</p> : null}

          <dl className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-2">
            {rows.map(([k, v]) => (
              <div key={k} className="postgame-cell rounded-md p-3">
                <dt className="pixel-text text-[9px] uppercase text-chalk/60">{k}</dt>
                <dd className="pixel-text mt-2 text-xl text-gold">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            <Breakdown title="This week's words" b={s.current} />
            {s.review.total > 0 ? <Breakdown title="Review words" b={s.review} /> : null}
          </div>

          {s.missedWords.length ? (
            <section className="mt-6">
              <h2 className="pixel-text text-sm sm:text-base uppercase">Words to work on</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {s.missedWords.map((w) => <li key={w} className="rounded-full bg-red/80 px-3 py-1 font-display text-lg">{w}</li>)}
              </ul>
            </section>
          ) : (
            <p className="mt-6 text-xl">No words missed. Perfect game!</p>
          )}
        </section>

        {error ? <p className="mt-4 text-gold">{error}</p> : null}

        {s.missedWords.length ? (
          <Button size="lg" className="mt-8 w-full" onClick={() => void practiceThese()}>Practice these words</Button>
        ) : null}
        <div className={`${s.missedWords.length ? 'mt-3' : 'mt-8'} grid grid-cols-2 gap-3`}>
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
    <div className="postgame-cell rounded-md p-4">
      <h3 className="pixel-text text-xs uppercase text-chalk/80">{title}</h3>
      <p className="text-chalk/80 mt-1">{b.firstTry} of {b.total} on the first try · {b.missed} missed</p>
    </div>
  )
}
