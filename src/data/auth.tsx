/** Parent authentication. One interface, two backends: localStorage (dev/tests) and the app's API (api-auth.ts). */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export interface AuthUser {
  id: string
  email: string | null
}

export interface AuthBackend {
  getUser(): Promise<AuthUser | null>
  onChange(cb: (u: AuthUser | null) => void): () => void
  /** Throws Error('INVALID_CREDENTIALS') on a bad email/password. */
  signIn(email: string, password: string): Promise<void>
  /** Throws Error('EMAIL_TAKEN') when the email is already registered. */
  signUp(email: string, password: string): Promise<'signed_in' | 'confirm_email'>
  signOut(): Promise<void>
  resetPassword(email: string): Promise<void>
  updatePassword(newPassword: string): Promise<void>
}

// ---------------------------------------------------------------- local backend
const LOCAL_KEY = 'slugger.auth'
interface LocalAuthBlob {
  users: Record<string, { id: string; pass: string }>
  current: string | null
}

export function createLocalAuth(): AuthBackend {
  const load = (): LocalAuthBlob => {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '') as LocalAuthBlob
    } catch {
      return { users: {}, current: null }
    }
  }
  const save = (b: LocalAuthBlob) => localStorage.setItem(LOCAL_KEY, JSON.stringify(b))
  const listeners = new Set<(u: AuthUser | null) => void>()
  const currentUser = (b: LocalAuthBlob): AuthUser | null => {
    if (!b.current) return null
    const entry = Object.entries(b.users).find(([, v]) => v.id === b.current)
    return entry ? { id: entry[1].id, email: entry[0] } : null
  }
  const emit = () => {
    const u = currentUser(load())
    listeners.forEach((cb) => cb(u))
  }
  return {
    async getUser() {
      return currentUser(load())
    },
    onChange(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    async signIn(email, password) {
      const b = load()
      const u = b.users[email.toLowerCase()]
      if (!u || u.pass !== password) throw new Error('INVALID_CREDENTIALS')
      b.current = u.id
      save(b)
      emit()
    },
    async signUp(email, password) {
      const b = load()
      const key = email.toLowerCase()
      if (b.users[key]) throw new Error('EMAIL_TAKEN')
      const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now())
      b.users[key] = { id, pass: password }
      b.current = id
      save(b)
      emit()
      return 'signed_in'
    },
    async signOut() {
      const b = load()
      b.current = null
      save(b)
      emit()
    },
    async resetPassword() {
      /* nothing to send in local mode */
    },
    async updatePassword(newPassword) {
      const b = load()
      const entry = Object.values(b.users).find((v) => v.id === b.current)
      if (entry) entry.pass = newPassword
      save(b)
    },
  }
}

// ---------------------------------------------------------------- React
interface AuthValue extends Omit<AuthBackend, 'getUser' | 'onChange'> {
  user: AuthUser | null
  loading: boolean
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ backend, children }: { backend: AuthBackend; children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    backend.getUser().then((u) => {
      if (!alive) return
      setUser(u)
      setLoading(false)
    })
    const off = backend.onChange((u) => alive && setUser(u))
    return () => {
      alive = false
      off()
    }
  }, [backend])

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      signIn: (e, p) => backend.signIn(e, p),
      signUp: (e, p) => backend.signUp(e, p),
      signOut: () => backend.signOut(),
      resetPassword: (e) => backend.resetPassword(e),
      updatePassword: (p) => backend.updatePassword(p),
    }),
    [backend, user, loading],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const v = useContext(AuthContext)
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>')
  return v
}

/** Friendly copy for auth errors. */
export function authErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (msg === 'INVALID_CREDENTIALS') return "That email or password doesn't match."
  if (msg === 'EMAIL_TAKEN') return 'An account with that email already exists. Try signing in.'
  if (msg === 'UNAUTHENTICATED') return 'You are signed out. Please sign in again.'
  if (msg === 'TOO_MANY_ATTEMPTS') return 'Too many tries. Wait a few minutes and try again.'
  if (msg === 'OFFLINE') return "Can't reach the server. Check the connection and try again."
  if (msg === 'INVALID_EMAIL') return 'That does not look like an email address.'
  if (msg === 'BAD_REQUEST') return 'Something in that form was not accepted. Check the fields and try again.'
  return msg || 'Something went wrong. Please try again.'
}
