import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import CameraScreen from './screens/CameraScreen'
import HistoryScreen from './screens/HistoryScreen'
import OnboardingModal, { ONBOARDING_STORAGE_KEY } from './components/OnboardingModal'
import ResultScreen from './screens/ResultScreen'
import { useTranslation } from './contexts/LanguageContext'
import { extractWithClaude } from './services/claudeOCR'
import { getAllTriageRecords, queueOfflineCapture, saveTriageRecord, updateTriageRecord } from './services/db'
import { preprocessImage } from './services/imagePreprocess'
import { processOfflineQueue } from './services/offlineQueue'
import { extractWithTesseract } from './services/tesseractOCR'

// Storage key kept intentionally vague to avoid leaking implementation details
const ACCESS_CODE_STORAGE_KEY = 'triage-access-code'

function createRecordId() {
  return crypto.randomUUID()
}

function createPersistedRecord(result, metadata = {}) {
  const timestamp = metadata.createdAt ?? new Date().toISOString()

  return {
    id: metadata.id ?? createRecordId(),
    createdAt: timestamp,
    updatedAt: timestamp,
    status: metadata.status ?? 'done',
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
  const { t } = useTranslation()
  const [view, setView] = useState('camera')
  const [records, setRecords] = useState([])
  const [activeRecord, setActiveRecord] = useState(null)
  const [resultBackTarget, setResultBackTarget] = useState('camera')
  const [accessCode, setAccessCode] = useState(() => localStorage.getItem(ACCESS_CODE_STORAGE_KEY) ?? '')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem(ONBOARDING_STORAGE_KEY))
  const queueIsRunningRef = useRef(false)

  const savedRecordIds = useMemo(() => new Set(records.map((record) => record.id)), [records])

  // Count of captures whose OCR is still running in the background worker
  const pendingCount = useMemo(() => records.filter((r) => r.status === 'pending').length, [records])

  const refreshRecords = useCallback(async () => {
    const nextRecords = await getAllTriageRecords()
    setRecords(nextRecords)
  }, [])

  const handleQueueProcessing = useCallback(async () => {
    if (!accessCode || queueIsRunningRef.current) {
      return
    }

    queueIsRunningRef.current = true
    setIsSyncing(true)

    try {
      await processOfflineQueue({
        accessCode,
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
  }, [accessCode, refreshRecords])

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
    if (isOnline && accessCode) {
      handleQueueProcessing()
    }
  }, [accessCode, handleQueueProcessing, isOnline])

  const handleSaveAccessCode = (nextCode) => {
    const cleanedCode = nextCode.trim()

    if (!cleanedCode) {
      setErrorMessage(t('enterAccessCodeError'))
      return
    }

    localStorage.setItem(ACCESS_CODE_STORAGE_KEY, cleanedCode)
    setAccessCode(cleanedCode)
    setErrorMessage('')
  }

  const openResultFromHistory = (record) => {
    // Pending records have no OCR result yet — only open completed ones
    if (record.status === 'pending') return

    setActiveRecord(record)
    setResultBackTarget('history')
    setView('result')
  }

  const handleCapture = async (capture) => {
    if (navigator.vibrate) {
      navigator.vibrate(25)
    }

    setErrorMessage('')

    try {
      const processedImage = await preprocessImage(capture.blob)

      // 1. Write a draft record to IDB immediately so the Inbox badge increments
      //    and the medic can fire the next shot without waiting for OCR.
      const draftId = createRecordId()
      const draftRecord = createPersistedRecord({}, {
        id: draftId,
        status: 'pending',
        source: 'offline',
        imageDataUrl: capture.dataUrl,
        processedImageDataUrl: processedImage.dataUrl,
      })

      await saveTriageRecord(draftRecord)
      await refreshRecords()

      // 2. Helper called when OCR finishes (either path).
      const handleOcrDone = async (result, rawText, source) => {
        await updateTriageRecord(draftId, {
          ...result,
          rawOcrText: rawText,
          status: 'done',
          source,
          needsReview: source === 'offline' || result.confidence < 0.6,
        })

        // Queue offline captures for Claude upgrade when connectivity returns.
        // Blobs cannot be stored in IndexedDB on iOS Safari — convert to
        // ArrayBuffer (universally supported) and reconstruct on the way out.
        if (source === 'offline' && capture.blob) {
          const imageBuffer = await capture.blob.arrayBuffer()
          await queueOfflineCapture({
            id: draftId,
            recordId: draftId,
            imageBuffer,
            imageMimeType: capture.blob.type || 'image/jpeg',
            createdAt: draftRecord.createdAt,
          })
        }

        await refreshRecords()
      }

      // 3. Helper called if OCR fails entirely.
      const handleOcrError = async (error) => {
        console.error('OCR failed:', error)
        await updateTriageRecord(draftId, { status: 'error' })
        setErrorMessage(error.message || t('captureError'))
        await refreshRecords()
      }

      // 4. Fire OCR — no await. Camera stays live immediately.
      if (isOnline && accessCode) {
        extractWithClaude({ accessCode, base64ImageData: processedImage.base64 })
          .then((result) => handleOcrDone(result, null, 'online'))
          .catch((onlineError) => {
            console.warn('Claude failed, falling back to Tesseract:', onlineError)
            return extractWithTesseract({ blob: processedImage.blob, id: draftId })
              .then(({ result, rawText }) => handleOcrDone(result, rawText, 'offline'))
          })
          .catch(handleOcrError)
      } else {
        extractWithTesseract({ blob: processedImage.blob, id: draftId })
          .then(({ result, rawText }) => handleOcrDone(result, rawText, 'offline'))
          .catch(handleOcrError)
      }
    } catch (error) {
      console.error(error)
      setErrorMessage(error.message || String(error) || t('captureError'))
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
      setErrorMessage(t('saveError'))
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

  let screen
  if (view === 'history') {
    screen = (
      <HistoryScreen
        isSyncing={isSyncing}
        onBack={() => setView('camera')}
        onOpenRecord={openResultFromHistory}
        records={records}
      />
    )
  } else if (view === 'result' && resultRecord) {
    screen = (
      <ResultScreen
        backLabel={resultBackTarget === 'history' ? t('backToHistory') : t('backToCamera')}
        isSaving={isSaving}
        onBack={() => setView(resultBackTarget)}
        onSave={handleSaveActiveRecord}
        record={resultRecord}
      />
    )
  } else {
    screen = (
      <CameraScreen
        accessCode={accessCode}
        errorMessage={errorMessage}
        isOnline={isOnline}
        onCapture={handleCapture}
        onOpenHistory={() => setView('history')}
        onOpenInbox={() => setView('history')}
        onSaveAccessCode={handleSaveAccessCode}
        pendingCount={pendingCount}
      />
    )
  }

  return (
    <>
      {screen}
      {showOnboarding && <OnboardingModal onDismiss={() => setShowOnboarding(false)} />}
    </>
  )
}

export default App
