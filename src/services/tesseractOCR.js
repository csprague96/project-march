// Main-thread communicator for the Tesseract Web Worker.
// The worker holds a single warm Tesseract instance and processes
// recognitions sequentially to prevent OOM on constrained devices.

let worker = null
const pending = new Map()

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./tesseract.worker.js', import.meta.url), { type: 'module' })
    worker.onmessage = ({ data: { id, result, rawText, error } }) => {
      const handlers = pending.get(id)
      pending.delete(id)
      if (!handlers) return
      if (error) {
        handlers.reject(new Error(error))
      } else {
        handlers.resolve({ result, rawText })
      }
    }
    worker.onerror = (event) => {
      // Surface worker-level errors to all pending promises
      const message = event.message ?? 'Tesseract worker crashed'
      for (const { reject } of pending.values()) {
        reject(new Error(message))
      }
      pending.clear()
      worker = null
    }
  }
  return worker
}

export function extractWithTesseract({ blob, id = crypto.randomUUID() }) {
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ id, blob })
  })
}
