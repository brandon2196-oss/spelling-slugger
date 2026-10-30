import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '../../components/Button'

export interface SpellingInputProps {
  disabled: boolean
  onSubmit: (text: string) => void
  /** Bumps to refocus the field (new word, animation finished). */
  focusKey?: number
  onHear?: (how: 'word' | 'slow' | 'sentence') => void
  hasSentence?: boolean
}

export function SpellingInput({ disabled, onSubmit, focusKey = 0, onHear, hasSentence = false }: SpellingInputProps) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!disabled) ref.current?.focus()
  }, [disabled, focusKey])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (disabled) return
    const text = value
    setValue('')
    onSubmit(text)
    ref.current?.focus()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input
        ref={ref}
        type="text"
        aria-label="Spell the word"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        inputMode="text"
        enterKeyHint="done"
        className="w-full rounded-2xl border-4 border-gold/70 bg-chalk px-5 py-4 text-center font-display text-3xl sm:text-4xl tracking-wide text-ink outline-none focus:border-gold disabled:opacity-60"
      />
      {onHear ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Hear the word">
          <Button type="button" variant="secondary" disabled={disabled} onClick={() => { onHear('word'); ref.current?.focus() }}>
            Hear again
          </Button>
          <Button type="button" variant="secondary" disabled={disabled} onClick={() => { onHear('slow'); ref.current?.focus() }}>
            Slow
          </Button>
          {hasSentence ? (
            <Button type="button" variant="secondary" disabled={disabled} onClick={() => { onHear('sentence'); ref.current?.focus() }}>
              Use in a sentence
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Button type="submit" size="lg" disabled={disabled}>Swing!</Button>
        <Button type="button" variant="secondary" size="lg" disabled={disabled} onClick={() => { setValue(''); ref.current?.focus() }}>
          Clear
        </Button>
      </div>
    </form>
  )
}
