import type { GameState } from '../../engine/types'

export interface BugPlayer {
  name: string
  jerseyNumber: number
  teamName: string
}

/**
 * The score bug: the glass plate in the corner of the broadcast with the game's numbers.
 * Same testids as the old outfield board so the game tests and e2e keep reading it.
 */
export function Scoreboard({ state, player, visitors }: { state: GameState; player?: BugPlayer; visitors?: number[] }) {
  const { tallies, bases } = state
  const wordNo = Math.min(state.index + 1, state.words.length)
  // The line score lags the engine: the game screen reveals the Visitors' inning during the inning-end play.
  const shown = visitors ?? state.visitors
  return (
    <section aria-label="Scoreboard" className="score-bug board-text inline-flex flex-col rounded-sm uppercase">
      <div className="flex items-stretch">
        {player ? (
          <div className="bug-plate flex items-center gap-[0.6em] px-[0.8em] py-[0.4em]">
            <span className="max-w-[9em] truncate">{player.teamName || player.name}</span>
            <span className="opacity-70">#{player.jerseyNumber}</span>
          </div>
        ) : null}
        <div className="flex items-center gap-[0.6em] px-[0.8em] py-[0.3em]">
          <span className="bug-runs text-gold" data-testid="runs">{tallies.runs}</span>
          <span className="bug-runs-label text-chalk/70 text-[0.8em]">Runs</span>
        </div>
        <Cell label="Hits" value={tallies.hits} testId="hits" />
        <Cell label="Inn" value={state.inning} testId="inning" />
        <div className="bug-cell flex items-center px-[0.7em]">
          <Diamond bases={bases} />
        </div>
      </div>
      <div className="bug-cell flex items-center justify-between gap-[1em] border-t border-chalk/15 px-[0.8em] py-[0.35em] text-[0.85em]">
        <Dots n={state.strikes} max={2} label="S" color="bg-gold" testId="strikes" />
        <Dots n={state.outs} max={2} label="O" color="bg-red" testId="outs" />
        <span className="text-chalk/80" data-testid="progress">
          Word {wordNo}/{state.words.length}
        </span>
      </div>
      <LineScore state={state} visitors={shown} home={player?.teamName || 'Slammers'} />
    </section>
  )
}

/** Kid's runs per inning, from the at-bat log (index 0 is inning 1). */
export function homeByInning(state: GameState): number[] {
  const out = Array.from({ length: state.inning }, () => 0)
  for (const ab of state.atBats) if (ab.outcome !== null) out[ab.inning - 1] = (out[ab.inning - 1] ?? 0) + ab.runsScored
  return out
}

/** HOME and VISITORS, runs by inning, the way a real line score reads. */
export function LineScore({ state, visitors, home, className = '' }: { state: GameState; visitors: number[]; home: string; className?: string }) {
  const homeRuns = homeByInning(state)
  const innings = Math.max(homeRuns.length, visitors.length, 1)
  const cols = Array.from({ length: innings }, (_, i) => i)
  const vTotal = visitors.reduce((a, b) => a + b, 0)
  return (
    <table data-testid="line-score" aria-label="Line score" className={`bug-cell border-t border-chalk/15 text-[0.75em] leading-tight ${className}`}>
      <thead className="sr-only">
        <tr><th>Team</th>{cols.map((i) => <th key={i}>Inning {i + 1}</th>)}<th>Runs</th></tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row" className="max-w-[7em] truncate px-[0.6em] text-left font-normal">{home}</th>
          {cols.map((i) => <td key={i} className="px-[0.35em] text-center text-chalk/80">{homeRuns[i] ?? ''}</td>)}
          <td className="px-[0.6em] text-right text-gold">{tallies(state)}</td>
        </tr>
        <tr>
          <th scope="row" className="px-[0.6em] text-left font-normal">Visitors</th>
          {cols.map((i) => <td key={i} className="px-[0.35em] text-center text-chalk/80">{visitors[i] ?? ''}</td>)}
          <td className="px-[0.6em] text-right text-gold" data-testid="visitors">{vTotal}</td>
        </tr>
      </tbody>
    </table>
  )
}

const tallies = (state: GameState) => state.tallies.runs

function Cell({ label, value, testId }: { label: string; value: number; testId: string }) {
  return (
    <div className="bug-cell flex flex-col items-center justify-center px-[0.8em] py-[0.3em] leading-none">
      <span className="text-chalk/60 text-[0.75em]">{label}</span>
      <span className="mt-[0.35em] text-[1.3em] text-gold" data-testid={testId}>{value}</span>
    </div>
  )
}

function Dots({ n, max, label, color, testId }: { n: number; max: number; label: string; color: string; testId: string }) {
  return (
    <span className="flex items-center gap-[0.5em]">
      <span className="text-chalk/60">{label}</span>
      <span className="flex gap-[0.35em]" aria-hidden="true">
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={`bug-dot ${i < n ? color : 'bg-chalk/20'}`} />
        ))}
      </span>
      <span className="sr-only" data-testid={testId}>{n}</span>
    </span>
  )
}

function Diamond({ bases }: { bases: GameState['bases'] }) {
  const on = (b: boolean) => (b ? 'fill-gold' : 'fill-chalk/25')
  const who = [bases.first && 'first', bases.second && 'second', bases.third && 'third'].filter(Boolean).join(', ') || 'none'
  return (
    <svg viewBox="0 0 12 12" className="h-[2.6em] w-[2.6em]" style={{ shapeRendering: 'crispEdges' }} role="img" aria-label={`Runners on: ${who}`}>
      <rect x="4" y="0" width="4" height="4" className={on(bases.second)} />
      <rect x="8" y="4" width="4" height="4" className={on(bases.first)} />
      <rect x="0" y="4" width="4" height="4" className={on(bases.third)} />
      <rect x="4" y="8" width="4" height="4" className="fill-chalk/60" />
    </svg>
  )
}
