import { beforeEach, describe, expect, it } from 'vitest'
import { buildDefaultField, readFieldKind, toggleFieldKind } from './fieldChoice'

describe('fieldChoice', () => {
  beforeEach(() => localStorage.clear())
  it('defaults to cartoon unless VITE_FIELD=pixel', () => {
    expect(buildDefaultField(undefined)).toBe('cartoon')
    expect(buildDefaultField('pixel')).toBe('pixel')
    expect(buildDefaultField('junk')).toBe('cartoon')
  })
  it('hidden toggle flips and persists', () => {
    const start = readFieldKind()
    const next = toggleFieldKind()
    expect(next).not.toBe(start)
    expect(readFieldKind()).toBe(next)
    expect(toggleFieldKind()).toBe(start)
  })
})
