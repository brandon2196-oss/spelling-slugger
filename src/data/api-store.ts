/** ApiStore: the production Store, talking to the app's own API with the session cookie. */
import { createApiClient, type ApiClientOptions } from './api-client'
import type { GameFilter, GameRecord, NewGame, NewPlayer, Player, Store, StoredAttempt, WordList } from './types'

export function createApiStore(opts: ApiClientOptions = {}): Store {
  const api = createApiClient(opts)
  const q = (filter: GameFilter) => {
    const s = new URLSearchParams()
    if (filter.mode) s.set('mode', filter.mode)
    if (filter.listId) s.set('listId', filter.listId)
    if (filter.status) s.set('status', filter.status)
    const str = s.toString()
    return str ? `?${str}` : ''
  }
  return {
    listPlayers: () => api.get<Player[]>('/players'),
    createPlayer: (input: NewPlayer) => api.post<Player>('/players', input),
    updatePlayer: (id, patch) => api.patch<Player>(`/players/${id}`, patch),
    deletePlayer: (id) => api.del(`/players/${id}`),

    listWordLists: (playerId) => api.get<WordList[]>(`/players/${playerId}/lists`),
    getWordList: (id) => api.get<WordList>(`/lists/${id}`).catch(nullOn404),
    createWordList: (playerId, input) => api.post<WordList>(`/players/${playerId}/lists`, input),
    updateWordList: (id, patch) => api.patch<WordList>(`/lists/${id}`, patch),
    setActiveList: (playerId, listId) => api.put(`/players/${playerId}/active-list`, { listId }),
    deleteWordList: (id) => api.del(`/lists/${id}`),

    createGame: (input: NewGame) => api.post<GameRecord>('/games', input),
    recordAttempt: (gameId, attempt: StoredAttempt) => api.post(`/games/${gameId}/attempts`, attempt),
    /** The server computes the summary from the attempt log; the argument is kept for the interface. */
    completeGame: (gameId) => api.post(`/games/${gameId}/complete`, {}),
    getGame: (id) => api.get<GameRecord>(`/games/${id}`).catch(nullOn404),
    findInProgressGame: (playerId) => api.get<GameRecord | null>(`/players/${playerId}/games/in-progress`),
    listGames: (playerId, filter = {}) => api.get<GameRecord[]>(`/players/${playerId}/games${q(filter)}`),

    hasParentPin: async () => (await api.get<{ set: boolean }>('/pin')).set,
    setParentPin: (pin) => api.put('/pin', { pin }),
    verifyParentPin: async (pin) => (await api.post<{ ok: boolean }>('/pin/verify', { pin })).ok,
    deleteAccount: () => api.del('/account'),
  }
}

function nullOn404(e: unknown): null {
  if (e instanceof Error && e.message === 'NOT_FOUND') return null
  throw e
}
