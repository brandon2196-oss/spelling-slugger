/** Picks the database driver from DATABASE_URL. */
import { createPgDb, createTestDb, type Db } from './db'

export function openDb(url: string | undefined): Promise<Db> | Db {
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. On Replit: open the Database tool, create a database, then republish. ' +
        'Locally: DATABASE_URL=pglite://.data/dev runs an embedded Postgres.',
    )
  }
  if (url.startsWith('pglite://')) return createTestDb(url.slice('pglite://'.length) || undefined)
  return createPgDb(url)
}

