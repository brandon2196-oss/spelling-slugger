#!/usr/bin/env node
/**
 * npm run pack-art: art-src/ (raw Nano Banana masters) -> public/art/ (game assets) + manifest.
 * Brief 3.3.1. Re-runnable: rewrites every file it owns and flips manifest statuses to "ready".
 * Never edits art-src/. Anything not in art-src/ stays "missing".
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import sharp from 'sharp'
import {
  alignFrames, blobs, dropGroundStrips, keyShadowGreen, bbox, clearGridLines, crop, img, keyGreen, keyWhiteFromEdges, packAtlas, sliceSheet, splitBatter,
} from './lib.mjs'

const ROOT = process.argv[2] ?? process.cwd()
const SRC = join(ROOT, 'art-src')
const OUT = join(ROOT, 'public/art')
const MANIFEST = join(OUT, 'manifest.json')
/** Stadium layers ship at 1024x768 (what Gemini delivered, 4:3) and draw scaled to 1280x960. */
const LAYER = { w: 1024, h: 768 }
const GAME = { w: 1280, h: 960 }

async function load(rel) {
  const { data, info } = await sharp(join(SRC, rel)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return img(info.width, info.height, new Uint8ClampedArray(data.buffer, data.byteOffset, data.length))
}
const toSharp = (im) => sharp(Buffer.from(im.data.buffer, im.data.byteOffset, im.data.length), { raw: { width: im.width, height: im.height, channels: 4 } })
async function resize(im, w, h, fit = 'fill') {
  const { data, info } = await toSharp(im).resize(w, h, { fit, background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true })
  return img(info.width, info.height, new Uint8ClampedArray(data.buffer, data.byteOffset, data.length))
}
const written = []
async function save(rel, im) {
  const p = join(OUT, rel)
  mkdirSync(dirname(p), { recursive: true })
  await toSharp(im).png({ palette: true, quality: 95, effort: 10, compressionLevel: 9 }).toFile(p)
  written.push(rel)
}
function saveJson(rel, obj) {
  const p = join(OUT, rel)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, JSON.stringify(obj) + '\n')
  written.push(rel)
}
const keyed = async (rel) => keyGreen(await load(rel))
// (crowd strips and stadium layers skip grid clearing: dense rows would read as lines)

