import type { HTMLAttributes } from 'react'

/** A chalk-white panel. Use sparingly: only for a form or a thing you can pick. */
export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-chalk text-ink rounded-3xl p-6 shadow-[0_8px_0_rgba(0,0,0,0.12)] ${className}`} {...rest} />
}
