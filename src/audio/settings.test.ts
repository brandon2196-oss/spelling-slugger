import { act, renderHook } from '@testing-library/react'
import { applyAudioSettings, readAudioSettings, useAudioSettings } from './settings'
import { sfx } from './sfx'

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

describe('applyAudioSettings', () => {
  const base = { volume: 1, muted: false, sfx: true, announcer: 'bigRed' as const }
  it('Quiet Booth keeps SFX and ambience on', () => {
    applyAudioSettings({ ...base, announcer: 'quiet' })
    expect(sfx.enabled).toBe(true)
  })
  it('speaker mute turns SFX and ambience off', () => {
    applyAudioSettings({ ...base, muted: true })
    expect(sfx.enabled).toBe(false)
    applyAudioSettings(base)
    expect(sfx.enabled).toBe(true)
  })
})
