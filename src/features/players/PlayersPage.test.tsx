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

it('shows every kid as a big pick and an Add sibling action with private share copy', () => {
  render(<MemoryRouter><PlayersPage /></MemoryRouter>)
  expect(screen.getByRole('link', { name: 'Play as Cooper' })).toHaveAttribute('href', '/play/a')
  expect(screen.getByRole('link', { name: 'Play as Mia' })).toHaveAttribute('href', '/play/b')
  expect(screen.getByRole('link', { name: 'Add sibling' })).toHaveAttribute('href', '/players/new')
  expect(screen.getByText(/only with friends/i)).toBeInTheDocument()
})
