import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Paper } from '../../components/Page'
import { useStore } from '../../data/store'
import type { GameRecord } from '../../data/types'

const outcomeLabel = { double: 'Double', single: 'Single', walk: 'Walk', strikeout: 'Strikeout' } as const

export function GameDetailPage() {
  const { gameId = '' } = useParams()
  const store = useStore()
  const [game, setGame] = useState<GameRecord | null | undefined>(undefined)
  useEffect(() => {
    store.getGame(gameId).then(setGame)
  }, [store, gameId])

  if (game === undefined) return <Paper className="p-8" aria-busy="true" />
  if (!game) return <Paper className="p-8">That game was not found.</Paper>

  return (
    <Paper className="px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <Link to={`/parent/players/${game.playerId}/history`} className="underline text-navy/70">← Game history</Link>
        <h1 className="mt-2 text-3xl text-navy">
          {game.summary?.runs ?? 0} run{game.summary?.runs === 1 ? '' : 's'} · {new Date(game.completedAt ?? game.startedAt).toLocaleString()}
        </h1>
        {game.warnings.length ? <p className="mt-1 text-sm text-ink/60">{game.warnings.join(' ')}</p> : null}

        <ol className="mt-6 divide-y divide-navy/10 rounded-2xl border border-navy/10 bg-white">
          {game.words.map((w) => {
            const attempts = game.attempts.filter((a) => a.position === w.position).sort((a, b) => a.attemptNumber - b.attemptNumber)
            const final = attempts.find((a) => a.outcome)
            const strikes = attempts.filter((a) => !a.correct).length
            return (
              <li key={w.position} className="p-3 grid gap-1 sm:grid-cols-[2rem_1fr_auto] sm:items-center">
                <span className="font-display text-navy/50">{w.position + 1}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xl text-navy">{w.text}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${w.source === 'review' ? 'bg-gold/30 text-ink' : 'bg-navy/10 text-navy'}`}>
                      {w.source === 'review' ? 'Review' : 'This week'}
                    </span>
                  </div>
                  <div className="text-sm text-ink/70 flex flex-wrap gap-x-3">
                    {attempts.length === 0 ? <span>Not attempted</span> : attempts.map((a) => (
                      <span key={a.attemptNumber} className={a.correct ? 'text-grass-dark font-semibold' : 'line-through text-red'}>{a.text}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className={`font-display text-lg ${final?.outcome === 'strikeout' ? 'text-red' : 'text-navy'}`}>{final ? outcomeLabel[final.outcome!] : '—'}</div>
                  <div className="text-ink/60">{strikes} strike{strikes === 1 ? '' : 's'}</div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </Paper>
  )
}
