import { useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Banner } from '../../../components/Banner'
import { Button } from '../../../components/Button'
import { extractCandidates } from './candidates'
import { extractPdfLines } from './pdfText'

type Phase =
  | { kind: 'idle' }
  | { kind: 'reading'; fileName: string }
  | { kind: 'review'; fileName: string; likely: string[]; other: string[]; selected: Set<string> }
  | { kind: 'scanned'; fileName: string }
  | { kind: 'empty'; fileName: string }
  | { kind: 'error'; fileName: string }

interface Props {
  /** Called with the words the parent left selected. */
  onAdd(words: string[], fileName: string): void
  /** The parent asked for the paste box instead. */
  onPasteInstead(): void
}

const plural = (n: number) => (n === 1 ? '1 word' : `${n} words`)

/** Drop zone → read the PDF in the browser → let the parent untick strays → add. Nothing is uploaded. */
export function PdfImport({ onAdd, onPasteInstead }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  async function readFile(file: File) {
    setPhase({ kind: 'reading', fileName: file.name })
    try {
      const result = await extractPdfLines(await file.arrayBuffer())
      if (!result.hasText) return setPhase({ kind: 'scanned', fileName: file.name })
      const { likely, other } = extractCandidates(result.lines)
      if (likely.length === 0 && other.length === 0) return setPhase({ kind: 'empty', fileName: file.name })
      setPhase({ kind: 'review', fileName: file.name, likely, other, selected: new Set(likely) })
    } catch {
      setPhase({ kind: 'error', fileName: file.name })
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void readFile(file)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void readFile(file)
  }

  function toggle(word: string) {
    setPhase((p) => {
      if (p.kind !== 'review') return p
      const selected = new Set(p.selected)
      if (selected.has(word)) selected.delete(word)
      else selected.add(word)
      return { ...p, selected }
    })
  }

  const chooser = (label: string) => (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${dragging ? 'border-gold bg-gold/10' : 'border-navy/30 bg-white'}`}
    >
      <p className="font-display text-xl text-navy">Drop the teacher's PDF here</p>
      <p className="text-ink/70 mt-1 mb-3">The words are read right here on this computer. Nothing is uploaded.</p>
      <label htmlFor={inputId} className="inline-flex items-center justify-center gap-2 font-display font-bold rounded-2xl cursor-pointer bg-red text-chalk shadow-[0_5px_0_#9a1a2b] text-xl px-6 py-3 min-h-14 focus-within:outline-4 focus-within:outline-gold">
        {label}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".pdf,application/pdf"
          onChange={onPick}
          className="sr-only"
          aria-label="Choose a PDF"
        />
      </label>
    </div>
  )

  if (phase.kind === 'idle') return chooser('Choose a PDF')

  if (phase.kind === 'reading') {
    return (
      <div aria-busy="true" role="status" className="rounded-2xl border-2 border-navy/15 bg-white p-5 text-navy font-display text-xl">
        Reading {phase.fileName}…
      </div>
    )
  }

  if (phase.kind === 'review') {
    const count = phase.selected.size
    const chip = (word: string) => {
      const on = phase.selected.has(word)
      return (
        <button
          key={word}
          type="button"
          aria-pressed={on}
          onClick={() => toggle(word)}
          className={`rounded-full border-2 px-3 py-1 text-lg transition-colors focus-visible:outline-4 focus-visible:outline-gold ${on ? 'border-grass bg-grass text-chalk' : 'border-navy/20 bg-white text-navy/60 line-through decoration-navy/40'}`}
        >
          {word}
        </button>
      )
    }
    return (
      <div className="rounded-2xl border-2 border-navy/15 bg-white p-4">
        <h2 className="font-display text-2xl text-navy">Found {plural(phase.likely.length)} in {phase.fileName}</h2>
        <p className="text-ink/70 mb-3">Tap a word to leave it out.</p>
        <div className="flex flex-wrap gap-2">{phase.likely.map(chip)}</div>
        {phase.other.length > 0 ? (
          <details className="mt-4">
            <summary className="cursor-pointer text-navy/80 underline-offset-4 hover:underline">
              Other words on the page ({phase.other.length})
            </summary>
            <div className="mt-2 flex flex-wrap gap-2">{phase.other.map(chip)}</div>
          </details>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <Button size="lg" disabled={count === 0} onClick={() => onAdd([...phase.likely, ...phase.other].filter((w) => phase.selected.has(w)), phase.fileName)}>
            Add {plural(count)}
          </Button>
          <Button variant="secondary" size="lg" onClick={() => setPhase({ kind: 'idle' })}>Try another PDF</Button>
        </div>
      </div>
    )
  }

  const message =
    phase.kind === 'scanned'
      ? `${phase.fileName} is a picture of the words, not text, so it can't be read here.`
      : phase.kind === 'empty'
        ? `No words were found in ${phase.fileName}.`
        : `Couldn't read ${phase.fileName}.`
  return (
    <div className="grid gap-3">
      <Banner kind={phase.kind === 'error' ? 'error' : 'info'}>
        {message} Type the words, or paste them from the email instead.
      </Banner>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onPasteInstead}>Paste instead</Button>
        <Button variant="secondary" onClick={() => setPhase({ kind: 'idle' })}>Try another PDF</Button>
      </div>
    </div>
  )
}
