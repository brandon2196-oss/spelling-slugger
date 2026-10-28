# PDF Word-List Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A parent drops the teacher's PDF onto the list editor and gets the week's words, with a review step to untick stray words, in under a minute.

**Architecture:** Text is extracted in the browser with pdf.js (lazy-loaded chunk; no server, no upload). A pure heuristic module turns positioned text into `likely` words (one-to-four-word lines, numbered items) and `other` words (everything else wordlike). A review panel in the list editor shows `likely` pre-selected as toggle chips; "Add N words" feeds the existing `addWords`. Scanned PDFs (no text layer) get a clear message and the paste fallback; OCR is out of scope.

**Tech Stack:** pdfjs-dist 6 (runtime), pdf-lib (dev, fixture generation), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-26-spelling-slugger-spec.md` plus Brandon 2026-10-27: "they get the word list sent to them as part of pdf and it can change by teacher and grade so easy import of the list is priority".

## Global Constraints

- Nothing leaves the browser: the PDF is read locally; no network call in the import path.
- Lazy-load pdf.js; the main bundle size must not grow.
- Store-agnostic: the import only produces `string[]` for the existing `addWords`.
- Copy in sentence case, plain verbs; the parent always reviews before words are added.

## Review Focus

1. Two-column sheets: pdf.js emits both columns' items on one y; must yield both words, not a merged token.
2. Numbered lines with definitions ("3. brave: showing courage"): the word is the first token, the definition is not.
3. ALL CAPS sheets: words lower-cased; a mixed-case sheet is left alone.
4. Header noise ("Spelling Words", "Name:", "Week 9", "Challenge words"): never pre-selected.
5. Scanned PDF: no crash, no empty silent result; message plus paste fallback.

---

### Task 1: Candidate heuristics (pure)

**Files:** Create `src/features/parent/import/candidates.ts`, `src/features/parent/import/candidates.test.ts`.

**Produces:** `extractCandidates(lines: string[]): { likely: string[]; other: string[] }`.

- [ ] Tests: single-column list; two-column list (lines of two words); numbered list; numbered with definitions; header lines excluded; ALL CAPS lower-cased; mixed case kept; duplicates collapsed; empty input → both empty; a list with one line of 15 comma-separated words.
- [ ] Run, fail. Implement. Pass. Commit `feat(import): candidate word heuristics`.

### Task 2: PDF text extraction

**Files:** Create `src/features/parent/import/pdfText.ts`, `scripts/make-fixture-pdfs.mjs`, `e2e/fixtures/{one-column,two-column,numbered-definitions,scanned}.pdf`, `src/features/parent/import/pdfText.test.ts` (node env, legacy build).

**Produces:** `extractPdfLines(data: ArrayBuffer): Promise<{ lines: string[]; pages: number; hasText: boolean }>`; lines grouped by y within a page, ordered by x.

- [ ] Fixture script with pdf-lib: one-column 15 words; two-column 16 words with a title and "Name: ____"; numbered with definitions; "scanned" = a page with a filled rectangle and no text.
- [ ] Test extraction against each fixture; fail; implement with `pdfjs-dist/legacy/build/pdf.mjs` in tests and `pdfjs-dist` + worker `?url` in the browser; pass. Commit `feat(import): pdf text extraction + fixtures`.

### Task 3: Import panel in the list editor

**Files:** Create `src/features/parent/import/PdfImport.tsx`; modify `src/features/parent/ListEditorPage.tsx`, `ListEditorPage.test.tsx`.

- [ ] Tests (mock `./import/pdfText`): uploading a PDF shows "Found N words" with likely words pressed; toggling one off and clicking "Add N words" adds only the selected; scanned → message with paste fallback; a parse error → error banner, editor still usable.
- [ ] Implement: drop zone + file input (`accept=".pdf,application/pdf"`) as the first block on a new list; chips as `button[aria-pressed]`; "Other words from the page" collapsed; `Add N words`; `Cancel`. Pass. Commit `feat(import): PDF import panel`.

### Task 4: Build split + Playwright

**Files:** modify `vite.config.ts` (manualChunks `pdf`), `e2e/import.spec.ts`.

- [ ] e2e: set the file input to `e2e/fixtures/two-column.pdf`, expect "Found 16 words", add, expect 16 rows, save, list appears. Scanned fixture → message visible.
- [ ] `npm run build`: pdf chunk separate, main chunk unchanged within 5 KB. `npm test`, `npm run e2e` green. Commit `feat(import): lazy pdf chunk + e2e`.
