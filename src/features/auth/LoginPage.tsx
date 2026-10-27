import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { authErrorMessage, useAuth } from '../../data/auth'
import { Button } from '../../components/Button'
import { TextField } from '../../components/TextField'
import { Banner } from '../../components/Banner'
import { AuthShell } from './AuthShell'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await signIn(email.trim(), password)
      navigate('/players', { replace: true })
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Sign in"
      footer={<>New here? <Link to="/register" className="underline text-gold">Create a family account</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error ? <Banner kind="error">{error}</Banner> : null}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
        <p className="text-center"><Link to="/forgot" className="underline text-navy/70">Forgot your password?</Link></p>
      </form>
    </AuthShell>
  )
}
