/** Parent accounts and sessions. */
import { hashPassword, newSessionToken, SESSION_DAYS, tokenHash, verifyPassword } from './auth'
import type { Db } from './db'
import { createFamily } from './store'

export interface SessionUser {
  userId: string
  familyId: string
  email: string
}

interface UserRow { id: string; family_id: string; email: string; password_hash: string }

export async function registerUser(db: Db, email: string, password: string): Promise<SessionUser> {
  const taken = await db.query('select 1 from users where lower(email) = lower($1)', [email])
  if (taken.rows.length > 0) throw new Error('EMAIL_TAKEN')
  const hash = await hashPassword(password)
  return db.tx(async (q) => {
    const familyId = await createFamily(q)
    const { rows } = await q.query<{ id: string }>(
      'insert into users (family_id, email, password_hash) values ($1, $2, $3) returning id', [familyId, email, hash],
    )
    return { userId: rows[0]!.id, familyId, email }
  }).catch((e: unknown) => {
    // Lost a race with the same email: the unique index fired.
    if (e instanceof Error && /users_email_idx|unique/i.test(e.message)) throw new Error('EMAIL_TAKEN')
    throw e
  })
}

export async function authenticate(db: Db, email: string, password: string): Promise<SessionUser | null> {
  const { rows } = await db.query<UserRow>('select * from users where lower(email) = lower($1)', [email])
  const u = rows[0]
  if (!u || !(await verifyPassword(password, u.password_hash))) return null
  return { userId: u.id, familyId: u.family_id, email: u.email }
}

export async function setPassword(db: Db, userId: string, password: string): Promise<void> {
  await db.query('update users set password_hash = $2 where id = $1', [userId, await hashPassword(password)])
}

/** Owner-run reset (no email provider): returns false when no such account exists. */
export async function resetPasswordByEmail(db: Db, email: string, password: string): Promise<boolean> {
  const { rows } = await db.query<{ id: string }>('select id from users where lower(email) = lower($1)', [email])
  if (!rows[0]) return false
  await setPassword(db, rows[0].id, password)
  await db.query('delete from sessions where user_id = $1', [rows[0].id])
  return true
}

export async function createSession(db: Db, userId: string): Promise<string> {
  const token = newSessionToken()
  await db.query(
    `insert into sessions (token_hash, user_id, expires_at) values ($1, $2, now() + ($3 || ' days')::interval)`,
    [tokenHash(token), userId, String(SESSION_DAYS)],
  )
  return token
}

export async function findSession(db: Db, token: string): Promise<SessionUser | null> {
  const { rows } = await db.query<UserRow>(
    `select u.* from sessions s join users u on u.id = s.user_id where s.token_hash = $1 and s.expires_at > now()`,
    [tokenHash(token)],
  )
  const u = rows[0]
  return u ? { userId: u.id, familyId: u.family_id, email: u.email } : null
}

export async function deleteSession(db: Db, token: string): Promise<void> {
  await db.query('delete from sessions where token_hash = $1', [tokenHash(token)])
}
