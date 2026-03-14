import { useTranslation } from '../contexts/LanguageContext'

function AllergyBadges({ allergies }) {
  const { t } = useTranslation()

  if (!allergies?.length) {
    return (
      <div className="inline-flex rounded-full border border-[var(--triage-minimal)]/30 bg-[var(--triage-minimal)]/10 px-4 py-2 text-sm font-semibold tracking-wide text-[var(--triage-minimal)]">
        {t('noKnownAllergies')}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {allergies.map((allergy) => (
        <span
          key={allergy}
          className="rounded-full bg-[var(--triage-immediate)] px-3 py-2 text-sm font-semibold uppercase tracking-wide text-white"
        >
          {allergy}
        </span>
      ))}
    </div>
  )
}

export default AllergyBadges
