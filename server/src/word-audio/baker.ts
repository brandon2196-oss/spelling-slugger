/**
 * Background bake queue for spelling-word clips. Saving a list calls `enqueueWords` and returns at
 * once; a small worker pool synthesizes missing clips with retries. In memory per process: a
 * restart drops the queue and the next save (or status check) re-queues whatever is still missing.
 */
import { clipHash, clipsForWord, type ClipProfile } from '../../../src/audio/word-audio-profile'
import type { ClipStorage } from './storage'

export type Synth = (text: string, profile: ClipProfile) => Promise<Buffer>
export interface WordLike { text: string; sentence?: string | null }
export interface AudioStatus { total: number; ready: number; pending: number }

export interface BakerOptions {
  storage: ClipStorage
  synth: Synth
  /** Max simultaneous Edge TTS requests. Default 2. */
  concurrency?: number
  /** Attempts per clip. Default 3. */
  attempts?: number
  /** Backoff before retry n (ms). Default 500 * n. */
  backoffMs?: (attempt: number) => number
  log?: (msg: string) => void
}

export interface WordBaker {
  enqueueWords(words: WordLike[]): Promise<void>
  status(words: WordLike[]): Promise<AudioStatus>
  /** Resolves when the queue is empty and no bake is running (tests, shutdown). */
  idle(): Promise<void>
  storage: ClipStorage
}

interface Job { hash: string; text: string; profile: ClipProfile }

export function createWordBaker(opts: BakerOptions): WordBaker {
  const concurrency = opts.concurrency ?? 2
  const attempts = opts.attempts ?? 3
  const backoff = opts.backoffMs ?? ((n: number) => 500 * n)
  const log = opts.log ?? ((m: string) => console.warn(m))
  const queue: Job[] = []
  const queued = new Set<string>()
  let running = 0
  let idleWaiters: (() => void)[] = []

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  async function bake(job: Job) {
    if (await opts.storage.has(job.hash)) return
    for (let n = 1; ; n++) {
      try {
        const mp3 = await opts.synth(job.text, job.profile)
        if (mp3.length === 0) throw new Error('EMPTY_AUDIO')
        await opts.storage.put(job.hash, mp3)
        return
      } catch (e) {
        if (n >= attempts) {
          log(`word audio bake failed after ${n} tries (${job.hash.slice(0, 8)}): ${e instanceof Error ? e.message : e}`)
          return
        }
        await sleep(backoff(n))
      }
    }
  }

  function pump() {
    while (running < concurrency && queue.length) {
      const job = queue.shift()!
      running++
      void bake(job)
        .catch((e) => log(`word audio bake error: ${e instanceof Error ? e.message : e}`))
        .finally(() => {
          running--
          queued.delete(job.hash)
          pump()
        })
    }
    if (running === 0 && queue.length === 0) {
      const w = idleWaiters
      idleWaiters = []
      w.forEach((f) => f())
    }
  }

  async function jobsFor(words: WordLike[]): Promise<Job[]> {
    const seen = new Set<string>()
    const out: Job[] = []
    for (const w of words)
      for (const c of clipsForWord(w)) {
        const hash = await clipHash(c.kind, c.text)
        if (seen.has(hash)) continue
        seen.add(hash)
        out.push({ hash, text: c.text, profile: c.profile })
      }
    return out
  }

  return {
    storage: opts.storage,
    async enqueueWords(words) {
      for (const job of await jobsFor(words)) {
        if (queued.has(job.hash)) continue
        queued.add(job.hash)
        queue.push(job)
      }
      pump()
    },
    async status(words) {
      const jobs = await jobsFor(words)
      let ready = 0
      let pending = 0
      for (const j of jobs) {
        if (await opts.storage.has(j.hash)) ready++
        else if (queued.has(j.hash)) pending++
      }
      return { total: jobs.length, ready, pending }
    },
    idle: () => (running === 0 && queue.length === 0 ? Promise.resolve() : new Promise<void>((r) => idleWaiters.push(r))),
  }
}
