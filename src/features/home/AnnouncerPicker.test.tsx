import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach } from 'vitest'
import { ANNOUNCERS, setAnnouncerPlayerForTests } from '../../audio/announcer'
import { setManifestForTests } from '../../audio/manifest'
import { AnnouncerPicker } from './AnnouncerPicker'

type Utter = { text: string; onend: null | (() => void) }

function installFakeSpeech() {
  const spoken: Utter[] = []
  const synth = { cancel: vi.fn(), speak: vi.fn((u: Utter) => spoken.push(u)), getVoices: () => [], speaking: false }
  class FakeUtterance {
    text: string
    rate = 1
    pitch = 1
    volume = 1
    lang = ''
    voice: unknown = null
    onstart: null | (() => void) = null
    onend: null | (() => void) = null
    onerror: null | ((e: unknown) => void) = null
    constructor(text: string) { this.text = text }
  }
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true, writable: true })
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: FakeUtterance, configurable: true, writable: true })
  return { synth, spoken }
}

describe('AnnouncerPicker', () => {
  let fake: ReturnType<typeof installFakeSpeech>
  beforeEach(() => { fake = installFakeSpeech() })
  afterEach(() => {
    Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true, writable: true })
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: undefined, configurable: true, writable: true })
  })

  it('shows the three booths with the current one pressed', () => {
    render(<AnnouncerPicker value="smoothEddie" onChange={() => {}} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
    expect(screen.getByRole('button', { name: /big red brannigan/i })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /smooth eddie breeze/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /quiet/i })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText(ANNOUNCERS.smoothEddie.tagline)).toBeInTheDocument()
  })

  it('pressed state follows the value prop', () => {
    const { rerender } = render(<AnnouncerPicker value="bigRed" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /big red/i })).toHaveAttribute('aria-pressed', 'true')
    rerender(<AnnouncerPicker value="quiet" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /big red/i })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /quiet/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('clicking a talker calls onChange and plays a sample line', async () => {
    const onChange = vi.fn()
    const play = vi.fn(async (_url: string) => {})
    setAnnouncerPlayerForTests({ load: vi.fn(), preload: vi.fn(), setVolume: vi.fn(), setMuted: vi.fn(), resume: vi.fn(), play })
    const gameStart = ANNOUNCERS.smoothEddie.lines.gameStart.map((_, i) => `/audio/announcers/smoothEddie/gameStart-${String(i).padStart(2, '0')}.ogg`)
    setManifestForTests({ version: 1, clips: { bigRed: {}, smoothEddie: { gameStart }, quiet: {} } })
    render(<AnnouncerPicker value="bigRed" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /smooth eddie/i }))
    expect(onChange).toHaveBeenCalledWith('smoothEddie')
    await vi.waitFor(() => expect(play).toHaveBeenCalledTimes(1))
    expect(play.mock.calls[0]![0]).toMatch(/smoothEddie\/gameStart-\d\d\.ogg$/)
    expect(fake.synth.speak).not.toHaveBeenCalled()
    setAnnouncerPlayerForTests(null)
    setManifestForTests(null)
  })

  it('clicking the quiet booth calls onChange without speaking', async () => {
    const onChange = vi.fn()
    render(<AnnouncerPicker value="bigRed" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /quiet/i }))
    expect(onChange).toHaveBeenCalledWith('quiet')
    expect(fake.synth.speak).not.toHaveBeenCalled()
  })

  it('each booth has a portrait', () => {
    render(<AnnouncerPicker value="bigRed" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /big red/i }).querySelector('svg')).not.toBeNull()
    expect(screen.getByRole('button', { name: /smooth eddie/i }).querySelector('svg')).not.toBeNull()
    expect(screen.getByRole('button', { name: /quiet/i }).querySelector('svg')).not.toBeNull()
  })
})
