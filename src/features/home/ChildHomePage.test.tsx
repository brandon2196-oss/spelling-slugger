// src/features/home/ChildHomePage.test.tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { vi } from 'vitest'
import { ChildHomePage } from './ChildHomePage'

const store = {
  listWordLists: vi.fn(async () => [{ id: 'l1', isActive: true }]),
  listGames: vi.fn(async () => []),
}
vi.mock('../../data/store', () => ({ useStore: () => store }))
vi.mock('../players/usePlayers', () => ({
  usePlayer: () => ({ id: 'a', name: 'Cooper', teamName: 'Sluggers', jerseyNumber: 7, hand: 'L', appearance: {}, createdAt: '' }),
}))
vi.mock('../players/PlayerPreview', () => ({ PlayerPreview: () => <div data-testid="batter" /> }))
vi.mock('../game/startGame', () => ({ resumeOrNull: async () => null, startMissedWordsGame: vi.fn(), startWeeklyGame: vi.fn() }))
vi.mock('../../audio/preload', () => ({ preloadAudio: async () => {} }))
vi.mock('../../engine/season', () => ({ seasonRecord: () => ({}), recordLine: () => '3-1' }))
vi.mock('./useGuardedStart', () => ({ useGuardedStart: () => ({ start: vi.fn(), modal: null }) }))

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/play/a']}>
      <Routes><Route path="/play/:playerId" element={<ChildHomePage />} /></Routes>
    </MemoryRouter>,
  )
}

it('renders in the ballpark shell with the batter in front of a stadium still', async () => {
  renderHome()
  const hero = await screen.findByTestId('ballpark-hero')
  expect(screen.getByRole('main')).toHaveAttribute('data-shell', 'ballpark')
  expect(hero).toContainElement(screen.getByRole('img', { name: 'The cartoon baseball stadium' }))
  expect(hero).toContainElement(screen.getByTestId('batter'))
})

it('keeps season W/L prominent and makes Play this week the gold CTA', async () => {
  renderHome()
  expect(await screen.findByTestId('season-record')).toHaveTextContent('3-1')
  expect(screen.getByRole('button', { name: /play this week/i })).toHaveClass('btn-gold')
  expect(screen.getByRole('link', { name: 'Practice' })).toHaveClass('btn-cream')
  expect(screen.getByRole('button', { name: 'Missed words' })).toHaveClass('btn-cream')
  expect(screen.getByRole('link', { name: 'Past weeks' })).toHaveClass('btn-cream')
})

it('announcer row shows placeholders, not pixel portraits', async () => {
  renderHome()
  const row = await screen.findByRole('group', { name: 'Announcer' })
  expect(row.querySelectorAll('[data-testid="booth-placeholder"]')).toHaveLength(3)
  expect(row.querySelector('svg')).toBeNull()
})
