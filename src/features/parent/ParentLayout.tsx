import { Link, NavLink, Navigate, Outlet, useNavigate, useParams } from 'react-router'
import { BallparkShell } from '../../components/BallparkShell'
import { usePlayers } from '../players/usePlayers'

const tabs = [
  ['lists', 'Word lists'],
  ['history', 'Game history'],
  ['stats', 'Progress'],
] as const

/** /parent → the first player's word lists. */
export function ParentIndex() {
  const { players, loading } = usePlayers()
  if (loading) return <BallparkShell variant="parent" className="p-8" aria-busy="true" />
  const first = players![0]
  return <Navigate to={first ? `/parent/players/${first.id}/lists` : '/players/new'} replace />
}

export function ParentLayout() {
  const { playerId } = useParams()
  const { players, loading } = usePlayers()
  const navigate = useNavigate()
  if (loading) return <BallparkShell variant="parent" className="p-8" aria-busy="true" />
  const player = players!.find((p) => p.id === playerId)
  if (!player) return <Navigate to="/parent" replace />

  return (
    <BallparkShell variant="parent">
      <header className="border-b border-gold/30">
        <div className="mx-auto max-w-5xl px-4 py-3 flex flex-wrap items-center gap-3">
          <Link to="/players" className="board-text text-gold text-sm">← Players</Link>
          <label className="ml-auto flex items-center gap-2 text-sm text-chalk/80">
            Managing
            <select
              className="rounded-lg border border-gold/40 bg-chalk px-2 py-1 font-display text-navy text-base"
              value={player.id}
              onChange={(e) => navigate(`/parent/players/${e.target.value}/lists`)}
            >
              {players!.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <NavLink to="/parent/account" className="text-sm underline text-chalk/70">Account</NavLink>
        </div>
        <nav className="mx-auto max-w-5xl px-4 flex gap-1 overflow-x-auto">
          {tabs.map(([slug, label]) => (
            <NavLink
              key={slug}
              to={`/parent/players/${player.id}/${slug}`}
              className={({ isActive }) =>
                `whitespace-nowrap px-4 py-2 font-display text-lg border-b-4 ${isActive ? 'border-gold text-gold' : 'border-transparent text-chalk/60 hover:text-chalk'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="parent-panel bg-paper text-ink rounded-3xl p-4 sm:p-6" data-testid="parent-panel">
          <Outlet context={{ player }} />
        </div>
      </div>
    </BallparkShell>
  )
}
