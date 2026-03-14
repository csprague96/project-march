import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import CameraScreen from './screens/CameraScreen'
import HistoryScreen from './screens/HistoryScreen'
import ResultScreen from './screens/ResultScreen'
import { extractWithClaude } from './services/claudeOCR'
import { getAllTriageRecords, queueOfflineCapture, saveTriageRecord } from './services/db'
import { preprocessImage } from './services/imagePreprocess'
import { processOfflineQueue } from './services/offlineQueue'
import { extractWithTesseract } from './services/tesseractOCR'

const API_KEY_STORAGE_KEY = 'triage-claude-api-key'

function createRecordId() {
  return crypto.randomUUID()
}

function createPersistedRecord(result, metadata = {}) {
  const timestamp = metadata.createdAt ?? new Date().toISOString()

  return {
    id: metadata.id ?? createRecordId(),
    createdAt: timestamp,
    updatedAt: timestamp,
    source: metadata.source ?? 'online',
    needsReview: metadata.needsReview ?? false,
    wasUpgraded: metadata.wasUpgraded ?? false,
    upgradedAt: metadata.upgradedAt ?? null,
    imageDataUrl: metadata.imageDataUrl ?? null,
    processedImageDataUrl: metadata.processedImageDataUrl ?? null,
    rawOcrText: metadata.rawOcrText ?? null,
    savedAt: metadata.savedAt ?? null,
    ...result,
  }
}

function App() {
  const [view, setView] = useState('camera')
  const [records, setRecords] = useState([])
  const [activeRecord, setActiveRecord] = useState(null)
  const [resultBackTarget, setResultBackTarget] = useState('camera')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE_KEY) ?? '')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [processingLabel, setProcessingLabel] = useState('Processing')
  const [errorMessage, setErrorMessage] = useState('')
  const queueIsRunningRef = useRef(false)

  const savedRecordIds = useMemo(() => new Set(records.map((record) => record.id)), [records])

  const refreshRecords = useCallback(async () => {
    const nextRecords = await getAllTriageRecords()
    setRecords(nextRecords)
  }, [])

  const handleQueueProcessing = useCallback(async () => {
    if (!apiKey || queueIsRunningRef.current) {
      return
    }

    queueIsRunningRef.current = true
    setIsSyncing(true)

    try {
      await processOfflineQueue({
        apiKey,
        onRecordUpdated: refreshRecords,
        onError: (error) => {
          console.error('Offline queue processing failed:', error)
        },
      })
      await refreshRecords()
    } finally {
      queueIsRunningRef.current = false
      setIsSyncing(false)
    }
  }, [apiKey, refreshRecords])

  useEffect(() => {
    refreshRecords()
  }, [refreshRecords])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (isOnline && apiKey) {
      handleQueueProcessing()
    }
  }, [apiKey, handleQueueProcessing, isOnline])

  const handleSaveApiKey = (nextApiKey) => {
    const cleanedKey = nextApiKey.trim()

    if (!cleanedKey) {
      setErrorMessage('Enter a Claude API key or continue offline.')
      return
    }

    localStorage.setItem(API_KEY_STORAGE_KEY, cleanedKey)
    setApiKey(cleanedKey)
    setErrorMessage('')
  }

  const openResultFromHistory = (record) => {
    setActiveRecord(record)
    setResultBackTarget('history')
    setView('result')
  }

  const handleCapture = async (capture) => {
    if (navigator.vibrate) {
      navigator.vibrate(25)
    }

    setErrorMessage('')
    setIsProcessing(true)

    try {
      setProcessingLabel('Preprocessing image')
      const processedImage = await preprocessImage(capture.blob)

      let result
      let source = 'online'
      let rawOcrText = null

      if (isOnline && apiKey) {
        try {
          setProcessingLabel('Sending to Claude')
          result = await extractWithClaude({
            apiKey,
            base64ImageData: processedImage.base64,
          })
        } catch (onlineError) {
          console.warn('Claude OCR failed, falling back to Tesseract:', onlineError)
          setProcessingLabel('Claude failed, running offline OCR')
          const offlineResult = await extractWithTesseract({
            blob: processedImage.blob,
          })
          result = offlineResult.result
          rawOcrText = offlineResult.rawText
          source = 'offline'
        }
      } else {
        setProcessingLabel('Running offline OCR')
        const offlineResult = await extractWithTesseract({
          blob: processedImage.blob,
        })
        result = offlineResult.result
        rawOcrText = offlineResult.rawText
        source = 'offline'
      }

      const draftRecord = createPersistedRecord(result, {
        source,
        needsReview: source === 'offline' || result.confidence < 0.6,
        imageDataUrl: capture.dataUrl,
        processedImageDataUrl: processedImage.dataUrl,
        rawOcrText,
      })

      // Keep the original image blob in memory until the user decides to save.
      draftRecord.imageBlob = capture.blob

      setActiveRecord(draftRecord)
      setResultBackTarget('camera')
      setView('result')
    } catch (error) {
      console.error(error)
      setErrorMessage(error.message || 'The card could not be processed. Try again.')
    } finally {
      setIsProcessing(false)
      setProcessingLabel('Processing')
    }
  }

  const handleSaveActiveRecord = async () => {
    if (!activeRecord || savedRecordIds.has(activeRecord.id)) {
      return
    }

    setIsSaving(true)

    try {
      const savedAt = new Date().toISOString()
      const { imageBlob, ...persistableRecord } = activeRecord
      const recordToSave = { ...persistableRecord, savedAt }

      await saveTriageRecord(recordToSave)

      if (activeRecord.source === 'offline' && imageBlob) {
        await queueOfflineCapture({
          id: activeRecord.id,
          recordId: activeRecord.id,
          imageBlob,
          createdAt: recordToSave.createdAt,
        })
      }

      const nextRecord = { ...recordToSave }
      setActiveRecord(nextRecord)
      await refreshRecords()
    } catch (error) {
      console.error(error)
      setErrorMessage('The triage card could not be saved.')
    } finally {
      setIsSaving(false)
    }
  }

  const resultRecord = activeRecord
    ? {
        ...activeRecord,
        savedAt: activeRecord.savedAt ?? (savedRecordIds.has(activeRecord.id) ? activeRecord.updatedAt : null),
      }
    : null

  if (view === 'history') {
    return (
      <HistoryScreen
        isSyncing={isSyncing}
        onBack={() => setView('camera')}
        onOpenRecord={openResultFromHistory}
        records={records}
      />
    )
  }

  if (view === 'result' && resultRecord) {
    return (
      <ResultScreen
        backLabel={resultBackTarget === 'history' ? 'Back to History' : 'Back to Camera'}
        isSaving={isSaving}
        onBack={() => setView(resultBackTarget)}
        onSave={handleSaveActiveRecord}
        record={resultRecord}
      />
    )
  }

  return (
    <CameraScreen
      apiKey={apiKey}
      errorMessage={errorMessage}
      isOnline={isOnline}
      isProcessing={isProcessing}
      onCapture={handleCapture}
      onOpenHistory={() => setView('history')}
      onSaveApiKey={handleSaveApiKey}
      processingLabel={processingLabel}
    />
  )
}

export default App
