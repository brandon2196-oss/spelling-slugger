import type { HTMLAttributes, ReactNode } from 'react'

interface PageProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode
}

/** Child-facing screens: night sky, centered, big. */
export function Stadium({ children, className = '', ...rest }: PageProps) {
  return (
    <main className={`min-h-full bg-[radial-gradient(ellipse_at_top,#2a4a86_0%,#142850_55%,#0b1733_100%)] text-chalk ${className}`} {...rest}>
      {children}
    </main>
  )
}

/** Parent-facing screens: chalk paper, left-aligned, calm. */
export function Paper({ children, className = '', ...rest }: PageProps) {
  return <main className={`min-h-full bg-paper text-ink ${className}`} {...rest}>{children}</main>
}
