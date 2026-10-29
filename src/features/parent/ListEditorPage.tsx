import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Banner } from '../../components/Banner'
import { Button } from '../../components/Button'
import { TextField } from '../../components/TextField'
import { useStore } from '../../data/store'
import type { NewWord } from '../../data/types'
import { normalize } from '../../engine/grade'
import { DIFFICULTIES, type Difficulty } from '../../engine/types'
import { buildWeekList } from '../../engine/weekList'
import { findPrecedingList } from '../../data/previous-week'
import { mondayOf, prettyDate } from './dates'
import { PdfImport } from './import/PdfImport'
import { parseWordPaste } from './wordPaste'

const TARGET = 15

export function ListEditorPage() {
  const { playerId = '', listId } = useParams()
  const store = useStore()
  const navigate = useNavigate()
  const [weekStart, setWeekStart] = useState(mondayOf())
  const [title, setTitle] = useState('')
  const [titleTouched, setTitleTouched] = useState(false)
  const [words, setWords] = useState<NewWord[]>([])
  const [draft, setDraft] = useState('')
  const [pasteOpen, setPasteOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(!listId)
  const [paste, setPaste] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(!listId)
  const [review, setReview] = useState<NewWord[] | null>(null)
  const [buildNotes, setBuildNotes] = useState<string[]>([])
  const [sentenceFor, setSentenceFor] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const saveRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!listId) return
    store.getWordList(listId).then((l) => {
      if (!l) return setError('That list was not found.')
      setWeekStart(l.weekStart)
      setTitle(l.title)
      setTitleTouched(true)
      setWords(l.words.filter((w) => w.source === 'current').map((w) => ({ text: w.text, sentence: w.sentence, difficulty: w.difficulty, source: 'current' })))
      setReview(l.words.some((w) => w.source === 'review') ? l.words.filter((w) => w.source === 'review').map((w) => ({ text: w.text, sentence: w.sentence, difficulty: w.difficulty, source: 'review' })) : null)
      setLoaded(true)
    })
  }, [store, listId])

  const effectiveTitle = titleTouched && title.trim() ? title : `Week of ${prettyDate(weekStart)}`

  function addWords(texts: string[]) {
    setNotice(null)
    setReview(null)
    setWords((prev) => {
      const seen = new Set(prev.map((w) => normalize(w.text)))
      const skipped: string[] = []
      const next = [...prev]
      for (const t of texts) {
        const key = normalize(t)
        if (seen.has(key)) {
          skipped.push(t)
          continue
        }
        seen.add(key)
        next.push({ text: t, sentence: null, difficulty: 'medium', source: 'current' })
      }
      if (skipped.length) setNotice(`Already on the list, skipped: ${skipped.join(', ')}`)
      return next
    })
  }

  function onDraftKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const t = draft.trim()
    if (!t) return saveRef.current?.focus()
    addWords([t])
    setDraft('')
    inputRef.current?.focus()
  }

  function applyImport(texts: string[], fileName: string) {
    addWords(texts)
    setNotice((n) => [`Added ${texts.length} words from ${fileName}.`, n].filter(Boolean).join(' '))
    setImportOpen(false)
    inputRef.current?.focus()
  }

  function applyPaste() {
    const { words: parsed, dropped } = parseWordPaste(paste)
    addWords(parsed)
    if (dropped.length) setNotice((n) => [n, `Duplicates in the paste were skipped: ${dropped.join(', ')}`].filter(Boolean).join(' '))
    setPaste('')
    setPasteOpen(false)
    inputRef.current?.focus()
  }

  async function buildWeek(): Promise<NewWord[]> {
    const lists = await store.listWordLists(playerId)
    const target = { id: listId ?? '__new__', playerId, title: '', weekStart, isActive: false, createdAt: '', words: [] }
    const prev = findPrecedingList(lists, target)
    const built = buildWeekList(words, prev ? prev.words : null, Math.random)
    const rev = built.words.filter((w) => w.source === 'review')
    setReview(rev)
    setBuildNotes(built.warnings)
    return rev
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (words.length === 0) return setError('Add at least one word.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return setError('Pick the week start date.')
    try {
      const rev = review ?? (await buildWeek())
      const all = [...words, ...rev]
      if (listId) await store.updateWordList(listId, { title: effectiveTitle, weekStart, words: all })
      else {
        const created = await store.createWordList(playerId, { title: effectiveTitle, weekStart, words: all })
        const lists = await store.listWordLists(playerId)
        if (!lists.some((l) => l.isActive)) await store.setActiveList(playerId, created.id)
      }
      navigate(`/parent/players/${playerId}/lists`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the list.')
    }
  }

  if (!loaded) return <div aria-busy="true" />

  return (
    <form onSubmit={onSubmit} className="max-w-2xl">
      <h1 className="text-3xl text-navy">{listId ? 'Edit word list' : "This week's words"}</h1>
      <p className="text-ink/70 mb-6">Type this week's 15 words and tag each Easy, Medium, or Hard. We add 5 review words from last week to make 20.</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Week starts" type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} required />
        <TextField
          label="List name"
          value={titleTouched ? title : effectiveTitle}
          onFocus={() => !titleTouched && setTitle(effectiveTitle)}
          onChange={(e) => { setTitleTouched(true); setTitle(e.target.value) }}
        />
      </div>

      {importOpen ? (
        <div className="mt-6">
          <PdfImport onAdd={applyImport} onPasteInstead={() => { setImportOpen(false); setPasteOpen(true) }} />
        </div>
      ) : null}

      <div className="mt-6 flex items-end gap-2">
        <div className="flex-1">
          <TextField
            ref={inputRef}
            label="Type a word and press Enter"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onDraftKey}
            autoFocus
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
          />
        </div>
        <Button variant="secondary" size="lg" onClick={() => { if (draft.trim()) { addWords([draft.trim()]); setDraft(''); inputRef.current?.focus() } }}>
          Add
        </Button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-x-4">
          <Button variant="ghost" onClick={() => setImportOpen((o) => !o)} className="text-navy/80">
            {importOpen ? 'Hide PDF import' : 'Import a PDF'}
          </Button>
          <Button variant="ghost" onClick={() => setPasteOpen((o) => !o)} className="text-navy/80">
            {pasteOpen ? 'Hide paste box' : 'Paste a whole list'}
          </Button>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${words.length >= TARGET ? 'bg-grass text-chalk' : 'bg-navy/10 text-navy'}`}>
          {words.length} / {TARGET}
        </span>
      </div>

      {pasteOpen ? (
        <div className="mt-2 rounded-2xl border-2 border-navy/15 bg-white p-3">
          <label className="block">
            <span className="block font-semibold text-navy mb-1">Paste words separated by commas or new lines</span>
            <textarea
              className="w-full rounded-xl border-2 border-navy/20 p-3 text-lg min-h-28 focus:border-navy outline-none"
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              spellCheck={false}
            />
          </label>
          <Button className="mt-2" onClick={applyPaste}>Add these words</Button>
        </div>
      ) : null}

      {notice ? <div className="mt-3"><Banner>{notice}</Banner></div> : null}

      <ol className="mt-5 divide-y divide-navy/10 rounded-2xl border border-navy/10 bg-white">
        {words.length === 0 ? (
          <li className="p-4 text-ink/60">No words yet.</li>
        ) : (
          words.map((w, i) => (
            <li key={`${i}-${w.text}`} className="p-2 pl-4 flex flex-wrap items-center gap-2">
              <span className="w-7 font-display text-navy/60">{i + 1}</span>
              <input
                aria-label={`Word ${i + 1}`}
                className="flex-1 min-w-32 bg-transparent px-2 py-1 text-lg rounded-lg focus:bg-paper outline-none focus:ring-2 focus:ring-gold"
                value={w.text}
                spellCheck={false}
                autoCapitalize="off"
                onChange={(e) => setWords((ws) => ws.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
              />
              <DifficultyPicker word={w.text} value={w.difficulty ?? 'medium'} onChange={(d) => setWords((ws) => ws.map((x, j) => (j === i ? { ...x, difficulty: d } : x)))} />
              <Button variant="ghost" className="text-sm text-navy/70" onClick={() => setSentenceFor(sentenceFor === i ? null : i)}>
                {w.sentence ? 'Sentence ✓' : 'Add sentence'}
              </Button>
              <Button variant="ghost" aria-label={`Remove ${w.text}`} className="text-red" onClick={() => setWords((ws) => ws.filter((_, j) => j !== i))}>
                ✕
              </Button>
              {sentenceFor === i ? (
                <input
                  aria-label={`Sentence for ${w.text}`}
                  placeholder={`A sentence using "${w.text}" (read aloud on request)`}
                  className="basis-full ml-9 rounded-lg border border-navy/20 px-3 py-2"
                  value={w.sentence ?? ''}
                  onChange={(e) => setWords((ws) => ws.map((x, j) => (j === i ? { ...x, sentence: e.target.value || null } : x)))}
                />
              ) : null}
            </li>
          ))
        )}
      </ol>

      <div className="mt-4">
        <Button variant="secondary" onClick={() => void buildWeek()}>Build week</Button>
      </div>
      {buildNotes.map((n) => <div key={n} className="mt-3"><Banner>{n}</Banner></div>)}
      {review ? (
        <section className="mt-4">
          <h2 className="text-xl text-navy">Review words</h2>
          <ul className="mt-2 divide-y divide-navy/10 rounded-2xl border border-navy/10 bg-white">
            {review.map((w, i) => (
              <li key={`r-${i}-${w.text}`} className="p-2 pl-4 flex flex-wrap items-center gap-2">
                <span className="flex-1 text-lg">{w.text}</span>
                <span className="rounded-full bg-gold/30 px-2 py-0.5 text-xs font-bold text-navy">from last week</span>
                <DifficultyPicker word={w.text} value={w.difficulty ?? 'easy'} onChange={(d) => setReview((rs) => rs && rs.map((x, j) => (j === i ? { ...x, difficulty: d } : x)))} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {error ? <div className="mt-4"><Banner kind="error">{error}</Banner></div> : null}

      <div className="mt-6 flex gap-3">
        <Button ref={saveRef} type="submit" size="lg">{listId ? 'Save changes' : 'Save list'}</Button>
        <Button variant="secondary" size="lg" onClick={() => navigate(`/parent/players/${playerId}/lists`)}>Cancel</Button>
      </div>
    </form>
  )
}

function DifficultyPicker({ word, value, onChange }: { word: string; value: Difficulty; onChange: (d: Difficulty) => void }) {
  const label: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }
  return (
    <div role="radiogroup" aria-label={`Difficulty for ${word}`} className="flex rounded-full border border-navy/20 overflow-hidden text-sm">
      {DIFFICULTIES.map((d) => (
        <button key={d} type="button" role="radio" aria-checked={value === d} aria-label={`${word}: ${label[d]}`}
          onClick={() => onChange(d)}
          className={`px-3 py-1 ${value === d ? 'bg-navy text-chalk' : 'text-navy'}`}>
          {label[d]}
        </button>
      ))}
    </div>
  )
}
