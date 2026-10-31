import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import { PlayerPreview } from './PlayerPreview'
import { DEFAULT_APPEARANCE, HAIRSTYLES } from './appearance'

const layers = (c: HTMLElement) => [...c.querySelectorAll('[data-layer]')].map((n) => n.getAttribute('data-layer'))

describe('PlayerPreview cartoon batter', () => {
  it('draws the packed cartoon batter, not the SVG stick figure', () => {
    const { container } = render(<PlayerPreview appearance={DEFAULT_APPEARANCE} hand="R" jerseyNumber={7} />)
    expect(container.querySelector('svg')).toBeNull()
    expect(screen.getByTestId('cartoon-batter')).toBeTruthy()
    for (const img of container.querySelectorAll('img')) {
      const rel = img.getAttribute('src')!.replace(/^.*?art\//, 'art/')
      expect(existsSync(resolve(__dirname, '../../../public', rel))).toBe(true)
    }
    expect(layers(container)).toContain('outline')
  })
  it('(20) a left-handed batter is drawn mirrored', () => {
    const { container } = render(<PlayerPreview appearance={DEFAULT_APPEARANCE} hand="L" jerseyNumber={7} />)
    expect(screen.getByTestId('cartoon-batter').getAttribute('data-hand')).toBe('L')
    expect((container.querySelector('[data-figure]') as HTMLElement).style.transform).toMatch(/scaleX\(-1\)/)
  })
  it('(21) a right-handed batter is drawn upright', () => {
    const { container } = render(<PlayerPreview appearance={DEFAULT_APPEARANCE} hand="R" jerseyNumber={7} />)
    expect((container.querySelector('[data-figure]') as HTMLElement).style.transform).not.toMatch(/scaleX\(-1/)
  })
  it('tints layers from the look and shows the jersey number', () => {
    const { container } = render(
      <PlayerPreview appearance={{ ...DEFAULT_APPEARANCE, jerseyColor: '#123456', skinTone: '#8d5524' }} hand="R" jerseyNumber={42} />,
    )
    expect(screen.getByTestId('jersey-number').textContent).toBe('42')
    expect(container.querySelector('[data-layer="jersey"]')!.getAttribute('data-tint')).toBe('#123456')
    expect(container.querySelector('[data-layer="skin"]')!.getAttribute('data-tint')).toBe('#8d5524')
    expect(container.querySelector('[data-layer="outline"]')!.getAttribute('data-tint')).toBeNull()
  })
  it('uses an existing hair layer for every hairstyle', () => {
    for (const hairstyle of HAIRSTYLES) {
      const { container, unmount } = render(<PlayerPreview appearance={{ ...DEFAULT_APPEARANCE, hairstyle }} hand="R" jerseyNumber={1} />)
      const hair = layers(container).find((l) => l!.startsWith('hair-'))!
      expect(existsSync(resolve(__dirname, '../../../public/art/batter/stance-idle', `00-${hair}.png`))).toBe(true)
      unmount()
    }
  })
})
