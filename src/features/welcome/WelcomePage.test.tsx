// src/features/welcome/WelcomePage.test.tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import { WelcomePage } from './WelcomePage'

vi.mock('../../data/auth', () => ({ useAuth: () => ({ user: null, loading: false }) }))

function renderPage() {
  return render(<MemoryRouter><WelcomePage /></MemoryRouter>)
}

it('renders inside the ballpark shell with a framed stadium still', () => {
  renderPage()
  expect(screen.getByRole('main')).toHaveAttribute('data-shell', 'ballpark')
  expect(screen.getByTestId('ballpark-hero')).toContainElement(screen.getByRole('img', { name: 'The cartoon baseball stadium' }))
})

it('drops the leftover broadcast chrome', () => {
  renderPage()
  expect(screen.queryByText(/on air/i)).toBeNull()
  expect(screen.queryByText(/now batting/i)).toBeNull()
})

it('keeps the pitch, the result legend, and gold account buttons', () => {
  renderPage()
  expect(screen.getByRole('heading', { level: 1, name: 'Grand Slam Spelling' })).toHaveClass('board-text')
  for (const r of ['Double', 'Single', 'Walk', 'Strikeout']) expect(screen.getByText(r)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute('href', '/register')
  expect(screen.getByRole('link', { name: 'Create account' })).toHaveClass('btn-gold')
  expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  expect(screen.getByRole('link', { name: 'Sign in' })).toHaveClass('btn-gold')
})
