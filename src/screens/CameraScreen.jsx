import { Flashlight, Globe, History, Inbox, KeyRound, RefreshCw, TriangleAlert, Wifi, WifiOff } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import CaptureButton from '../components/CaptureButton'
import { useTranslation } from '../contexts/LanguageContext'
import { captureFrame, setTorch, startRearCamera, stopCamera } from '../services/camera'

function CameraScreen({
  accessCode,
  errorMessage,
  isOnline,
  onCapture,
  onOpenHistory,
  onOpenInbox,
  onSaveAccessCode,
  pendingCount = 0,
}) {
  const { language, t, toggleLanguage } = useTranslation()
  const videoRef = useRef(null)
  const [cameraError, setCameraError] = useState(null)
  const [accessCodeDraft, setAccessCodeDraft] = useState(accessCode ?? '')
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [captureFlash, setCaptureFlash] = useState(false)
  const [frozenFrame, setFrozenFrame] = useState(null)

  const connectCamera = useCallback(async () => {
    setCameraError(null)
    try {
      const { torchSupported: hasTorch } = await startRearCamera(videoRef.current)
      setTorchSupported(hasTorch)
    } catch {
      // First attempt can fail transiently — the camera device may still be
      // releasing from a previous stream (common with React StrictMode's
      // double-mount in development, or rapid reloads on device). Wait briefly
      // and retry once before surfacing any error to the user.
      await new Promise((r) => setTimeout(r, 600))
      try {
        const { torchSupported: hasTorch } = await startRearCamera(videoRef.current)
        setTorchSupported(hasTorch)
      } catch (finalError) {
        const isPermissionError = finalError.name === 'NotAllowedError' || finalError.name === 'PermissionDeniedError'
        setCameraError(isPermissionError ? 'permission_denied' : finalError.message)
      }
    }
  }, [])

  useEffect(() => {
    connectCamera()
    return () => stopCamera()
  }, [connectCamera])

  const handleCapture = async () => {
    try {
      const frame = await captureFrame(videoRef.current)
      // Freeze the feed for 0.5 s so the medic can see the captured frame,
      // then resume the live view. Flash and freeze share the same timer.
      setCaptureFlash(true)
      setFrozenFrame(frame.dataUrl)
      setTimeout(() => {
        setCaptureFlash(false)
        setFrozenFrame(null)
      }, 500)
      // Fire-and-forget — OCR runs in the background worker.
      // The camera stays live and the user can capture again immediately.
      onCapture(frame)
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
      {/* Frozen frame: displayed for 0.5 s after capture to confirm the shot */}
      {frozenFrame ? <img src={frozenFrame} className="absolute inset-0 h-full w-full object-cover opacity-70" aria-hidden="true" alt="" /> : null}
      <div className="camera-vignette absolute inset-0" />
      {/* Shutter flash: fires on capture to confirm the photo was taken */}
      {captureFlash ? <div className="animate-shutter-flash absolute inset-0 bg-white" /> : null}

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
                  {t('online')}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[var(--triage-delayed)]">
                  <WifiOff className="h-3.5 w-3.5" />
                  {t('offline')}
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

          {cameraError === 'permission_denied' ? (
            <div className="rounded-2xl border border-[var(--triage-immediate)]/35 bg-[var(--triage-immediate)]/14 p-4 text-sm text-white">
              <div className="flex items-start gap-3">
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[var(--triage-immediate)]" />
                <div className="space-y-2">
                  <p className="font-semibold">{t('cameraPermissionDenied')}</p>
                  <p className="text-white/70">{t('cameraPermissionHint')}</p>
                  <button
                    type="button"
                    onClick={connectCamera}
                    className="mt-1 flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t('retryCamera')}
                  </button>
                </div>
              </div>
            </div>
          ) : cameraError || errorMessage ? (
            <div className="rounded-2xl border border-[var(--triage-immediate)]/35 bg-[var(--triage-immediate)]/14 p-4 text-sm text-white">
              <div className="flex items-start gap-3">
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="space-y-2">
                  <span>{cameraError || errorMessage}</span>
                  {cameraError ? (
                    <button
                      type="button"
                      onClick={connectCamera}
                      className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {t('retryCamera')}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-white/8 bg-black/30 px-4 py-3 text-sm text-[var(--text-secondary)] backdrop-blur">
            {t('cameraInstructions')}
          </div>
        </div>

        <footer className="relative flex flex-col items-center gap-4 pb-4">
          <CaptureButton onClick={handleCapture} />

          {/* Inbox button: bottom-right, shows count of captures awaiting review */}
          <div className="absolute right-0 bottom-4">
            <button
              type="button"
              onClick={onOpenInbox}
              className="relative flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-white backdrop-blur"
              aria-label={t('inbox')}
            >
              <Inbox className="h-5 w-5" />
              {pendingCount > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--triage-immediate)] px-1 text-[10px] font-bold text-white">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              ) : null}
            </button>
          </div>
        </footer>
      </div>
    </section>
  )
}

export default CameraScreen
