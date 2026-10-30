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

describe('shipped SFX files', () => {
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
