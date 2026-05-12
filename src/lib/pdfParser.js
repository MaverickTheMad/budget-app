// PDF text extraction using pdf.js.
// Returns the full extracted text, page by page, joined with form feeds.
// Used by parsers downstream — parsers should not need to know about PDF internals.

import * as pdfjsLib from 'pdfjs-dist'

// Worker setup — Vite serves the worker as an asset
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

/**
 * Extract text from a PDF file/blob.
 * @param {File|Blob} file
 * @returns {Promise<{ text: string, pages: string[], pageCount: number }>}
 */
export async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    // Reconstruct lines by Y position — pdf.js gives items in reading order
    // but lines often need explicit \n based on transform[5] (Y coord)
    let lastY = null
    let line = ''
    const lines = []
    for (const item of content.items) {
      const y = Math.round(item.transform[5])
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        if (line.trim()) lines.push(line.trim())
        line = ''
      }
      line += (line && !line.endsWith(' ') ? ' ' : '') + item.str
      lastY = y
    }
    if (line.trim()) lines.push(line.trim())
    pages.push(lines.join('\n'))
  }
  return {
    text: pages.join('\n\f\n'),
    pages,
    pageCount: pdf.numPages
  }
}
