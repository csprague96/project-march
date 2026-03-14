import { Flashlight, Globe, History, KeyRound, LoaderCircle, TriangleAlert, Wifi, WifiOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import CaptureButton from '../components/CaptureButton'
import { useTranslation } from '../contexts/LanguageContext'
import { captureFrame, setTorch, startRearCamera, stopCamera } from '../services/camera'

function CameraScreen({
  accessCode,
  errorMessage,
  isOnline,
  isProcessing,
  onCapture,
  onOpenHistory,
  onSaveAccessCode,
  processingLabel,
}) {
  const { language, t, toggleLanguage } = useTranslation()
  const videoRef = useRef(null)
  const [cameraError, setCameraError] = useState('')
  const [accessCodeDraft, setAccessCodeDraft] = useState(accessCode ?? '')
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function connectCamera() {
      try {
        const { torchSupported: hasTorch } = await startRearCamera(videoRef.current)

        if (!isMounted) {
          return
        }

        setTorchSupported(hasTorch)
        setCameraError('')
      } catch (error) {
        if (isMounted) {
          setCameraError(error.message)
        }
      }
    }

    connectCamera()

    return () => {
      isMounted = false
      stopCamera()
    }
  }, [])

  const handleCapture = async () => {
    try {
      const frame = await captureFrame(videoRef.current)
      await onCapture(frame)
    } catch (error) {
      setCameraError(error.message)
    }
  }

  const handleTorchToggle = async () => {
    const nextEnabled = !torchEnabled
    const didToggle = await setTorch(nextEnabled)

    if (didToggle) {
      setTorchEnabled(nextEnabled)
    }
  }

  return (
    <section className="relative min-h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover opacity-70" autoPlay muted />
      <div className="camera-vignette absolute inset-0" />

      <div className="relative z-10 flex min-h-screen flex-col justify-between p-4 sm:p-6">
        <header className="flex items-center justify-between gap-2">
          {/* Left: History + Language toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenHistory}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-white backdrop-blur"
              aria-label={t('history')}
            >
              <History className="h-5 w-5" />
            </button>

            {/* Language toggle: cycles EN ↔ UK */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-black/30 px-3 text-white backdrop-blur"
              aria-label={t('toggleLanguage')}
            >
              <Globe className="h-4 w-4 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-widest">
                {language === 'en' ? 'EN' : 'UK'}
              </span>
            </button>
          </div>

          {/* Right: Online status + Torch */}
          <div className="flex items-center gap-2">
            <div className="rounded-full border border-white/10 bg-black/35 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white">
              {isOnline ? (
                <span className="flex items-center gap-1.5">
                  <Wifi className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">{t('online')}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[var(--triage-delayed)]">
                  <WifiOff className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">{t('offline')}</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleTorchToggle}
              disabled={!torchSupported}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-white backdrop-blur disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Toggle torch"
            >
              <Flashlight className={`h-5 w-5 ${torchEnabled ? 'text-[var(--triage-delayed)]' : ''}`} />
            </button>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          {!accessCode ? (
            <div className="rounded-3xl border border-white/10 bg-black/55 p-5 shadow-panel backdrop-blur">
              <div className="flex items-start gap-3">
                <KeyRound className="mt-1 h-5 w-5 text-[var(--triage-delayed)]" />
                <div className="w-full space-y-4">
                  <div>
                    <h1 className="text-lg font-semibold text-white">{t('enterMedicAccessCode')}</h1>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {t('accessCodeDescription')}
                    </p>
                  </div>

                  <input
                    value={accessCodeDraft}
                    onChange={(event) => setAccessCodeDraft(event.target.value)}
                    placeholder={t('accessCodePlaceholder')}
                    className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/25"
                  />

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => onSaveAccessCode(accessCodeDraft)}
                      className="min-h-12 rounded-2xl bg-[var(--triage-immediate)] px-5 text-sm font-semibold text-white"
                    >
                      {t('saveCode')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {cameraError || errorMessage ? (
            <div className="rounded-2xl border border-[var(--triage-immediate)]/35 bg-[var(--triage-immediate)]/14 p-4 text-sm text-white">
              <div className="flex items-start gap-3">
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{cameraError || errorMessage}</span>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-white/8 bg-black/30 px-4 py-3 text-sm text-[var(--text-secondary)] backdrop-blur">
            {t('cameraInstructions')}
          </div>
        </div>

        <footer className="flex flex-col items-center gap-4 pb-4">
          {isProcessing ? (
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-4 py-2 text-sm text-white backdrop-blur">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              {processingLabel}
            </div>
          ) : null}

          <CaptureButton disabled={isProcessing} isProcessing={isProcessing} onClick={handleCapture} />
        </footer>
      </div>
    </section>
  )
}

export default CameraScreen
