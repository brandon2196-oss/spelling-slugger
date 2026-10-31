import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { BallparkShell } from '../../components/BallparkShell'
import { StadiumStill } from '../../components/StadiumStill'
import { useStore } from '../../data/store'
import { useAudioSettings } from '../../audio/settings'
import { primeSpeech } from '../../audio/speech'
import { sfx } from '../../audio/sfx'
import { preloadAudio } from '../../audio/preload'
import type { GameRecord, WordList } from '../../data/types'
import { resumeOrNull, startMissedWordsGame, startWeeklyGame } from '../game/startGame'
import { PlayerPreview } from '../players/PlayerPreview'
import { usePlayer } from '../players/usePlayers'
import { AnnouncerPicker } from './AnnouncerPicker'
import { useGuardedStart } from './useGuardedStart'
import { recordLine, seasonRecord } from '../../engine/season'

export function ChildHomePage() {
  const { playerId = '' } = useParams()
  const player = usePlayer(playerId)
  const store = useStore()
  const [active, setActive] = useState<WordList | null | undefined>(undefined)
  const [resume, setResume] = useState<GameRecord | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [record, setRecord] = useState('')
  const { start, modal } = useGuardedStart(playerId)
  const audio = useAudioSettings()

  useEffect(() => {
    void preloadAudio(audio.announcer)
  }, [audio.announcer])

  useEffect(() => {
    store.listWordLists(playerId).then((ls) => setActive(ls.find((l) => l.isActive) ?? null))
    resumeOrNull(store, playerId).then(setResume)
    store.listGames(playerId, { mode: 'weekly', status: 'complete' }).then((gs) => setRecord(recordLine(seasonRecord(gs))))
  }, [store, playerId])

  if (player === undefined || active === undefined) return <BallparkShell className="p-8" aria-busy="true" />
  if (!player) return <BallparkShell className="p-8"><Link to="/players" className="btn-cream">Back to players</Link></BallparkShell>

  function playWeek() {
    if (!active) return
    void start(() => startWeeklyGame(store, playerId, active.id))
  }
  async function playMissed() {
    setNotice(null)
    const games = await store.listGames(playerId, { status: 'complete' })
    const anyMissed = games.some((g) => g.attempts.some((a) => !a.correct))
    if (!anyMissed) return setNotice('No missed words yet. Nice!')
    void start(() => startMissedWordsGame(store, playerId))
  }

  return (
    <BallparkShell
      className="px-4 py-6"
      hero={
        <div className="relative">
          <StadiumStill />
          <div className="absolute inset-x-0 bottom-0 flex justify-center">
            <PlayerPreview appearance={player.appearance} hand={player.hand} jerseyNumber={player.jerseyNumber} size={180} />
          </div>
        </div>
      }
    >
      <div className="mx-auto max-w-3xl">
        <header className="mt-4 flex items-center justify-between gap-3">
          <Link to="/players" className="btn-cream min-h-11 text-base">Switch player</Link>
          <Link to="/parent" className="btn-cream min-h-11 text-base">Parent zone</Link>
        </header>

        <div className="mt-4 text-center">
          <h1 className="board-text text-gold text-3xl leading-tight">{player.name}</h1>
          <p className="mt-1 text-chalk/70">{player.teamName || 'Grand Slammers'} · #{player.jerseyNumber}</p>
          {record ? <p className="mt-2 font-display text-3xl text-gold" data-testid="season-record">{record}</p> : null}
        </div>

        {resume ? (
          <div className="mt-6 rounded-3xl bg-gold text-navy p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-2xl">Finish your game</p>
              <p>Word {Math.min(resume.attempts.filter((a) => a.outcome).length + 1, resume.words.length)} of {resume.words.length}</p>
            </div>
            <Link to={`/game/${resume.id}`} className="btn-primary" onClick={() => { primeSpeech(); sfx.unlock() }}>Keep playing</Link>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3">
          {active ? (
            <button type="button" className="btn-gold min-h-16 text-2xl px-8 py-4" onClick={() => void playWeek()}>Play this week&apos;s game</button>
          ) : (
            <div className="ballpark-card border-dashed p-5 text-center">
              <p className="font-display text-2xl">No words yet</p>
              <p className="text-chalk/70">Ask a grown-up to add this week&apos;s words in the parent zone.</p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <Link to={`/play/${playerId}/pick/practice`} className="btn-cream flex-col py-4">Practice</Link>
            <button type="button" className="btn-cream py-4" onClick={() => void playMissed()}>Missed words</button>
            <Link to={`/play/${playerId}/pick/previous`} className="btn-cream flex-col py-4">Past weeks</Link>
          </div>
          {notice ? <p className="text-center text-gold">{notice}</p> : null}
        </div>

        <section aria-label="Announcer booth" className="mt-8">
          <BoothHeading />
          <AnnouncerPicker value={audio.announcer} onChange={(id) => { primeSpeech(); sfx.unlock(); audio.set({ announcer: id }) }} />
        </section>
      </div>
      {modal}
    </BallparkShell>
  )
}

function BoothHeading() {
  return <h2 className="board-text text-gold text-sm mb-3">In the booth tonight</h2>
}
