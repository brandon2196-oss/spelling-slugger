// @vitest-environment node
import { EventEmitter } from 'node:events'
import { createPgDb, createTestDb, migrate, type Db } from './db'

let db: Db
beforeAll(async () => {
  db = await createTestDb()
})
afterAll(() => db.close())

describe('migrate', () => {
  it('applies the initial migration once and is idempotent', async () => {
    expect(await migrate(db)).toEqual(['0001_init.sql'])
    expect(await migrate(db)).toEqual([])
  })

  it('creates every table the API needs', async () => {
    const { rows } = await db.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public' order by 1",
    )
    const names = rows.map((r) => r.table_name)
    for (const t of ['families', 'users', 'sessions', 'players', 'word_lists', 'words', 'games', 'game_words', 'attempts', 'schema_migrations'])
      expect(names).toContain(t)
  })

  it('rejects two users with the same email in different case', async () => {
    const fam = await db.query<{ id: string }>('insert into families default values returning id')
    const fid = fam.rows[0]!.id
    await db.query('insert into users (family_id, email, password_hash) values ($1, $2, $3)', [fid, 'Mom@Example.com', 'x'])
    await expect(
      db.query('insert into users (family_id, email, password_hash) values ($1, $2, $3)', [fid, 'mom@example.com', 'y']),
    ).rejects.toThrow()
  })
})

describe('createPgDb', () => {
  it('survives an idle-connection error from the pool instead of crashing the process', async () => {
    const pools: EventEmitter[] = []
    vi.doMock('pg', () => ({
      default: {
        Pool: class extends EventEmitter {
          constructor() { super(); pools.push(this) }
          query = async () => ({ rows: [] })
          end = async () => undefined
        },
      },
    }))
    const errors: unknown[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a) })
    try {
      const pg = createPgDb('postgres://x')
      await pg.query('select 1')
      expect(pools).toHaveLength(1)
      // With no 'error' listener EventEmitter throws here, which in production exits the process.
      expect(() => pools[0]!.emit('error', new Error('terminating connection due to idle timeout'))).not.toThrow()
      expect(errors.length).toBeGreaterThan(0)
      await pg.close()
    } finally {
      spy.mockRestore()
      vi.doUnmock('pg')
    }
  })
})
