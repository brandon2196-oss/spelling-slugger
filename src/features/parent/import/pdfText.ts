/** Positioned text item as pdf.js reports it (`TextItem` without the fields we never read). */
export interface TextItemLike {
  str: string
  transform: number[]
  height: number
}

export interface PdfLines {
  lines: string[]
  pages: number
  /** False for scanned sheets: a picture of words with no text layer. */
  hasText: boolean
}

/** The slice of pdf.js we use, so tests can hand in the Node build. */
export interface PdfEngine {
  getDocument(src: { data: Uint8Array }): { promise: Promise<PdfDocumentLike>; destroy(): Promise<void> }
}
interface PdfDocumentLike {
  numPages: number
  getPage(n: number): Promise<{ getTextContent(): Promise<{ items: unknown[] }> }>
}

/** Rebuild reading-order lines from positioned items: same baseline → one line, left to right. */
export function groupLines(items: TextItemLike[]): string[] {
  const placed = items
    .filter((it) => it.str.trim() !== '')
    .map((it) => ({ str: it.str, x: it.transform[4] ?? 0, y: it.transform[5] ?? 0, h: it.height || 10 }))
    .sort((a, b) => b.y - a.y || a.x - b.x)

  const lines: { y: number; h: number; parts: { x: number; str: string; w: number }[] }[] = []
  for (const it of placed) {
    const line = lines.find((l) => Math.abs(l.y - it.y) <= Math.max(2, 0.5 * Math.min(l.h, it.h)))
    const part = { x: it.x, str: it.str, w: it.str.length * it.h * 0.5 }
    if (line) line.parts.push(part)
    else lines.push({ y: it.y, h: it.h, parts: [part] })
  }

  return lines.map((l) => {
    l.parts.sort((a, b) => a.x - b.x)
    let out = ''
    let endX = Number.NEGATIVE_INFINITY
    for (const p of l.parts) {
      const gap = p.x - endX
      if (out && gap > 0.15 * l.h) out += ' '
      out += p.str
      endX = p.x + p.w
    }
    return out.replace(/\s+/g, ' ').trim()
  })
}

let browserEngine: Promise<PdfEngine> | null = null
async function loadBrowserEngine(): Promise<PdfEngine> {
  browserEngine ??= (async () => {
    const [pdfjs, worker] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ])
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    return pdfjs as unknown as PdfEngine
  })()
  return browserEngine
}

export async function extractPdfLines(data: ArrayBuffer, engine?: PdfEngine): Promise<PdfLines> {
  const pdf = engine ?? (await loadBrowserEngine())
  const task = pdf.getDocument({ data: new Uint8Array(data) })
  try {
    const doc = await task.promise
    const lines: string[] = []
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n)
      const content = await page.getTextContent()
      lines.push(...groupLines(content.items.filter(isTextItem)))
    }
    return { lines, pages: doc.numPages, hasText: lines.some((l) => l.length > 0) }
  } finally {
    await task.destroy()
  }
}

function isTextItem(it: unknown): it is TextItemLike {
  return typeof it === 'object' && it !== null && 'str' in it && 'transform' in it
}
