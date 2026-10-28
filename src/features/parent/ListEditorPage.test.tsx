import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { createLocalStore } from '../../data/local-store'
import { StoreContext } from '../../data/store'
import type { Store } from '../../data/types'
import { ListEditorPage } from './ListEditorPage'

vi.mock('./import/pdfText', () => ({
  extractPdfLines: vi.fn(async (data: ArrayBuffer) => {
    const name = new TextDecoder().decode(data)
    if (name === 'scanned') return { lines: [], pages: 1, hasText: false }
    if (name === 'broken') throw new Error('bad xref')
    return { lines: ['Spelling Words', 'Week 9', 'cat', 'dog', 'bird', 'fish', 'frog', 'Please practice every night'], pages: 1, hasText: true }
  }),
}))

const pdf = (content: string, name = 'week9.pdf') => new File([content], name, { type: 'application/pdf' })

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

  describe('PDF import', () => {
    it('shows the words it found, pre-selected, and adds the ones left selected', async () => {
      const user = userEvent.setup()
      await setup()
      await user.upload(await screen.findByLabelText(/choose a pdf/i), pdf('ok'))
      expect(await screen.findByText('Found 5 words in week9.pdf')).toBeInTheDocument()
      const cat = screen.getByRole('button', { name: 'cat', pressed: true })
      expect(screen.getByRole('button', { name: 'dog', pressed: true })).toBeInTheDocument()
      await user.click(cat)
      expect(screen.getByRole('button', { name: 'cat', pressed: false })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Add 4 words' }))
      expect(screen.getAllByRole('listitem')).toHaveLength(4)
      expect(screen.getByLabelText('Word 1')).toHaveValue('dog')
      expect(screen.queryByText(/Found 5 words/)).not.toBeInTheDocument()
      expect(screen.getByLabelText(/type a word/i)).toHaveFocus()
    })

    it('offers the other words on the page unselected', async () => {
      const user = userEvent.setup()
      await setup()
      await user.upload(await screen.findByLabelText(/choose a pdf/i), pdf('ok'))
      await screen.findByText('Found 5 words in week9.pdf')
      await user.click(screen.getByText(/other words on the page/i))
      const practice = screen.getByRole('button', { name: 'practice', pressed: false })
      await user.click(practice)
      await user.click(screen.getByRole('button', { name: 'Add 6 words' }))
      expect(screen.getByLabelText('Word 6')).toHaveValue('practice')
    })

    it('explains a scanned PDF and offers the paste box instead', async () => {
      const user = userEvent.setup()
      await setup()
      await user.upload(await screen.findByLabelText(/choose a pdf/i), pdf('scanned', 'scan.pdf'))
      expect(await screen.findByText(/picture of the words/i)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /paste instead/i }))
      expect(screen.getByLabelText(/paste words/i)).toBeInTheDocument()
    })

    it('reports a PDF it cannot read and leaves the editor usable', async () => {
      const user = userEvent.setup()
      await setup()
      await user.upload(await screen.findByLabelText(/choose a pdf/i), pdf('broken', 'bad.pdf'))
      expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't read/i)
      await user.type(screen.getByLabelText(/type a word/i), 'cat{Enter}')
      expect(screen.getByLabelText('Word 1')).toHaveValue('cat')
    })
  })
})
