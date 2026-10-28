/** ApiAuth: cookie sessions against the app's own API. */
import { createApiClient, type ApiClientOptions } from './api-client'
import type { AuthBackend, AuthUser } from './auth'

/** Thrown by resetPassword: there is no email provider; the site owner resets passwords. */
export const RESET_BY_OWNER = 'RESET_BY_OWNER'

export function createApiAuth(opts: ApiClientOptions = {}): AuthBackend {
  const api = createApiClient(opts)
  const listeners = new Set<(u: AuthUser | null) => void>()
  const emit = (u: AuthUser | null) => listeners.forEach((cb) => cb(u))
  const me = async (): Promise<AuthUser | null> => (await api.get<{ user: AuthUser | null }>('/auth/me')).user

  return {
    getUser: me,
    onChange(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    async signIn(email, password) {
      const { user } = await api.post<{ user: AuthUser }>('/auth/login', { email, password })
      emit(user)
    },
    async signUp(email, password) {
      const { user } = await api.post<{ user: AuthUser }>('/auth/register', { email, password })
      emit(user)
      return 'signed_in'
    },
    async signOut() {
      await api.post('/auth/logout')
      emit(null)
    },
    async resetPassword() {
      throw new Error(RESET_BY_OWNER)
    },
    updatePassword: (newPassword) => api.post('/auth/password', { newPassword }),
  }
}
