#!/usr/bin/env node
/**
 * Regenerate public/audio/sfx/ and public/audio/ir/ from CC0 masters in audio-src/ (brief 5.1).
 *
 *   audio-src/sfx/<pool>/<pool>-<n>.<wav|flac|ogg|mp3|aif|aiff>  to public/audio/sfx/<pool>/<pool>-<n>.ogg
 *   audio-src/sfx/ambience/ambience-{low,high}.<ext>              same, no silence trim (loop points)
 *   audio-src/ir/stadium.<ext>                                    to public/audio/ir/stadium.ogg, re-encode only
 *
 * Processing: trim leading silence, loudnorm to -16 LUFS, mono, 44.1 kHz, Ogg Vorbis q5.
 * Usage: npm run process-audio [-- --dry-run] [--src audio-src] [--out public/audio] [--measure <dir>]
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, extname, join, relative } from 'node:path'

const EXT = new Set(['.wav', '.flac', '.ogg', '.mp3', '.aif', '.aiff'])
const TRIM = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02'
const LOUD = 'loudnorm=I=-16:TP=-1.5:LRA=11'
const ENCODE = ['-ac', '1', '-ar', '44100', '-c:a', 'libvorbis', '-q:a', '5']
// ffmpeg 7.1 aborts (best_input assertion) on silenceremove,loudnorm into libvorbis; fixed frame sizes avoid it.
const FRAME_FIX = 'asetnsamples=n=1024'
const MAX_SFX_BYTES = 4 * 1024 * 1024

const argv = process.argv.slice(2)
const flag = (name) => argv.includes(name)
const opt = (name, dflt) => {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt
}

const audioFiles = (dir) =>
  existsSync(dir) ? readdirSync(dir).sort().filter((f) => EXT.has(extname(f).toLowerCase())) : []

function plan(srcRoot, outRoot) {
  const jobs = []
  const sfxRoot = join(srcRoot, 'sfx')
  if (existsSync(sfxRoot)) {
    for (const pool of readdirSync(sfxRoot).sort()) {
      const dir = join(sfxRoot, pool)
      if (!statSync(dir).isDirectory()) continue
      for (const f of audioFiles(dir)) {
        jobs.push({
          in: join(dir, f),
          out: join(outRoot, 'sfx', pool, `${basename(f, extname(f))}.ogg`),
          filters: pool === 'ambience' ? LOUD : `${TRIM},${LOUD}`,
        })
      }
    }
  }
  const ir = audioFiles(join(srcRoot, 'ir')).find((f) => basename(f, extname(f)) === 'stadium')
  if (ir) jobs.push({ in: join(srcRoot, 'ir', ir), out: join(outRoot, 'ir', 'stadium.ogg'), filters: 'anull' })
  return jobs
}

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

const dirBytes = (dir) => (existsSync(dir) ? walk(dir).reduce((n, p) => n + statSync(p).size, 0) : 0)

/** Integrated loudness (LUFS) of one file via ffmpeg loudnorm analysis. */
function lufs(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], { encoding: 'utf8' })
  // ffmpeg may print more lines after the JSON block, so cut at its closing brace.
  const s = r.stderr
  return Number(JSON.parse(s.slice(s.lastIndexOf('{'), s.lastIndexOf('}') + 1)).input_i)
}

function measure(dir) {
  const groups = {}
  for (const f of walk(dir).filter((p) => EXT.has(extname(p).toLowerCase()))) {
    const key = relative(dir, f).split('/')[0]
    ;(groups[key] ??= []).push(lufs(f))
  }
  const out = {}
  for (const [k, v] of Object.entries(groups)) out[k] = Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10
  return out
}

const measureDir = opt('--measure', null)
if (measureDir) {
  console.log(JSON.stringify(measure(measureDir), null, 2))
  process.exit(0)
}

const out = opt('--out', 'public/audio')
const jobs = plan(opt('--src', 'audio-src'), out)

if (flag('--dry-run')) {
  console.log(JSON.stringify(jobs))
  process.exit(0)
}

for (const j of jobs) {
  mkdirSync(dirname(j.out), { recursive: true })
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', j.in, '-af', `${j.filters},${FRAME_FIX}`, ...ENCODE, j.out], { stdio: 'inherit' })
  console.log(`ok  ${j.out}`)
}

const bytes = dirBytes(join(out, 'sfx'))
console.log(`public/audio/sfx: ${(bytes / 1024 / 1024).toFixed(2)} MB`)
if (bytes >= MAX_SFX_BYTES) {
  console.error('public/audio/sfx is 4 MB or more; shorten or drop variants')
  process.exit(1)
}
