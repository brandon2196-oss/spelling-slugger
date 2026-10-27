import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { authErrorMessage, useAuth } from '../../data/auth'
import { Button } from '../../components/Button'
import { TextField } from '../../components/TextField'
import { Banner } from '../../components/Banner'
import { AuthShell } from './AuthShell'

export function ForgotPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await resetPassword(email.trim())
      setSent(true)
    } catch (err) {
      setError(authErrorMessage(err))
    }
  }

  return (
    <AuthShell title="Reset your password" footer={<Link to="/login" className="underline text-gold">Back to sign in</Link>}>
      {sent ? (
        <Banner kind="success">Check your email for a reset link.</Banner>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {error ? <Banner kind="error">{error}</Banner> : null}
          <Button type="submit" size="lg" className="w-full">Send reset link</Button>
        </form>
      )}
    </AuthShell>
  )
}
