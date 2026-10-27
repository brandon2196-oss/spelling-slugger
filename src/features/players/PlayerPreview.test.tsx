import { render } from '@testing-library/react'
import { PlayerPreview } from './PlayerPreview'
import { DEFAULT_APPEARANCE } from './appearance'

describe('PlayerPreview handedness', () => {
  it('(20) a left-handed batter is drawn mirrored', () => {
    const { container } = render(<PlayerPreview appearance={DEFAULT_APPEARANCE} hand="L" jerseyNumber={7} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('data-hand')).toBe('L')
    const figure = svg.querySelector('[data-figure]')!
    expect(figure.getAttribute('transform')).toMatch(/scale\(-1,\s*1\)/)
  })
  it('(21) a right-handed batter is drawn upright', () => {
    const { container } = render(<PlayerPreview appearance={DEFAULT_APPEARANCE} hand="R" jerseyNumber={7} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('data-hand')).toBe('R')
    expect(svg.querySelector('[data-figure]')!.getAttribute('transform') ?? '').not.toMatch(/scale\(-1/)
  })
  it('shows the jersey number and uses the chosen colors', () => {
    const { container } = render(
      <PlayerPreview appearance={{ ...DEFAULT_APPEARANCE, jerseyColor: '#123456' }} hand="R" jerseyNumber={42} />,
    )
    expect(container.textContent).toContain('42')
    expect(container.innerHTML).toContain('#123456')
  })
})
