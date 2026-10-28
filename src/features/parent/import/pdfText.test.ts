// @vitest-environment node
import { readFile } from 'node:fs/promises'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { extractCandidates } from './candidates'
import { extractPdfLines, groupLines, type PdfEngine } from './pdfText'

const engine = pdfjs as unknown as PdfEngine
const fixture = async (name: string) => {
  const buf = await readFile(new URL(`../../../../e2e/fixtures/${name}.pdf`, import.meta.url))
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

describe('groupLines', () => {
  it('joins items on one baseline left to right and separates columns with a space', () => {
    const items = [
      { str: 'night', transform: [1, 0, 0, 1, 300, 700], height: 14 },
      { str: 'bright', transform: [1, 0, 0, 1, 72, 700], height: 14 },
      { str: 'light', transform: [1, 0, 0, 1, 72, 676], height: 14 },
    ]
    expect(groupLines(items)).toEqual(['bright night', 'light'])
  })

  it('glues items that touch (a word split into runs)', () => {
    const items = [
      { str: 'fr', transform: [1, 0, 0, 1, 72, 700], height: 14 },
      { str: 'iend', transform: [1, 0, 0, 1, 86, 700], height: 14 },
    ]
    expect(groupLines(items)).toEqual(['friend'])
  })
})

describe('extractPdfLines on fixtures', () => {
  it('reads a one-column sheet into 15 likely words', async () => {
    const r = await extractPdfLines(await fixture('one-column'), engine)
    expect(r.pages).toBe(1)
    expect(r.hasText).toBe(true)
    const { likely } = extractCandidates(r.lines)
    expect(likely).toHaveLength(15)
    expect(likely[0]).toBe('because')
    expect(likely).not.toContain('Spelling')
  })

  it('reads a two-column numbered sheet with a header and challenge words', async () => {
    const r = await extractPdfLines(await fixture('two-column'), engine)
    const { likely } = extractCandidates(r.lines)
    expect(likely).toEqual(expect.arrayContaining(['bright', 'high', 'midnight', 'brightness', 'nightmare']))
    expect(likely).toHaveLength(18)
    expect(likely).not.toContain('Lee')
    expect(likely).not.toContain('Name')
  })

  it('keeps only the words on a numbered-definitions sheet', async () => {
    const r = await extractPdfLines(await fixture('numbered-definitions'), engine)
    expect(extractCandidates(r.lines).likely).toEqual(['brave', 'enormous', 'gentle', 'curious', 'ancient'])
  })

  it('reports a scanned sheet as having no text', async () => {
    const r = await extractPdfLines(await fixture('scanned'), engine)
    expect(r.hasText).toBe(false)
    expect(r.lines).toEqual([])
  })
})
