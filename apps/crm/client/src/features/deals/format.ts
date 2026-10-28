const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export function formatCurrency(value: number): string {
  return currency.format(value)
}

export function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** `2026-11-14T00:00:00.000Z` -> `2026-11-14`, for a date input. */
export function toDateInputValue(value: string | null): string {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}
