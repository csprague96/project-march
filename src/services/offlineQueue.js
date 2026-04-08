import { extractWithClaude } from './claudeOCR'
import { getQueuedCaptures, removeQueuedCapture, updateTriageRecord } from './db'
import { preprocessImage } from './imagePreprocess'

export async function processOfflineQueue({ accessCode, onRecordUpdated, onError }) {
  if (!accessCode) {
    return
  }

  const queuedCaptures = await getQueuedCaptures()

  for (const queuedCapture of queuedCaptures) {
    try {
      // Reconstruct Blob from ArrayBuffer — stored that way to avoid iOS Safari
      // IndexedDB restrictions on native Blob objects.
      const imageBlob = new Blob(
        [queuedCapture.imageBuffer],
        { type: queuedCapture.imageMimeType || 'image/jpeg' },
      )
      const processedImage = await preprocessImage(imageBlob)
      const upgradedResult = await extractWithClaude({
        accessCode,
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
