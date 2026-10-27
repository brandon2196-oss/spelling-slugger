import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { isParentUnlocked } from '../parent/ParentGate'
import { Banner } from '../../components/Banner'
import { Button } from '../../components/Button'
import { ColorPicker } from '../../components/ColorPicker'
import { Modal } from '../../components/Modal'
import { Paper } from '../../components/Page'
import { TextField } from '../../components/TextField'
import { useStore } from '../../data/store'
import type { Appearance, Hairstyle, NewPlayer } from '../../data/types'
import type { Hand } from '../../engine/types'
import { DEFAULT_APPEARANCE, HAIRSTYLES, HAIRSTYLE_LABELS, HAIR_COLORS, PALETTE, SKIN_TONES, isValidJersey } from './appearance'
import { PlayerPreview } from './PlayerPreview'
import { usePlayer } from './usePlayers'

const tones = SKIN_TONES.map((hex, i) => ({ hex, name: `Skin tone ${i + 1}` }))
const hairs = HAIR_COLORS.map((hex, i) => ({ hex, name: `Hair color ${i + 1}` }))

export function PlayerEditorPage() {
  const { id } = useParams()
  const existing = usePlayer(id)
  const store = useStore()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [teamName, setTeamName] = useState('')
  const [jersey, setJersey] = useState('7')
  const [hand, setHand] = useState<Hand>('R')
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (existing) {
      setName(existing.name)
      setTeamName(existing.teamName)
      setJersey(String(existing.jerseyNumber))
      setHand(existing.hand)
      setAppearance(existing.appearance)
    }
  }, [existing])

  if (id && existing === undefined) return <Paper className="p-8" aria-busy="true" />
  if (id && existing === null) return <Paper className="p-8"><Banner kind="error">That player wasn&apos;t found.</Banner></Paper>

  const set = (patch: Partial<Appearance>) => setAppearance((a) => ({ ...a, ...patch }))
  const jerseyNumber = Number(jersey)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Give your player a name.')
    if (!isValidJersey(jerseyNumber)) return setError('Jersey numbers go from 0 to 99.')
    const input: NewPlayer = { name: name.trim(), teamName: teamName.trim(), jerseyNumber, hand, appearance }
    const saved = existing ? await store.updatePlayer(existing.id, input) : await store.createPlayer(input)
    navigate(existing ? '/players' : `/play/${saved.id}`)
  }

  async function onDelete() {
    if (!existing) return
    await store.deletePlayer(existing.id)
    navigate('/players')
  }

  return (
    <Paper className="px-4 py-8">
      <form onSubmit={onSubmit} className="mx-auto max-w-4xl grid gap-8 lg:grid-cols-[1fr_minmax(0,1.4fr)]">
        <div className="lg:sticky lg:top-6 self-start">
          <h1 className="text-4xl text-navy">{existing ? `Edit ${existing.name}` : 'Build your player'}</h1>
          <div className="mt-4 rounded-3xl bg-navy p-4 flex justify-center">
            <PlayerPreview appearance={appearance} hand={hand} jerseyNumber={isValidJersey(jerseyNumber) ? jerseyNumber : 0} size="min(70vw, 300px)" />
          </div>
          <p className="mt-3 text-ink/70 text-sm">
            {hand === 'L' ? 'Lefties stand on the first-base side of the plate.' : 'Righties stand on the third-base side of the plate.'}
          </p>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_6rem]">
            <TextField label="Player name" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} required autoFocus={!existing} hint="First name or nickname only." />
            <TextField label="Team name" value={teamName} onChange={(e) => setTeamName(e.target.value)} maxLength={30} />
            <TextField label="Number" inputMode="numeric" value={jersey} onChange={(e) => setJersey(e.target.value.replace(/\D/g, '').slice(0, 2))} />
          </div>

          <fieldset>
            <legend className="font-semibold text-navy mb-2">Bats</legend>
            <div className="grid grid-cols-2 gap-2" role="radiogroup">
              {(['L', 'R'] as Hand[]).map((h) => (
                <button
                  key={h}
                  type="button"
                  role="radio"
                  aria-checked={hand === h}
                  onClick={() => setHand(h)}
                  className={`rounded-2xl border-2 px-4 py-3 font-display text-xl transition ${hand === h ? 'border-navy bg-navy text-chalk' : 'border-navy/20 bg-white text-navy'}`}
                >
                  {h === 'L' ? 'Left-handed' : 'Right-handed'}
                </button>
              ))}
            </div>
          </fieldset>

          <ColorPicker label="Jersey" value={appearance.jerseyColor} options={PALETTE} onChange={(hex) => set({ jerseyColor: hex })} />
          <ColorPicker label="Trim and socks" value={appearance.primaryColor} options={PALETTE} onChange={(hex) => set({ primaryColor: hex })} />
          <ColorPicker label="Number color" value={appearance.secondaryColor} options={PALETTE} onChange={(hex) => set({ secondaryColor: hex })} />
          <ColorPicker label="Pants" value={appearance.pantsColor} options={PALETTE} onChange={(hex) => set({ pantsColor: hex })} />
          <ColorPicker label="Hat and helmet" value={appearance.hatColor} options={PALETTE} onChange={(hex) => set({ hatColor: hex })} />
          <ColorPicker label="Skin tone" value={appearance.skinTone} options={tones} onChange={(hex) => set({ skinTone: hex })} />
          <ColorPicker label="Hair color" value={appearance.hairColor} options={hairs} onChange={(hex) => set({ hairColor: hex })} />

          <fieldset>
            <legend className="font-semibold text-navy mb-2">Hairstyle</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup">
              {HAIRSTYLES.map((h: Hairstyle) => (
                <button
                  key={h}
                  type="button"
                  role="radio"
                  aria-checked={appearance.hairstyle === h}
                  onClick={() => set({ hairstyle: h })}
                  className={`rounded-full border-2 px-4 py-2 ${appearance.hairstyle === h ? 'border-navy bg-navy text-chalk' : 'border-navy/20 bg-white text-navy'}`}
                >
                  {HAIRSTYLE_LABELS[h]}
                </button>
              ))}
            </div>
          </fieldset>

          {error ? <Banner kind="error">{error}</Banner> : null}

          <div className="flex flex-wrap gap-3 items-center">
            <Button type="submit" size="lg">{existing ? 'Save changes' : 'Save player'}</Button>
            <Button variant="secondary" size="lg" onClick={() => navigate(-1)}>Cancel</Button>
            {existing && isParentUnlocked() ? (
              <Button variant="ghost" className="ml-auto text-red" onClick={() => setConfirmDelete(true)}>Delete player</Button>
            ) : null}
          </div>
          {existing && !isParentUnlocked() ? (
            <p className="text-sm text-ink/60">
              Removing a player is done from the <Link to="/parent" className="underline">parent zone</Link>.
            </p>
          ) : null}
        </div>
      </form>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`Delete ${existing?.name}?`}>
        <p>This removes their word lists, games and scores. There is no undo.</p>
        <div className="mt-5 flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Keep</Button>
          <Button variant="danger" onClick={() => void onDelete()}>Delete</Button>
        </div>
      </Modal>
    </Paper>
  )
}
