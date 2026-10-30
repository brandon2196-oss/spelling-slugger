import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Card } from '../../components/Card'
import { Stadium } from '../../components/Page'

export function AuthShell({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <Stadium className="flex flex-col items-center justify-center px-4 py-10">
      <Link to="/" className="font-display text-gold text-lg mb-4">Grand Slam Spelling</Link>
      <Card className="w-full max-w-md">
        <h1 className="text-3xl text-navy mb-5">{title}</h1>
        {children}
      </Card>
      {footer ? <div className="mt-5 text-chalk/80 text-center">{footer}</div> : null}
    </Stadium>
  )
}
