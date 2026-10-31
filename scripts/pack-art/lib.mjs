/**
 * Pure pixel helpers for pack-art. Images are { width, height, data: Uint8ClampedArray RGBA }.
 * No I/O here so tests can feed tiny synthetic images.
 */

export const img = (width, height, data = new Uint8ClampedArray(width * height * 4)) => ({ width, height, data })

/**
 * Brief 3.3.1 step 1. Only near-#00FF00 goes transparent (tight tolerance), so green art such as the
 * grass survives. Pixels touching the key lose their green spill and half their alpha (fringe).
 */
export function keyGreen(im, { minG = 200, maxRB = 90, spill = 24 } = {}) {
  const { width: w, height: h, data: d } = im
  const keyed = new Uint8Array(w * h)
  for (let p = 0; p < w * h; p++) {
    const i = p * 4
    if (d[i + 1] >= minG && d[i] <= maxRB && d[i + 2] <= maxRB) { d[i + 3] = 0; keyed[p] = 1 }
  }
  for (let p = 0; p < w * h; p++) {
    if (keyed[p]) continue
    const x = p % w
    const edge = (x > 0 && keyed[p - 1]) || (x < w - 1 && keyed[p + 1]) || (p >= w && keyed[p - w]) || (p < w * (h - 1) && keyed[p + w])
    if (!edge) continue
    const i = p * 4, m = Math.max(d[i], d[i + 2])
    if (d[i + 1] - m > spill) { d[i + 1] = m; d[i + 3] = d[i + 3] >> 1 }
  }
  return im
}

/**
 * Green spill on the outline: keyGreen only despills the 1px ring touching the key, but sheets drawn on
 * soft-edged green (pitcher) keep a green halo a few pixels deep. Within `radius` px of transparency,
 * clamp green to max(red, blue) so the outline reads neutral. Interior pixels are left alone.
 */
export function despillEdges(im, radius = 3) {
  const { width: w, height: h, data: d } = im
  let dist = new Uint8Array(w * h).fill(255)
  for (let p = 0; p < w * h; p++) if (d[p * 4 + 3] === 0) dist[p] = 0
  for (let r = 1; r <= radius; r++) {
    const next = dist.slice()
    for (let p = 0; p < w * h; p++) {
      if (dist[p] !== 255) continue
      const x = p % w
      if ((x > 0 && dist[p - 1] === r - 1) || (x < w - 1 && dist[p + 1] === r - 1) || (p >= w && dist[p - w] === r - 1) || (p < w * (h - 1) && dist[p + w] === r - 1)) next[p] = r
    }
    dist = next
  }
  for (let p = 0; p < w * h; p++) {
    if (dist[p] === 0 || dist[p] === 255) continue
    const i = p * 4, m = Math.max(d[i], d[i + 2])
    if (d[i + 1] > m) d[i + 1] = m
  }
  return im
}

/** Flood-fill near-white background from the borders (the batter sheet arrived on white, not green). */
export function keyWhiteFromEdges(im, min = 235) {
  const { width: w, height: h, data: d } = im
  const seen = new Uint8Array(w * h)
  const stack = []
  const white = (p) => d[p * 4] >= min && d[p * 4 + 1] >= min && d[p * 4 + 2] >= min
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x)
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1)
  while (stack.length) {
    const p = stack.pop()
    if (seen[p] || !white(p)) continue
    seen[p] = 1
    d[p * 4 + 3] = 0
    const x = p % w
    if (x > 0) stack.push(p - 1)
    if (x < w - 1) stack.push(p + 1)
    if (p >= w) stack.push(p - w)
    if (p < w * (h - 1)) stack.push(p + w)
  }
  return im
}

const alphaAt = (im, x, y) => im.data[(y * im.width + x) * 4 + 3]

/**
 * Clear the thin dark grid lines Gemini drew between cells: runs of at most `maxWidth` columns (or
 * rows) that are opaque for `fill` of the span. Wider opaque runs are art and stay.
 */
export function clearGridLines(im, maxWidth = 5, fill = 0.6) {
  const { width: w, height: h, data: d } = im
  const colOn = Array.from({ length: w }, (_, x) => { let n = 0; for (let y = 0; y < h; y++) if (alphaAt(im, x, y) > 16) n++; return n >= fill * h })
  const rowOn = Array.from({ length: h }, (_, y) => { let n = 0; for (let x = 0; x < w; x++) if (alphaAt(im, x, y) > 16) n++; return n >= fill * w })
  for (const [a, b] of runs(colOn, 1, 1)) if (b - a <= maxWidth) for (let x = Math.max(0, a - 1); x < Math.min(w, b + 1); x++) for (let y = 0; y < h; y++) d[(y * w + x) * 4 + 3] = 0
  for (const [a, b] of runs(rowOn, 1, 1)) if (b - a <= maxWidth) for (let y = Math.max(0, a - 1); y < Math.min(h, b + 1); y++) for (let x = 0; x < w; x++) d[(y * w + x) * 4 + 3] = 0
  return im
}

