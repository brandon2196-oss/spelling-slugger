// @vitest-environment node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { REVERB_IR_URL } from './mixer'
import { ALL_SFX_URLS, POOL_SPEC } from './sfx'

const PUBLIC = join(process.cwd(), 'public')
const SFX_DIR = join(PUBLIC, 'audio', 'sfx')
const credits = readFileSync(join(process.cwd(), 'AUDIO-CREDITS.md'), 'utf8')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}
const onDisk = () => walk(SFX_DIR).map((p) => `/${relative(PUBLIC, p).split('\\').join('/')}`).sort()

/** Seconds of audio in an Ogg Vorbis file: last page granule position / sample rate. 0 if header pages only. */
export function oggSeconds(buf: Buffer): number {
  let off = 0
  let rate = 0
  let granule = 0n
  while (off + 27 <= buf.length && buf.toString('latin1', off, off + 4) === 'OggS') {
    const g = buf.readBigInt64LE(off + 6)
    const segs = buf[off + 26]!
    let body = 0
    for (let i = 0; i < segs; i++) body += buf[off + 27 + i]!
    const start = off + 27 + segs
    if (!rate && buf.toString('latin1', start + 1, start + 7) === 'vorbis' && buf[start] === 1) rate = buf.readUInt32LE(start + 12)
    if (g > 0n) granule = g
    off = start + body
  }
  return rate ? Number(granule) / rate : 0
}

describe('shipped SFX files', () => {
  it('every ogg decodes to real audio (not header pages only)', () => {
    for (const p of walk(SFX_DIR).filter((f) => f.endsWith('.ogg'))) {
      expect(oggSeconds(readFileSync(p)), relative(PUBLIC, p)).toBeGreaterThan(0.05)
    }
  })

  it('match POOL_SPEC and the ambience loops exactly (no strays, no gaps)', () => {
    expect(onDisk()).toEqual([...ALL_SFX_URLS].sort())
  })

  it('total under 4 MB', () => {
    const bytes = walk(SFX_DIR).reduce((n, p) => n + statSync(p).size, 0)
    expect(bytes).toBeLessThan(4 * 1024 * 1024)
  })

  it('every file has a credits row with a CC0 or public domain license', () => {
    const ir = existsSync(join(PUBLIC, REVERB_IR_URL)) ? [REVERB_IR_URL] : []
    for (const url of [...ALL_SFX_URLS, ...ir]) {
      const [folder, file] = url.split('/').slice(-2)
      const row = credits.split('\n').find((l) => l.startsWith(`| ${folder}/ | ${file} |`))
      expect(row, `credits row for ${folder}/${file}`).toBeDefined()
      expect(row).toMatch(/CC0|public domain/i)
    }
  })

  it('every stub pool is listed as pending', () => {
    for (const [pool, { n }] of Object.entries(POOL_SPEC)) {
      if (n === 0) expect(credits).toContain(`| ${pool}/ | (none) | pending, CC0 search failed |`)
    }
  })

  it('no Kenney, UI or jingle pack sources remain', () => {
    expect(credits).not.toMatch(/kenney|interface-sounds|music-jingles|## Legacy/i)
  })
})
