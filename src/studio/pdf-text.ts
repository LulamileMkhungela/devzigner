/** Extract bounded, selectable text from uploaded PDFs. */
import type { PDFDocumentProxy } from 'pdfjs-dist'

/** Extract bounded text only; images and scanned pages are not OCR'd. */
export async function readPdfText(pdf: PDFDocumentProxy): Promise<string> {
  let text = ''
  try {
    for (let i = 1; i <= Math.min(pdf.numPages, 12) && text.length < 16000; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items.map(item => 'str' in item ? item.str : '').join(' ').trim()
      if (pageText) text += `\nPage ${i}: ${pageText}`
    }
    return text.trim().slice(0, 16000)
  } finally { await pdf.destroy() }
}