/** Fold segments much narrower than the median (a loose ball, a glove tip) into their nearest neighbour. */
export function mergeSlivers(cols, ratio = 0.4) {
  const out = cols.map((c) => [...c])
  const median = () => [...out].map(([a, b]) => b - a).sort((x, y) => x - y)[out.length >> 1]
  for (let i = 0; out.length > 1 && i < out.length; ) {
    const [a, b] = out[i]
    if (b - a >= ratio * median()) { i++; continue }
    const left = i > 0 ? a - out[i - 1][1] : Infinity, right = i < out.length - 1 ? out[i + 1][0] - b : Infinity
    const j = left <= right ? i - 1 : i + 1
    out[j] = [Math.min(out[j][0], a), Math.max(out[j][1], b)]
    out.splice(i, 1)
    i = 0
  }
  return out
}

/** Runs of occupied columns (or rows) separated by at least `gap` empty ones. */
export function runs(occupied, gap = 3, minSize = 6) {
  const out = []
  let start = -1, last = -1
  const close = () => { if (start >= 0 && last + 1 - start >= minSize) out.push([start, last + 1]); start = -1 }
  for (let i = 0; i < occupied.length; i++) {
    if (occupied[i]) { if (start < 0) start = i; last = i }
    else if (start >= 0 && i - last >= gap) close()
  }
  close()
  return out
}

export function crop(im, x, y, w, h) {
  const out = img(w, h)
  for (let r = 0; r < h; r++) {
    const sy = y + r
    if (sy < 0 || sy >= im.height) continue
    for (let c = 0; c < w; c++) {
      const sx = x + c
      if (sx < 0 || sx >= im.width) continue
      const si = (sy * im.width + sx) * 4, di = (r * w + c) * 4
      for (let k = 0; k < 4; k++) out.data[di + k] = im.data[si + k]
    }
  }
  return out
}

/** Tight box around alpha > 16, or null when empty. */
export function bbox(im, thr = 16) {
  let x0 = im.width, y0 = im.height, x1 = -1, y1 = -1
  for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) {
    if (alphaAt(im, x, y) > thr) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

/**
 * Split a sheet into `rows` equal bands, then each band into figures by empty-column gaps.
 * With `equal`, or when the gap count does not give `perRow` figures, cuts `perRow` equal cells.
 */
export function sliceSheet(im, { rows = 1, perRow, equal = false, inset = 0 }) {
  const bandH = Math.floor(im.height / rows)
  const out = []
  for (let r = 0; r < rows; r++) {
    const band = crop(im, 0, r * bandH, im.width, bandH)
    const occ = Array.from({ length: band.width }, (_, x) => {
      for (let y = 0; y < band.height; y++) if (alphaAt(band, x, y) > 16) return true
      return false
    })
    let cols = equal ? [] : mergeSlivers(runs(occ, 3, 6))
    if (perRow && cols.length !== perRow) {
      const cw = band.width / perRow
      cols = Array.from({ length: perRow }, (_, i) => [Math.round(i * cw), Math.round((i + 1) * cw)])
    }
    out.push(cols.map(([a, b]) => crop(band, a + inset, inset, b - a - 2 * inset, band.height - 2 * inset)))
  }
  return out
}

/** Trim each frame and paste into one shared cell, centered, feet on a common baseline. */
export function alignFrames(frames, pad = 2) {
  const boxes = frames.map((f) => bbox(f) ?? { x: 0, y: 0, w: 1, h: 1 })
  const w = Math.max(...boxes.map((b) => b.w)) + pad * 2
  const h = Math.max(...boxes.map((b) => b.h)) + pad * 2
  return frames.map((f, i) => {
    const b = boxes[i]
    const out = img(w, h)
    const dx = Math.floor((w - b.w) / 2), dy = h - pad - b.h
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      const si = ((b.y + y) * f.width + b.x + x) * 4, di = ((dy + y) * w + dx + x) * 4
      for (let k = 0; k < 4; k++) out.data[di + k] = f.data[si + k]
    }
    return out
  })
}

