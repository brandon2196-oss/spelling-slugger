import { gradeLetters } from '../../engine/letterHint'

/** A try shown letter by letter: green + underline = right spot, red + strikethrough = wrong. */
export function LetterHint({ typed, correct, label }: { typed: string; correct: string; label?: string }) {
  const marks = gradeLetters(typed, correct)
  if (marks.length === 0) return null
  return (
    <p data-testid="letter-hint" aria-label={label} className="font-display text-3xl tracking-widest flex flex-wrap gap-1">
      {marks.map((m, i) => (
        <span
          key={i}
          data-ok={m.ok ? 'true' : 'false'}
          className={m.ok ? 'text-green-500 underline decoration-4 underline-offset-4' : 'text-red line-through decoration-4'}
        >
          <span aria-hidden="true">{m.char === ' ' ? '\u00a0' : m.char}</span>
          <span className="sr-only">{`${m.char} ${m.ok ? 'right' : 'wrong'}`}</span>
        </span>
      ))}
    </p>
  )
}
