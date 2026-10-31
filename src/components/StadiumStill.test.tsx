import { render, screen } from '@testing-library/react'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { STADIUM_STILL_LAYERS, StadiumStill } from './StadiumStill'

it('stacks only layers that already ship in public/art/stadium', () => {
  for (const layer of STADIUM_STILL_LAYERS) {
    expect(existsSync(resolve(__dirname, '../../public/art/stadium', `${layer}.png`))).toBe(true)
  }
  expect(STADIUM_STILL_LAYERS).toEqual(['sky', 'outfield-wall', 'stands-far', 'grass', 'dirt', 'chalk', 'bases', 'dugout-near'])
})

it('renders one decorative img per layer under a labelled img role', () => {
  render(<StadiumStill />)
  const still = screen.getByRole('img', { name: 'The cartoon baseball stadium' })
  const imgs = still.querySelectorAll('img')
  expect(imgs).toHaveLength(STADIUM_STILL_LAYERS.length)
  expect(imgs[0]!.getAttribute('src')).toMatch(/art\/stadium\/sky\.png$/)
  imgs.forEach((img) => expect(img).toHaveAttribute('alt', ''))
})
