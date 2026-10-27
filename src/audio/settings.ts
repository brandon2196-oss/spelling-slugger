import { useCallback, useEffect, useState } from 'react'
import { setSpeechVolume } from './speech'
import { sfx } from './sfx'

export interface AudioSettings {
  volume: number
  muted: boolean
  sfx: boolean
}

const KEY = 'slugger.audio'
const DEFAULTS: AudioSettings = { volume: 1, muted: false, sfx: true }

function read(): AudioSettings {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<AudioSettings>) }
  } catch {
    return DEFAULTS
  }
}

function apply(s: AudioSettings): void {
  const v = s.muted ? 0 : s.volume
  setSpeechVolume(v)
  sfx.setVolume(v)
  sfx.enabled = s.sfx && !s.muted
}

export function useAudioSettings() {
  const [settings, setSettings] = useState<AudioSettings>(read)
  useEffect(() => apply(settings), [settings])
  const set = useCallback((patch: Partial<AudioSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch { /* ignore */ }
      return next
    })
  }, [])
  return { ...settings, set }
}
