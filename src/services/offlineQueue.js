import { extractWithClaude } from './claudeOCR'
import { getQueuedCaptures, removeQueuedCapture, updateTriageRecord } from './db'
import { preprocessImage } from './imagePreprocess'

export async function processOfflineQueue({ apiKey, onRecordUpdated, onError }) {
  if (!apiKey) {
    return
  }

  const queuedCaptures = await getQueuedCaptures()

  for (const queuedCapture of queuedCaptures) {
    try {
      const processedImage = await preprocessImage(queuedCapture.imageBlob)
      const upgradedResult = await extractWithClaude({
        apiKey,
        base64ImageData: processedImage.base64,
      })

      await updateTriageRecord(queuedCapture.recordId, {
        ...upgradedResult,
        source: 'online',
        needsReview: upgradedResult.confidence < 0.6,
        wasUpgraded: true,
        upgradedAt: new Date().toISOString(),
      })

      await removeQueuedCapture(queuedCapture.id)
      onRecordUpdated?.(queuedCapture.recordId)
    } catch (error) {
      onError?.(error, queuedCapture)
    }
  }
}
