// src/components/BallparkShell.tsx
import type { HTMLAttributes, ReactNode } from 'react'
import { StadiumStill } from './StadiumStill'

export type BallparkVariant = 'kid' | 'parent'

export interface BallparkShellProps extends HTMLAttributes<HTMLElement> {
  variant?: BallparkVariant
  /** true = framed stadium still; a node = custom content inside the frame; omit for no hero. */
  hero?: ReactNode | true
  children?: ReactNode
}

/** One stadium look for every menu: dark ballpark gradient, optional framed still, board-text titles. */
export function BallparkShell({ variant = 'kid', hero, children, className = '', ...rest }: BallparkShellProps) {
  return (
    <main className={`ballpark-shell min-h-full text-chalk ${className}`} data-shell="ballpark" data-variant={variant} {...rest}>
      {hero !== undefined && hero !== false && hero !== null ? (
        <div className="ballpark-frame" data-testid="ballpark-hero">
          {hero === true ? <StadiumStill /> : hero}
        </div>
      ) : null}
      {children}
    </main>
  )
}
