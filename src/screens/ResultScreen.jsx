import { ChevronLeft, Save } from 'lucide-react'

import TriageCard from '../components/TriageCard'
import { useTranslation } from '../contexts/LanguageContext'

function ResultScreen({ backLabel, isSaving, onBack, onSave, record }) {
  const { t } = useTranslation()
  const hasBeenSaved = Boolean(record?.savedAt)

  return (
    <section className="min-h-screen bg-[var(--bg-primary)] px-4 py-4 text-[var(--text-primary)] sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <header className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            {backLabel}
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={hasBeenSaved || isSaving}
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[var(--btn-primary)] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
          >
            <Save className="h-4 w-4" />
            {hasBeenSaved ? t('saved') : isSaving ? t('saving') : t('save')}
          </button>
        </header>

        <div className="animate-panel-up">
          <TriageCard record={record} />
        </div>
      </div>
    </section>
  )
}

export default ResultScreen
