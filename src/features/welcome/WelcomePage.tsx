import { Link, Navigate } from 'react-router'
import { useAuth } from '../../data/auth'
import { Stadium } from '../../components/Page'

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
    <Stadium className="flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl text-center">
        <p className="text-gold font-display text-xl tracking-wide">Now batting</p>
        <h1 className="font-display text-5xl sm:text-6xl leading-none mt-1">Cooper&apos;s Spelling Slugger</h1>
        <p className="mt-6 text-lg text-chalk/85 max-w-md mx-auto">
          A baseball game that runs on your kid&apos;s weekly spelling words. They hear a word, type it,
          and swing for the fences.
        </p>

        <ul className="mt-8 grid grid-cols-2 gap-3 text-left">
          {outcomes.map(([how, result]) => (
            <li key={result} className="rounded-2xl bg-navy/60 border border-chalk/15 px-4 py-3">
              <span className="block text-chalk/70 text-sm">{how}</span>
              <span className="block font-display text-2xl text-gold">{result}</span>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/register" className="btn-primary text-xl px-8 py-4">Create a family account</Link>
          <Link to="/login" className="btn-secondary text-xl px-8 py-4">Sign in</Link>
        </div>
        <p className="mt-6 text-sm text-chalk/60">Free. No ads. Kids never need an account of their own.</p>
      </div>
    </Stadium>
  )
}
