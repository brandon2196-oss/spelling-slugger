import { render, screen } from '@testing-library/react'
import { LetterHint } from './LetterHint'

describe('LetterHint', () => {
  it('marks letters with a non-color cue and text labels', () => {
    render(<LetterHint typed="kat" correct="cat" />)
    const spans = screen.getByTestId('letter-hint').querySelectorAll('[data-ok]')
    expect([...spans].map((s) => s.getAttribute('data-ok'))).toEqual(['false', 'true', 'true'])
    expect(screen.getByText('k wrong')).toBeInTheDocument()
    expect(screen.getByText('a right')).toBeInTheDocument()
    expect(spans[0]!.className).toContain('line-through')
    expect(spans[1]!.className).toContain('underline')
  })
  it('does not show untyped letters', () => {
    render(<LetterHint typed="ca" correct="cats" />)
    expect(screen.getByTestId('letter-hint').querySelectorAll('[data-ok]')).toHaveLength(2)
  })
})
