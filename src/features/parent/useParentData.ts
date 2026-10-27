import { useEffect, useState } from 'react'
import { useStore } from '../../data/store'
import type { GameRecord, WordList } from '../../data/types'

/** Everything the dashboard pages need for one child, loaded once. */
export function useParentData(playerId: string) {
  const store = useStore()
  const [games, setGames] = useState<GameRecord[] | null>(null)
  const [lists, setLists] = useState<WordList[] | null>(null)
  useEffect(() => {
    store.listGames(playerId).then(setGames)
    store.listWordLists(playerId).then(setLists)
  }, [store, playerId])
  return { games, lists, loading: games === null || lists === null }
}