// ------------------------------------------------------------------ stadium
/** foreground-fence is optional and the generated one paints a black bar and netting across home plate, so it is not shipped. */
const LAYERS = ['sky', 'outfield-wall', 'stands-far', 'grass', 'dirt', 'chalk', 'bases', 'dugout-near']
async function stadium(m) {
  const layers = {}
  for (const name of LAYERS) {
    let im
    if (name === 'sky') {
      // sky.png is a screen capture: rounded dark corners and a stray panel top right. Crop to content,
      // trim the border, then mirror the clean left half over the right (the towers are symmetric).
      const raw = await keyed('stadium/layers/sky.png')
      const b = bbox(raw)
      const inset = Math.round(b.w * 0.03)
      im = await resize(crop(raw, b.x + inset, b.y + inset, b.w - 2 * inset, b.h - 2 * inset), LAYER.w, LAYER.h, 'cover')
      for (let y = 0; y < LAYER.h; y++) for (let x = LAYER.w >> 1; x < LAYER.w; x++) {
        const s = (y * LAYER.w + (LAYER.w - 1 - x)) * 4, d = (y * LAYER.w + x) * 4
        for (let k = 0; k < 3; k++) im.data[d + k] = im.data[s + k]
      }
      for (let i = 3; i < im.data.length; i += 4) im.data[i] = 255
    } else {
      im = await resize(await keyed(`stadium/layers/${name}.png`), LAYER.w, LAYER.h)
    }
    layers[name] = im
    await save(`stadium/${name}.png`, im)
    m.stadium.layers[name].status = 'ready'
    m.stadium.layers[name].size = { width: LAYER.w, height: LAYER.h }
  }
  // Four base sprites cut from the bases layer; their centers give the diamond coordinates.
  // The layer also carries faint diamond outlines and the pitching rubber: keep small blobs only and
  // take the extremes (rubber sits in the middle, so it never wins).
  const found = blobs(layers.bases, 30).filter((b) => b.w < 60 && b.h < 60)
  if (found.length < 4) throw new Error(`bases layer: expected 4 bases, found ${found.length}`)
  const pick = {
    home: found.reduce((a, b) => (b.cy > a.cy ? b : a)),
    second: found.reduce((a, b) => (b.cy < a.cy ? b : a)),
    first: found.reduce((a, b) => (b.cx > a.cx ? b : a)),
    third: found.reduce((a, b) => (b.cx < a.cx ? b : a)),
  }
  const k = GAME.w / LAYER.w
  const gp = (x, y) => ({ x: Math.round(x * k), y: Math.round(y * k) })
  for (const [base, b] of Object.entries(pick)) {
    await save(`stadium/bases-${base}.png`, crop(layers.bases, b.x - 1, b.y - 1, b.w + 2, b.h + 2))
    m.stadium.bases[base].status = 'ready'
    m.stadium.bases[base].at = gp(b.cx, b.cy)
  }
  // Positions in game pixels. Bases come from the art; everything else is placed on the diamond.
  const H = gp(pick.home.cx, pick.home.cy), F = gp(pick.first.cx, pick.first.cy)
  const S = gp(pick.second.cx, pick.second.cy), T = gp(pick.third.cx, pick.third.cy)
  /** u along home->first, v along home->third, in base-path units. */
  const at = (u, v) => ({ x: Math.round(H.x + u * (F.x - H.x) + v * (T.x - H.x)), y: Math.round(H.y + u * (F.y - H.y) + v * (T.y - H.y)) })
  const span = F.x - T.x
  const c = m.coordinates
  c.homePlate = H; c.first = F; c.second = S; c.third = T
  c.mound = at(0.47, 0.47)
  c.batterBoxLeft = { x: Math.round(H.x - span * 0.07), y: H.y + 4 }
  c.batterBoxRight = { x: Math.round(H.x + span * 0.07), y: H.y + 4 }
  c.catcher = { x: H.x, y: Math.min(GAME.h - 20, H.y + Math.round(span * 0.06)) }
  // Umpire stands off the catcher's shoulder so neither hides the other.
  c.umpire = { x: H.x + 50, y: Math.min(GAME.h - 4, H.y + Math.round(span * 0.11)) }
  void at
  // Wall top: first opaque row per column of the outfield-wall layer, minus the scoreboard bump.
  const wall = layers['outfield-wall']
  const tops = []
  for (let x = 0; x < wall.width; x += 32) {
    let y = 0
    while (y < wall.height && wall.data[(y * wall.width + x) * 4 + 3] < 128) y++
    if (y < wall.height) tops.push({ x, y })
  }
  const median = [...tops].sort((a, b) => a.y - b.y)[tops.length >> 1].y
  // Scoreboard: the run of raised columns that contains the center.
  const mid = tops.reduce((a, b) => (Math.abs(b.x - wall.width / 2) < Math.abs(a.x - wall.width / 2) ? b : a))
  let lo = tops.indexOf(mid), hi = lo
  const raised = (p) => p && p.y < median - 20
  if (raised(mid)) {
    while (raised(tops[lo - 1])) lo--
    while (raised(tops[hi + 1])) hi++
    const x0 = tops[lo].x, x1 = tops[hi].x + 32, y0 = Math.min(...tops.slice(lo, hi + 1).map((p) => p.y))
    c.scoreboardPanel = { x: Math.round(x0 * k), y: Math.round(y0 * k), width: Math.round((x1 - x0) * k), height: Math.round((median - y0) * k) }
  }
  // The outfield-wall layer also holds the stands, so its top edge is the stands' top. The wall
  // itself is the band just above the outfield grass: measure the grass top and step up the wall height.
  const grass = layers.grass
  const WALL_H = 24
  const grassTop = []
  for (let x = 0; x < grass.width; x += 32) {
    let y = 0
    while (y < grass.height && grass.data[(y * grass.width + x) * 4 + 3] < 128) y++
    if (y < grass.height) grassTop.push(gp(x, y))
  }
  c.outfieldWallTop = grassTop.map((p) => ({ x: p.x, y: p.y - WALL_H }))
  const wallY = Math.round(grassTop.find((p) => p.x >= GAME.w / 2 - 20)?.y ?? median * k) - WALL_H
  const lerp = (a, b, t) => ({ x: Math.round(a.x + (b.x - a.x) * t), y: Math.round(a.y + (b.y - a.y) * t) })
  // Order: 1B, 2B, SS, 3B, LF, CF, RF. Infield just behind the bags, outfield on the grass below the wall.
  c.fielders = [
    { x: F.x - 40, y: F.y - 45 }, { ...lerp(S, F, 0.45), y: lerp(S, F, 0.45).y - 35 },
    { ...lerp(S, T, 0.45), y: lerp(S, T, 0.45).y - 35 }, { x: T.x + 40, y: T.y - 45 },
    { x: T.x - 30, y: wallY + 130 }, { x: H.x, y: wallY + 100 }, { x: F.x + 30, y: wallY + 130 },
  ]
  c.ballLeavesYard = { x: H.x, y: wallY - 40 }
  c._derived = 'Bases are measured from stadium/bases.png. Mound, boxes, catcher, umpire and fielders are placed on that diamond by pack-art; wall top and scoreboard come from outfield-wall.png. Tune here if anything looks off.'
}

