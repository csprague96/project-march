import Tesseract from 'tesseract.js'

import { parseOfflineOcrText } from './domainParser'

export async function extractWithTesseract({ blob, onProgress }) {
  const result = await Tesseract.recognize(blob, 'ukr', {
    logger: (message) => {
      if (message.status === 'recognizing text') {
        onProgress?.(message.progress ?? 0)
      }
    },
  })

  const rawText = result?.data?.text ?? ''
  const parsed = parseOfflineOcrText(rawText)

  return {
    result: parsed,
    rawText,
  }
}
