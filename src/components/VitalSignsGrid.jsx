const VITAL_LABELS = [
  ['pulse', 'Pulse'],
  ['blood_pressure', 'BP'],
  ['respiratory_rate', 'RR'],
  ['spo2', 'SpO2'],
  ['pain_scale', 'Pain'],
]

function VitalSignsGrid({ vitalSigns }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {VITAL_LABELS.map(([key, label]) => {
        const value = vitalSigns?.[key]
        if (key === 'pain_scale' && !value) return null

        return (
          <div key={key} className="rounded-2xl border border-[var(--border)] bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">{label}</div>
            <div className="mt-2 font-medical text-2xl font-semibold text-[var(--text-primary)]">
              {value ?? '--'}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default VitalSignsGrid
