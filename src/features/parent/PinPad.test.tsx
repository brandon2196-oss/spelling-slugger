import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PinPad } from './PinPad'

describe('PinPad', () => {
  it('calls onComplete with four digits and clears itself for the next entry', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<PinPad onComplete={onComplete} />)
    for (const d of ['1', '2', '3', '4']) await user.click(screen.getByRole('button', { name: new RegExp(`^${d}$`) }))
    expect(onComplete).toHaveBeenCalledWith('1234')
    expect(screen.getByLabelText('0 of 4 digits entered')).toBeInTheDocument()
    for (const d of ['5', '6', '7', '8']) await user.click(screen.getByRole('button', { name: new RegExp(`^${d}$`) }))
    expect(onComplete).toHaveBeenLastCalledWith('5678')
    expect(onComplete).toHaveBeenCalledTimes(2)
  })
  it('deletes the last digit', async () => {
    const user = userEvent.setup()
    render(<PinPad onComplete={() => {}} />)
    await user.click(screen.getByRole('button', { name: /^1$/ }))
    await user.click(screen.getByRole('button', { name: /^2$/ }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByLabelText('1 of 4 digits entered')).toBeInTheDocument()
  })
})
