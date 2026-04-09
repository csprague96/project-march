import { useEffect, useState } from 'react'

import { useTranslation } from '../contexts/LanguageContext'

export const ONBOARDING_STORAGE_KEY = 'march-onboarded'

function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const triggerInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  return { canInstall: !!deferredPrompt, triggerInstall }
}

function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
}

export default function OnboardingModal({ onDismiss }) {
  const { t } = useTranslation()
  const { canInstall, triggerInstall } = useInstallPrompt()
  const showIOSInstructions = isIOS() && !canInstall

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1')
    onDismiss()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={handleDismiss} />

      {/* Sheet */}
      <div className="animate-panel-up relative w-full max-w-lg rounded-t-3xl border border-white/10 bg-black/80 p-6 pb-8 shadow-panel backdrop-blur">

        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <span className="ukraine-flag" aria-label="Ukrainian flag" role="img" />
          <h2 className="text-lg font-semibold text-white">{t('onboardingTitle')}</h2>
        </div>

        {/* About */}
        <p className="mb-5 text-sm leading-relaxed text-[var(--text-secondary)]">
          {t('onboardingAbout')}
        </p>

        {/* Install section */}
        {(canInstall || showIOSInstructions) && (
          <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
              {t('onboardingInstallTitle')}
            </p>

            {canInstall && (
              <button
                type="button"
                onClick={triggerInstall}
                className="w-full rounded-xl py-2.5 text-sm font-semibold text-black"
                style={{ background: 'var(--ukraine-yellow)' }}
              >
                {t('onboardingInstallAndroid')}
              </button>
            )}

            {showIOSInstructions && (
              <p className="text-sm leading-relaxed text-white/80">
                {t('onboardingInstallIOS')}
              </p>
            )}
          </div>
        )}

        {/* Dismiss */}
        <button
          type="button"
          onClick={handleDismiss}
          className="w-full rounded-2xl py-3 text-sm font-semibold text-white"
          style={{ background: 'var(--ukraine-blue)' }}
        >
          {t('onboardingDismiss')}
        </button>
      </div>
    </div>
  )
}
