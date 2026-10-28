/**
 * Baked announcer clips. `clips[id][event][i]` is the public URL of the recording of
 * `ANNOUNCERS[id].lines[event][i]` (written by the bake script). Missing entries mean "stay quiet".
 */
import type { AnnounceEvent, AnnouncerId } from './announcer'

export interface Manifest {
  version: 1
  clips: Record<AnnouncerId, Partial<Record<AnnounceEvent, string[]>>>
}

export const MANIFEST_URL = '/audio/announcer-manifest.json'
const EMPTY: Manifest = { version: 1, clips: { bigRed: {}, smoothEddie: {}, quiet: {} } }

let cached: Manifest | null = null
let pending: Promise<Manifest> | null = null

function normalize(raw: unknown): Manifest {
  const m = raw as Partial<Manifest> | null
  if (!m || m.version !== 1 || typeof m.clips !== 'object' || !m.clips) return EMPTY
  return { version: 1, clips: { ...EMPTY.clips, ...m.clips } }
}

/** Fetch the manifest once and cache it. Never rejects; a failed load yields an empty manifest. */
export function loadManifest(fetchImpl: typeof fetch = (...a) => fetch(...a)): Promise<Manifest> {
  if (cached) return Promise.resolve(cached)
  if (!pending) {
    pending = (async () => {
      try {
        const res = await fetchImpl(MANIFEST_URL)
        cached = res.ok ? normalize(await res.json()) : EMPTY
      } catch {
        cached = EMPTY
      }
      return cached
    })()
  }
  return pending
}

/** URL of the baked clip for line `lineIndex`, or null when not loaded / not baked. */
export function clipUrlFor(id: AnnouncerId, event: AnnounceEvent, lineIndex: number): string | null {
  return cached?.clips[id]?.[event]?.[lineIndex] ?? null
}

/** Test seam: replace (or clear with null) the cached manifest. */
export function setManifestForTests(m: Manifest | null): void {
  cached = m
  pending = m ? Promise.resolve(m) : null
}
