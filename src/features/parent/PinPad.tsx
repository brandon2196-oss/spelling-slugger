import { useEffect, useState } from 'react'

export interface PinPadProps {
  length?: number
  onComplete: (pin: string) => void | Promise<void>
  /** Bumps to clear the pad and shake it after a wrong entry. */
  shakeKey?: number
  disabled?: boolean
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

export function PinPad({ length = 4, onComplete, shakeKey = 0, disabled }: PinPadProps) {
  const [pin, setPin] = useState('')
  useEffect(() => setPin(''), [shakeKey])

  const push = (k: string) => {
    if (disabled) return
    if (k === '⌫') return setPin((p) => p.slice(0, -1))
    if (!k || pin.length >= length) return
    const next = pin + k
    if (next.length === length) {
      setPin('')
      void onComplete(next)
    } else {
      setPin(next)
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) push(e.key)
      if (e.key === 'Backspace') push('⌫')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className={`mx-auto w-64 ${shakeKey ? 'animate-[shake_.4s]' : ''}`} key={shakeKey}>
      <div className="flex justify-center gap-3 mb-5" aria-label={`${pin.length} of ${length} digits entered`}>
        {Array.from({ length }, (_, i) => (
          <span key={i} className={`h-4 w-4 rounded-full border-2 border-navy ${i < pin.length ? 'bg-navy' : 'bg-transparent'}`} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((k, i) =>
          k === '' ? (
            <span key={`blank-${i}`} />
          ) : (
            <button
              key={k}
              type="button"
              onClick={() => push(k)}
              disabled={disabled}
              aria-label={k === '⌫' ? 'Delete' : k}
              className="h-14 rounded-2xl bg-white border-2 border-navy/15 font-display text-2xl text-navy active:translate-y-[2px] focus-visible:outline-4 focus-visible:outline-gold"
            >
              {k}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
