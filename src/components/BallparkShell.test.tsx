// src/components/BallparkShell.test.tsx
import { render, screen } from '@testing-library/react'
import { BallparkShell } from './BallparkShell'

it('renders a main landmark marked as the ballpark shell, kid variant by default', () => {
  render(<BallparkShell><p>hi</p></BallparkShell>)
  const main = screen.getByRole('main')
  expect(main).toHaveAttribute('data-shell', 'ballpark')
  expect(main).toHaveAttribute('data-variant', 'kid')
  expect(main).toHaveClass('ballpark-shell')
  expect(screen.getByText('hi')).toBeInTheDocument()
  expect(screen.queryByTestId('ballpark-hero')).toBeNull()
})

it('hero={true} frames the default stadium still', () => {
  render(<BallparkShell hero />)
  const hero = screen.getByTestId('ballpark-hero')
  expect(hero).toHaveClass('ballpark-frame')
  expect(hero.querySelector('[role="img"][aria-label="The cartoon baseball stadium"]')).not.toBeNull()
})

it('custom hero content renders inside the frame', () => {
  render(<BallparkShell hero={<span>custom</span>} />)
  expect(screen.getByTestId('ballpark-hero')).toHaveTextContent('custom')
})

it('parent variant is marked and passes through props', () => {
  render(<BallparkShell variant="parent" aria-busy="true" className="p-8" />)
  const main = screen.getByRole('main')
  expect(main).toHaveAttribute('data-variant', 'parent')
  expect(main).toHaveAttribute('aria-busy', 'true')
  expect(main).toHaveClass('p-8')
})
