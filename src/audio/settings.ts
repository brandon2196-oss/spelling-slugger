import { useCallback, useEffect, useState } from 'react'
import { ANNOUNCERS, type AnnouncerId } from './announcer'
import { setSpeechVolume } from './speech'
import { clips } from './clips'
import { sfx } from './sfx'

export interface AudioSettings {
  volume: number
  muted: boolean
  sfx: boolean
  /** Who's in the booth. Device-level, like the volume. */
  announcer: AnnouncerId
}

const KEY = 'slugger.audio'
const DEFAULTS: AudioSettings = { volume: 1, muted: false, sfx: true, announcer: 'bigRed' }

/** Current settings from storage, for callers outside React (the sequence player, the booth). */
export function readAudioSettings(): AudioSettings {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<AudioSettings>
    const merged = { ...DEFAULTS, ...stored }
    if (!(merged.announcer in ANNOUNCERS)) merged.announcer = DEFAULTS.announcer
    return merged
  } catch {
    return DEFAULTS
  }
}

/** Speaker mute silences everything (ambience too). Quiet Booth (announcer 'quiet') removes only voices. */
export function applyAudioSettings(s: AudioSettings): void {
  const v = s.muted ? 0 : s.volume
  setSpeechVolume(v)
  sfx.setVolume(v)
  clips.setVolume(v)
  clips.setMuted(s.muted)
  sfx.enabled = s.sfx && !s.muted
}

export function useAudioSettings() {
  const [settings, setSettings] = useState<AudioSettings>(readAudioSettings)
  useEffect(() => applyAudioSettings(settings), [settings])
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