// ------------------------------------------------------------------ atlases
async function sheetFrames(rel, { rows = 1, perRow, grid = true }) {
  const im0 = await load(rel)
  keyGreen(im0)
  keyShadowGreen(im0)
  dropGroundStrips(im0, rows)
  // Gemini's cell counts do not always match the contract, so cut by figure (gaps between
  // figures after the grid lines are gone); when that disagrees with the contract count, the sheet
  // is a clean grid and equal cells win. Delivered counts are recorded in the manifest.
  const im = im0
  if (grid) clearGridLines(im)
  return sliceSheet(im, { rows, perRow })
}
async function atlas(key, file, clips, m) {
  const named = []
  const refH = {}
  for (const { clip, rel, rows = 1, suffixes = [''] } of clips) {
    const perRow = m[key].clips[clip].frames
    const bands = await sheetFrames(rel, { rows, perRow })
    for (const [r, frames] of bands.entries()) {
      let aligned = alignFrames(frames)
      // Gemini drew some clips smaller (windup, punchout). Scale each clip so the character keeps the
      // height of its first clip; otherwise he shrinks mid-animation.
      const who = clip.split('-')[0] + suffixes[r]
      refH[who] ??= aligned[0].height
      if (Math.abs(aligned[0].height - refH[who]) > 4) {
        const k = refH[who] / aligned[0].height
        aligned = await Promise.all(aligned.map((f) => resize(f, Math.round(f.width * k), refH[who])))
      }
      aligned.forEach((f, i) => named.push([`${clip}${suffixes[r]}-${String(i).padStart(2, '0')}`, f]))
    }
  }
  // One cell size per atlas so every frame of a character shares a baseline.
  const all = alignFrames(named.map(([, f]) => f))
  const { sheet, json } = packAtlas(named.map(([n], i) => [n, all[i]]), `${file}.png`)
  await save(`${file}.png`, sheet)
  saveJson(`${file}.json`, json)
  m[key].image.status = 'ready'
  m[key].data.status = 'ready'
  m[key].frameSize = { width: all[0].width, height: all[0].height }
  for (const { clip, rows = 1, suffixes = [''] } of clips) {
    const got = named.filter(([n]) => n.startsWith(clip + suffixes[0] + '-')).length
    m[key].clips[clip].delivered = rows > 1 ? { frames: got, bodyTypes: suffixes.map((s) => s.slice(1)) } : { frames: got }
  }
}

async function crowd(m) {
  const named = []
  for (const row of [1, 2, 3]) for (const [clip, n] of [['idle', 2], ['cheer', 4]]) {
    const im = await keyed(`crowd/row${row}-${clip}.png`)
    const strips = sliceSheet({ ...im, ...rotate(im) }, { perRow: n })[0].map(unrotate)
    for (const [i, s] of strips.entries()) {
      const b = bbox(s) ?? { x: 0, y: 0, w: s.width, h: s.height }
      named.push([`row${row}-crowd-${clip}-${String(i).padStart(2, '0')}`, await resize(crop(s, 0, b.y, s.width, b.h), 512, Math.round(b.h * 512 / s.width))])
    }
  }
  const all = alignFrames(named.map(([, f]) => f), 0)
  const { sheet, json } = packAtlas(named.map(([n], i) => [n, all[i]]), 'crowd.png', 2)
  await save('crowd.png', sheet)
  saveJson('crowd.json', json)
  m.crowd.image.status = m.crowd.data.status = 'ready'
  m.crowd.frameSize = { width: all[0].width, height: all[0].height }
}
/** Transpose so the column slicer can cut horizontal strips. */
function rotate(im) {
  const out = img(im.height, im.width)
  for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) {
    const s = (y * im.width + x) * 4, d = (x * im.height + y) * 4
    for (let k = 0; k < 4; k++) out.data[d + k] = im.data[s + k]
  }
  return out
}
const unrotate = rotate

