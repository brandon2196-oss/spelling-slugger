// @vitest-environment node
import { hashPassword, newSessionToken, tokenHash, verifyPassword } from './auth'

describe('passwords', () => {
  it('verifies the password it hashed and rejects another', async () => {
    const hash = await hashPassword('correct horse battery')
    expect(await verifyPassword('correct horse battery', hash)).toBe(true)
    expect(await verifyPassword('correct horse batterx', hash)).toBe(false)
  })

  it('salts: the same password hashes differently twice', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'))
  })

  it('rejects a malformed stored hash instead of throwing', async () => {
    expect(await verifyPassword('x', 'garbage')).toBe(false)
  })
})

describe('session tokens', () => {
  it('makes long url-safe tokens whose stored form is a sha-256 hex', () => {
    const t = newSessionToken()
    expect(t).toMatch(/^[A-Za-z0-9_-]{43,}$/)
    expect(tokenHash(t)).toMatch(/^[0-9a-f]{64}$/)
    expect(tokenHash(t)).toBe(tokenHash(t))
    expect(newSessionToken()).not.toBe(t)
  })
})
