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
        <div className="inline-flex items-center gap-3">
          <span className="on-air-tag board-text inline-flex items-center gap-2 rounded-sm px-3 py-2 text-[10px] uppercase" aria-hidden="true">
            <span className="live-dot inline-block h-2 w-2 bg-chalk" />
            On air
          </span>
          <p className="text-gold font-display text-xl tracking-wide">Now batting</p>
        </div>
        <h1 className="board-text announce-board mt-5 uppercase leading-[1.5]">
          <span className="block whitespace-nowrap text-[clamp(1.1rem,5.2vw,1.95rem)]">Grand Slam Spelling</span>
        </h1>

        <div className="mx-auto mt-8 max-w-md rounded-lg border-2 border-[color:var(--bezel-line)] bg-bezel p-1 shadow-[4px_4px_0_#04070f]">
          <StadiumStill />
        </div>

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

/** Drawn in the same order as the game's stadium (public/art/manifest.json), minus the near fence. */
const STILL = ['sky', 'outfield-wall', 'stands-far', 'grass', 'dirt', 'chalk', 'bases', 'dugout-near']

/** A still of the cartoon stadium, stacked from the packed layers the game already ships. */
function StadiumStill() {
  return (
    <div className="stadium-still rounded-md" role="img" aria-label="The cartoon baseball stadium">
      {STILL.map((layer) => <img key={layer} src={`${import.meta.env.BASE_URL}art/stadium/${layer}.png`} alt="" />)}
    </div>
  )
}
