export function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** `2026-10-10T17:00:00.000Z` -> `2026-10-10T17:00`, for a datetime-local input. */
export function toDateTimeInputValue(value: string | null): string {
  if (!value) return ''

  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}
