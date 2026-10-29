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
          <span className="on-air-tag pixel-text inline-flex items-center gap-2 rounded-sm px-3 py-2 text-[10px] uppercase" aria-hidden="true">
            <span className="live-dot inline-block h-2 w-2 bg-chalk" />
            On air
          </span>
          <p className="text-gold font-display text-xl tracking-wide">Now batting</p>
        </div>
        <h1 className="pixel-text announce-pixel mt-5 uppercase leading-[1.5]">
          <span className="block whitespace-nowrap text-[clamp(1.1rem,5.2vw,1.95rem)]">Grand Slam Spelling</span>
        </h1>

        <div className="mx-auto mt-8 max-w-md rounded-lg border-2 border-[color:var(--bezel-line)] bg-bezel p-1 shadow-[4px_4px_0_#04070f]">
          <StadiumStrip />
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

const CROWD = ['#d7263d', '#fffaf0', '#f5b700', '#8fd3ff', '#1b1b1f', '#f1c3a3', '#6b3fa0', '#3f9a4a']
const STARS: [number, number][] = [[9, 3], [27, 7], [52, 2], [71, 5], [96, 3], [118, 8], [141, 4], [153, 1]]

/** The night stadium at 160×50, in rects: sky, light towers, three rows of crowd, wall, striped grass, the diamond. */
function StadiumStrip() {
  const crowd: [number, number, string][] = []
  for (let row = 0; row < 3; row++) {
    for (let x = 0; x < 160; x += 2) {
      crowd.push([x, 22 + row * 2, CROWD[(x / 2 + row * 3) % CROWD.length]!])
    }
  }
  return (
    <svg viewBox="0 0 160 50" className="pixel-strip rounded-md" role="img" aria-label="A pixel-art baseball stadium at night">
      {/* sky, darkest at the top */}
      <rect x="0" y="0" width="160" height="30" fill="#142850" />
      <rect x="0" y="0" width="160" height="8" fill="#0b1733" />
      <rect x="0" y="8" width="160" height="5" fill="#0f1f42" />
      {STARS.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#fffaf0" />)}
      {/* light towers and their glow */}
      {[20, 140].map((x) => (
        <g key={x}>
          <polygon points={`${x - 5},9 ${x + 5},9 ${x + 22},26 ${x - 22},26`} fill="#f5b700" opacity="0.12" />
          <rect x={x - 1} y="9" width="2" height="19" fill="#3a3a44" />
          <rect x={x - 5} y="6" width="10" height="3" fill="#e8e8f0" />
          <rect x={x - 5} y="9" width="10" height="1" fill="#f5b700" />
        </g>
      ))}
      {/* crowd */}
      {crowd.map(([x, y, fill]) => <rect key={`${x}-${y}`} x={x} y={y} width="2" height="2" fill={fill} />)}
      {/* wall */}
      <rect x="0" y="28" width="160" height="4" fill="#245c2e" />
      <rect x="0" y="28" width="160" height="1" fill="#f5b700" />
      {/* grass stripes */}
      {[32, 35, 38, 41, 44, 47].map((y, i) => (
        <rect key={y} x="0" y={y} width="160" height="3" fill={i % 2 ? '#2f7d3a' : '#3f9a4a'} />
      ))}
      {/* diamond */}
      <polygon points="80,33 106,42 80,51 54,42" fill="#c98a4b" />
      <polygon points="80,36 100,42 80,48 60,42" fill="#3f9a4a" />
      <rect x="78" y="41" width="4" height="2" fill="#c98a4b" />
      <rect x="79" y="35" width="2" height="2" fill="#fffaf0" />
      <rect x="98" y="41" width="2" height="2" fill="#fffaf0" />
      <rect x="60" y="41" width="2" height="2" fill="#fffaf0" />
      <rect x="79" y="47" width="2" height="2" fill="#fffaf0" />
      {/* the batter, waiting */}
      <rect x="83" y="44" width="2" height="1" fill="#f1c3a3" />
      <rect x="83" y="45" width="2" height="3" fill="#142850" />
      <rect x="85" y="43" width="1" height="3" fill="#c98a4b" />
    </svg>
  )
}
