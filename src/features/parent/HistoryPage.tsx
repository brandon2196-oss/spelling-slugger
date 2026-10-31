import { Link, useParams } from 'react-router'
import { useParentData } from './useParentData'

const modeLabel = { weekly: 'Weekly', practice: 'Practice', missed: 'Missed words' } as const

export function HistoryPage() {
  const { playerId = '' } = useParams()
  const { games, lists, loading } = useParentData(playerId)
  if (loading) return <div aria-busy="true" />
  const done = games!.filter((g) => g.status === 'complete')
  const title = (id: string | null) => lists!.find((l) => l.id === id)?.title ?? (id ? 'Deleted list' : '—')

  return (
    <section>
      <h1 className="text-3xl text-navy">Game history</h1>
      <p className="text-ink/70">Every finished game. Open one to see each word and every attempt.</p>
      {done.length === 0 ? (
        <p className="mt-8 rounded-3xl border-2 border-dashed border-navy/20 p-8 text-center text-ink/70">No finished games yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-ink/60">
              <tr>
                <th className="py-2 pr-3 font-semibold">Date</th>
                <th className="py-2 pr-3 font-semibold">Mode</th>
                <th className="py-2 pr-3 font-semibold">List</th>
                <th className="py-2 pr-3 font-semibold text-right">Runs</th>
                <th className="py-2 pr-3 font-semibold text-right">Visitors</th>
                <th className="py-2 pr-3 font-semibold">Result</th>
                <th className="py-2 pr-3 font-semibold text-right">Hits</th>
                <th className="py-2 pr-3 font-semibold text-right">K</th>
                <th className="py-2 pr-3 font-semibold text-right">First try</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/10">
              {done.map((g) => (
                <tr key={g.id} className="hover:bg-navy/5">
                  <td className="py-2 pr-3"><Link to={`/parent/games/${g.id}`} className="underline text-navy">{new Date(g.completedAt ?? g.startedAt).toLocaleDateString()}</Link></td>
                  <td className="py-2 pr-3">{modeLabel[g.mode]}</td>
                  <td className="py-2 pr-3">{title(g.listId)}</td>
                  <td className="py-2 pr-3 text-right font-display text-lg text-navy">{g.summary?.runs ?? 0}</td>
                  <td className="py-2 pr-3 text-right">{g.visitorRuns ?? ''}</td>
                  <td className="py-2 pr-3">{g.result === 'win' ? 'W' : g.result === 'loss' ? 'L' : ''}</td>
                  <td className="py-2 pr-3 text-right">{g.summary?.hits ?? 0}</td>
                  <td className="py-2 pr-3 text-right">{g.summary?.strikeouts ?? 0}</td>
                  <td className="py-2 pr-3 text-right">{g.summary?.firstTryAccuracy ?? 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
