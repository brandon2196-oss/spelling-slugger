import { useState } from 'react'
import { Button } from '../../components/Button'

const TITLE = "Cooper's Spelling Slugger"
const TEXT = 'A baseball game that makes spelling practice fun. Free, no ads.'

export function appUrl(): string {
  return (import.meta.env.VITE_APP_URL as string | undefined) || (typeof window !== 'undefined' ? window.location.origin : '')
}

/** Native share sheet when the device has one; otherwise copy the link, plus text and email links. */
export function ShareButton({ url = appUrl(), className = '' }: { url?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const body = `${TEXT} ${url}`

  async function share() {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: TITLE, text: TEXT, url })
      } catch { /* user closed the sheet */ }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* clipboard blocked; the links below still work */ }
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <Button variant="secondary" onClick={() => void share()}>{copied ? 'Link copied!' : 'Share the app'}</Button>
      <a className="underline underline-offset-4" href={`sms:?&body=${encodeURIComponent(body)}`}>Text it</a>
      <a className="underline underline-offset-4" href={`mailto:?subject=${encodeURIComponent(TITLE)}&body=${encodeURIComponent(body)}`}>Email it</a>
    </div>
  )
}
