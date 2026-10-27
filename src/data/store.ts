import { createContext, useContext } from 'react'
import type { Store } from './types'

export const StoreContext = createContext<Store | null>(null)

export function useStore(): Store {
  const s = useContext(StoreContext)
  if (!s) throw new Error('useStore must be used inside <StoreProvider>')
  return s
}
