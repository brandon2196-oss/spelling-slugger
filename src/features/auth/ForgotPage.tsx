import { Link } from 'react-router'
import { AuthShell } from './AuthShell'

/**
 * There is no email provider behind this app, so resets are done by the person who runs it
 * (from the server shell: `npm run reset-password -- you@example.com`).
 */
export function ForgotPage() {
  return (
    <AuthShell title="Forgot your password?" footer={<Link to="/login" className="underline text-gold">Back to sign in</Link>}>
      <div className="space-y-3 text-chalk/90">
        <p>Password resets are done by the person who runs this site. Send them a note with the email you signed up with and they will set a new password for you.</p>
        <p>Once you are signed in again, you can change it yourself under Parent zone → Account.</p>
      </div>
    </AuthShell>
  )
}
