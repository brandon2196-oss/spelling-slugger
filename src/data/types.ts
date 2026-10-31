/** Persistence-layer types and the Store interface every backend implements. */
import type { GameSummary } from '../engine/results'
import type { Difficulty, GameWord, Hand, Outcome, WordSource } from '../engine/types'

export type Hairstyle = 'short' | 'curly' | 'long' | 'buzz' | 'ponytail' | 'afro'

export interface Appearance {
  primaryColor: string
  secondaryColor: string
  jerseyColor: string
  pantsColor: string
  hatColor: string
  skinTone: string
  hairColor: string
  hairstyle: Hairstyle
}

export interface Player {
  id: string
  name: string
  teamName: string
  jerseyNumber: number
  hand: Hand
  appearance: Appearance
  createdAt: string
}
export type NewPlayer = Omit<Player, 'id' | 'createdAt'>

export interface Word {
  id: string
  /** 1-based display number. */
  position: number
  text: string
  sentence: string | null
  difficulty: Difficulty
  source: WordSource
}
export interface NewWord {
  text: string
  sentence: string | null
  difficulty?: Difficulty
  source?: WordSource
}

export interface WordList {
  id: string
  playerId: string
  title: string
  /** YYYY-MM-DD */
  weekStart: string
  isActive: boolean
  createdAt: string
  words: Word[]
}

export type GameMode = 'weekly' | 'practice' | 'missed'

export interface StoredAttempt {
  position: number
  attemptNumber: 1 | 2 | 3
  text: string
  correct: boolean
  /** Set on the attempt that ended the at-bat; null for strikes one and two. */
  outcome: Outcome | null
}

export interface GameRecord {
  id: string
  playerId: string
  listId: string | null
  mode: GameMode
  status: 'in_progress' | 'complete'
  words: GameWord[]
  attempts: StoredAttempt[]
  warnings: string[]
  summary: GameSummary | null
  /** Phase 3: filled when the game completes; null for older games and games in progress. A tie is a win. */
  result: 'win' | 'loss' | null
  /** Phase 3: the Visitors' final total; null for older games and games in progress. */
  visitorRuns: number | null
  startedAt: string
  completedAt: string | null
}

export interface NewGame {
  playerId: string
  listId: string | null
  mode: GameMode
  words: GameWord[]
  warnings: string[]
}

export interface GameFilter {
  mode?: GameMode
  listId?: string
  status?: GameRecord['status']
}

export interface Store {
  listPlayers(): Promise<Player[]>
  createPlayer(input: NewPlayer): Promise<Player>
  updatePlayer(id: string, patch: Partial<NewPlayer>): Promise<Player>
  deletePlayer(id: string): Promise<void>

  /** Newest weekStart first. */
  listWordLists(playerId: string): Promise<WordList[]>
  getWordList(id: string): Promise<WordList | null>
  createWordList(playerId: string, input: { title: string; weekStart: string; words: NewWord[] }): Promise<WordList>
  /** `words`, when given, replaces the whole list and renumbers 1..n. */
  updateWordList(id: string, patch: { title?: string; weekStart?: string; words?: NewWord[] }): Promise<WordList>
  /** Exactly one active list per player. */
  setActiveList(playerId: string, listId: string): Promise<void>
  deleteWordList(id: string): Promise<void>

  createGame(input: NewGame): Promise<GameRecord>
  /** Idempotent on (gameId, position, attemptNumber). */
  recordAttempt(gameId: string, attempt: StoredAttempt): Promise<void>
  completeGame(gameId: string, summary: GameSummary): Promise<void>
  getGame(id: string): Promise<GameRecord | null>
  findInProgressGame(playerId: string): Promise<GameRecord | null>
  /** Newest first. */
  listGames(playerId: string, filter?: GameFilter): Promise<GameRecord[]>

  hasParentPin(): Promise<boolean>
  setParentPin(pin: string): Promise<void>
  verifyParentPin(pin: string): Promise<boolean>
  deleteAccount(): Promise<void>
}
