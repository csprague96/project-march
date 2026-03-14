import { useTranslation } from '../contexts/LanguageContext'

function OfflineBanner({ source, wasUpgraded }) {
  const { t } = useTranslation()

  if (source !== 'offline' && !wasUpgraded) {
    return null
  }

  if (wasUpgraded) {
    return (
      <div className="rounded-2xl border border-[var(--triage-minimal)]/30 bg-[var(--triage-minimal)]/10 px-4 py-3 text-sm font-medium text-[var(--triage-minimal)]">
        {t('offlineBannerUpgraded')}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[var(--triage-delayed)]/40 bg-[var(--triage-delayed)]/12 px-4 py-3 text-sm font-semibold tracking-wide text-[var(--triage-delayed)]">
      {t('offlineBannerVerify')}
    </div>
  )
}

export default OfflineBanner
