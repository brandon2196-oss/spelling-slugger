/**
 * Family isolation test (spec test 22). Runs only against a throwaway Supabase project:
 *   SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY, SUPABASE_TEST_SERVICE_KEY
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseStore } from './supabase-store'
import type { NewPlayer } from './types'

const URL = process.env.SUPABASE_TEST_URL
const ANON = process.env.SUPABASE_TEST_ANON_KEY
const SERVICE = process.env.SUPABASE_TEST_SERVICE_KEY
const enabled = Boolean(URL && ANON && SERVICE)

const player: NewPlayer = {
  name: 'Test', teamName: 'T', jerseyNumber: 1, hand: 'L',
  appearance: {
    primaryColor: '#000', secondaryColor: '#fff', jerseyColor: '#000', pantsColor: '#fff',
    hatColor: '#000', skinTone: '#fff', hairColor: '#000', hairstyle: 'short',
  },
}

describe.skipIf(!enabled)('row-level security between families', () => {
  const admin = enabled ? createClient(URL!, SERVICE!, { auth: { persistSession: false } }) : null
  const users: string[] = []
  let a: SupabaseClient, b: SupabaseClient

  async function signedInClient(tag: string): Promise<SupabaseClient> {
    const email = `rls-${tag}-${Date.now()}@example.com`
    const password = 'Test-password-123!'
    const { data, error } = await admin!.auth.admin.createUser({ email, password, email_confirm: true })
    if (error) throw error
    users.push(data.user.id)
    const c = createClient(URL!, ANON!, { auth: { persistSession: false } })
    const { error: e2 } = await c.auth.signInWithPassword({ email, password })
    if (e2) throw e2
    return c
  }

  beforeAll(async () => {
    a = await signedInClient('a')
    b = await signedInClient('b')
  }, 30_000)

  afterAll(async () => {
    for (const id of users) await admin!.auth.admin.deleteUser(id)
  })

  it('family B sees none of family A’s players, lists, games or words', async () => {
    const storeA = createSupabaseStore(a)
    const storeB = createSupabaseStore(b)
    const p = await storeA.createPlayer(player)
    const l = await storeA.createWordList(p.id, { title: 'W', weekStart: '2026-10-19', words: [{ text: 'cat', sentence: null }] })
    const g = await storeA.createGame({
      playerId: p.id, listId: l.id, mode: 'weekly', warnings: [],
      words: [{ position: 0, text: 'cat', sentence: null, source: 'current', sourceWordId: null }],
    })

    expect(await storeB.listPlayers()).toEqual([])
    expect(await storeB.getWordList(l.id)).toBeNull()
    expect(await storeB.getGame(g.id)).toBeNull()
    const { data: words } = await b.from('words').select('*')
    expect(words).toEqual([])
    const { data: gw } = await b.from('game_words').select('*')
    expect(gw).toEqual([])

    // B cannot write into A's list either.
    const { error } = await b.from('words').insert({ list_id: l.id, position: 9, text: 'hack' })
    expect(error).not.toBeNull()
  }, 30_000)

  it('each new user gets exactly one family and a working PIN', async () => {
    const storeA = createSupabaseStore(a)
    expect(await storeA.hasParentPin()).toBe(false)
    await storeA.setParentPin('1234')
    expect(await storeA.verifyParentPin('1234')).toBe(true)
    expect(await storeA.verifyParentPin('9999')).toBe(false)
  }, 30_000)
})
