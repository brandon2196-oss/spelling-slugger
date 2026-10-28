import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { ANNOUNCERS, announcerState, sayAs, type AnnounceEvent, type CommentaryContext } from '../../audio/announcer'
import { useAudioSettings } from '../../audio/settings'
import { sfx } from '../../audio/sfx'
import { primeSpeech, speakSentence, speakSlowly, speakWord, speechAvailable } from '../../audio/speech'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { Stadium } from '../../components/Page'
import { currentWord } from '../../engine/game'
import type { Bases, SubmitEvent } from '../../engine/types'
import type { FieldController } from '../../field/controller'
import { usePlayer } from '../players/usePlayers'
import { Broadcast } from './Broadcast'
import { playSequence } from './playSequence'
import { SpellingInput } from './SpellingInput'
import { wait } from './timing'
import { useGameSession } from './useGameSession'

const ANNOUNCE_MS = 1100
const Field = lazy(() => import('../../field/Field').then((m) => ({ default: m.Field })))

export function GamePage() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const session = useGameSession(gameId)
  const { record, state, busy, submit, setBusy } = session
  const player = usePlayer(record?.playerId)
  const audio = useAudioSettings()

  const [announcement, setAnnouncement] = useState<string | null>(null)
  const [reveal, setReveal] = useState<{ word: string; gameOver: boolean } | null>(null)
  const [peek, setPeek] = useState(false)
  const [focusKey, setFocusKey] = useState(0)
  const [saveError, setSaveError] = useState<string | null>(null)
  /** What the stadium shows. Lags the engine until the play animation has run (see onSubmit). */
  const [fieldBases, setFieldBases] = useState<Bases | null>(null)
  const spokenIndex = useRef<number>(-1)
  const introDone = useRef(false)
  const fieldRef = useRef<FieldController | null>(null)
  const canSpeak = speechAvailable()
  /** What the booth is doing right now: drives the mouth flap and the caption bar. */
  const [booth, setBooth] = useState(announcerState.get())
  useEffect(() => announcerState.subscribe(setBooth), [])
  const persona = ANNOUNCERS[audio.announcer]
  /** The booth may run long; a play never waits more than this on a line (the next pitch cuts it off). */
  const COMMENTARY_CAP_MS = 7000
  const commentary = useCallback(
    (evt: AnnounceEvent, ctx: CommentaryContext) => Promise.race([sayAs(audio.announcer, evt, ctx), wait(COMMENTARY_CAP_MS)]),
    [audio.announcer],
  )
  const latest = useRef({ index: -1, busy: false })
  latest.current = { index: state?.index ?? -1, busy }

  const word = state ? currentWord(state) : null

  // On load (and reload) the field starts from the saved state.
  useEffect(() => {
    if (state && fieldBases === null) setFieldBases(state.bases)
  }, [state, fieldBases])

  const hear = useCallback(
    (how: 'word' | 'slow' | 'sentence') => {
      if (!word || !canSpeak) return
      primeSpeech()
      sfx.unlock()
      if (how === 'slow') void speakSlowly(word.text)
      else if (how === 'sentence' && word.sentence) void speakSentence(word.sentence)
      else void speakWord(word.text)
    },
    [word, canSpeak],
  )

  // Say each new word once, when it comes up and nothing is animating. A brand-new game gets the
  // booth's welcome first; the word is read only after that line ends.
  useEffect(() => {
    if (!state || !word || busy || reveal) return
    if (spokenIndex.current === state.index) return
    spokenIndex.current = state.index
    if (!introDone.current && state.index === 0 && state.atBats.every((ab) => ab.attempts.length === 0)) {
      introDone.current = true
      const forIndex = state.index
      void Promise.race([sayAs(audio.announcer, 'gameStart', { runs: 0, inning: 1 }), wait(COMMENTARY_CAP_MS)]).finally(() => {
        // Only read the word if the child hasn't already swung during the welcome.
        if (latest.current.index === forIndex && !latest.current.busy) hear('word')
      })
      return
    }
    introDone.current = true
    hear('word')
  }, [state, word, busy, reveal, hear, audio.announcer])

  async function announce(text: string) {
    setAnnouncement(text)
    await wait(ANNOUNCE_MS)
    setAnnouncement(null)
  }

  async function onSubmit(text: string) {
    setSaveError(null)
    let event: SubmitEvent
    try {
      event = await submit(text)
    } catch {
      setSaveError("Couldn't save that swing. Check the connection and try again.")
      setFocusKey((k) => k + 1)
      return
    }
    if (event.kind === 'ignored') return
    sfx.unlock()
    try {
      await playSequence(fieldRef.current, sfx, announce, event, commentary)
    } catch (err) {
      console.error('Field animation failed; continuing without it', err)
      setAnnouncement(null)
    } finally {
      // Only now does the stadium learn the new base state; during the play the scene moved the runners itself.
      if (event.kind === 'at-bat-complete') setFieldBases(event.basesAfter)
    }
    if (event.kind === 'at-bat-complete' && event.outcome === 'strikeout') {
      setReveal({ word: event.correctSpelling, gameOver: event.gameOver })
      return // stays busy until the child taps Next
    }
    if (event.kind === 'at-bat-complete' && event.gameOver) {
      navigate(`/game/${gameId}/results`, { replace: true })
      return
    }
    setBusy(false)
    setFocusKey((k) => k + 1)
  }

  function nextAfterReveal() {
    const over = reveal?.gameOver
    setReveal(null)
    if (over) {
      navigate(`/game/${gameId}/results`, { replace: true })
      return
    }
    setBusy(false)
    setFocusKey((k) => k + 1)
  }

  if (session.loading || player === undefined) return <Stadium className="p-8" aria-busy="true" />
  if (!record || !state || !player) {
    return (
      <Stadium className="p-8 text-center">
        <p className="text-2xl">That game couldn&apos;t be found.</p>
        <Link to="/players" className="btn-secondary mt-6">Back to players</Link>
      </Stadium>
    )
  }
  // Already finished (e.g. reopened from history). While a submission is still saving, `busy`
  // is true and onSubmit owns the navigation, so this never fires early.
  if (state.status === 'complete' && !busy && !reveal) return <Navigate to={`/game/${gameId}/results`} replace />

  return (
    <Stadium className="px-3 py-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-3 text-chalk/80">
          <Link to={`/play/${player.id}`} className="font-display text-lg">← {player.name}</Link>
          <div className="flex items-center gap-2">
            <span className="text-sm hidden sm:inline">{record.mode === 'weekly' ? 'Weekly game' : record.mode === 'practice' ? 'Practice' : 'Missed words'}</span>
            <Button variant="ghost" aria-pressed={audio.muted} aria-label={audio.muted ? 'Unmute' : 'Mute'} onClick={() => audio.set({ muted: !audio.muted })}>
              {audio.muted ? '🔇' : '🔊'}
            </Button>
          </div>
        </header>

        <div className="game-grid mt-3 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)] lg:items-start">
          <div className="game-field relative">
            <Broadcast
              state={state}
              player={{ name: player.name, jerseyNumber: player.jerseyNumber, teamName: player.teamName }}
              mode={record.mode}
              announcer={{ name: persona.name, portrait: persona.portrait, speaking: booth.speaking }}
              caption={booth.line}
              announcement={announcement}
            >
              <Suspense fallback={<div className="aspect-[4/3] w-full bg-grass-dark" aria-hidden="true" />}>
                <Field
                  look={{ hand: player.hand, appearance: player.appearance, jerseyNumber: player.jerseyNumber }}
                  bases={fieldBases ?? state.bases}
                  controllerRef={fieldRef}
                />
              </Suspense>
            </Broadcast>
          </div>

          <div className="game-side flex flex-col gap-4">
            <section aria-label="Your turn" className="game-turn rounded-3xl bg-chalk/10 border border-chalk/15 p-4 space-y-4">
              {canSpeak ? (
                <div className="game-hear grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                  <Button variant="secondary" size="lg" disabled={busy} onClick={() => hear('word')}>Hear word</Button>
                  <Button variant="secondary" disabled={busy} onClick={() => hear('slow')}>Hear it slowly</Button>
                  <Button variant="secondary" disabled={busy} onClick={() => hear('word')}>Repeat</Button>
                  <Button variant="secondary" disabled={busy || !word?.sentence} onClick={() => hear('sentence')}>Hear a sentence</Button>
                </div>
              ) : (
                <div className="rounded-2xl bg-gold/15 border border-gold/40 p-3 text-chalk">
                  <p>This browser can&apos;t read words aloud. A grown-up can tap &ldquo;Show the word&rdquo; to read it to you.</p>
                  <Button variant="secondary" className="mt-2" onClick={() => setPeek(true)}>Show the word</Button>
                </div>
              )}
              <SpellingInput disabled={busy || !!reveal} onSubmit={onSubmit} focusKey={focusKey} />
              {saveError ? <p role="alert" className="text-gold">{saveError}</p> : null}
            </section>

            {record.warnings.length ? (
              <p className="text-xs text-chalk/50">{record.warnings.join(' ')}</p>
            ) : null}
          </div>
        </div>
      </div>

      <Modal open={reveal !== null} onClose={nextAfterReveal} title="Strike three!">
        <div data-testid="reveal">
          <p className="text-ink/70">The word was</p>
          <p className="font-display text-4xl text-navy tracking-wide my-2">{reveal?.word}</p>
          <div className="mt-5 flex flex-wrap gap-3 justify-end">
            {canSpeak ? <Button variant="secondary" onClick={() => reveal && void speakWord(reveal.word)}>Hear it again</Button> : null}
            <Button onClick={nextAfterReveal} autoFocus>{reveal?.gameOver ? 'See results' : 'Next word'}</Button>
          </div>
        </div>
      </Modal>

      <PeekModal open={peek} word={word?.text ?? ''} onClose={() => setPeek(false)} />
    </Stadium>
  )
}

/** Only shown when speech is impossible: a grown-up reads the word, then it hides again. */
function PeekModal({ open, word, onClose }: { open: boolean; word: string; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [open, onClose])
  return (
    <Modal open={open} onClose={onClose} title="For the grown-up">
      <p className="font-display text-4xl text-navy">{word}</p>
      <p className="text-sm text-ink/60 mt-2">Hides in a few seconds.</p>
    </Modal>
  )
}
