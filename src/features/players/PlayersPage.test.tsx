import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import { PlayersPage } from './PlayersPage'

vi.mock('./usePlayers', () => ({
  usePlayers: () => ({ loading: false, players: [
    { id: 'a', name: 'Cooper', teamName: '', jerseyNumber: 7, hand: 'L', appearance: {}, createdAt: '' },
    { id: 'b', name: 'Mia', teamName: '', jerseyNumber: 3, hand: 'R', appearance: {}, createdAt: '' },
  ] }),
}))
vi.mock('./PlayerPreview', () => ({ PlayerPreview: () => null }))
vi.mock('../share/ShareButton', () => ({ ShareButton: () => <button type="button">Share</button> }))

it('shows every kid as a big pick and an Add sibling action with private share copy', () => {
  render(<MemoryRouter><PlayersPage /></MemoryRouter>)
  expect(screen.getByRole('link', { name: 'Play as Cooper' })).toHaveAttribute('href', '/play/a')
  expect(screen.getByRole('link', { name: 'Play as Mia' })).toHaveAttribute('href', '/play/b')
  expect(screen.getByRole('link', { name: 'Add sibling' })).toHaveAttribute('href', '/players/new')
  expect(screen.getByText(/only with friends/i)).toBeInTheDocument()
})

it('renders inside the ballpark shell with stadium-styled kid cards', () => {
  render(<MemoryRouter><PlayersPage /></MemoryRouter>)
  expect(screen.getByRole('main')).toHaveAttribute('data-shell', 'ballpark')
  expect(screen.getByRole('heading', { level: 1 })).toHaveClass('board-text')
  const card = screen.getByRole('link', { name: 'Play as Cooper' }).closest('li')!
  expect(card).toHaveClass('ballpark-card')
  expect(screen.getByRole('link', { name: 'Play as Cooper' })).toHaveClass('btn-gold')
  expect(screen.getAllByRole('link', { name: 'Edit' })[0]).toHaveClass('btn-cream')
})

it('Parent zone and Share are ballpark controls, not text links', () => {
  render(<MemoryRouter><PlayersPage /></MemoryRouter>)
  const parent = screen.getByRole('link', { name: 'Parent zone' })
  expect(parent).toHaveAttribute('href', '/parent')
  expect(parent).toHaveClass('btn-cream')
  expect(parent).not.toHaveClass('underline')
  expect(screen.getByTestId('share-control')).toHaveClass('ballpark-card')
})
