/** Typed view of public/art/manifest.json. Missing assets mean placeholders; null coordinates mean defaults. */
import { FIELD, type Point } from './layout'

export type AssetStatus = 'missing' | 'ready'
interface Asset { path: string; status: AssetStatus; optional?: boolean }

export interface RawManifest {
  gameSize?: { width: number; height: number }
  stadium?: { drawOrder?: string[]; layers?: Record<string, Asset> }
  coordinates?: Record<string, unknown>
  [k: string]: unknown
}

export interface Coordinates {
  homePlate: Point; first: Point; second: Point; third: Point; mound: Point
  batterBoxLeft: Point; batterBoxRight: Point; catcher: Point; umpire: Point
  fielders: Point[]; wallY: number; ballLeavesYard: Point
  scoreboardPanel: { x: number; y: number; width: number; height: number }
}

export interface FieldManifest {
  width: number
  height: number
  drawOrder: string[]
  layers: Record<string, Asset>
  coords: Coordinates
  /** Paths of every required asset still missing. */
  missing: string[]
  /** Paths (relative to public/) of every asset marked ready. */
  ready: Set<string>
  /** Packed batter swing (the only batter clip delivered so far), or null for the placeholder. */
  batterSwing: BatterClip | null
}

export interface BatterClip {
  frames: number
  contactFrame: number
  /** Layer names that have pixels, e.g. outline, skin, jersey. */
  layers: string[]
  /** Path for one frame and layer. */
  file: (frame: number, layer: string) => string
}

function parseSwing(batter: unknown): BatterClip | null {
  const clip = (batter as { clips?: Record<string, unknown> } | undefined)?.clips?.['swing-contact'] as
    | { status?: string; files?: string[]; delivered?: { frames?: number; contactFrame?: number } }
    | undefined
  if (clip?.status !== 'ready' || !Array.isArray(clip.files) || !clip.files.length) return null
  const frames = clip.delivered?.frames ?? 0
  if (frames < 1) return null
  const prefix = 'art/batter/swing-contact/'
  const layers = [...new Set(clip.files.filter((f) => f.startsWith(prefix + '00-')).map((f) => f.slice(prefix.length + 3, -4)))]
  return {
    frames,
    contactFrame: clip.delivered?.contactFrame ?? Math.min(3, frames - 1),
    layers,
    file: (frame, layer) => `${prefix}${String(frame).padStart(2, '0')}-${layer}.png`,
  }
}

/** Cartoon game pixels are the pixel layout times this. */
export const CARTOON_SCALE = 4
const s = (p: Point): Point => ({ x: p.x * CARTOON_SCALE, y: p.y * CARTOON_SCALE })

export const DEFAULT_COORDS: Coordinates = {
  homePlate: s(FIELD.home), first: s(FIELD.first), second: s(FIELD.second), third: s(FIELD.third), mound: s(FIELD.mound),
  batterBoxLeft: s({ x: FIELD.home.x - 18, y: FIELD.home.y }), batterBoxRight: s({ x: FIELD.home.x + 18, y: FIELD.home.y }),
  catcher: s({ x: FIELD.home.x, y: FIELD.home.y + 16 }), umpire: s({ x: FIELD.home.x, y: FIELD.home.y + 24 }),
  fielders: [
    s({ x: 240, y: 150 }), s({ x: 196, y: 128 }), s({ x: 124, y: 128 }), s({ x: 80, y: 150 }),
    s({ x: 70, y: 106 }), s({ x: 160, y: 98 }), s({ x: 250, y: 106 }),
  ],
  wallY: 88 * CARTOON_SCALE,
  ballLeavesYard: s({ x: 160, y: 50 }),
  scoreboardPanel: { x: 1040, y: 20, width: 220, height: 100 },
}

const isPoint = (v: unknown): v is Point =>
  !!v && typeof (v as Point).x === 'number' && typeof (v as Point).y === 'number'

function walkAssets(v: unknown, out: Asset[]): void {
  if (!v || typeof v !== 'object') return
  const a = v as Asset
  if (typeof a.path === 'string' && (a.status === 'missing' || a.status === 'ready')) { out.push(a); return }
  for (const c of Object.values(v)) walkAssets(c, out)
}

export function parseManifest(raw: RawManifest | null | undefined): FieldManifest {
  const r = raw ?? {}
  const c = (r.coordinates ?? {}) as Record<string, unknown>
  const pt = (k: keyof Coordinates & string): Point => (isPoint(c[k]) ? (c[k] as Point) : (DEFAULT_COORDS[k] as Point))
  const fielders = Array.isArray(c.fielders) ? c.fielders : []
  const wall = Array.isArray(c.outfieldWallTop) ? c.outfieldWallTop.filter(isPoint) : []
  const sp = c.scoreboardPanel as Record<string, number | null> | undefined
  const panelOk = sp && ['x', 'y', 'width', 'height'].every((k) => typeof sp[k] === 'number')
  const assets: Asset[] = []
  walkAssets({ stadium: r.stadium, batter: r.batter, chrome: r.chrome, crowd: r.crowd, fielders: r.fielders }, assets)
  const all: Asset[] = []
  walkAssets(r, all)
  return {
    width: r.gameSize?.width ?? 1280,
    height: r.gameSize?.height ?? 960,
    drawOrder: r.stadium?.drawOrder ?? ['sky', 'outfield-wall', 'stands-far', 'grass', 'dirt', 'chalk', 'bases'],
    layers: r.stadium?.layers ?? {},
    coords: {
      homePlate: pt('homePlate'), first: pt('first'), second: pt('second'), third: pt('third'), mound: pt('mound'),
      batterBoxLeft: pt('batterBoxLeft'), batterBoxRight: pt('batterBoxRight'), catcher: pt('catcher'), umpire: pt('umpire'),
      fielders: DEFAULT_COORDS.fielders.map((d, i) => (isPoint(fielders[i]) ? (fielders[i] as Point) : d)),
      wallY: wall.length ? Math.min(...wall.map((p) => p.y)) : DEFAULT_COORDS.wallY,
      ballLeavesYard: pt('ballLeavesYard'),
      scoreboardPanel: panelOk ? (sp as unknown as Coordinates['scoreboardPanel']) : DEFAULT_COORDS.scoreboardPanel,
    },
    missing: assets.filter((a) => a.status !== 'ready' && !a.optional).map((a) => a.path),
    ready: new Set(all.filter((a) => a.status === 'ready').map((a) => a.path)),
    batterSwing: parseSwing(r.batter),
  }
}

/** Fetch the manifest; any failure means an all-placeholder stadium. */
export async function loadManifest(url = '/art/manifest.json'): Promise<FieldManifest> {
  try {
    const res = await fetch(url)
    if (!res.ok) return parseManifest(null)
    return parseManifest((await res.json()) as RawManifest)
  } catch {
    return parseManifest(null)
  }
}
