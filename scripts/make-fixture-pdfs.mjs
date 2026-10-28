// Generates the teacher-sheet PDFs the import tests run against. `npm run fixtures`.
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { mkdir, writeFile } from 'node:fs/promises'

const OUT = new URL('../e2e/fixtures/', import.meta.url)

async function sheet(draw) {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const page = doc.addPage([612, 792])
  const text = (s, x, y, size = 14) => page.drawText(s, { x, y, size, font })
  draw({ page, text })
  return doc.save()
}

const oneColumn = sheet(({ text }) => {
  text('Spelling Words', 72, 720, 20)
  text('Week 9', 72, 696)
  const words = ['because', 'friend', 'thought', 'enough', 'people', 'their', 'again', 'through',
    'before', 'around', 'school', 'every', 'always', 'another', 'little']
  words.forEach((w, i) => text(w, 72, 660 - i * 24))
})

const twoColumn = sheet(({ text }) => {
  text("Mrs. Lee's 3rd Grade Spelling", 72, 720, 18)
  text('Name: ____________________    Date: ________', 72, 690, 12)
  const left = ['bright', 'light', 'sight', 'fright', 'night', 'tight', 'flight', 'might']
  const right = ['high', 'sigh', 'thigh', 'knight', 'slight', 'delight', 'tonight', 'midnight']
  left.forEach((w, i) => text(`${i + 1}. ${w}`, 72, 650 - i * 26))
  right.forEach((w, i) => text(`${i + 9}. ${w}`, 320, 650 - i * 26))
  text('Challenge words', 72, 420, 14)
  text('brightness', 72, 396)
  text('nightmare', 72, 372)
})

const numberedDefinitions = sheet(({ text }) => {
  text('Unit 4 Vocabulary', 72, 720, 18)
  const rows = [
    ['brave', 'showing courage when you are afraid'],
    ['enormous', 'very, very big'],
    ['gentle', 'soft and kind'],
    ['curious', 'wanting to know more'],
    ['ancient', 'from a very long time ago'],
  ]
  rows.forEach(([w, d], i) => text(`${i + 1}. ${w}: ${d}`, 72, 680 - i * 28, 13))
})

const scanned = sheet(({ page }) => {
  page.drawRectangle({ x: 60, y: 60, width: 492, height: 672, color: rgb(0.93, 0.93, 0.9) })
  for (let i = 0; i < 12; i++) page.drawRectangle({ x: 90, y: 680 - i * 44, width: 180 + (i % 3) * 30, height: 10, color: rgb(0.3, 0.3, 0.3) })
})

await mkdir(OUT, { recursive: true })
for (const [name, p] of Object.entries({ 'one-column': oneColumn, 'two-column': twoColumn, 'numbered-definitions': numberedDefinitions, scanned })) {
  await writeFile(new URL(`${name}.pdf`, OUT), await p)
}
console.log('fixtures written to e2e/fixtures/')
