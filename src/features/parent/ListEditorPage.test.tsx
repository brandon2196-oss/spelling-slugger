import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { createLocalStore } from '../../data/local-store'
import { StoreContext } from '../../data/store'
import type { Store } from '../../data/types'
import { ListEditorPage } from './ListEditorPage'

const cooper = {
  name: 'Cooper', teamName: '', jerseyNumber: 7, hand: 'L' as const,
  appearance: {
    primaryColor: '#000', secondaryColor: '#fff', jerseyColor: '#000', pantsColor: '#fff',
    hatColor: '#000', skinTone: '#fff', hairColor: '#000', hairstyle: 'short' as const,
  },
}

async function setup(): Promise<{ store: Store; playerId: string }> {
  localStorage.clear()
  const store = createLocalStore()
  const p = await store.createPlayer(cooper)
  const router = createMemoryRouter(
    [
      { path: '/parent/players/:playerId/lists/new', element: <ListEditorPage /> },
      { path: '/parent/players/:playerId/lists', element: <div>lists index</div> },
    ],
    { initialEntries: [`/parent/players/${p.id}/lists/new`] },
  )
  render(
    <StoreContext.Provider value={store}>
      <RouterProvider router={router} />
    </StoreContext.Provider>,
  )
  return { store, playerId: p.id }
}

describe('ListEditorPage', () => {
  it('adds a word on Enter, clears and refocuses the input, numbers the rows', async () => {
    const user = userEvent.setup()
    await setup()
    const input = await screen.findByLabelText(/type a word/i)
    await user.type(input, 'cat{Enter}')
    await user.type(input, 'dog{Enter}')
    expect(input).toHaveValue('')
    expect(input).toHaveFocus()
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('1')
    expect(rows[1]).toHaveTextContent('2')
    expect(screen.getByLabelText('Word 1')).toHaveValue('cat')
    expect(screen.getByLabelText('Word 2')).toHaveValue('dog')
  })

  it('saves the list with positions 1..n', async () => {
    const user = userEvent.setup()
    const { store, playerId } = await setup()
    const input = await screen.findByLabelText(/type a word/i)
    await user.type(input, 'cat{Enter}dog{Enter}')
    await user.click(screen.getByRole('button', { name: /save list/i }))
    await waitFor(async () => {
      const lists = await store.listWordLists(playerId)
      expect(lists).toHaveLength(1)
      expect(lists[0]!.words.map((w) => [w.position, w.text])).toEqual([[1, 'cat'], [2, 'dog']])
    })
  })

  it('pastes a whole list at once', async () => {
    const user = userEvent.setup()
    await setup()
    await user.click(await screen.findByRole('button', { name: /paste a whole list/i }))
    await user.type(screen.getByLabelText(/paste/i), '1. apple\n2. banana')
    await user.click(screen.getByRole('button', { name: /add these words/i }))
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})
