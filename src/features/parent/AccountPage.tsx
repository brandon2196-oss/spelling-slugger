import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Banner } from '../../components/Banner'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { Paper } from '../../components/Page'
import { TextField } from '../../components/TextField'
import { authErrorMessage, useAuth } from '../../data/auth'
import { useStore } from '../../data/store'
import { ShareButton } from '../share/ShareButton'
import { lockParentZone } from './ParentGate'
import { PinPad } from './PinPad'

export function AccountPage() {
  const { user, signOut, updatePassword } = useAuth()
  const store = useStore()
  const navigate = useNavigate()
  const [pinStep, setPinStep] = useState<'idle' | 'first' | 'second'>('idle')
  const [firstPin, setFirstPin] = useState('')
  const [pinMsg, setPinMsg] = useState<string | null>(null)
  const [shake, setShake] = useState(0)
  const [password, setPassword] = useState('')
  const [passMsg, setPassMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteWord, setDeleteWord] = useState('')

  async function onPin(pin: string) {
    if (pinStep === 'first') {
      setFirstPin(pin)
      setPinStep('second')
      return
    }
    if (pin !== firstPin) {
      setShake((s) => s + 1)
      setPinStep('first')
      setPinMsg("Those didn't match. Start again.")
      return
    }
    await store.setParentPin(pin)
    setPinStep('idle')
    setPinMsg('PIN updated.')
  }

  async function onPassword(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setPassMsg({ kind: 'error', text: 'Use at least 8 characters.' })
    try {
      await updatePassword(password)
      setPassword('')
      setPassMsg({ kind: 'success', text: 'Password updated.' })
    } catch (err) {
      setPassMsg({ kind: 'error', text: authErrorMessage(err) })
    }
  }

  async function onDelete() {
    await store.deleteAccount()
    lockParentZone()
    await signOut()
    navigate('/', { replace: true })
  }

  async function onSignOut() {
    lockParentZone()
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <Paper className="px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <Link to="/parent" className="underline text-navy/70">← Parent zone</Link>
          <h1 className="mt-2 text-3xl text-navy">Account</h1>
          <p className="text-ink/70">Signed in as <strong>{user?.email ?? 'local family'}</strong>.</p>
        </div>

        <section className="rounded-2xl bg-white border border-navy/10 p-5">
          <h2 className="font-display text-xl text-navy">Share with other families</h2>
          <p className="text-ink/70 mb-3">Every family gets its own private account, players and word lists.</p>
          <ShareButton />
        </section>

        <section className="rounded-2xl bg-white border border-navy/10 p-5">
          <h2 className="font-display text-xl text-navy">Parent PIN</h2>
          {pinStep === 'idle' ? (
            <div className="mt-2 flex items-center gap-3">
              <Button variant="secondary" onClick={() => { setPinMsg(null); setPinStep('first') }}>Change PIN</Button>
              {pinMsg ? <span className="text-grass-dark">{pinMsg}</span> : null}
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-center text-ink/70 mb-3">{pinStep === 'first' ? 'Enter a new 4-digit PIN.' : 'Enter it again.'}</p>
              <PinPad onComplete={onPin} shakeKey={shake} />
              {pinMsg ? <div className="mt-3"><Banner kind="error">{pinMsg}</Banner></div> : null}
              <Button variant="ghost" className="mt-3" onClick={() => setPinStep('idle')}>Cancel</Button>
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white border border-navy/10 p-5">
          <h2 className="font-display text-xl text-navy">Password</h2>
          <form onSubmit={onPassword} className="mt-2 flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1"><TextField label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <Button type="submit" variant="secondary" size="lg">Update password</Button>
          </form>
          {passMsg ? <div className="mt-3"><Banner kind={passMsg.kind}>{passMsg.text}</Banner></div> : null}
        </section>

        <section className="rounded-2xl bg-white border border-navy/10 p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-navy">Sign out</h2>
            <p className="text-ink/70">Kids can keep playing on this device until you sign out.</p>
          </div>
          <Button variant="secondary" onClick={() => void onSignOut()}>Sign out</Button>
        </section>

        <section className="rounded-2xl border border-red/30 bg-red/5 p-5">
          <h2 className="font-display text-xl text-red">Delete this family&apos;s account</h2>
          <p className="text-ink/70">Removes every player, word list, game and score. There is no undo.</p>
          <Button variant="ghost" className="mt-2 text-red" onClick={() => setConfirmDelete(true)}>Delete account…</Button>
        </section>
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete everything?">
        <p>Type <strong>DELETE</strong> to confirm. All players, lists and scores will be gone for good.</p>
        <div className="mt-3"><TextField label="Confirmation" value={deleteWord} onChange={(e) => setDeleteWord(e.target.value)} autoComplete="off" /></div>
        <div className="mt-5 flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Keep my account</Button>
          <Button variant="danger" disabled={deleteWord !== 'DELETE'} onClick={() => void onDelete()}>Delete account</Button>
        </div>
      </Modal>
    </Paper>
  )
}
