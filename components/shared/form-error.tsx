/**
 * Inline form field error display.
 * Shows a red error message below a form field.
 */
export function FormError({ error }: { error?: string }) {
  if (!error) return null
  return <p className="text-xs text-red-600 mt-1">{error}</p>
}

/**
 * Warning banner (non-blocking). Shows yellow alert.
 */
export function FormWarning({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
      <svg className="h-4 w-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{message}</span>
    </div>
  )
}
