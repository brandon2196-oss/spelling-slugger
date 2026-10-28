/** Passwords (scrypt, Node built-in) and opaque session tokens. No secrets to configure. */
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: { N: number }) => Promise<Buffer>

const SCRYPT_N = 16384
const KEY_LEN = 64

export const SESSION_COOKIE = 'slugger_session'
export const SESSION_DAYS = 90
export const MIN_PASSWORD_LENGTH = 8

/** `scrypt$<N>$<salt b64>$<key b64>` */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scrypt(password, salt, KEY_LEN, { N: SCRYPT_N })
  return ['scrypt', SCRYPT_N, salt.toString('base64'), key.toString('base64')].join('$')
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, nStr, saltB64, keyB64] = stored.split('$')
  if (scheme !== 'scrypt' || !nStr || !saltB64 || !keyB64) return false
  const N = Number(nStr)
  if (!Number.isInteger(N) || N < 1024) return false
  try {
    const expected = Buffer.from(keyB64, 'base64')
    const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length, { N })
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

export function newSessionToken(): string {
  return randomBytes(32).toString('base64url')
}

export function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
