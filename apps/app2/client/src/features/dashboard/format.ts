/**
 * Money, in the store's display currency.
 *
 * Always two decimal places. Dropping them above a threshold made a column of
 * totals read "$429.10" next to "$1,024", which looks like two different
 * precisions rather than one consistent one.
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Money for a headline figure, where the cents are noise.
 *
 * Used by the dashboard stat tiles only; anywhere a reader compares values
 * against each other wants formatCurrency.
 */
export function formatCurrencyCompact(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

/**
 * Compact axis tick, e.g. 1.6K.
 *
 * Keeps one decimal below 10K: rounding to whole thousands made 1,600 and
 * 2,400 both render as "2K", so a chart axis showed the same label twice.
 */
export function formatCompact(value: number): string {
  if (Math.abs(value) < 1000) return String(Math.round(value))

  const thousands = value / 1000
  const digits = Math.abs(thousands) < 10 ? 1 : 0
  return `${thousands.toFixed(digits).replace(/\.0$/, '')}K`
}

/**
 * Short axis label for an ISO date.
 *
 * Parsed as UTC — the API buckets days in UTC, and letting the browser apply a
 * local offset would shift a point into the previous day west of Greenwich.
 */
export function formatDayLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return isoDate
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(date)
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}
