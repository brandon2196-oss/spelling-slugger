/** One tiny database interface, two drivers: `pg` in production, PGlite (Postgres in WASM) in tests. */
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>
  /** Run a multi-statement script (migrations). */
  exec(sql: string): Promise<void>
  /** Run `fn` inside one transaction; rolls back if it throws. */
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>
  close(): Promise<void>
}
export type Queryable = Pick<Db, 'query'>

export function createPgDb(connectionString: string): Db {
  // Lazy so the test build never loads `pg`.
  const poolP = import('pg').then(({ default: pg }) => new pg.Pool({ connectionString, max: 5 }))
  return {
    async query(sql, params) {
      const pool = await poolP
      const r = await pool.query(sql, params as never[])
      return { rows: r.rows }
    },
    async exec(sql) {
      const pool = await poolP
      await pool.query(sql)
    },
    async tx(fn) {
      const client = await (await poolP).connect()
      try {
        await client.query('begin')
        const out = await fn({ query: async (sql, params) => ({ rows: (await client.query(sql, params as never[])).rows }) })
        await client.query('commit')
        return out
      } catch (e) {
        await client.query('rollback').catch(() => undefined)
        throw e
      } finally {
        client.release()
      }
    },
    async close() {
      await (await poolP).end()
    },
  }
}

/** PGlite: in-memory by default, or persisted under `dataDir` for local full-stack development. */
export async function createTestDb(dataDir?: string): Promise<Db> {
  const { PGlite } = await import('@electric-sql/pglite')
  const pg = new PGlite(dataDir)
  await pg.waitReady
  return {
    async query(sql, params) {
      const r = await pg.query(sql, params)
      return { rows: r.rows as never[] }
    },
    async exec(sql) {
      await pg.exec(sql)
    },
    tx(fn) {
      return pg.transaction((t) => fn({ query: async (sql, params) => ({ rows: (await t.query(sql, params)).rows as never[] }) }))
    },
    close: () => pg.close(),
  }
}

/** Resolves next to the built bundle (server/dist) and the source (server/src) alike. */
export const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations/', import.meta.url))

/** Applies every `NNNN_name.sql` not yet in schema_migrations, in filename order. Returns what it applied. */
export async function migrate(db: Db, dir: string = MIGRATIONS_DIR): Promise<string[]> {
  await db.exec('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())')
  const done = new Set((await db.query<{ name: string }>('select name from schema_migrations')).rows.map((r) => r.name))
  const files = (await readdir(dir)).filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort()
  const applied: string[] = []
  for (const f of files) {
    if (done.has(f)) continue
    const sql = await readFile(new URL(f, `file://${dir}`), 'utf8')
    await db.exec(`begin;\n${sql}\ninsert into schema_migrations (name) values ('${f}');\ncommit;`)
    applied.push(f)
  }
  return applied
}
