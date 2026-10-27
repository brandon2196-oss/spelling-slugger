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
})
