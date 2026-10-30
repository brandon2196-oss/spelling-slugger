/** Where baked word clips live. Production: Replit App Storage. Tests/local dev: a directory or memory. */
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { CLIP_NAME } from '../../../src/audio/word-audio-profile'

export interface ClipStorage {
  has(hash: string): Promise<boolean>
  /** The MP3 bytes, or null when the clip has not been baked. */
  get(hash: string): Promise<Buffer | null>
  put(hash: string, mp3: Buffer): Promise<void>
}

function check(hash: string): string {
  if (!CLIP_NAME.test(hash)) throw new Error('BAD_CLIP_NAME')
  return hash
}

export function createMemoryClipStorage(): ClipStorage & { size(): number } {
  const m = new Map<string, Buffer>()
  return {
    has: async (h) => m.has(check(h)),
    get: async (h) => m.get(check(h)) ?? null,
    put: async (h, b) => { m.set(check(h), b) },
    size: () => m.size,
  }
}

export function createFsClipStorage(dir: string): ClipStorage {
  const file = (h: string) => path.join(dir, `${check(h)}.mp3`)
  return {
    async has(h) {
      const f = file(h)
      try { return (await stat(f)).isFile() } catch { return false }
    },
    async get(h) {
      const f = file(h)
      try { return await readFile(f) } catch { return null }
    },
    async put(h, b) {
      await mkdir(dir, { recursive: true })
      const tmp = `${file(h)}.${process.pid}.tmp`
      await writeFile(tmp, b)
      await rename(tmp, file(h)) // atomic: readers never see half a clip
    },
  }
}

const PREFIX = 'word-audio/'

/**
 * Replit App Storage (Object Storage). Needs a bucket created in the Replit "App Storage" tool; the
 * deployment picks up its default bucket automatically (or pass REPLIT_BUCKET_ID).
 */
export async function createReplitClipStorage(bucketId?: string): Promise<ClipStorage> {
  const { Client } = await import('@replit/object-storage')
  const client = new Client(bucketId ? { bucketId } : undefined)
  // The constructor starts the bucket lookup as a floating promise. Await it here so a missing
  // bucket throws to the caller instead of becoming an unhandled rejection that kills the server.
  // getBucket() is runtime-public but typed private; it returns the in-flight init promise.
  await (client as unknown as { getBucket(): Promise<unknown> }).getBucket()
  return {
    async has(h) {
      const r = await client.exists(PREFIX + check(h) + '.mp3')
      return r.ok ? r.value : false
    },
    async get(h) {
      const r = await client.downloadAsBytes(PREFIX + check(h) + '.mp3')
      return r.ok ? r.value[0] : null
    },
    async put(h, b) {
      const r = await client.uploadFromBytes(PREFIX + check(h) + '.mp3', b)
      if (!r.ok) throw new Error(`APP_STORAGE_UPLOAD_FAILED: ${r.error.message}`)
    },
  }
}
