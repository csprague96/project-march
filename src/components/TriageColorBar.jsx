const TRIAGE_COLORS = {
  IMMEDIATE: 'var(--triage-immediate)',
  DELAYED: 'var(--triage-delayed)',
  MINIMAL: 'var(--triage-minimal)',
  EXPECTANT: 'var(--triage-expectant)',
}

function TriageColorBar({ category }) {
  const resolvedCategory = category ?? 'UNCLASSIFIED'
  const backgroundColor = TRIAGE_COLORS[resolvedCategory] ?? 'var(--border)'

  return (
    <div
      className="flex min-h-12 items-center justify-center rounded-t-3xl px-4 py-3 text-center font-semibold tracking-[0.25em] text-white"
      style={{ backgroundColor }}
    >
      {resolvedCategory}
    </div>
  )
}

export default TriageColorBar
