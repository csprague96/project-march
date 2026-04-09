import { Activity, Droplets, HeartPulse, ShieldAlert, ShieldPlus, Syringe, User } from 'lucide-react'

import AllergyBadges from './AllergyBadges'
import ConfidenceIndicator from './ConfidenceIndicator'
import OfflineBanner from './OfflineBanner'
import TriageColorBar from './TriageColorBar'
import VitalSignsGrid from './VitalSignsGrid'
import { useTranslation } from '../contexts/LanguageContext'

function Section({ children, icon, title }) {
  const IconComponent = icon

  return (
    <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-black/20 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
        <IconComponent className="h-4 w-4" />
        <span>{title}</span>
      </div>
      {children}
    </section>
  )
}

function ListBlock({ emptyLabel, items }) {
  if (!items?.length) {
    return <div className="text-sm text-[var(--text-secondary)]">{emptyLabel}</div>
  }

  return (
    <ul className="space-y-2 text-sm text-[var(--text-primary)]">
      {items.map((item) => (
        <li key={item} className="rounded-xl border border-white/5 bg-white/4 px-3 py-2">
          {item}
        </li>
      ))}
    </ul>
  )
}

function TriageCard({ record }) {
  const { t } = useTranslation()

  return (
    <article className="mx-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] shadow-panel">
      <TriageColorBar category={record.triage_category} />

      <div className="space-y-6 p-4 sm:p-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">{t('patient')}</div>
              <div className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                {record.patient_name ?? t('unknownPatient')}
              </div>
              {(record.military_id || record.individual_number) ? (
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-[var(--text-secondary)]">
                  {record.military_id ? <span>{t('militaryId')}: {record.military_id}</span> : null}
                  {record.individual_number ? <span>{t('individualNumber')}: {record.individual_number}</span> : null}
                </div>
              ) : null}
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">{t('timestamp')}</div>
              <div className="mt-1 text-sm text-[var(--text-primary)]">
                {record.date_time ?? new Date(record.createdAt).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--blood-type-bg)] px-5 py-3 text-center">
            <div className="text-xs uppercase tracking-[0.4em] text-white/70">{t('bloodType')}</div>
            <div className="mt-1 font-medical text-3xl font-bold leading-none text-white">
              {record.blood_type ?? '--'}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Section icon={ShieldAlert} title={t('allergies')}>
            <AllergyBadges allergies={record.allergies} />
          </Section>

          <Section icon={Droplets} title={t('mechanismOfInjury')}>
            <div className="flex flex-wrap gap-2">
              {record.mechanism_of_injury?.length ? (
                record.mechanism_of_injury.map((mechanism) => (
                  <span
                    key={mechanism}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--text-primary)]"
                  >
                    {mechanism}
                  </span>
                ))
              ) : (
                <span className="text-sm text-[var(--text-secondary)]">{t('noMechanismCaptured')}</span>
              )}
            </div>
          </Section>
        </div>

        <Section icon={ShieldPlus} title={t('injuries')}>
          <p className="text-sm leading-6 text-[var(--text-primary)]">{record.injuries ?? t('noInjuryDetail')}</p>
          {record.injury_locations?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {record.injury_locations.map((loc) => (
                <span key={loc} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[var(--text-primary)]">
                  {loc}
                </span>
              ))}
            </div>
          ) : null}
        </Section>

        <Section icon={Activity} title={t('vitalSigns')}>
          <VitalSignsGrid vitalSigns={record.vital_signs} />
          {record.vital_signs?.avpu ? (
            <div className="rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-sm text-[var(--text-primary)]">
              AVPU: <span className="font-medical font-semibold">{record.vital_signs.avpu}</span>
            </div>
          ) : null}
        </Section>

        {record.march_therapies ? (
          <Section icon={HeartPulse} title={t('marchTherapies')}>
            <div className="space-y-2">
              {[
                ['massive_hemorrhage', t('massiveHemorrhage')],
                ['airway', t('airway')],
                ['respiration', t('respiration')],
                ['circulation', t('circulation')],
                ['secondary', t('secondary')],
              ].map(([key, label]) => {
                const items = record.march_therapies[key]
                if (!items?.length) return null
                return (
                  <div key={key} className="rounded-xl border border-white/5 bg-white/4 px-3 py-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">{label}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {items.map((item) => (
                        <span key={item} className="rounded-full bg-white/8 px-2 py-0.5 text-xs text-[var(--text-primary)]">{item}</span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <Section icon={Syringe} title={t('treatments')}>
            <ListBlock emptyLabel={t('noTreatments')} items={record.treatments} />
          </Section>

          <Section icon={Syringe} title={t('medicationsDetailed')}>
            {record.medications_detailed?.length ? (
              <div className="space-y-2">
                {record.medications_detailed.map((med, i) => (
                  <div key={i} className="rounded-xl border border-white/5 bg-white/4 px-3 py-2 text-sm text-[var(--text-primary)]">
                    <div className="font-semibold">{med.name}</div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-[var(--text-secondary)]">
                      {med.dose ? <span>{t('dose')}: {med.dose}</span> : null}
                      {med.route ? <span>{t('route')}: {med.route}</span> : null}
                      {med.time ? <span>{t('time')}: {med.time}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ListBlock emptyLabel={t('noMedications')} items={record.medications} />
            )}
          </Section>
        </div>

        {record.fluids?.length ? (
          <Section icon={Droplets} title={t('ivFluids')}>
            <div className="space-y-2">
              {record.fluids.map((fluid, i) => (
                <div key={i} className="rounded-xl border border-white/5 bg-white/4 px-3 py-2 text-sm text-[var(--text-primary)]">
                  <div className="font-semibold">{fluid.name}</div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-[var(--text-secondary)]">
                    {fluid.volume ? <span>{t('volume')}: {fluid.volume}</span> : null}
                    {fluid.route ? <span>{t('route')}: {fluid.route}</span> : null}
                    {fluid.time ? <span>{t('time')}: {fluid.time}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        <Section icon={ShieldPlus} title={t('tourniquet')}>
          {record.tourniquets?.length ? (
            <div className="space-y-2">
              {record.tourniquets.map((tq, i) => (
                <div key={i} className="rounded-2xl border border-[var(--triage-immediate)]/30 bg-[var(--triage-immediate)]/10 p-4 text-sm text-[var(--text-primary)]">
                  <div className="font-semibold text-white">{t('tourniquetApplied')}</div>
                  <div>{t('location')}: {tq.location ?? t('notCaptured')}</div>
                  {tq.type ? <div>{t('tourniquetType')}: {tq.type}</div> : null}
                  <div>{t('time')}: {tq.time ?? t('notCaptured')}</div>
                </div>
              ))}
            </div>
          ) : record.tourniquet?.applied ? (
            <div className="space-y-2 rounded-2xl border border-[var(--triage-immediate)]/30 bg-[var(--triage-immediate)]/10 p-4 text-sm text-[var(--text-primary)]">
              <div className="font-semibold text-white">{t('tourniquetApplied')}</div>
              <div>{t('location')}: {record.tourniquet.location ?? t('notCaptured')}</div>
              <div>{t('time')}: {record.tourniquet.time ?? t('notCaptured')}</div>
            </div>
          ) : (
            <div className="text-sm text-[var(--text-secondary)]">{t('noTourniquetDocumented')}</div>
          )}
        </Section>

        {record.notes ? (
          <Section icon={ShieldAlert} title={t('notes')}>
            <p className="text-sm leading-6 text-[var(--text-primary)]">{record.notes}</p>
          </Section>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <ConfidenceIndicator confidence={record.confidence} needsReview={record.needsReview} />
          <div className="space-y-4">
            <OfflineBanner source={record.source} wasUpgraded={record.wasUpgraded} />
            <div className="rounded-2xl border border-[var(--border)] bg-black/20 p-4 text-sm text-[var(--text-secondary)]">
              <div>{t('unit')}: {record.unit ?? t('notCaptured')}</div>
              {record.evacuation_type ? (
                <div className="mt-2">{t('evacuationType')}: {record.evacuation_type}</div>
              ) : null}
              <div className="mt-2">{t('evacuationPriority')}: {record.evacuation_priority ?? t('notCaptured')}</div>
              {record.first_responder?.name ? (
                <div className="mt-3 border-t border-white/10 pt-3">
                  <div className="text-xs uppercase tracking-wider">{t('firstResponder')}</div>
                  <div className="mt-1 text-[var(--text-primary)]">{record.first_responder.name}</div>
                  {record.first_responder.id ? (
                    <div className="text-xs">{t('individualNumber')}: {record.first_responder.id}</div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

export default TriageCard
