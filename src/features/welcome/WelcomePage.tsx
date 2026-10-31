// src/features/welcome/WelcomePage.tsx
import { Link, Navigate } from 'react-router'
import { useAuth } from '../../data/auth'
import { BallparkShell } from '../../components/BallparkShell'

const outcomes: [string, string][] = [
  ['Spell it right the first time', 'Double'],
  ['Get it on the second try', 'Single'],
  ['Third try does it', 'Walk'],
  ['Three misses', 'Strikeout'],
]

export function WelcomePage() {
  const { user, loading } = useAuth()
  if (!loading && user) return <Navigate to="/players" replace />
  return (
    <BallparkShell hero className="flex flex-col items-center px-4 py-8 [&>.ballpark-frame]:w-full">
      <div className="w-full max-w-xl text-center">
        <h1 className="board-text announce-board mt-6 uppercase leading-[1.5]">
          <span className="block whitespace-nowrap text-[clamp(1.1rem,5.2vw,1.95rem)]">Grand Slam Spelling</span>
        </h1>

        <p className="mt-4 text-lg text-chalk/85 max-w-md mx-auto">
          Your kid&apos;s weekly spelling words, as a baseball game. Hear it, spell it, swing.
        </p>

        <ul className="mt-6 grid grid-cols-2 gap-3 text-left">
          {outcomes.map(([how, result]) => (
            <li key={result} className="ballpark-card px-4 py-3">
              <span className="block text-chalk/70 text-sm">{how}</span>
              <span className="block font-display text-2xl text-gold">{result}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/register" className="btn-gold text-xl px-8 py-4">Create account</Link>
          <Link to="/login" className="btn-gold text-xl px-8 py-4">Sign in</Link>
        </div>
        <p className="mt-6 text-sm text-chalk/60">Free. No ads. Kids never need an account of their own.</p>
      </div>
    </BallparkShell>
  )
}
