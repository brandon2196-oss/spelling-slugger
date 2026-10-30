import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SpellingInput } from './SpellingInput'

describe('SpellingInput', () => {
  it('turns off every kind of hint the browser could give', () => {
    render(<SpellingInput disabled={false} onSubmit={() => {}} />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('spellcheck', 'false')
    expect(input).toHaveAttribute('autocomplete', 'off')
    expect(input).toHaveAttribute('autocorrect', 'off')
    expect(input).toHaveAttribute('autocapitalize', 'off')
  })
  it('submits on Enter and clears', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<SpellingInput disabled={false} onSubmit={onSubmit} />)
    await user.type(screen.getByRole('textbox'), 'cat{Enter}')
    expect(onSubmit).toHaveBeenCalledWith('cat')
    expect(screen.getByRole('textbox')).toHaveValue('')
  })
  it('does nothing while disabled', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<SpellingInput disabled={true} onSubmit={onSubmit} />)
    await user.type(screen.getByRole('textbox'), 'cat{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
  })
  it('clear button empties the field', async () => {
    const user = userEvent.setup()
    render(<SpellingInput disabled={false} onSubmit={() => {}} />)
    await user.type(screen.getByRole('textbox'), 'ca')
    await user.click(screen.getByRole('button', { name: /clear/i }))
    expect(screen.getByRole('textbox')).toHaveValue('')
  })

  it('calls onHear for Hear again, Slow, and Use in a sentence', async () => {
    const user = userEvent.setup()
    const onHear = vi.fn()
    render(
      <SpellingInput disabled={false} onSubmit={() => {}} onHear={onHear} hasSentence />,
    )
    await user.click(screen.getByRole('button', { name: /hear again/i }))
    await user.click(screen.getByRole('button', { name: /^slow$/i }))
    await user.click(screen.getByRole('button', { name: /use in a sentence/i }))
    expect(onHear).toHaveBeenCalledWith('word')
    expect(onHear).toHaveBeenCalledWith('slow')
    expect(onHear).toHaveBeenCalledWith('sentence')
  })

  it('hides hear buttons when onHear is omitted', () => {
    render(<SpellingInput disabled={false} onSubmit={() => {}} />)
    expect(screen.queryByRole('button', { name: /hear again/i })).not.toBeInTheDocument()
  })

  it('hides Use in a sentence when hasSentence is false', () => {
    render(
      <SpellingInput disabled={false} onSubmit={() => {}} onHear={() => {}} hasSentence={false} />,
    )
    expect(screen.queryByRole('button', { name: /use in a sentence/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /hear again/i })).toBeInTheDocument()
  })

  it('keeps focus on the spelling field after Hear again', async () => {
    const user = userEvent.setup()
    render(
      <SpellingInput disabled={false} onSubmit={() => {}} onHear={() => {}} hasSentence />,
    )
    const input = screen.getByRole('textbox')
    input.focus()
    await user.click(screen.getByRole('button', { name: /hear again/i }))
    expect(input).toHaveFocus()
  })
})
