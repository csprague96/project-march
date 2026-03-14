function CaptureButton({ disabled, isProcessing, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-white/20 bg-white/8 p-2 transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={isProcessing ? 'Processing capture' : 'Capture triage card'}
    >
      <span className="block h-full w-full rounded-full border-4 border-white bg-[var(--triage-immediate)]" />
    </button>
  )
}

export default CaptureButton
