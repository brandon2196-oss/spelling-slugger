import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { authErrorMessage, useAuth } from '../../data/auth'
import { Button } from '../../components/Button'
import { TextField } from '../../components/TextField'
import { Banner } from '../../components/Banner'
import { AuthShell } from './AuthShell'

/** Change password while signed in (kept at /reset for old bookmarks). */
export function ResetPage() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setError('Use a password with at least 8 characters.')
    try {
      await updatePassword(password)
      navigate('/players', { replace: true })
    } catch (err) {
      setError(authErrorMessage(err))
    }
  }

  return (
    <AuthShell title="Choose a new password">
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField label="New password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error ? <Banner kind="error">{error}</Banner> : null}
        <Button type="submit" size="lg" className="w-full">Save password</Button>
      </form>
    </AuthShell>
  )
}
