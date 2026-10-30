/** Picks the word-audio backend from the environment. Never throws: audio is optional. */
import path from 'node:path'
import { createWordBaker, type WordBaker } from './baker'
import { createEdgeSynth } from './edge-synth'
import { createFsClipStorage, createReplitClipStorage, type ClipStorage } from './storage'

/**
 * WORD_AUDIO=off          disable baking and clip serving (game uses browser speech)
 * WORD_AUDIO_DIR=<dir>    store clips on disk (local dev, tests, any non-Replit host)
 * REPL_ID set             Replit App Storage (default bucket, or REPLIT_BUCKET_ID)
 * otherwise               .data/word-audio on disk
 */
export async function setupWordAudio(env: NodeJS.ProcessEnv = process.env): Promise<WordBaker | undefined> {
  if (env.WORD_AUDIO === 'off') return undefined
  let storage: ClipStorage
  try {
    if (env.WORD_AUDIO_DIR) storage = createFsClipStorage(path.resolve(env.WORD_AUDIO_DIR))
    else if (env.REPL_ID) storage = await createReplitClipStorage(env.REPLIT_BUCKET_ID)
    else storage = createFsClipStorage(path.resolve('.data/word-audio'))
  } catch (e) {
    console.warn(`word audio disabled: ${e instanceof Error ? e.message : e}`)
    return undefined
  }
  return createWordBaker({ storage, synth: createEdgeSynth(), concurrency: Number(env.WORD_AUDIO_CONCURRENCY ?? 2) || 2 })
}
