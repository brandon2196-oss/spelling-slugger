// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function tree(files: string[]): string {
  const root = mkdtempSync(join(tmpdir(), 'audio-src-'))
  for (const f of files) {
    mkdirSync(join(root, f, '..'), { recursive: true })
    writeFileSync(join(root, f), '')
  }
  return root
}
const run = (src: string, out: string) =>
  JSON.parse(execFileSync('node', ['scripts/process-audio.mjs', '--dry-run', '--src', src, '--out', out], { encoding: 'utf8' })) as Array<{ in: string; out: string; filters: string }>

describe('process-audio --dry-run', () => {
  it('maps every master to an ogg under out/sfx/<pool>/ with trim and loudnorm', () => {
    const src = tree(['sfx/crack/crack-1.wav', 'sfx/crack/crack-2.flac', 'sfx/mitt/mitt-1.wav', 'sfx/mitt/notes.txt'])
    const jobs = run(src, '/tmp/out')
    expect(jobs.map((j) => j.out)).toEqual(['/tmp/out/sfx/crack/crack-1.ogg', '/tmp/out/sfx/crack/crack-2.ogg', '/tmp/out/sfx/mitt/mitt-1.ogg'])
    for (const j of jobs) {
      expect(j.filters).toContain('silenceremove')
      expect(j.filters).toContain('loudnorm=I=-16')
    }
  })

  it('ambience keeps its loop points (no silence trim)', () => {
    const src = tree(['sfx/ambience/ambience-low.wav'])
    const [job] = run(src, '/tmp/out')
    expect(job!.out).toBe('/tmp/out/sfx/ambience/ambience-low.ogg')
    expect(job!.filters).not.toContain('silenceremove')
    expect(job!.filters).toContain('loudnorm=I=-16')
  })

  it('the stadium IR is converted without trim or loudnorm', () => {
    const src = tree(['ir/stadium.wav'])
    const [job] = run(src, '/tmp/out')
    expect(job!.out).toBe('/tmp/out/ir/stadium.ogg')
    expect(job!.filters).toBe('anull')
  })
})
