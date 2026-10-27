/** Horizontal bars with the label on the left and the value on the right. */
export function Bars({ rows, color = 'var(--red)' }: { rows: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(6rem,1fr)_3fr_2.5rem] items-center gap-3 text-sm">
          <span className="font-display text-base text-navy truncate">{r.label}</span>
          <span className="h-4 rounded-full bg-navy/10 overflow-hidden" aria-hidden="true">
            <span className="block h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
          </span>
          <span className="text-right tabular-nums">{r.value}</span>
        </li>
      ))}
    </ul>
  )
}