/** Grid-pack equal cells into one atlas image plus a Phaser JSON-hash frame list. */
export function packAtlas(named, imageName, cols = 8) {
  const cw = Math.max(...named.map(([, f]) => f.width)), ch = Math.max(...named.map(([, f]) => f.height))
  const n = named.length, c = Math.min(cols, n), r = Math.ceil(n / c)
  const sheet = img(cw * c, ch * r)
  const frames = {}
  named.forEach(([name, f], i) => {
    const x = (i % c) * cw, y = Math.floor(i / c) * ch
    for (let yy = 0; yy < f.height; yy++) for (let xx = 0; xx < f.width; xx++) {
      const si = (yy * f.width + xx) * 4, di = ((y + yy) * sheet.width + x + xx) * 4
      for (let k = 0; k < 4; k++) sheet.data[di + k] = f.data[si + k]
    }
    frames[name] = {
      frame: { x, y, w: f.width, h: f.height }, rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: f.width, h: f.height }, sourceSize: { w: f.width, h: f.height },
    }
  })
  return { sheet, json: { frames, meta: { app: 'spelling-slugger pack-art', image: imageName, format: 'RGBA8888', size: { w: sheet.width, h: sheet.height }, scale: '1' } } }
}

function hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  let h = 0
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: (h * 60 + 360) % 360, s: mx ? d / mx : 0, v: mx / 255 }
}

/**
 * Brief 3.3.1 step 2: classify a batter pixel by hue into its tint layer. `upper` is true in the
 * top third of the figure, which separates the orange hat brim from the brown bat.
 */
export function batterLayer(r, g, b, upper) {
  const { h, s, v } = hsv(r, g, b)
  if (v < 0.22) return 'outline'
  if (s < 0.3) return 'shoes-bat-glove'
  if (h < 12 || h >= 340) return 'skin'
  if (h < 45) return upper && v > 0.6 ? 'hat-brim' : 'shoes-bat-glove'
  if (h < 75) return 'hat'
  if (h < 150) return 'shoes-bat-glove'
  if (h < 205) return 'pants'
  if (h < 252) return 'trim'
  if (h < 285) return 'hair-short'
  return 'jersey'
}

/** Split one keyed batter frame into per-layer images. Tinted layers become grayscale shading. */
export function splitBatter(frame) {
  const layers = {}
  const bb = bbox(frame) ?? { y: 0, h: frame.height }
  const get = (name) => (layers[name] ??= img(frame.width, frame.height))
  const d = frame.data
  for (let y = 0; y < frame.height; y++) for (let x = 0; x < frame.width; x++) {
    const i = (y * frame.width + x) * 4
    if (d[i + 3] === 0) continue
    const name = batterLayer(d[i], d[i + 1], d[i + 2], y < bb.y + bb.h / 3)
    const o = get(name).data
    if (name === 'outline' || name === 'shoes-bat-glove') {
      for (let k = 0; k < 4; k++) o[i + k] = d[i + k]
    } else {
      const v = Math.round(Math.max(d[i], d[i + 1], d[i + 2]))
      o[i] = o[i + 1] = o[i + 2] = v
      o[i + 3] = d[i + 3]
    }
  }
  return layers
}

/** Connected blobs of alpha > 16, largest first: { x, y, w, h, area, cx, cy }. */
export function blobs(im, minArea = 20) {
  const { width: w, height: h } = im
  const seen = new Uint8Array(w * h)
  const out = []
  for (let p0 = 0; p0 < w * h; p0++) {
    if (seen[p0] || im.data[p0 * 4 + 3] <= 16) continue
    const stack = [p0]
    let area = 0, sx = 0, sy = 0, x0 = w, y0 = h, x1 = 0, y1 = 0
    seen[p0] = 1
    while (stack.length) {
      const p = stack.pop()
      const x = p % w, y = (p - x) / w
      area++; sx += x; sy += y
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q >= 0 && !seen[q] && im.data[q * 4 + 3] > 16) { seen[q] = 1; stack.push(q) }
      }
    }
    if (area >= minArea) out.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, area, cx: sx / area, cy: sy / area })
  }
  return out.sort((a, b) => b.area - a.area)
}

/** Character sheets only: the soft ground shadows Gemini drew are a darker key green. */
export function keyShadowGreen(im) {
  const d = im.data
  for (let i = 0; i < d.length; i += 4) if (d[i + 1] > 2.2 * Math.max(d[i], d[i + 2]) + 30) d[i + 3] = 0
  return im
}

/**
 * Some sheets (pitcher) stand the figures on a strip of dirt. Within the bottom quarter of each band,
 * rows that are opaque across most of the band width are ground, not figure: clear them and below.
 */
export function dropGroundStrips(im, rows = 1, fill = 0.7) {
  const { width: w, height: h, data: d } = im
  const bandH = Math.floor(h / rows)
  for (let r = 0; r < rows; r++) {
    const top = r * bandH, bottom = top + bandH
    for (let y = bottom - Math.floor(bandH / 4); y < bottom; y++) {
      let n = 0
      for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 16) n++
      if (n >= fill * w) {
        for (let yy = y; yy < bottom; yy++) for (let x = 0; x < w; x++) d[(yy * w + x) * 4 + 3] = 0
        break
      }
    }
  }
  return im
}
