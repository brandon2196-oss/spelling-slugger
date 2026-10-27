import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '../../components/Button'
import { Stadium } from '../../components/Page'
import { useStore } from '../../data/store'
import type { GameRecord, WordList } from '../../data/types'
import { resumeOrNull, startMissedWordsGame, startWeeklyGame } from '../game/startGame'
import { PlayerPreview } from '../players/PlayerPreview'
import { usePlayer } from '../players/usePlayers'

export function ChildHomePage() {
  const { playerId = '' } = useParams()
  const player = usePlayer(playerId)
  const store = useStore()
  const navigate = useNavigate()
  const [active, setActive] = useState<WordList | null | undefined>(undefined)
  const [resume, setResume] = useState<GameRecord | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    store.listWordLists(playerId).then((ls) => setActive(ls.find((l) => l.isActive) ?? null))
    resumeOrNull(store, playerId).then(setResume)
  }, [store, playerId])

  if (player === undefined || active === undefined) return <Stadium className="p-8" aria-busy="true" />
  if (!player) return <Stadium className="p-8"><Link to="/players" className="btn-secondary">Back to players</Link></Stadium>

  async function playWeek() {
    if (!active) return
    const g = await startWeeklyGame(store, playerId, active.id)
    navigate(`/game/${g.id}`)
  }
  async function playMissed() {
    try {
      const g = await startMissedWordsGame(store, playerId)
      navigate(`/game/${g.id}`)
    } catch {
      setNotice('No missed words yet. Nice!')
    }
  }

  return (
    <Stadium className="px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between text-chalk/70">
          <Link to="/players" className="underline underline-offset-4">Switch player</Link>
          <Link to="/parent" className="underline underline-offset-4">Parent zone</Link>
        </header>

        <div className="mt-4 flex flex-col sm:flex-row items-center gap-4">
          <PlayerPreview appearance={player.appearance} hand={player.hand} jerseyNumber={player.jerseyNumber} size={180} />
          <div className="text-center sm:text-left">
            <p className="text-gold font-display text-xl">Now batting</p>
            <h1 className="font-display text-5xl leading-none">{player.name}</h1>
            <p className="mt-1 text-chalk/70">{player.teamName || 'Spelling Sluggers'} · #{player.jerseyNumber}</p>
          </div>
        </div>

        {resume ? (
          <div className="mt-6 rounded-3xl bg-gold text-navy p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-2xl">Finish your game</p>
              <p>Word {Math.min(resume.attempts.filter((a) => a.outcome).length + 1, resume.words.length)} of {resume.words.length}</p>
            </div>
            <Link to={`/game/${resume.id}`} className="btn-primary">Keep playing</Link>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3">
          {active ? (
            <Button size="xl" onClick={() => void playWeek()}>Play this week&apos;s game</Button>
          ) : (
            <div className="rounded-3xl border-2 border-dashed border-chalk/30 p-5 text-center">
              <p className="font-display text-2xl">No words yet</p>
              <p className="text-chalk/70">Ask a grown-up to add this week&apos;s words in the parent zone.</p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <Link to={`/play/${playerId}/pick/practice`} className="btn-secondary flex-col py-4">Practice</Link>
            <Button variant="secondary" size="lg" className="py-4" onClick={() => void playMissed()}>Missed words</Button>
            <Link to={`/play/${playerId}/pick/previous`} className="btn-secondary flex-col py-4">Past weeks</Link>
          </div>
          {notice ? <p className="text-center text-gold">{notice}</p> : null}
        </div>
      </div>
    </Stadium>
  )
}
