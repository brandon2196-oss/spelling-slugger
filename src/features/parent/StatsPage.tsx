import { useParams } from 'react-router'
import { Bars } from './charts/Bars'
import { Sparkline } from './charts/Sparkline'
import { prettyDate } from './dates'
import { frequentlyMissed, mastered, reviewRetention, totals, weeklyTrend, wordStats } from './stats'
import { useParentData } from './useParentData'

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white border border-navy/10 p-4">
      <div className="text-sm text-ink/60">{label}</div>
      <div className="font-display text-3xl text-navy">{value}</div>
    </div>
  )
}

export function StatsPage() {
  const { playerId = '' } = useParams()
  const { games, lists, loading } = useParentData(playerId)
  if (loading) return <div aria-busy="true" />

  const t = totals(games!)
  const trend = weeklyTrend(games!, lists!)
  const stats = wordStats(games!)
  const missed = frequentlyMissed(stats).slice(0, 10)
  const solid = mastered(stats)
  const retention = reviewRetention(games!)
  const shortDate = (iso: string) => prettyDate(iso).replace(/, \d{4}$/, '')

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-3xl text-navy">Progress</h1>
        <p className="text-ink/70">Weekly games count toward scores; practice shows up in the word stats.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile label="Weekly games" value={t.games} />
        <Tile label="Practice sessions" value={t.practice} />
        <Tile label="High score" value={`${t.highScore} runs`} />
        <Tile label="First-try rate" value={`${t.firstTryRate}%`} />
      </div>

      {trend.length ? (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white border border-navy/10 p-4 text-navy">
            <h2 className="font-display text-xl">Best runs each week</h2>
            <Sparkline points={trend.map((p) => p.bestRuns)} labels={trend.map((p) => shortDate(p.weekStart))} />
          </div>
          <div className="rounded-2xl bg-white border border-navy/10 p-4 text-navy">
            <h2 className="font-display text-xl">First-try accuracy</h2>
            <Sparkline points={trend.map((p) => p.firstTryAccuracy)} max={100} unit="%" labels={trend.map((p) => shortDate(p.weekStart))} color="var(--grass-dark)" />
          </div>
        </div>
      ) : (
        <p className="rounded-3xl border-2 border-dashed border-navy/20 p-6 text-center text-ink/70">Charts appear after the first weekly game.</p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-white border border-navy/10 p-4">
          <h2 className="font-display text-xl text-navy">Words to work on</h2>
          <p className="text-sm text-ink/60 mb-3">Times struck out.</p>
          {missed.length ? <Bars rows={missed.map((w) => ({ label: w.text, value: w.missed }))} /> : <p className="text-ink/70">Nothing missed yet.</p>}
        </div>
        <div className="rounded-2xl bg-white border border-navy/10 p-4">
          <h2 className="font-display text-xl text-navy">Mastered</h2>
          <p className="text-sm text-ink/60 mb-3">Seen at least twice, never struck out, almost always first try.</p>
          {solid.length ? (
            <ul className="flex flex-wrap gap-2">{solid.map((w) => <li key={w.text} className="rounded-full bg-grass/15 text-grass-dark px-3 py-1 font-display">{w.text}</li>)}</ul>
          ) : <p className="text-ink/70">Keep playing. Mastery takes a couple of looks at each word.</p>}
          <h3 className="mt-5 font-display text-lg text-navy">Review-word retention</h3>
          <p className="text-ink/70">{retention === null ? 'No review words played yet.' : `${retention}% of last-week words spelled right on the first try.`}</p>
        </div>
      </div>
    </section>
  )
}
