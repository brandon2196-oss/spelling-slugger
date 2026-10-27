import { useMemo } from 'react'
import { RouterProvider } from 'react-router'
import { AuthProvider, createLocalAuth, createSupabaseAuth } from './data/auth'
import { createLocalStore } from './data/local-store'
import { StoreContext } from './data/store'
import { createSupabaseStore } from './data/supabase-store'
import { getSupabase, supabaseConfigured } from './data/supabase-client'
import { router } from './routes'

const APP_URL = (import.meta.env.VITE_APP_URL as string | undefined) ?? window.location.origin

/** "supabase" when asked for or when configured; otherwise local mode so the app runs with no account. */
export function chooseBackend(): 'local' | 'supabase' {
  const wanted = import.meta.env.VITE_STORE as string | undefined
  if (wanted === 'local') return 'local'
  if (wanted === 'supabase') return 'supabase'
  return supabaseConfigured() ? 'supabase' : 'local'
}

export default function App() {
  const { auth, store } = useMemo(() => {
    if (chooseBackend() === 'supabase') {
      const sb = getSupabase()
      return { auth: createSupabaseAuth(sb, APP_URL), store: createSupabaseStore(sb) }
    }
    return { auth: createLocalAuth(), store: createLocalStore() }
  }, [])
  return (
    <AuthProvider backend={auth}>
      <StoreContext.Provider value={store}>
        <RouterProvider router={router} />
      </StoreContext.Provider>
    </AuthProvider>
  )
}
