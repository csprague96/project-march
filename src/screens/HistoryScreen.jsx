import { ChevronLeft, Clock3 } from 'lucide-react'

import { useTranslation } from '../contexts/LanguageContext'

const TRIAGE_COLORS = {
  IMMEDIATE: 'var(--triage-immediate)',
  DELAYED: 'var(--triage-delayed)',
  MINIMAL: 'var(--triage-minimal)',
  EXPECTANT: 'var(--triage-expectant)',
}

function HistoryScreen({ isSyncing, onBack, onOpenRecord, records }) {
  const { t } = useTranslation()

  return (
    <section className="min-h-screen bg-[var(--bg-primary)] px-4 py-4 text-[var(--text-primary)] sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('camera')}
          </button>

          <div className="text-right">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">{t('savedCards')}</div>
            <div className="mt-1 text-sm text-[var(--text-primary)]">
              {records.length} {t('total')} {isSyncing ? t('syncingQueue') : ''}
            </div>
          </div>
        </header>

        {records.length ? (
          <div className="space-y-3">
            {records.map((record) => (
              <button
                type="button"
                key={record.id}
                onClick={() => onOpenRecord(record)}
                className="flex w-full flex-col gap-3 rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-left transition hover:border-white/15"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-[var(--text-primary)]">
                      {record.patient_name ?? t('unknownPatient')}
                    </div>
                    <div className="mt-1 text-sm text-[var(--text-secondary)]">
                      {record.unit ?? t('unitNotCaptured')}
                    </div>
                  </div>

                  <span
                    className="rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                    style={{ backgroundColor: TRIAGE_COLORS[record.triage_category] ?? 'var(--border)' }}
                  >
                    {record.triage_category ?? t('unclassified')}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
                  <span className="inline-flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />
                    {new Date(record.createdAt).toLocaleString()}
                  </span>
                  {record.wasUpgraded ? (
                    <span className="rounded-full border border-[var(--triage-minimal)]/30 bg-[var(--triage-minimal)]/10 px-3 py-1 text-xs text-[var(--triage-minimal)]">
                      {t('upgraded')}
                    </span>
                  ) : null}
                  {record.source === 'offline' ? (
                    <span className="rounded-full border border-[var(--triage-delayed)]/30 bg-[var(--triage-delayed)]/10 px-3 py-1 text-xs text-[var(--triage-delayed)]">
                      {t('offlineVerify')}
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-8 text-center text-[var(--text-secondary)]">
            {t('noSavedCards')}
          </div>
        )}
      </div>
    </section>
  )
}

export default HistoryScreen
