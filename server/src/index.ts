/**
 * Production entry: one process serves the built frontend from STATIC_DIR (default dist/) and the
 * API, against DATABASE_URL. `pglite://<dir>` runs an embedded Postgres for local full-stack dev
 * and tests (dev dependency; never used on Replit).
 */
import { existsSync } from 'node:fs'
import path from 'node:path'
import { createApp } from './app'
import { migrate } from './db'
import { openDb } from './index-db'

async function main() {
  const db = await openDb(process.env.DATABASE_URL)
  const applied = await migrate(db)
  if (applied.length) console.log(`migrations applied: ${applied.join(', ')}`)

  const staticDir = path.resolve(process.env.STATIC_DIR ?? 'dist')
  if (!existsSync(path.join(staticDir, 'index.html'))) console.warn(`no frontend build at ${staticDir}; serving the API only`)

  // Replit deployments are always HTTPS; anything running on Replit gets Secure cookies.
  const secureCookies = process.env.SECURE_COOKIES ? process.env.SECURE_COOKIES !== '0' : Boolean(process.env.REPL_ID)
  const app = createApp(db, { secureCookies, staticDir: existsSync(staticDir) ? staticDir : undefined })
  const port = Number(process.env.PORT ?? 3000)
  app.listen(port, '0.0.0.0', () => console.log(`Spelling Slugger listening on :${port} (secure cookies: ${secureCookies})`))
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
