/** Owner tools, run from the server shell: `npm run reset-password -- mom@example.com NewPassword123` */
import { MIN_PASSWORD_LENGTH } from './auth'
import { migrate } from './db'
import { openDb } from './index-db'
import { resetPasswordByEmail } from './users'

const [cmd, ...args] = process.argv.slice(2)

async function main() {
  if (cmd !== 'reset-password') {
    console.error('usage: cli reset-password <email> <new-password>')
    process.exit(2)
  }
  const [email, password] = args
  if (!email || !password || password.length < MIN_PASSWORD_LENGTH) {
    console.error(`usage: cli reset-password <email> <new-password>  (password: at least ${MIN_PASSWORD_LENGTH} characters)`)
    process.exit(2)
  }
  const db = await openDb(process.env.DATABASE_URL)
  await migrate(db)
  const ok = await resetPasswordByEmail(db, email, password)
  console.log(ok ? `password updated for ${email}; their other devices are signed out` : `no account with email ${email}`)
  await db.close()
  process.exit(ok ? 0 : 1)
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
