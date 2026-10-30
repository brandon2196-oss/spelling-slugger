import type { AnnouncerId } from './announcer'
import { clips } from './clips'
import { loadManifest } from './manifest'
import { ALL_SFX_URLS } from './sfx'

/** Warm SFX + the chosen announcer's baked clips. Never rejects; a missing manifest just preloads SFX. */
export async function preloadAudio(announcer: AnnouncerId, fetchImpl?: typeof fetch): Promise<void> {
  try {
    const manifest = await loadManifest(fetchImpl)
    const announcerUrls = Object.values(manifest.clips[announcer] ?? {}).flat().filter((u): u is string => typeof u === 'string')
    await clips.preload([...ALL_SFX_URLS, ...announcerUrls])
  } catch { /* degrade quiet */ }
}
