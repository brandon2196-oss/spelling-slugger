import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShareButton } from './ShareButton'

describe('ShareButton', () => {
  it('copies the app link when the browser has no native share sheet', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<ShareButton url="https://slugger.example.com" />)
    await user.click(screen.getByRole('button', { name: /share/i }))
    expect(writeText).toHaveBeenCalledWith('https://slugger.example.com')
    expect(await screen.findByText('Link copied!')).toBeInTheDocument()
  })
  it('offers text-message and email links with the same address', () => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    render(<ShareButton url="https://slugger.example.com" />)
    expect(screen.getByRole('link', { name: /text/i })).toHaveAttribute('href', expect.stringContaining('sms:'))
    expect(screen.getByRole('link', { name: /email/i })).toHaveAttribute('href', expect.stringContaining('mailto:'))
    expect(screen.getByRole('link', { name: /email/i }).getAttribute('href')).toContain(encodeURIComponent('https://slugger.example.com'))
  })
  it('uses the native share sheet when it exists', async () => {
    const share = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    const user = userEvent.setup()
    render(<ShareButton url="https://slugger.example.com" />)
    await user.click(screen.getByRole('button', { name: /share/i }))
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://slugger.example.com' }))
  })
})
