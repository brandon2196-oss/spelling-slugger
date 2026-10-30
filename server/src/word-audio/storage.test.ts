// @vitest-environment node
import { mkdtemp, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createFsClipStorage, createMemoryClipStorage, type ClipStorage } from './storage'

const H = 'a'.repeat(64)

async function roundTrip(s: ClipStorage) {
  expect(await s.has(H)).toBe(false)
  expect(await s.get(H)).toBeNull()
  await s.put(H, Buffer.from('mp3'))
  expect(await s.has(H)).toBe(true)
  expect((await s.get(H))?.toString()).toBe('mp3')
  await expect(s.get('../etc/passwd')).rejects.toThrow('BAD_CLIP_NAME')
}

describe('clip storage', () => {
  it('memory round trip', () => roundTrip(createMemoryClipStorage()))
  it('filesystem round trip leaves only the final file', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'clips-'))
    await roundTrip(createFsClipStorage(path.join(dir, 'nested')))
    expect(await readdir(path.join(dir, 'nested'))).toEqual([`${H}.mp3`])
  })
})