// ------------------------------------------------------------------ batter (swing-contact only)
async function batter(m) {
  const im = keyWhiteFromEdges(await load('batter/swing-contact.png'))
  const frames = alignFrames(sliceSheet(im, {})[0])
  const clip = m.batter.clips['swing-contact']
  const files = []
  const made = new Set()
  for (const [i, f] of frames.entries()) {
    const layers = splitBatter(f)
    for (const [layer, li] of Object.entries(layers)) {
      const rel = `batter/swing-contact/${String(i).padStart(2, '0')}-${layer}.png`
      await save(rel, li)
      files.push(`art/${rel}`)
      made.add(layer)
    }
  }
  clip.status = 'ready'
  clip.files = files
  clip.delivered = { frames: frames.length, frameSize: { width: frames[0].width, height: frames[0].height }, contactFrame: 4 }
  clip.missingLayers = m.batter.layers.filter((l) => !made.has(l))
  clip._note = 'Packed from one flat Gemini drawing split by hue (brief 3.3.1). The drawn hair is the only hairstyle and ships as hair-short. Layers listed in missingLayers have no pixels; the game skips them.'
}

// ------------------------------------------------------------------ singles
async function ball(m) {
  const fit = async (im, w) => { const b = bbox(im); return resize(crop(im, b.x, b.y, b.w, b.h), w, Math.max(1, Math.round(b.h * w / b.w))) }
  await save('ball/ball.png', await fit(await keyed('ball/ball.png'), 20)) // game size: 20 px ball
  m.ball.ball.status = 'ready'
  await save('ball/ball-shadow.png', await fit(await keyed('ball/ball-shadow.png'), 28))
  m.ball['ball-shadow'].status = 'ready'
  const spins = sliceSheet(clearGridLines(await keyed('ball/ball-spin.png')), { perRow: 3 })[0]
  for (const [i, s] of spins.entries()) {
    await save(`ball/ball-spin-0${i}.png`, await fit(s, 20))
    m.ball['ball-spin'].files[i].status = 'ready'
  }
}
async function booth(m) {
  for (const who of ['bigRed', 'jackDalton']) for (const mouth of ['mouth-closed', 'mouth-open']) {
    const key = `${who}-${mouth}`
    await save(`booth/${key}.png`, await resize(await keyed(`booth/${key}.png`), 512, 512, 'contain'))
    m.booth[key].status = 'ready'
  }
}

// ------------------------------------------------------------------ main
function dirBytes(dir) {
  let n = 0
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    n += statSync(p).isDirectory() ? dirBytes(p) : statSync(p).size
  }
  return n
}

export async function packArt() {
  const m = JSON.parse(readFileSync(MANIFEST, 'utf8'))
  // Start from all-missing so a rerun never keeps a stale "ready".
  const reset = (v) => {
    if (!v || typeof v !== 'object') return
    if (typeof v.status === 'string') v.status = 'missing'
    for (const c of Object.values(v)) reset(c)
  }
  reset(m)
  for (const d of ['stadium', 'batter', 'ball', 'booth', 'chrome']) rmSync(join(OUT, d), { recursive: true, force: true })
  await stadium(m)
  await atlas('pitcher', 'pitcher', [
    { clip: 'pitcher-idle', rel: 'pitcher/pitcher-idle.png' },
    { clip: 'pitcher-windup-throw', rel: 'pitcher/pitcher-windup-throw.png' },
    { clip: 'pitcher-react-hit', rel: 'pitcher/pitcher-react-hit.png' },
  ], m)
  await atlas('fielders', 'fielders', ['idle', 'chase', 'catch', 'watch-hr'].map((c) => ({
    clip: `fielder-${c}`, rel: `fielders/fielder-${c}.png`, rows: 2, suffixes: ['-a', '-b'],
  })), m)
  await atlas('catcherUmp', 'catcher-ump', ['catcher-idle', 'catcher-receive', 'ump-idle', 'ump-strike', 'ump-punchout'].map((c) => ({
    clip: c, rel: `catcher-ump/${c}.png`,
  })), m)
  await atlas('mascot', 'mascot', ['idle', 'happy', 'sad'].map((c) => ({ clip: `mascot-${c}`, rel: `mascot/mascot-${c}.png` })), m)
  await crowd(m)
  await batter(m)
  await ball(m)
  await booth(m)
  m.version = 1
  m._comment = 'Written by npm run pack-art from art-src/ (see scripts/pack-art). Paths are relative to public/. Assets marked missing were never generated; the game draws placeholders for them. Do not hand-edit statuses; rerun pack-art.'
  writeFileSync(MANIFEST, JSON.stringify(m, null, 2) + '\n')
  const bytes = dirBytes(OUT)
  if (bytes > m.sizeBudgetBytes) throw new Error(`public/art is ${bytes} bytes, over the ${m.sizeBudgetBytes} budget`)
  return { files: written.length, bytes }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await packArt()
  console.log(`pack-art: ${r.files} files, public/art = ${r.bytes} bytes`)
}
