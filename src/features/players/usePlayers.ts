import { useCallback, useEffect, useState } from 'react'
import { useStore } from '../../data/store'
import type { Player } from '../../data/types'

export function usePlayers() {
  const store = useStore()
  const [players, setPlayers] = useState<Player[] | null>(null)
  const reload = useCallback(() => store.listPlayers().then(setPlayers), [store])
  useEffect(() => {
    void reload()
  }, [reload])
  return { players, loading: players === null, reload }
}

export function usePlayer(id: string | undefined) {
  const store = useStore()
  const [player, setPlayer] = useState<Player | null | undefined>(undefined)
  useEffect(() => {
    if (!id) return setPlayer(null)
    store.listPlayers().then((ps) => setPlayer(ps.find((p) => p.id === id) ?? null))
  }, [store, id])
  return player // undefined = loading, null = not found
}
