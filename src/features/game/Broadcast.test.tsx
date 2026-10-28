import { render, screen } from '@testing-library/react'
import type { GameState } from '../../engine/types'
import { Broadcast } from './Broadcast'

const state: GameState = {
  words: Array.from({ length: 10 }, (_, i) => ({ position: i, text: `w${i}`, sentence: null, source: 'current', sourceWordId: null })),
  index: 3,
  strikes: 1,
  outs: 2,
  inning: 2,
  bases: { first: true, second: false, third: true },
  tallies: { runs: 5, hits: 4, singles: 1, doubles: 3, walks: 0, strikeouts: 2, totalStrikes: 7, firstTry: 3, secondTry: 1, thirdTry: 0, missed: 2 },
  atBats: [],
  status: 'active',
}

const player = { name: 'Cooper', jerseyNumber: 7, teamName: 'Sluggers' }

function renderBroadcast(over: Partial<Parameters<typeof Broadcast>[0]> = {}) {
  return render(
    <Broadcast
      state={state}
      player={player}
      mode="weekly"
      announcer={{ name: 'Big Red Brannigan', portrait: 'bigRed', speaking: false }}
      caption={null}
      announcement={null}
      {...over}
    >
      <div data-testid="field" />
    </Broadcast>,
  )
}

describe('Broadcast', () => {
  it('shows the game state in the score bug under the scoreboard testids', () => {
    renderBroadcast()
    expect(screen.getByTestId('field')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Scoreboard' })).toBeInTheDocument()
    expect(screen.getByTestId('runs')).toHaveTextContent('5')
    expect(screen.getByTestId('hits')).toHaveTextContent('4')
    expect(screen.getByTestId('inning')).toHaveTextContent('2')
    expect(screen.getByTestId('strikes')).toHaveTextContent('1')
    expect(screen.getByTestId('outs')).toHaveTextContent('2')
    expect(screen.getByTestId('progress')).toHaveTextContent('4/10')
  })

  it('names the team and jersey number in the bug', () => {
    renderBroadcast()
    expect(screen.getByText('Sluggers')).toBeInTheDocument()
    expect(screen.getByText('#7')).toBeInTheDocument()
  })

  it('shows the announcer name on the booth plate', () => {
    renderBroadcast()
    expect(screen.getByText('Big Red Brannigan')).toBeInTheDocument()
  })

  it('labels the quiet booth instead of a name', () => {
    renderBroadcast({ announcer: { name: 'Quiet booth', portrait: 'quiet', speaking: false } })
    expect(screen.getByText('QUIET BOOTH')).toBeInTheDocument()
  })

  it('renders the caption as a status line when given', () => {
    renderBroadcast({ caption: 'OH MY STARS, what a swing!' })
    expect(screen.getByRole('status', { name: 'Commentary' })).toHaveTextContent('OH MY STARS, what a swing!')
  })

  it('renders no caption bar when the caption is null', () => {
    renderBroadcast({ caption: null })
    expect(screen.queryByRole('status', { name: 'Commentary' })).toBeNull()
  })

  it('marks the announcer window as speaking', () => {
    renderBroadcast({ announcer: { name: 'Big Red Brannigan', portrait: 'bigRed', speaking: true } })
    expect(screen.getByTestId('announcer-window')).toHaveAttribute('data-speaking', '1')
  })

  it('does not mark the announcer window as speaking when silent', () => {
    renderBroadcast()
    expect(screen.getByTestId('announcer-window')).not.toHaveAttribute('data-speaking')
  })

  it('shows the announcement pop when given', () => {
    renderBroadcast({ announcement: 'DOUBLE!' })
    expect(screen.getByText('DOUBLE!')).toBeInTheDocument()
  })
})
