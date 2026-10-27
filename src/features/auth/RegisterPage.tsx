import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { authErrorMessage, useAuth } from '../../data/auth'
import { Button } from '../../components/Button'
import { TextField } from '../../components/TextField'
import { Banner } from '../../components/Banner'
import { AuthShell } from './AuthShell'

export function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('Use a password with at least 8 characters.')
    setBusy(true)
    try {
      const result = await signUp(email.trim(), password)
      if (result === 'confirm_email') setConfirm(true)
      else navigate('/players', { replace: true })
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (confirm) {
    return (
      <AuthShell title="Check your email">
        <p className="text-lg">We sent a confirmation link to <strong>{email}</strong>. Open it, then come back and sign in.</p>
        <Link to="/login" className="btn-primary mt-6 w-full">Go to sign in</Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Create a family account"
      footer={<>Already have one? <Link to="/login" className="underline text-gold">Sign in</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          hint="At least 8 characters. This is the grown-up's password; kids never need one."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <Banner kind="error">{error}</Banner> : null}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  )
}
