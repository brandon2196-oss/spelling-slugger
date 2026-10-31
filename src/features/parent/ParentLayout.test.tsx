// src/features/parent/ParentLayout.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useOutletContext } from 'react-router'
import { vi } from 'vitest'
import { ParentLayout } from './ParentLayout'

vi.mock('../players/usePlayers', () => ({
  usePlayers: () => ({ loading: false, players: [
    { id: 'a', name: 'Cooper', teamName: '', jerseyNumber: 7, hand: 'L', appearance: {}, createdAt: '' },
    { id: 'b', name: 'Mia', teamName: '', jerseyNumber: 3, hand: 'R', appearance: {}, createdAt: '' },
  ] }),
}))

function Child() {
  const { player } = useOutletContext<{ player: { name: string } }>()
  const loc = useLocation()
  return <p>child:{player.name}:{loc.pathname}</p>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/parent/players/:playerId" element={<ParentLayout />}>
          <Route path=":tab" element={<Child />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

it('wraps the parent zone in the parent-variant ballpark shell with a light content panel', () => {
  renderAt('/parent/players/a/lists')
  const main = screen.getByRole('main')
  expect(main).toHaveAttribute('data-shell', 'ballpark')
  expect(main).toHaveAttribute('data-variant', 'parent')
  expect(screen.queryByTestId('ballpark-hero')).toBeNull()
  expect(screen.getByTestId('parent-panel')).toHaveTextContent('child:Cooper:/parent/players/a/lists')
})

it('keeps tabs, Managing, and Account exactly as before', async () => {
  renderAt('/parent/players/a/lists')
  expect(screen.getByRole('link', { name: 'Word lists' })).toHaveAttribute('href', '/parent/players/a/lists')
  expect(screen.getByRole('link', { name: 'Game history' })).toHaveAttribute('href', '/parent/players/a/history')
  expect(screen.getByRole('link', { name: 'Progress' })).toHaveAttribute('href', '/parent/players/a/stats')
  expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/parent/account')
  await userEvent.selectOptions(screen.getByLabelText('Managing'), 'b')
  expect(await screen.findByText('child:Mia:/parent/players/b/lists')).toBeInTheDocument()
})
