import { act, renderHook } from '@testing-library/react'
import { readAudioSettings, useAudioSettings } from './settings'

describe('audio settings', () => {
  beforeEach(() => localStorage.clear())

  it('defaults the announcer to Big Red', () => {
    expect(readAudioSettings()).toMatchObject({ volume: 1, muted: false, sfx: true, announcer: 'bigRed' })
  })
  it('reads a stored announcer back', () => {
    localStorage.setItem('slugger.audio', JSON.stringify({ announcer: 'smoothEddie' }))
    expect(readAudioSettings().announcer).toBe('smoothEddie')
  })
  it('ignores an unknown stored announcer', () => {
    localStorage.setItem('slugger.audio', JSON.stringify({ announcer: 'nobody' }))
    expect(readAudioSettings().announcer).toBe('bigRed')
  })
  it('the hook persists the announcer like the other settings', () => {
    const { result } = renderHook(() => useAudioSettings())
    expect(result.current.announcer).toBe('bigRed')
    act(() => result.current.set({ announcer: 'quiet' }))
    expect(result.current.announcer).toBe('quiet')
    expect(readAudioSettings().announcer).toBe('quiet')
    expect(JSON.parse(localStorage.getItem('slugger.audio')!)).toMatchObject({ announcer: 'quiet', volume: 1 })
  })
})
