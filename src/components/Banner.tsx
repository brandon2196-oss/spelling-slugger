import type { ReactNode } from 'react'

export function Banner({ kind = 'info', children }: { kind?: 'info' | 'error' | 'success'; children: ReactNode }) {
  const tone = kind === 'error' ? 'bg-red/10 text-red border-red/40' : kind === 'success' ? 'bg-grass/10 text-grass-dark border-grass/40' : 'bg-navy/5 text-navy border-navy/20'
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 ${tone}`}>
      {children}
    </div>
  )
}
