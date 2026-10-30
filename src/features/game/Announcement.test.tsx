import { render, screen } from '@testing-library/react'
import { Announcement } from './Announcement'

describe('Announcement', () => {
  it('uses a polite live region so it does not interrupt the spoken word', () => {
    render(<Announcement text="HOME RUN" />)
    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toHaveTextContent('HOME RUN')
  })
})
