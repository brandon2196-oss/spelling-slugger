import { useMemo } from 'react'
import { RouterProvider } from 'react-router'
import { createApiAuth } from './data/api-auth'
import { createApiStore } from './data/api-store'
import { AuthProvider, createLocalAuth } from './data/auth'
import { createLocalStore } from './data/local-store'
import { StoreContext } from './data/store'
import { router } from './routes'
import { ErrorBoundary } from './components/ErrorBoundary'
import { enableBakedWordAudio } from './audio/word-audio'

export type Backend = 'local' | 'api'

/**
 * VITE_STORE wins when set. Otherwise a production build talks to the app's own API and a dev
 * server runs in local mode (localStorage, fake sign-in) so the app works with nothing else running.
 */
export function chooseBackend(env: { VITE_STORE?: string; PROD?: boolean } = import.meta.env): Backend {
  if (env.VITE_STORE === 'local') return 'local'
  if (env.VITE_STORE === 'api') return 'api'
  return env.PROD ? 'api' : 'local'
}

export default function App() {
  const { auth, store } = useMemo(() => {
    const backend = chooseBackend()
    // Baked word clips exist only on the server; local mode keeps browser speech.
    enableBakedWordAudio(backend === 'api')
    if (backend === 'api') return { auth: createApiAuth(), store: createApiStore() }
    return { auth: createLocalAuth(), store: createLocalStore() }
  }, [])
  return (
    <AuthProvider backend={auth}>
      <StoreContext.Provider value={store}>
        <ErrorBoundary>
          <RouterProvider router={router} />
        </ErrorBoundary>
      </StoreContext.Provider>
    </AuthProvider>
  )
}
