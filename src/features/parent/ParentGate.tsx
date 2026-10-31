import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router'
import { Banner } from '../../components/Banner'
import { Card } from '../../components/Card'
import { BallparkShell } from '../../components/BallparkShell'
import { useStore } from '../../data/store'
import { PinPad } from './PinPad'

const UNLOCK_KEY = 'slugger.parentUnlocked'

export function isParentUnlocked(): boolean {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1'
  } catch {
    return false
  }
}
export function lockParentZone(): void {
  try {
    sessionStorage.removeItem(UNLOCK_KEY)
  } catch { /* ignore */ }
}

/** Guards /parent/*: first visit sets a 4-digit PIN; later visits must enter it (once per tab). */
export function ParentGate() {
  const store = useStore()
  const [hasPin, setHasPin] = useState<boolean | null>(null)
  const [unlocked, setUnlocked] = useState(isParentUnlocked())
  const [firstEntry, setFirstEntry] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(0)

  useEffect(() => {
    store.hasParentPin().then(setHasPin)
  }, [store])

  const unlock = () => {
    try {
      sessionStorage.setItem(UNLOCK_KEY, '1')
    } catch { /* ignore */ }
    setUnlocked(true)
  }

  if (unlocked) return <Outlet />
  if (hasPin === null) return <BallparkShell variant="parent" className="p-8" aria-busy="true" />

  async function onPin(pin: string) {
    setError(null)
    if (!hasPin) {
      if (firstEntry === null) return setFirstEntry(pin)
      if (firstEntry !== pin) {
        setFirstEntry(null)
        setShake((s) => s + 1)
        return setError("Those didn't match. Start again.")
      }
      await store.setParentPin(pin)
      return unlock()
    }
    if (await store.verifyParentPin(pin)) return unlock()
    setShake((s) => s + 1)
    setError("That's not it. Ask a grown-up.")
  }

  return (
    <BallparkShell variant="parent" className="flex flex-col items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm text-center">
        <h1 className="text-3xl text-navy">{hasPin ? 'Parent zone' : 'Set a parent PIN'}</h1>
        <p className="mt-2 mb-6 text-ink/70">
          {hasPin
            ? 'Enter the 4-digit PIN to manage words and see progress.'
            : firstEntry === null
              ? 'Pick 4 digits that only grown-ups know. It keeps kids out of the word lists.'
              : 'Enter the same 4 digits again.'}
        </p>
        <PinPad onComplete={onPin} shakeKey={shake} />
        {error ? <div className="mt-4"><Banner kind="error">{error}</Banner></div> : null}
        <p className="mt-6"><Link to="/players" className="underline text-navy/70">Back to players</Link></p>
      </Card>
    </BallparkShell>
  )
}
