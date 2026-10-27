import type { GameState } from '../../engine/types'

function Dots({ n, max, label, color }: { n: number; max: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 text-chalk/70 text-sm uppercase tracking-wider">{label}</span>
      <span className="flex gap-1.5" aria-hidden="true">
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={`h-4 w-4 rounded-full ${i < n ? color : 'bg-chalk/15'}`} />
        ))}
      </span>
      <span className="sr-only">{n}</span>
    </div>
  )
}

/** The outfield scoreboard: navy board, gold bulbs. */
export function Scoreboard({ state }: { state: GameState }) {
  const { tallies, bases } = state
  return (
    <section aria-label="Scoreboard" className="rounded-3xl bg-navy border-4 border-gold/60 p-4 text-chalk shadow-[0_8px_0_#0a1630]">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Runs" value={tallies.runs} big />
        <Stat label="Hits" value={tallies.hits} />
        <Stat label="Inning" value={state.inning} />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Dots n={state.strikes} max={2} label="Strikes" color="bg-gold" />
          <div data-testid="outs"><Dots n={state.outs} max={2} label="Outs" color="bg-red" /></div>
        </div>
        <Diamond bases={bases} />
        <div className="text-right text-sm text-chalk/70">
          Word {Math.min(state.index + 1, state.words.length)} of {state.words.length}
        </div>
      </div>
    </section>
  )
}

function Stat({ label, value, big }: { label: string; value: number; big?: boolean }) {
  return (
    <div className="rounded-xl bg-black/30 py-2">
      <div className="text-xs uppercase tracking-wider text-chalk/60">{label}</div>
      <div className={`font-display text-gold leading-none ${big ? 'text-5xl' : 'text-3xl'}`}>{value}</div>
    </div>
  )
}

function Diamond({ bases }: { bases: GameState['bases'] }) {
  const on = (b: boolean) => (b ? 'fill-gold' : 'fill-chalk/20')
  return (
    <svg viewBox="0 0 60 60" className="h-14 w-14" role="img" aria-label={`Runners on: ${[bases.first && 'first', bases.second && 'second', bases.third && 'third'].filter(Boolean).join(', ') || 'none'}`}>
      <rect x="22" y="2" width="16" height="16" transform="rotate(45 30 10)" className={on(bases.second)} />
      <rect x="42" y="22" width="16" height="16" transform="rotate(45 50 30)" className={on(bases.first)} />
      <rect x="2" y="22" width="16" height="16" transform="rotate(45 10 30)" className={on(bases.third)} />
      <rect x="22" y="42" width="16" height="16" transform="rotate(45 30 50)" className="fill-chalk/50" />
    </svg>
  )
}
