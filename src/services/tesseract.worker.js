import Tesseract from 'tesseract.js'

import { parseOfflineOcrText } from './domainParser'

// A single warm Tesseract instance shared across all recognitions.
// Lazy-initialized on first use to avoid loading the 15 MB+ Ukrainian
// language model until it is actually needed.
let workerReady = null

function getWorker() {
  if (!workerReady) {
    workerReady = Tesseract.createWorker('ukr')
  }
  return workerReady
}

// Serial processing queue — each recognition is chained onto the previous one.
// This prevents concurrent worker.recognize() calls on the same Tesseract
// instance, which would cause OOM crashes on memory-constrained Android devices
// when multiple photos are captured in rapid succession.
let queue = Promise.resolve()

self.onmessage = ({ data: { id, blob } }) => {
  queue = queue.then(async () => {
    try {
      const tWorker = await getWorker()
      const { data } = await tWorker.recognize(blob)
      const rawText = data.text ?? ''
      const result = parseOfflineOcrText(rawText)
      self.postMessage({ id, result, rawText })
    } catch (error) {
      self.postMessage({ id, error: error.message })
    }
  })
}
