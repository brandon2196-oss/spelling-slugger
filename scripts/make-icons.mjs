// Rasterize public/icon.svg into the PNG sizes the PWA manifest and iOS need.
import sharp from 'sharp'
import { mkdir, readFile } from 'node:fs/promises'

const svg = await readFile(new URL('../public/icon.svg', import.meta.url))
await mkdir(new URL('../public/icons/', import.meta.url), { recursive: true })
const out = (name) => new URL(`../public/icons/${name}`, import.meta.url).pathname

await sharp(svg).resize(192, 192).png().toFile(out('icon-192.png'))
await sharp(svg).resize(512, 512).png().toFile(out('icon-512.png'))
await sharp(svg).resize(180, 180).png().toFile(out('apple-touch-icon-180.png'))
// maskable: the artwork inside a safe zone, solid navy to the edges
const inner = await sharp(svg).resize(400, 400).png().toBuffer()
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#142850' } })
  .composite([{ input: inner, left: 56, top: 56 }])
  .png()
  .toFile(out('maskable-512.png'))
console.log('icons written to public/icons/')
