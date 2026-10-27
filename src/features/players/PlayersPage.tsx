import { Link, Navigate } from 'react-router'
import { Button } from '../../components/Button'
import { Stadium } from '../../components/Page'
import { useAuth } from '../../data/auth'
import { PlayerPreview } from './PlayerPreview'
import { usePlayers } from './usePlayers'
import { ShareButton } from '../share/ShareButton'

export function PlayersPage() {
  const { players, loading } = usePlayers()
  const { signOut } = useAuth()
  if (loading) return <Stadium className="p-8" aria-busy="true" />
  if (players!.length === 0) return <Navigate to="/players/new" replace />

  return (
    <Stadium className="px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-baseline justify-between gap-4">
          <h1 className="font-display text-4xl">Who&apos;s batting?</h1>
          <Link to="/parent" className="text-chalk/70 underline underline-offset-4">Parent zone</Link>
        </header>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {players!.map((p) => (
            <li key={p.id} className="rounded-3xl bg-chalk text-ink p-4 flex gap-4 items-center shadow-[0_8px_0_rgba(0,0,0,0.18)]">
              <PlayerPreview appearance={p.appearance} hand={p.hand} jerseyNumber={p.jerseyNumber} size={110} />
              <div className="min-w-0 flex-1">
                <p className="font-display text-3xl text-navy leading-none">{p.name}</p>
                <p className="text-ink/70 mt-1">{p.teamName || 'No team yet'} · #{p.jerseyNumber} · {p.hand === 'L' ? 'Lefty' : 'Righty'}</p>
                <div className="mt-3 flex gap-2">
                  <Link to={`/play/${p.id}`} className="btn-primary min-h-11 px-5 py-2 text-lg">Play</Link>
                  <Link to={`/players/${p.id}/edit`} className="btn-secondary min-h-11 px-4 py-2 text-base">Edit</Link>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap gap-3 items-center justify-between">
          <Link to="/players/new" className="btn-secondary">Add a player</Link>
          <Button variant="ghost" onClick={() => void signOut()} className="text-chalk/70">Sign out</Button>
        </div>
        <div className="mt-10 border-t border-chalk/15 pt-6 text-chalk/80">
          <p className="mb-2">Know another family who&apos;d like this?</p>
          <ShareButton />
        </div>
      </div>
    </Stadium>
  )
}
