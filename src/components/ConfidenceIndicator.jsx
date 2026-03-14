function ConfidenceIndicator({ confidence, needsReview }) {
  const percent = Math.round((confidence ?? 0) * 100)
  const lowConfidence = needsReview || (confidence ?? 0) < 0.6

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">Confidence</span>
        <span className="font-medical text-lg font-semibold text-[var(--text-primary)]">{percent}%</span>
      </div>
      {lowConfidence ? (
        <div className="mt-3 rounded-xl border border-[var(--triage-delayed)]/40 bg-[var(--triage-delayed)]/12 px-3 py-2 text-sm font-semibold text-[var(--triage-delayed)]">
          LOW CONFIDENCE - VERIFY MANUALLY
        </div>
      ) : null}
    </div>
  )
}

export default ConfidenceIndicator
