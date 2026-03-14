function OfflineBanner({ source, wasUpgraded }) {
  if (source !== 'offline' && !wasUpgraded) {
    return null
  }

  if (wasUpgraded) {
    return (
      <div className="rounded-2xl border border-[var(--triage-minimal)]/30 bg-[var(--triage-minimal)]/10 px-4 py-3 text-sm font-medium text-[var(--triage-minimal)]">
        Previously offline result upgraded with Claude verification.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[var(--triage-delayed)]/40 bg-[var(--triage-delayed)]/12 px-4 py-3 text-sm font-semibold tracking-wide text-[var(--triage-delayed)]">
      OFFLINE - VERIFY
    </div>
  )
}

export default OfflineBanner
