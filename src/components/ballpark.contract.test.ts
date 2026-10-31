// src/components/ballpark.contract.test.ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')

const SURFACES = [
  'src/features/welcome/WelcomePage.tsx',
  'src/features/players/PlayersPage.tsx',
  'src/features/home/ChildHomePage.tsx',
  'src/features/parent/ParentLayout.tsx',
  'src/features/parent/ParentGate.tsx',
]

describe('ballpark menu contract', () => {
  it.each(SURFACES)('%s renders inside BallparkShell, not Stadium/Paper', (file) => {
    const src = read(file)
    expect(src).toMatch(/import \{ BallparkShell \} from '..\/..\/components\/BallparkShell'/)
    expect(src).toMatch(/<BallparkShell[\s>]/)
    expect(src).not.toMatch(/components\/Page'/)
  })

  it.each([...SURFACES, 'src/components/BallparkShell.tsx', 'src/components/StadiumStill.tsx', 'src/features/home/AnnouncerPicker.tsx'])(
    '%s never mounts the live CartoonScene or the pixel booth portraits',
    (file) => {
      const src = read(file)
      expect(src).not.toMatch(/CartoonScene/)
      expect(src).not.toMatch(/BoothPortrait/)
    },
  )

  it('Welcome has no broadcast chrome', () => {
    const src = read('src/features/welcome/WelcomePage.tsx')
    expect(src).not.toMatch(/On air|Now batting|on-air-tag|live-dot/)
  })
})
