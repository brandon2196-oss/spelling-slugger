import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { useStore } from '../../data/store'
import type { WordList } from '../../data/types'
import { addDays, prettyDate } from './dates'

export function ListsPage() {
  const { playerId = '' } = useParams()
  const store = useStore()
  const [lists, setLists] = useState<WordList[] | null>(null)
  const [toDelete, setToDelete] = useState<WordList | null>(null)
  const reload = useCallback(() => store.listWordLists(playerId).then(setLists), [store, playerId])
  useEffect(() => {
    void reload()
  }, [reload])

  if (!lists) return <div aria-busy="true" />

  async function makeActive(l: WordList) {
    await store.setActiveList(playerId, l.id)
    await reload()
  }
  async function duplicate(l: WordList) {
    await store.createWordList(playerId, {
      title: `${l.title} (copy)`,
      weekStart: addDays(l.weekStart, 7),
      words: l.words.map((w) => ({ text: w.text, sentence: w.sentence })),
    })
    await reload()
  }
  async function remove() {
    if (!toDelete) return
    await store.deleteWordList(toDelete.id)
    setToDelete(null)
    await reload()
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl text-navy">Word lists</h1>
          <p className="text-ink/70">One list per school week. The active list is what &ldquo;Play this week&rdquo; uses.</p>
        </div>
        <Link to={`/parent/players/${playerId}/lists/new`} className="btn-primary">New week</Link>
      </div>

      {lists.length === 0 ? (
        <div className="mt-8 rounded-3xl border-2 border-dashed border-navy/20 p-8 text-center">
          <p className="text-xl text-navy font-display">No words yet</p>
          <p className="mt-1 text-ink/70">Type in this week&apos;s spelling list and your slugger can step up to the plate.</p>
          <Link to={`/parent/players/${playerId}/lists/new`} className="btn-primary mt-5">Add this week&apos;s words</Link>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-navy/10">
          {lists.map((l) => (
            <li key={l.id} className="py-4 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link to={`/parent/players/${playerId}/lists/${l.id}`} className="font-display text-xl text-navy hover:underline">{l.title}</Link>
                  {l.isActive ? <span className="rounded-full bg-grass text-chalk text-xs font-bold px-2 py-0.5">Active</span> : null}
                </div>
                <p className="text-sm text-ink/70">Week of {prettyDate(l.weekStart)} · {l.words.length} word{l.words.length === 1 ? '' : 's'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!l.isActive ? <Button variant="secondary" onClick={() => void makeActive(l)}>Make active</Button> : null}
                <Button variant="secondary" onClick={() => void duplicate(l)}>Duplicate</Button>
                <Button variant="ghost" className="text-red" onClick={() => setToDelete(l)}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={toDelete !== null} onClose={() => setToDelete(null)} title={`Delete "${toDelete?.title}"?`}>
        <p>Finished games keep their words and scores.</p>
        <div className="mt-5 flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setToDelete(null)}>Keep</Button>
          <Button variant="danger" onClick={() => void remove()}>Delete</Button>
        </div>
      </Modal>
    </section>
  )
}
