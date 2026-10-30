#!/usr/bin/env node
/**
 * Bake the booth: render every Big Red / Jack Dalton line in src/audio/announcer-lines.json to an
 * audio clip and regenerate public/audio/announcer-manifest.json (written last). Idempotent: re-runs
 * overwrite clips and the manifest. The quiet booth has no lines and is not baked.
 *
 * Engine: edge-tts (Microsoft Edge neural voices), used offline at bake time only. The app never
 * calls a TTS service for the booth; it plays these files. See AUDIO-CREDITS.md.
 *
 * Placeholders are filled with fixed bake-time stand-ins (clips can't know the live values):
 *   {word}   -> "that spelling"
 *   {runs}   -> "2"
 *   {inning} -> "3"
 *
 * Env: EDGE_TTS=/path/to/edge-tts (default: /workspace/bvenv-tts/bin/edge-tts, then `edge-tts` on PATH).
 * Output: public/audio/announcers/{announcer}/{event}-{NN}.mp3 (NN = zero-padded array index).
 */
import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Voice profiles: two clearly different original voices (no celebrity imitation). */
const VOICES = {
  bigRed: { voice: 'en-US-GuyNeural', rate: '+6%', pitch: '-6Hz' }, // big, energetic play-by-play
  smoothEddie: { voice: 'en-US-BrianNeural', rate: '-8%', pitch: '-2Hz' }, // laid-back, casual
}
const PLACEHOLDERS = { word: 'that spelling', runs: '2', inning: '3' }
const EXT = 'mp3'
const CONCURRENCY = 6

const EDGE_TTS = process.env.EDGE_TTS ?? (existsSync('/workspace/bvenv-tts/bin/edge-tts') ? '/workspace/bvenv-tts/bin/edge-tts' : 'edge-tts')

const fill = (s) => s.replace(/\{(word|runs|inning)\}/g, (_, k) => PLACEHOLDERS[k])
const lines = JSON.parse(readFileSync(join(ROOT, 'src/audio/announcer-lines.json'), 'utf8'))

const jobs = []
const manifest = { version: 1, clips: { bigRed: {}, smoothEddie: {}, quiet: {} } }
// BAKE_ONLY=smoothEddie re-bakes one booth; the others keep their existing clips (manifest entries still rewritten).
const ONLY = process.env.BAKE_ONLY
for (const [id, profile] of Object.entries(VOICES)) {
  const skip = ONLY && ONLY !== id
  const dir = join(ROOT, 'public/audio/announcers', id)
  if (!skip) {
    rmSync(dir, { recursive: true, force: true }) // drop stale clips from removed lines
    mkdirSync(dir, { recursive: true })
  }
  for (const [event, arr] of Object.entries(lines[id])) {
    manifest.clips[id][event] = arr.map((text, i) => {
      const name = `${event}-${String(i).padStart(2, '0')}.${EXT}`
      if (!skip) jobs.push({ text: fill(text), profile, out: join(dir, name) })
      return `/audio/announcers/${id}/${name}`
    })
  }
}

async function bake({ text, profile, out }) {
  for (let attempt = 1; ; attempt++) {
    try {
      await run(EDGE_TTS, ['--voice', profile.voice, `--rate=${profile.rate}`, `--pitch=${profile.pitch}`, '--text', text, '--write-media', out])
      return
    } catch (e) {
      if (attempt >= 3) throw new Error(`bake failed for ${out}: ${e.message}`)
    }
  }
}

let done = 0
const queue = [...jobs]
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  for (let job; (job = queue.shift()); ) {
    await bake(job)
    if (++done % 20 === 0 || done === jobs.length) console.log(`baked ${done}/${jobs.length}`)
  }
}))

writeFileSync(join(ROOT, 'public/audio/announcer-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(`manifest written (${jobs.length} clips)`)
