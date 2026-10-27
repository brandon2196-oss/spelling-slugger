/** A small line chart with dots, one series, no library. Values are already in display units. */
export function Sparkline({ points, max, labels, unit = '', color = 'var(--navy)' }: { points: number[]; max?: number; labels: string[]; unit?: string; color?: string }) {
  const W = 320
  const H = 110
  const padX = 12
  const padY = 14
  const top = Math.max(1, max ?? Math.max(...points, 1))
  const n = points.length
  const x = (i: number) => (n === 1 ? W / 2 : padX + (i * (W - 2 * padX)) / (n - 1))
  const y = (v: number) => H - padY - (v / top) * (H - 2 * padY)
  const d = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full h-auto" role="img" aria-label={labels.map((l, i) => `${l}: ${points[i]}${unit}`).join(', ')}>
      <line x1={padX} x2={W - padX} y1={y(0)} y2={y(0)} stroke="currentColor" strokeOpacity="0.15" />
      {n > 1 ? <path d={d} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" /> : null}
      {points.map((v, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(v)} r="5" fill={color} />
          <text x={x(i)} y={y(v) - 9} textAnchor="middle" fontSize="11" fill="currentColor">{v}{unit}</text>
          <text x={x(i)} y={H + 12} textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.6">{labels[i]}</text>
        </g>
      ))}
    </svg>
  )
}
