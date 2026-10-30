// @vitest-environment node
import { createHash } from 'node:crypto'
import { CLIP_NAME, CLIP_PROFILES, clipHash, clipsForWord, clipUrl } from './word-audio-profile'

describe('word audio profile', () => {
  it('hashes sha256(voice|rate|pitch|text)', async () => {
    const p = CLIP_PROFILES.word
    const expected = createHash('sha256').update(`${p.voice}|${p.rate}|${p.pitch}|necessary`).digest('hex')
    expect(await clipHash('word', 'necessary')).toBe(expected)
    expect(await clipHash('word', '  necessary ')).toBe(expected)
    expect(CLIP_NAME.test(expected)).toBe(true)
  })
  it('differs per kind', async () => {
    expect(await clipHash('word', 'cat')).not.toBe(await clipHash('slow', 'cat'))
  })
  it('uses Jenny for every clip', () => {
    for (const p of Object.values(CLIP_PROFILES)) expect(p.voice).toBe('en-US-JennyNeural')
  })
  it('lists word, slow, and sentence only when present', () => {
    expect(clipsForWord({ text: 'cat', sentence: null }).map((c) => c.kind)).toEqual(['word', 'slow'])
    expect(clipsForWord({ text: 'cat', sentence: ' The cat sat. ' }).map((c) => c.text)).toEqual(['cat', 'cat', 'The cat sat.'])
    expect(clipsForWord({ text: 'cat', sentence: '   ' })).toHaveLength(2)
  })
  it('builds the URL', () => expect(clipUrl('ab')).toBe('/audio/words/ab.mp3'))
})
