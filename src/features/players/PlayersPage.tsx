import { Link, Navigate } from 'react-router'
import { Stadium } from '../../components/Page'
import { PlayerPreview } from './PlayerPreview'
import { usePlayers } from './usePlayers'
import { ShareButton } from '../share/ShareButton'

export function PlayersPage() {
  const { players, loading } = usePlayers()
  if (loading) return <Stadium className="p-8" aria-busy="true" />
  if (players!.length === 0) return <Navigate to="/players/new" replace />

  return (
    <Stadium className="px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-baseline justify-between gap-4">
          <h1 className="font-display text-4xl">Who&apos;s up to bat?</h1>
          <Link to="/parent" className="text-chalk/70 underline underline-offset-4">Parent zone</Link>
        </header>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {players!.map((p) => (
            <li key={p.id} className="rounded-3xl bg-chalk text-ink p-4 flex gap-4 items-center shadow-[0_8px_0_rgba(0,0,0,0.18)]">
              <PlayerPreview appearance={p.appearance} hand={p.hand} jerseyNumber={p.jerseyNumber} size={130} />
              <div className="min-w-0 flex-1">
                <p className="font-display text-3xl text-navy leading-none">{p.name}</p>
                <p className="text-ink/70 mt-1">{p.teamName || 'No team yet'} · #{p.jerseyNumber} · {p.hand === 'L' ? 'Lefty' : 'Righty'}</p>
                <div className="mt-3 flex gap-2">
                  <Link to={`/play/${p.id}`} aria-label={`Play as ${p.name}`} className="btn-primary min-h-14 px-6 py-3 text-xl">Play</Link>
                  <Link to={`/players/${p.id}/edit`} className="btn-secondary min-h-11 px-4 py-2 text-base">Edit</Link>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap gap-3 items-center justify-between">
          <Link to="/players/new" className="btn-secondary min-h-14 text-lg">Add sibling</Link>
          <span className="text-sm text-chalk/50">Sign out and account settings live in the parent zone.</span>
        </div>
        <div className="mt-10 border-t border-chalk/15 pt-6 text-chalk/80">
          <p className="mb-2">Sharing only with friends? Send them the link — each family makes its own login and kids stay private.</p>
          <ShareButton />
        </div>
      </div>
    </Stadium>
  )
}
