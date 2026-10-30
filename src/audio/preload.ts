import type { AnnouncerId } from './announcer'
import { clips } from './clips'
import { loadManifest } from './manifest'
import { REVERB_IR_URL } from './mixer'
import { ALL_SFX_URLS } from './sfx'

/** Warm SFX, ambience, the voice IR and the chosen announcer's clips. Never rejects. */
export async function preloadAudio(announcer: AnnouncerId, fetchImpl?: typeof fetch): Promise<void> {
  const base = [...ALL_SFX_URLS, REVERB_IR_URL]
  try {
    const manifest = await loadManifest(fetchImpl)
    const announcerUrls = Object.values(manifest.clips[announcer] ?? {}).flat().filter((u): u is string => typeof u === 'string')
    await clips.preload([...base, ...announcerUrls])
  } catch {
    await clips.preload(base).catch(() => {})
  }
}
