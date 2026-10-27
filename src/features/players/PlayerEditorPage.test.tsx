import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { createLocalStore } from '../../data/local-store'
import { StoreContext } from '../../data/store'
import type { NewPlayer, Store } from '../../data/types'
import { PlayerEditorPage } from './PlayerEditorPage'

const cooper: NewPlayer = {
  name: 'Cooper', teamName: '', jerseyNumber: 7, hand: 'L',
  appearance: {
    primaryColor: '#000', secondaryColor: '#fff', jerseyColor: '#000', pantsColor: '#fff',
    hatColor: '#000', skinTone: '#fff', hairColor: '#000', hairstyle: 'short',
  },
}

async function mount(): Promise<Store> {
  localStorage.clear()
  const store = createLocalStore()
  const p = await store.createPlayer(cooper)
  const router = createMemoryRouter([{ path: '/players/:id/edit', element: <PlayerEditorPage /> }], { initialEntries: [`/players/${p.id}/edit`] })
  render(
    <StoreContext.Provider value={store}>
      <RouterProvider router={router} />
    </StoreContext.Provider>,
  )
  return store
}

describe('PlayerEditorPage delete', () => {
  afterEach(() => sessionStorage.clear())
  it('hides Delete player from a child (parent zone locked)', async () => {
    await mount()
    await screen.findByRole('button', { name: 'Save changes' })
    expect(screen.queryByRole('button', { name: /delete player/i })).toBeNull()
    expect(screen.getByText(/parent zone/i)).toBeInTheDocument()
  })
  it('shows Delete player once the parent zone is unlocked in this tab', async () => {
    sessionStorage.setItem('slugger.parentUnlocked', '1')
    await mount()
    expect(await screen.findByRole('button', { name: /delete player/i })).toBeInTheDocument()
  })
})
