import { describe, expect, it } from 'vitest'

import {
  formatCompact,
  formatCurrency,
  formatCurrencyCompact,
  formatDayLabel,
} from './format'

describe('formatCompact', () => {
  it('keeps a decimal below 10K so nearby ticks stay distinct', () => {
    // 1600 and 2400 both rounded to "2K" before, giving a duplicated axis tick.
    expect(formatCompact(1600)).toBe('1.6K')
    expect(formatCompact(2400)).toBe('2.4K')
  })

  it('drops a trailing .0', () => {
    expect(formatCompact(2000)).toBe('2K')
  })

  it('leaves values below a thousand alone', () => {
    expect(formatCompact(0)).toBe('0')
    expect(formatCompact(800)).toBe('800')
  })

  it('drops the decimal above 10K', () => {
    expect(formatCompact(12_400)).toBe('12K')
  })
})

describe('formatDayLabel', () => {
  it('reads an ISO date as UTC, not the local zone', () => {
    // A local-time parse would show Jun 14 anywhere west of Greenwich.
    expect(formatDayLabel('2026-06-15')).toBe('Jun 15')
  })

  it('returns the input unchanged when it is not a date', () => {
    expect(formatDayLabel('nonsense')).toBe('nonsense')
  })
})

describe('formatCurrency', () => {
  it('keeps cents at every magnitude, so a column reads consistently', () => {
    expect(formatCurrency(249.99)).toBe('$249.99')
    expect(formatCurrency(1024)).toBe('$1,024.00')
    expect(formatCurrency(16_570.5)).toBe('$16,570.50')
  })
})

describe('formatCurrencyCompact', () => {
  it('drops the cents for a headline figure', () => {
    expect(formatCurrencyCompact(16_570.5)).toBe('$16,571')
  })
})
